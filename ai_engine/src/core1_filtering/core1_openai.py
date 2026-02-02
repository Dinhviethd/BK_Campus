import os
import json
import requests
import google.generativeai as genai
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Optional

# 1. Cấu hình
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GOOGLE_API_KEY)

# Sử dụng model Flash cho tốc độ nhanh và miễn phí
model = genai.GenerativeModel('gemini-2.5-flash')

# GROQ_API_KEY = os.getenv("GROQ_API_KEY") # Nhớ cập nhật trong file .env
# supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# client = Groq(api_key=GROQ_API_KEY)
# # Có thể dùng 'llama-3.2-90b-vision-preview' nếu cần độ chính xác cao hơn
# MODEL_ID = 'llama-3.2-90b-vision-preview'

def get_image_bytes(url: str) -> Optional[bytes]:
    """Tải ảnh từ URL để gửi lên Gemini"""
    if not url: return None
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return response.content
    except Exception as e:
        print(f"Error downloading image: {e}")
    return None

def analyze_post(content: str, image_data: bytes = None):
    """
    Gửi content và ảnh lên LLM để phân tích.
    """
    
    # Prompt System chi tiết để lọc rác và check ảnh
    prompt = """
    Bạn là một AI kiểm duyệt cho hệ thống "Tìm đồ thất lạc". Nhiệm vụ của bạn là phân tích bài đăng từ Facebook.
    
    INPUT:
    - Nội dung văn bản (Content)
    - Hình ảnh đính kèm (nếu có)

    YÊU CẦU LOGIC:
    1. **Phân loại (Type)**: Xác định xem bài viết là "LOST" (người tìm đồ bị mất) hay "FOUND" (người nhặt được đồ tìm chủ) hay "TRASH" (quảng cáo, bán hàng, tâm sự, spam, không liên quan).
    2. **Kiểm tra ảnh (Image Check)**: 
       - Nếu ảnh là **ảnh nền Facebook** (chỉ có text trên nền màu/hoa văn), hoặc ảnh meme, ảnh selfie không liên quan đến đồ vật -> Đánh dấu là KHÔNG HỢP LỆ.
       - Nếu ảnh chụp đồ vật, giấy tờ, hiện trường -> Đánh dấu là HỢP LỆ.
       - Nếu không có ảnh -> Bỏ qua kiểm tra ảnh.
    3. **Trích xuất địa điểm (Location)**: Tìm địa chỉ, khu vực mất/nhặt được đồ trong bài viết. Nếu không có, trả về null.

    OUTPUT FORMAT (JSON Only):
    {
        "type": "LOST" | "FOUND" | "TRASH",
        "location": "string" | null,
        "is_image_valid": boolean, // False nếu là ảnh nền/spam/không liên quan
        "reason": "string" // Giải thích ngắn gọn tại sao
    }
    """

    inputs = [prompt, f"Post Content: {content}"]
    if image_data:
        inputs.append({"mime_type": "image/jpeg", "data": image_data})
    
    try:
        response = model.generate_content(inputs, generation_config={"response_mime_type": "application/json"})
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini Error: {e}")
        return None

def process_pipeline():
    print("--- Bắt đầu quét các bài viết PROCESSING ---")
    
    # [cite_start]1. Lấy bài viết cần xử lý [cite: 21, 39]
    response = supabase.table('posts').select('*').eq('status', 'PROCESSING').limit(10).execute()
    posts = response.data

    if not posts:
        print("Không có bài viết mới.")
        return

    for post in posts:
        post_id = post['id']
        content = post.get('content', '') or ''
        
        # Lấy URL ảnh từ bảng post_images (Giả sử logic lấy 1 ảnh đại diện để check)
        # Trong thực tế bạn cần join bảng, ở đây giả code logic đơn giản
        img_res = supabase.table('post_images').select('url').eq('post_id', post_id).limit(1).execute()
        image_url = img_res.data[0]['url'] if img_res.data else None
        
        print(f"Processing Post ID: {post_id}...")

        # 2. Chuẩn bị dữ liệu ảnh
        image_bytes = get_image_bytes(image_url) if image_url else None
        
        # 3. Gọi LLM
        result = analyze_post(content, image_bytes)
        
        if result:
            new_status = 'REJECTED'
            new_type = post.get('type') # Giữ nguyên hoặc update
            location = result.get('location')
            
            # 4. Logic Quyết định [Theo yêu cầu của bạn]
            # Nếu là TRASH -> REJECT
            if result['type'] == 'TRASH':
                new_status = 'REJECTED'
                print(f"-> REJECTED: Content is TRASH. Reason: {result['reason']}")
            
            # Nếu có ảnh mà ảnh không hợp lệ (ảnh nền, ko liên quan) -> REJECT
            elif image_url and not result['is_image_valid']:
                new_status = 'REJECTED'
                print(f"-> REJECTED: Image invalid (Background/Irrelevant). Reason: {result['reason']}")
            
            # Nếu Type do LLM detect khác hoàn toàn logic ban đầu -> Update lại Type
            # Và Status -> ACTIVE
            else:
                new_status = 'ACTIVE'
                new_type = result['type'] # Cập nhật type chuẩn xác từ LLM (LOST/FOUND)
                print(f"-> ACTIVE: {new_type} tại {location}")

            # [cite_start]5. Update Database [cite: 20, 21, 37]
            update_data = {
                "status": new_status,
                "type": new_type,
                "location": location,
                # [cite_start]"updated_at": "now()" -- Trigger trong DB đã tự xử lý [cite: 37]
            }
            
            supabase.table('posts').update(update_data).eq('id', post_id).execute()
        else:
            print("-> Lỗi khi gọi AI, bỏ qua.")

if __name__ == "__main__":
    process_pipeline()