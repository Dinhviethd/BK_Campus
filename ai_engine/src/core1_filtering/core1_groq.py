import os
import json
import time
from groq import Groq, RateLimitError
from supabase import create_client, Client
from dotenv import load_dotenv

# 1. Cấu hình
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = Groq(api_key=GROQ_API_KEY)

# CHỌN MODEL TỐC ĐỘ CAO & LIMIT CAO NHẤT
MODEL_ID = 'groq/compound'

def analyze_post_text(content: str, max_retries=3):
    """
    Phân tích bài viết (Chỉ Text) để tối ưu tốc độ và tránh lỗi model không hỗ trợ ảnh.
    """
    
    system_prompt = """
    Bạn là AI kiểm duyệt cho hệ thống "Tìm đồ thất lạc" (Lost & Found).
    
    INPUT: Nội dung bài đăng (Post Content).
    
    NHIỆM VỤ:
    1. Phân loại (type): 
       - "LOST": Người dùng bị mất đồ, đang tìm kiếm.
       - "FOUND": Người dùng nhặt được đồ, đang tìm chủ nhân.
       - "TRASH": Quảng cáo, tuyển dụng, cho vay, spam, tâm sự không liên quan.
    2. Trích xuất địa điểm (location): Tìm địa chỉ cụ thể hoặc khu vực trong bài. Nếu không có trả về null.
    
    OUTPUT JSON FORMAT (Bắt buộc):
    {
        "type": "LOST" | "FOUND" | "TRASH",
        "location": "string" | null,
        "reason": "Giải thích ngắn gọn"
    }
    """

    user_content = f"Post Content: {content}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content}
    ]

    for attempt in range(max_retries):
        try:
            completion = client.chat.completions.create(
                model=MODEL_ID,
                messages=messages,
                temperature=0, # Giữ 0 để kết quả ổn định
                response_format={"type": "json_object"}
            )
            return json.loads(completion.choices[0].message.content)
            
        except RateLimitError:
            # Nếu vẫn bị limit, chờ tăng dần (backoff)
            wait_time = (attempt + 1) * 2 
            print(f"⚠️ Rate Limit (429). Đang chờ {wait_time}s...")
            time.sleep(wait_time)
            
        except Exception as e:
            print(f"❌ Groq API Error: {e}")
            return None
            
    return None

def process_pipeline():
    print(f"--- Bắt đầu quét với Model: {MODEL_ID} ---")
    
    # 1. Lấy bài viết cần xử lý
    # Model 8b chạy rất nhanh, có thể tăng limit lên 20 bài/lần
    response = supabase.table('posts').select('*').eq('status', 'PROCESSING').limit(20).execute()
    posts = response.data

    if not posts:
        print("Không có bài viết mới.")
        return

    for post in posts:
        post_id = post['id']
        content = post.get('content', '') or ''
        
        print(f"Processing Post ID: {post_id}...")
        
        # 2. Gọi AI (Text Only)
        result = analyze_post_text(content)
        
        if result:
            new_status = 'REJECTED'
            new_type = post.get('type')
            location = result.get('location')
            
            # 3. Logic Quyết định
            if result['type'] == 'TRASH':
                new_status = 'REJECTED'
                print(f"-> REJECTED: TRASH. Reason: {result['reason']}")
            else:
                new_status = 'ACTIVE'
                new_type = result['type']
                print(f"-> ACTIVE: {new_type} tại {location}")

            # 4. Update Database
            update_data = {
                "status": new_status,
                "type": new_type,
                "location": location,
            }
            supabase.table('posts').update(update_data).eq('id', post_id).execute()
        else:
            print("-> Bỏ qua do lỗi AI.")

if __name__ == "__main__":
    process_pipeline()