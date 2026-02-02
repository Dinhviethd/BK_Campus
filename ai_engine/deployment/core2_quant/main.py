import os
import json
import time
from typing import List, Optional
from fastapi import FastAPI, BackgroundTasks, HTTPException, Header
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
from groq import Groq

# --- IMPORT MODULE EMBEDDING ---
try:
    from origin_clip import ClipEmbedder
except ImportError:
    print("WARNING: Không tìm thấy file origin_clip.py.")
    ClipEmbedder = None 

# 1. Cấu hình Environment & Khởi tạo App
load_dotenv()
app = FastAPI()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
API_SECRET = os.getenv("API_SECRET") 

# 2. Khởi tạo Client (Global)
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Thiếu cấu hình SUPABASE_URL hoặc SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
groq_client = Groq(api_key=GROQ_API_KEY)

# 3. Khởi tạo Model CLIP (ONNX)
print("--- KHỞI TẠO HỆ THỐNG AI (ONNX POWERED) ---")
clip_embedder = None
if ClipEmbedder:
    try:
        # Code mới sẽ tự tìm folder 'onnx_clip_quantized' trong origin_clip.py
        clip_embedder = ClipEmbedder()
        print("-> CLIP Model loaded successfully.")
    except Exception as e:
        print(f"Error loading ClipEmbedder: {e}")
else:
    print("Error: Class ClipEmbedder not found.")

MODEL_ID = "meta-llama/llama-4-scout-17b-16e-instruct" 

# --- CÁC HÀM XỬ LÝ LOGIC (GIỮ NGUYÊN LOGIC CŨ) ---

def fetch_pending_posts():
    # [cite_start]"""Lấy các bài viết đang ở trạng thái PROCESSING [cite: 8]"""
    response = supabase.table("posts")\
        .select("id, content, type, location")\
        .eq("status", "PROCESSING")\
        .limit(10)\
        .execute()
    return response.data

def get_post_images(post_id):
    # [cite_start]"""Lấy danh sách URL ảnh [cite: 9]"""
    response = supabase.table("post_images")\
        .select("url")\
        .eq("post_id", post_id)\
        .execute()
    return [item['url'] for item in response.data] if response.data else []

def analyze_post_with_llm(content, image_urls, current_type):
    """Logic gọi Groq API phân tích"""
    system_prompt = """
    You are an AI Moderator for a Lost & Found system.
    Your task is to analyze the user's post content and multiple images.
    RULES:
    1. CLASSIFY: 'LOST', 'FOUND', or 'TRASH'.
    2. EXTRACT location.
    3. IMAGE ANALYSIS: Check if images are relevant or trash/spam.
    OUTPUT FORMAT: JSON only.
    """
    
    user_message_content = [
        {"type": "text", "text": f"Post Content: '{content}'\nUser claimed Type: '{current_type}'"}
    ]
    for url in image_urls:
        user_message_content.append({"type": "image_url", "image_url": {"url": url}})

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

def process_logic_task():
    # [cite_start]"""Hàm chạy ngầm xử lý toàn bộ logic [cite: 8, 26]"""
    if not clip_embedder:
        print("Model CLIP chưa sẵn sàng. Bỏ qua task vector hóa.")
        # Vẫn cho chạy task phân loại nếu CLIP fail, nhưng bỏ qua bước embedding
        # Tuy nhiên để an toàn, return luôn nếu đây là core function
        return

    print("--- Bắt đầu Task xử lý ---")
    posts = fetch_pending_posts()
    print(f"Tìm thấy {len(posts)} bài viết pending.")

    for post in posts:
        try:
            post_id = post['id']
            content = post['content'] or ""
            current_type = post['type']
            
            image_urls = get_post_images(post_id)
            print(f"\nProcessing Post {post_id}...")
            
            # BƯỚC 1: LLM Phân loại
            result = analyze_post_with_llm(content, image_urls, current_type)
            
            if result:
                ai_type = result.get("classification", current_type)
                ai_location = result.get("location", post['location'])
                
                ai_status = "ACTIVE"
                if ai_type == "TRASH":
                    ai_status = "REJECTED"
                
                img_analysis = result.get("image_analysis", {})
                trash_urls = img_analysis.get("trash_image_urls", [])

                if len(image_urls) > 0 and img_analysis.get("is_background_or_text_only") and len(content) < 20:
                    ai_status = "REJECTED"

                update_data = {
                    "status": ai_status,
                    "type": ai_type,
                    "location": ai_location,
                }

                # Xóa ảnh rác
                if trash_urls:
                    for t_url in trash_urls:
                        supabase.table("post_images").delete()\
                            .eq("post_id", post_id).eq("url", t_url).execute()
                        if t_url in image_urls:
                            image_urls.remove(t_url)

                # BƯỚC 2: Embedding (Nếu ACTIVE) - Dùng ONNX Embedder mới
                if ai_status == "ACTIVE":
                    # [cite_start]# [cite: 39] Vector size 512
                    if content and len(content.strip()) > 0:
                        text_embedding = clip_embedder.get_embedding(content, input_type='text')
                        if text_embedding:
                            update_data["content_embedding"] = text_embedding

                    # [cite_start]# [cite: 40] Image embedding
                    if image_urls:
                        for url in image_urls:
                            img_embedding = clip_embedder.get_embedding(url, input_type='image')
                            if img_embedding:
                                supabase.table("post_images").update({
                                    "embedding": img_embedding
                                }).eq("post_id", post_id).eq("url", url).execute()

                # BƯỚC 3: Update Post
                supabase.table("posts").update(update_data).eq("id", post_id).execute()
                print(f"Updated Post {post_id} -> {ai_status}")
            
            else:
                print("AI failed to analyze.")
            
            time.sleep(1) 

        except Exception as e:
            print(f"Lỗi khi xử lý post {post.get('id')}: {e}")

# --- API ENDPOINT CHO WEBHOOK ---

class WebhookPayload(BaseModel):
    type: str 
    table: str
    record: dict
    schema_name: str = "public"
    old_record: Optional[dict] = None

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Core12 Fusion AI Service (ONNX Optimized) is running"}

@app.post("/webhook/process-posts")
async def trigger_process(
    background_tasks: BackgroundTasks, 
    x_api_secret: Optional[str] = Header(None)
):
    if API_SECRET and x_api_secret != API_SECRET:
         raise HTTPException(status_code=401, detail="Invalid API Secret")

    background_tasks.add_task(process_logic_task)
    return {"message": "Processing started in background"}