import os
import json
import time
from dotenv import load_dotenv
from supabase import create_client, Client
from groq import Groq

# --- IMPORT MODULE EMBEDDING ---
# Đảm bảo file origin_clip.py nằm cùng thư mục
try:
    from origin_clip import ClipEmbedder
except ImportError:
    print("Lỗi: Không tìm thấy file origin_clip.py")
    exit()

# 1. Cấu hình Environment
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# 2. Khởi tạo Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
groq_client = Groq(api_key=GROQ_API_KEY)

# 3. Khởi tạo Model CLIP (Chỉ tải 1 lần khi chạy script)
print("--- KHỞI TẠO HỆ THỐNG ---")
clip_embedder = ClipEmbedder() 

# Model Vision trên Groq
MODEL_ID = "meta-llama/llama-4-scout-17b-16e-instruct" # Cập nhật model Vision mới nhất của Groq nếu cần

def fetch_pending_posts():
    """Lấy các bài viết đang ở trạng thái PROCESSING"""
    response = supabase.table("posts")\
        .select("id, content, type, location")\
        .eq("status", "PROCESSING")\
        .limit(10)\
        .execute()
    return response.data

def get_post_images(post_id):
    """Lấy danh sách URL ảnh của bài post"""
    response = supabase.table("post_images")\
        .select("url")\
        .eq("post_id", post_id)\
        .execute()
    return [item['url'] for item in response.data] if response.data else []

def analyze_post_with_llm(content, image_urls, current_type):
    """Gọi Groq API để phân tích nội dung và danh sách ảnh"""
    
    system_prompt = """
    You are an AI Moderator for a Lost & Found system ("Tìm đồ thất lạc").
    Your task is to analyze the user's post content and multiple images (if provided).
    
    RULES:
    1. CLASSIFY the post into: 'LOST'(Người tìm đồ mất), 'FOUND'(Người nhặt được đồ tìm chủ), or 'TRASH'(Spam, advertising, unrelated content).
    2. EXTRACT location: Specific location mentioned. If none, return null.
    3. IMAGE ANALYSIS (Analyze ALL images provided):
       - "is_background_or_text_only": true if ALL images are just generic backgrounds/memes/text screenshots.
       - "is_relevant": false if none of the images show the object mentioned in the text.
       - "trash_image_urls": Return a list of URLs from the provided images that are irrelevant or spam.
    
    OUTPUT FORMAT: JSON only.
    """

    user_message_content = [
        {"type": "text", "text": f"Post Content: '{content}'\nUser claimed Type: '{current_type}'"}
    ]

    for url in image_urls:
        user_message_content.append({
            "type": "image_url",
            "image_url": {"url": url}
        })

    try:
        completion = groq_client.chat.completions.create(
            model=MODEL_ID,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message_content}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        print(f"Error calling Groq: {e}")
        return None

def process_posts():
    posts = fetch_pending_posts()
    print(f"Found {len(posts)} pending posts.")

    for post in posts:
        post_id = post['id']
        content = post['content'] or ""
        current_type = post['type']
        
        # Lấy TẤT CẢ ảnh
        image_urls = get_post_images(post_id)
        
        print(f"\n--- Processing Post {post_id} ---")
        
        # BƯỚC 1: Dùng LLM Phân loại trước
        result = analyze_post_with_llm(content, image_urls, current_type)
        
        if result:
            print(f"LLM Result: {result}")

            ai_status = "ACTIVE"
            ai_type = result.get("classification", current_type) # Ưu tiên kết quả AI
            ai_location = result.get("location", post['location'])
            
            # Logic Reject
            if ai_type == "TRASH":
                ai_status = "REJECTED"
            
            img_analysis = result.get("image_analysis", {})
            trash_urls = img_analysis.get("trash_image_urls", [])

            # Nếu tất cả ảnh là rác + nội dung ngắn -> Reject
            if len(image_urls) > 0 and img_analysis.get("is_background_or_text_only") and len(content) < 20:
                ai_status = "REJECTED"

            # Chuẩn bị dữ liệu update cho bảng posts
            update_data = {
                "status": ai_status,
                "type": ai_type,
                "location": ai_location,
            }

            # Xử lý lọc ảnh rác (xóa khỏi DB)
            if trash_urls:
                for t_url in trash_urls:
                    try:
                        supabase.table("post_images").delete()\
                            .eq("post_id", post_id)\
                            .eq("url", t_url).execute()
                        # Xóa khỏi list image_urls để không embed ảnh rác
                        if t_url in image_urls:
                            image_urls.remove(t_url)
                    except Exception as e:
                        print(f"Error deleting trash image: {e}")
                print(f"Deleted {len(trash_urls)} trash images.")

            # BƯỚC 2: Nếu ACTIVE thì mới chạy Embedding (CLIP)
            if ai_status == "ACTIVE":
                print(">> Post is ACTIVE. Starting Embedding process...")
                
                # 2.1. Embed Content (Text)
                if content and len(content.strip()) > 0:
                    try:
                        text_embedding = clip_embedder.get_embedding(content, input_type='text')
                        if text_embedding:
                            update_data["content_embedding"] = text_embedding
                            print("Generated Text Embedding.")
                    except Exception as e:
                        print(f"Error embedding text: {e}")

                # 2.2. Embed Images (Các ảnh còn lại sau khi lọc rác)
                if image_urls:
                    print(f"Embedding {len(image_urls)} images...")
                    for url in image_urls:
                        try:
                            img_embedding = clip_embedder.get_embedding(url, input_type='image')
                            if img_embedding:
                                # Update vector cho từng ảnh trong bảng post_images
                                supabase.table("post_images").update({
                                    "embedding": img_embedding
                                }).eq("post_id", post_id).eq("url", url).execute()
                                print(f"-> Embedded Image: {url[:30]}...")
                        except Exception as e:
                            print(f"Failed to embed image {url}: {e}")
            else:
                print(">> Post REJECTED. Skipping Embedding.")

            # BƯỚC 3: Update thông tin cuối cùng vào bảng POSTS
            try:
                supabase.table("posts").update(update_data).eq("id", post_id).execute()
                print(f"Updated Post {post_id} -> Status: {ai_status}")
            except Exception as e:
                print(f"Error updating post to DB: {e}")
            
        else:
            print("AI failed to analyze.")

        # Nghỉ nhẹ tránh spam API
        time.sleep(2)

if __name__ == "__main__":
    process_posts()