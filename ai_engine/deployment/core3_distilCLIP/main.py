import os
import time
import numpy as np
import requests
from io import BytesIO
from PIL import Image
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

# FastAPI & Pydantic
from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel
import uvicorn

# ONNX & Transformers
import onnxruntime as ort
from transformers import CLIPProcessor
from deep_translator import GoogleTranslator

# Supabase & Env
from dotenv import load_dotenv
from supabase import create_client, Client

# --- CONFIG ---
load_dotenv()
TEXT_MODEL_PATH = "text_encoder_quant.onnx"
VISION_MODEL_PATH = "vision_encoder_quant.onnx"
BASE_MODEL_NAME = "openai/clip-vit-base-patch32"

# --- GLOBAL VARIABLES ---
supabase: Client = None
embedder: "DistilClipEmbedder" = None

# --- CLASS: EMBEDDER (Giữ nguyên logic cũ) ---
class DistilClipEmbedder:
    def __init__(self):
        print("🚀 Đang khởi tạo DistilCLIP (ONNX Quantized)...")
        
        if not os.path.exists(TEXT_MODEL_PATH):
            raise FileNotFoundError("❌ Chưa thấy file ONNX. Hãy chạy quantize_safety.py trước!")

        self.processor = CLIPProcessor.from_pretrained(BASE_MODEL_NAME)
        self.translator = GoogleTranslator(source='vi', target='en')

        # Tắt log warning
        sess_options = ort.SessionOptions()
        sess_options.log_severity_level = 3 
        
        # Load Sessions
        try:
            self.text_session = ort.InferenceSession(TEXT_MODEL_PATH, sess_options, providers=['CPUExecutionProvider'])
            self.vision_session = ort.InferenceSession(VISION_MODEL_PATH, sess_options, providers=['CPUExecutionProvider'])
            print("✅ Model loaded successfully on CPU!")
        except Exception as e:
            print(f"❌ Lỗi load model ONNX: {e}")
            raise e

    def translate_text(self, text):
        if not text: return ""
        try:
            translated = self.translator.translate(text)
            return translated
        except Exception as e:
            print(f"⚠️ Lỗi dịch thuật: {e}")
            return text

    def get_image_from_url(self, url):
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return Image.open(BytesIO(response.content))
        except Exception as e:
            print(f"⚠️ Không thể tải ảnh ({url}): {e}")
            return None

    def _normalize(self, vector):
        norm = np.linalg.norm(vector, ord=2, axis=-1, keepdims=True)
        return vector / (norm + 1e-12)

    def get_embedding(self, input_data, input_type='text'):
        try:
            if input_type == 'text':
                english_text = self.translate_text(input_data)
                if not english_text: return None

                inputs = self.processor(text=[english_text], return_tensors="np", padding="max_length", max_length=77, truncation=True)
                onnx_inputs = {
                    'input_ids': inputs['input_ids'].astype(np.int64),
                    'attention_mask': inputs['attention_mask'].astype(np.int64)
                }
                outputs = self.text_session.run(None, onnx_inputs)
                embedding = outputs[0]

            elif input_type == 'image':
                image = self.get_image_from_url(input_data)
                if image is None: return None
                
                inputs = self.processor(images=image, return_tensors="np")
                onnx_inputs = {
                    'pixel_values': inputs['pixel_values'].astype(np.float32)
                }
                outputs = self.vision_session.run(None, onnx_inputs)
                embedding = outputs[0]
            else:
                return None

            embedding = self._normalize(embedding)
            return embedding[0].tolist()
        except Exception as e:
            print(f"❌ Lỗi khi embedding ({input_type}): {e}")
            return None

# --- LOGIC XỬ LÝ (Refactored for Task) ---

def process_post_task(post_id: str):
    """
    Hàm này chạy trong background. 
    Nó sẽ query lại DB để lấy full data (bao gồm ảnh) của post_id.
    """
    print(f"\n⚡ [Background] Bắt đầu xử lý Post ID: {post_id}")
    
    # 1. Fetch dữ liệu đầy đủ từ Supabase (Join bảng post_images)
    try:
        # Chờ nhẹ 2s để đảm bảo transaction insert ảnh (nếu có) đã hoàn tất ở phía client
        time.sleep(5) 
        
        response = supabase.table("posts") \
            .select("id, content, status, post_images(id, url)") \
            .eq("id", post_id) \
            .single() \
            .execute()
        
        post = response.data
        if not post:
            print(f"⚠️ Không tìm thấy bài viết {post_id} trong DB.")
            return

    except Exception as e:
        print(f"❌ Lỗi khi fetch data cho {post_id}: {e}")
        return

    # 2. Extract Data
    content = post.get('content', '')
    images = post.get('post_images', [])
    status = post.get('status')

    # Chỉ xử lý nếu status là PROCESSING hoặc ACTIVE
    if status not in ["PROCESSING", "ACTIVE"]:
        print(f"⏩ Post {post_id} có status '{status}'. Bỏ qua.")
        return

    # 3. Tính toán Vector
    text_vector = None
    image_vectors_map = {}

    # A. Text
    if content:
        print(f"   ↳ Embedding text...")
        text_vector = embedder.get_embedding(content, input_type='text')

    # B. Images
    if images:
        print(f"   ↳ Embedding {len(images)} ảnh...")
        for img in images:
            vec = embedder.get_embedding(img['url'], input_type='image')
            if vec:
                image_vectors_map[img['id']] = vec

    # 4. Check Race Condition & Update
    try:
        # Check lại status lần cuối
        check_res = supabase.table("posts").select("status").eq("id", post_id).single().execute()
        current_status = check_res.data['status']

        if current_status == 'REJECTED':
            print(f"   ⛔ TỪ CHỐI LƯU. Post đã bị đổi sang REJECTED.")
            return

        print(f"   💾 Đang lưu vào DB...")
        
        # Update Text Vector
        if text_vector:
            supabase.table("posts").update({
                "content_embedding": text_vector
            }).eq("id", post_id).execute()

        # Update Image Vectors
        for img_id, vec in image_vectors_map.items():
            supabase.table("post_images").update({
                "embedding": vec
            }).eq("id", img_id).execute()
            
        print(f"✅ Hoàn tất Post {post_id}!")

    except Exception as e:
        print(f"❌ Lỗi khi update DB: {e}")

# --- FASTAPI APP ---

# Pydantic Model cho Webhook Payload của Supabase
class WebhookRecord(BaseModel):
    id: str
    content: Optional[str] = None
    status: Optional[str] = None

class WebhookPayload(BaseModel):
    type: str
    table: str
    record: WebhookRecord
    schema_: str = "public" # 'schema' là từ khóa python nên dùng alias hoặc tên khác nếu cần parse strict

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    global supabase, embedder
    
    # 1. Init Supabase
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        print("❌ CRITICAL: Thiếu SUPABASE_URL hoặc SUPABASE_KEY")
    else:
        supabase = create_client(url, key)
        print("✅ Supabase Connected")

    # 2. Init Embedder (Load ONNX Models)
    try:
        embedder = DistilClipEmbedder()
    except Exception as e:
        print(f"❌ Failed to load models: {e}")
    
    yield
    # --- SHUTDOWN ---
    print("🛑 Shutting down...")

app = FastAPI(lifespan=lifespan)

@app.get("/")
def health_check():
    return {"status": "ok", "service": "Supabase Vectorizer Worker"}

@app.post("/webhook/process-post")
async def receive_webhook(payload: WebhookPayload, background_tasks: BackgroundTasks):
    """
    Webhook Endpoint được gọi bởi Supabase Database Webhook
    Trigger: INSERT ON public.posts
    """
    # Chỉ xử lý sự kiện INSERT
    if payload.type != "INSERT":
        return {"message": "Ignored", "reason": "Not an INSERT event"}

    post_id = payload.record.id
    print(f"🔔 Webhook received for Post ID: {post_id}")

    # Thêm vào hàng đợi xử lý ngầm (để tránh timeout webhook)
    background_tasks.add_task(process_post_task, post_id)

    return {"message": "Queued", "post_id": post_id}

# Endpoint để chạy thủ công (quét lại các bài cũ chưa có vector)
@app.post("/trigger-scan-all")
async def trigger_scan_all(background_tasks: BackgroundTasks):
    def scan_job():
        print("🕵️  Manual Scan triggered...")
        response = supabase.table("posts") \
            .select("id") \
            .in_("status", ["PROCESSING", "ACTIVE"]) \
            .is_("content_embedding", "null") \
            .execute()
        
        posts = response.data
        print(f"🔥 Found {len(posts)} pending posts.")
        for post in posts:
            process_post_task(post['id'])
            
    background_tasks.add_task(scan_job)
    return {"message": "Full scan started in background"}

# if __name__ == "__main__":
#     # Cấu hình cho Hugging Face Spaces (Port 7860)
#     uvicorn.run(app, host="0.0.0.0", port=7860)