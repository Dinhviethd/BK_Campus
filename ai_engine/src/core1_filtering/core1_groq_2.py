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

def get_post_image(post_id):
    """Lấy URL ảnh đầu tiên của bài post"""
    response = supabase.table("post_images")\
        .select("url")\
        .eq("post_id", post_id)\
        .limit(1)\
        .execute()
    if response.data:
        return response.data[0]['url']
    return None

def analyze_post_with_llm(content, image_url, current_type):
    """Gọi Groq API để phân tích"""
    
    system_prompt = """
    You are an AI Moderator for a Lost & Found system ("Tìm đồ thất lạc").
    Your task is to analyze the user's post content and image (if provided).
    
    RULES:
    1. CLASSIFY the post into: 'LOST' (Người tìm đồ mất), 'FOUND' (Người nhặt được đồ tìm chủ), or 'TRASH' (Spam, advertising, unrelated content).
    2. EXTRACT location: Identify the specific location mentioned in the text (e.g., "KTX Bách Khoa", "Đường Nguyễn Lương Bằng"). If none, return null.
    3. IMAGE ANALYSIS: 
       - Check if the image is a generic background (solid color, decorative patterns), a meme, or purely text (screenshot of text) without a real object. Mark "is_background_or_text_only": true.
       - Check if the image shows a real object relevant to the text.
       - If the text mentions an object but the image is completely unrelated, mark "is_relevant": false.
    
    OUTPUT FORMAT: JSON only.
    """

    user_message_content = [
        {"type": "text", "text": f"Post Content: '{content}'\nUser claimed Type: '{current_type}'"}
    ]

    # Nếu có ảnh thì thêm vào payload
    if image_url:
        user_message_content.append({
            "type": "image_url",
            "image_url": {"url": image_url}
        })

    try:
        completion = groq_client.chat.completions.create(
            model=MODEL_ID,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message_content}
            ],
            temperature=0.1, # Nhiệt độ thấp để kết quả nhất quán
            max_tokens=512,
            top_p=1,
            stream=False,
            response_format={"type": "json_object"} # Bắt buộc trả về JSON
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
        
        # Lấy ảnh
        image_url = get_post_image(post_id)
        
        print(f"Processing Post {post_id}...")
        
        # Gọi AI
        result = analyze_post_with_llm(content, image_url, current_type)
        
        if result:
            print(f"AI Result: {result}")
            
            ai_status = "ACTIVE"
            ai_type = result.get("classification", current_type)
            ai_location = result.get("location", post['location'])
            
            # Logic xử lý nghiệp vụ
            # 1. Nếu là TRASH -> REJECT
            if ai_type == "TRASH":
                ai_status = "REJECTED"
            
            # 2. Xử lý ảnh
            img_analysis = result.get("image_analysis", {})
            
            # Nếu ảnh không liên quan hoặc là ảnh nền -> Xóa ảnh (hoặc đánh dấu)
            # Ở đây mình set status REJECTED cho bài viết nếu text sơ sài mà ảnh lại là rác
            if image_url and (img_analysis.get("is_background_or_text_only") or not img_analysis.get("is_relevant")):
                # Tùy logic: 
                # Option A: Reject cả bài nếu ảnh rác và nội dung ngắn
                if len(content) < 20: 
                    ai_status = "REJECTED"
                # Option B: Vẫn giữ bài nhưng xóa link ảnh trong DB (để không hiển thị ảnh rác)
                else:
                    supabase.table("post_images").delete().eq("post_id", post_id).execute()
                    print(f"Deleted trash image for post {post_id}")

            # 3. Update lại Posts
            update_data = {
                "status": ai_status,
                "type": ai_type,
                "location": ai_location,
                # "updated_at": "now()" # Trigger trong DB sẽ tự lo
            }
            
            supabase.table("posts").update(update_data).eq("id", post_id).execute()
            print(f"Updated Post {post_id} -> Status: {ai_status}")
            
        else:
            print("AI failed to analyze.")
        
        # Tránh rate limit của Groq (nếu dùng free tier)
        time.sleep(2) 

if __name__ == "__main__":
    process_posts()