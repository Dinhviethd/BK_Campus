import os
import json
import time
from dotenv import load_dotenv
from supabase import create_client, Client
from groq import Groq

# 1. Cấu hình Environment
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# 2. Khởi tạo Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
groq_client = Groq(api_key=GROQ_API_KEY)

# Model Vision trên Groq
MODEL_ID = "meta-llama/llama-4-scout-17b-16e-instruct" 

def fetch_pending_posts():
    """Lấy các bài viết đang ở trạng thái PROCESSING"""
    # Join với bảng post_images để lấy ảnh (giả sử lấy 1 ảnh đại diện đầu tiên)
    # Lưu ý: Cần điều chỉnh query tùy thuộc vào cách bạn lưu ảnh. 
    # Ở đây mình query bảng posts và lấy ảnh liên quan thủ công cho dễ hiểu.
    response = supabase.table("posts")\
        .select("id, content, type, location")\
        .eq("status", "PROCESSING")\
        .limit(10)\
        .execute()
    return response.data

def get_post_images(post_id):
    """Lấy danh sách tất cả URL ảnh của bài post"""
    response = supabase.table("post_images")\
        .select("url")\
        .eq("post_id", post_id)\
        .execute()
    # Trả về list các url: ["url1", "url2", ...]
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

    # Nội dung văn bản
    user_message_content = [
        {"type": "text", "text": f"Post Content: '{content}'\nUser claimed Type: '{current_type}'"}
    ]

    # Thêm toàn bộ danh sách ảnh vào payload
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
        
        print(f"Processing Post {post_id} with {len(image_urls)} images...")
        
        result = analyze_post_with_llm(content, image_urls, current_type)
        
        if result:
            print(f"AI Result: {result}")

            ai_status = "ACTIVE"
            ai_type = result.get("classification", current_type)
            ai_location = result.get("location", post['location'])
            
            if ai_type == "TRASH":
                ai_status = "REJECTED"
            
            img_analysis = result.get("image_analysis", {})
            trash_urls = img_analysis.get("trash_image_urls", [])

            # Xử lý lọc ảnh rác
            if trash_urls:
                for t_url in trash_urls:
                    supabase.table("post_images").delete()\
                        .eq("post_id", post_id)\
                        .eq("url", t_url).execute()
                print(f"Deleted {len(trash_urls)} trash images for post {post_id}")

            # Nếu tất cả ảnh đều là rác và nội dung quá ngắn -> Reject bài
            if len(image_urls) > 0 and img_analysis.get("is_background_or_text_only") and len(content) < 20:
                ai_status = "REJECTED"

            # Cập nhật thông tin bài viết
            update_data = {
                "status": ai_status,
                "type": ai_type,
                "location": ai_location,
            }
            supabase.table("posts").update(update_data).eq("id", post_id).execute()
            print(f"Updated Post {post_id} -> Status: {ai_status}")
            
        else:
            print("AI failed to analyze.")

        time.sleep(2)

if __name__ == "__main__":
    process_posts()