import os
import json
import time
import asyncio
import numpy as np
import requests
from io import BytesIO
from typing import Optional, List, Dict
from contextlib import asynccontextmanager

# FastAPI
from fastapi import FastAPI, BackgroundTasks, HTTPException, Header
from pydantic import BaseModel
import uvicorn

# AI & DB Libs
from dotenv import load_dotenv
from supabase import create_client, Client
from groq import Groq
from PIL import Image

# ONNX & Transformers
import onnxruntime as ort
from transformers import CLIPProcessor
from deep_translator import GoogleTranslator

# --- 1. CONFIGURATION ---
load_dotenv()

# Supabase & Groq keys
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
API_SECRET = os.getenv("API_SECRET")

# AI Config
GROQ_MODEL_ID = "meta-llama/llama-3.2-11b-vision-preview" # Hoặc model vision 3.2 mới nhất hỗ trợ json tốt
TEXT_MODEL_PATH = "onnx_quantized/text_encoder_quant.onnx"
VISION_MODEL_PATH = "onnx_quantized/vision_encoder_quant.onnx"
BASE_CLIP_NAME = "openai/clip-vit-base-patch32"

# Global Clients
supabase: Client = None
groq_client: Groq = None
embedder: "DistilClipEmbedder" = None

# --- 2. CLASS: EMBEDDER (Vector Engine) ---
class DistilClipEmbedder:
    def __init__(self):
        print("🚀 [Init] Loading DistilCLIP Models...")
        if not os.path.exists(TEXT_MODEL_PATH):
            raise FileNotFoundError("❌ ONNX models not found!")

        self.processor = CLIPProcessor.from_pretrained(BASE_CLIP_NAME)
        self.translator = GoogleTranslator(source='vi', target='en')
        
        sess_opts = ort.SessionOptions()
        sess_opts.log_severity_level = 3
        
        self.text_session = ort.InferenceSession(TEXT_MODEL_PATH, sess_opts, providers=['CPUExecutionProvider'])
        self.vision_session = ort.InferenceSession(VISION_MODEL_PATH, sess_opts, providers=['CPUExecutionProvider'])
        print("✅ [Init] Models loaded successfully!")

    def translate_text(self, text):
        if not text: return ""
        try:
            return self.translator.translate(text)
        except:
            return text

    def get_image_from_url(self, url):
        try:
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            return Image.open(BytesIO(resp.content))
        except:
            return None

    def _normalize(self, vector):
        norm = np.linalg.norm(vector, ord=2, axis=-1, keepdims=True)
        return vector / (norm + 1e-12)

    def get_embedding(self, input_data, input_type='text'):
        try:
            if input_type == 'text':
                eng_text = self.translate_text(input_data)
                if not eng_text: return None
                inputs = self.processor(text=[eng_text], return_tensors="np", padding="max_length", max_length=77, truncation=True)
                onnx_inputs = {'input_ids': inputs['input_ids'].astype(np.int64), 'attention_mask': inputs['attention_mask'].astype(np.int64)}
                outputs = self.text_session.run(None, onnx_inputs)
                
            elif input_type == 'image':
                # Nếu input_data là URL string
                if isinstance(input_data, str):
                    image = self.get_image_from_url(input_data)
                else: 
                    image = input_data # Nếu đã là object PIL Image
                
                if image is None: return None
                inputs = self.processor(images=image, return_tensors="np")
                onnx_inputs = {'pixel_values': inputs['pixel_values'].astype(np.float32)}
                outputs = self.vision_session.run(None, onnx_inputs)
            
            vec = self._normalize(outputs[0])
            return vec[0].tolist()
        except Exception as e:
            print(f"❌ Embed Error ({input_type}): {e}")
            return None

# --- 3. CORE LOGIC PIPELINE ---

def analyze_post_with_llm(content, image_urls, current_type):
    """Bước 1: Dùng LLM để lọc rác và phân loại"""
    system_prompt = """
    You are an AI Moderator for a Lost & Found system.
    1. CLASSIFY post into: 'LOST', 'FOUND', or 'TRASH' (spam/irrelevant).
    2. EXTRACT location (specific string or null).
    3. CHECK IMAGES:
       - "trash_image_indices": List of indices (0-based) of images that are irrelevant/spam.
    OUTPUT JSON ONLY.
    """
    
    user_msg = [{"type": "text", "text": f"Content: '{content}'\nUser Type: '{current_type}'"}]
    for url in image_urls:
        user_msg.append({"type": "image_url", "image_url": {"url": url}})

    try:
        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL_ID,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        print(f"⚠️ Groq Error: {e}")
        return None

async def pipeline_task(post_id: str):
    """
    MASTER PIPELINE:
    1. Wait 5s (Images upload)
    2. Fetch Data
    3. AI Filter (Groq) -> Update DB Status
    4. If Valid -> Vectorize (CLIP) -> Update DB Embeddings
    """
    print(f"\n⏳ [Pipeline] Bắt đầu xử lý Post ID: {post_id}")
    
    # --- PHASE 0: WAIT ---
    await asyncio.sleep(5) # Đợi client upload ảnh xong
    
    # --- PHASE 1: FETCH DATA ---
    try:
        # Lấy post và join ảnh
        resp = supabase.table("posts")\
            .select("id, content, type, status, location, post_images(id, url)")\
            .eq("id", post_id).single().execute()
        post = resp.data
        if not post: return
    except Exception as e:
        print(f"❌ Error fetch: {e}")
        return

    content = post.get('content', '')
    images = post.get('post_images', []) # List of dict: [{'id':..., 'url':...}]
    image_urls = [img['url'] for img in images]
    
    print(f"   ▶ Content len: {len(content)} | Images: {len(images)}")

    # --- PHASE 2: FILTER & CLASSIFY (LLM) ---
    llm_result = analyze_post_with_llm(content, image_urls, post['type'])
    
    final_status = "ACTIVE" # Mặc định nếu LLM fail thì vẫn cho hiện, xử lý sau
    
    if llm_result:
        print(f"   🤖 LLM Result: {llm_result}")
        ai_type = llm_result.get("classification", post['type'])
        ai_location = llm_result.get("location", post['location'])
        
        # 1. Xử lý ảnh rác trước
        trash_indices = llm_result.get("trash_image_indices", [])
        valid_images = [] # Danh sách ảnh sạch để đem đi embedding
        
        for idx, img_obj in enumerate(images):
            if idx in trash_indices:
                # Xóa ảnh rác khỏi DB
                supabase.table("post_images").delete().eq("id", img_obj['id']).execute()
                print(f"      🗑 Deleted trash image: {img_obj['id']}")
            else:
                valid_images.append(img_obj)
        
        # Cập nhật lại danh sách ảnh sạch
        images = valid_images

        # 2. Xử lý trạng thái bài viết
        if ai_type == "TRASH":
            final_status = "REJECTED"
        
        # Update DB Metadata
        supabase.table("posts").update({
            "status": final_status,
            "type": ai_type,
            "location": ai_location
        }).eq("id", post_id).execute()
    else:
        print("   ⚠️ LLM failed/skipped. Proceeding with raw data.")

    # --- PHASE 3: EMBEDDING (VECTORIZE) ---
    # CHỈ chạy nếu status là ACTIVE/PROCESSING. Nếu REJECTED thì dừng luôn.
    if final_status == "REJECTED":
        print("   ⛔ Post REJECTED. Skipping embeddings.")
        # Clear embedding cũ nếu lỡ có
        supabase.table("posts").update({"content_embedding": None}).eq("id", post_id).execute()
        return

    print("   ⚡ Starting Vectorization...")
    
    # A. Text Embedding
    if content:
        vec_text = embedder.get_embedding(content, input_type='text')
        if vec_text:
            supabase.table("posts").update({"content_embedding": vec_text}).eq("id", post_id).execute()
            print("      ✅ Text embedded.")

    # B. Image Embedding (Chỉ embed những ảnh còn lại sau khi lọc)
    for img_obj in images:
        vec_img = embedder.get_embedding(img_obj['url'], input_type='image')
        if vec_img:
            supabase.table("post_images").update({"embedding": vec_img}).eq("id", img_obj['id']).execute()
            print(f"      ✅ Image embedded: {img_obj['id']}")

    print(f"🎉 Pipeline Completed for {post_id}")

# --- 4. FASTAPI SETUP ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global supabase, groq_client, embedder
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    groq_client = Groq(api_key=GROQ_API_KEY)
    try:
        embedder = DistilClipEmbedder()
    except Exception as e:
        print(f"❌ Model Init Failed: {e}")
    yield
    # Shutdown
    print("🛑 Shutting down...")

app = FastAPI(lifespan=lifespan)

class WebhookPayload(BaseModel):
    type: str
    table: str
    record: dict
    schema_: str = "public"

@app.post("/webhook/process-full-flow")
async def webhook_handler(payload: WebhookPayload, background_tasks: BackgroundTasks, x_api_secret: Optional[str] = Header(None)):
    """
    Webhook duy nhất: Nhận INSERT -> Chạy full luồng (Lọc -> Embed)
    """
    if API_SECRET and x_api_secret != API_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if payload.type == "INSERT":
        post_id = payload.record.get('id')
        if post_id:
            background_tasks.add_task(pipeline_task, post_id)
            return {"status": "queued", "id": post_id}
    
    return {"status": "ignored"}

@app.get("/")
def health():
    return {"status": "ready", "service": "AI Pipeline (Filter + Vector)"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)