import os
import time
import numpy as np
import requests
from io import BytesIO
from PIL import Image

# ONNX & Transformers
import onnxruntime as ort
from transformers import CLIPProcessor
from deep_translator import GoogleTranslator

# Supabase & Env
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables (.env phải chứa SUPABASE_URL và SUPABASE_KEY)
load_dotenv()

# Cấu hình Model
TEXT_MODEL_PATH = "onnx_quantized/text_encoder_quant.onnx"
VISION_MODEL_PATH = "onnx_quantized/vision_encoder_quant.onnx"
BASE_MODEL_NAME = "openai/clip-vit-base-patch32"

class DistilClipEmbedder:
    def __init__(self):
        print("🚀 Đang khởi tạo DistilCLIP (ONNX Quantized)...")
        
        if not os.path.exists(TEXT_MODEL_PATH):
            raise FileNotFoundError("❌ Chưa thấy file ONNX. Hãy chạy quantize_safety.py trước!")

        self.processor = CLIPProcessor.from_pretrained(BASE_MODEL_NAME)
        self.translator = GoogleTranslator(source='vi', target='en')

        # Tắt bớt log warning của ONNX Runtime
        sess_options = ort.SessionOptions()
        sess_options.log_severity_level = 3 
        
        # Load Sessions
        try:
            self.text_session = ort.InferenceSession(TEXT_MODEL_PATH, sess_options, providers=['CPUExecutionProvider'])
            self.vision_session = ort.InferenceSession(VISION_MODEL_PATH, sess_options, providers=['CPUExecutionProvider'])
            print("✅ Model loaded successfully on CPU!")
        except Exception as e:
            print(f"❌ Lỗi load model ONNX: {e}")

    def translate_text(self, text):
        if not text: return ""
        try:
            translated = self.translator.translate(text)
            # print(f"   [Translate] {text[:30]}... -> {translated[:30]}...")
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
            return embedding[0].tolist() # Convert numpy -> list cho Supabase
        except Exception as e:
            print(f"❌ Lỗi khi embedding ({input_type}): {e}")
            return None

# --- SUPABASE WORKER LOGIC ---

def run_worker():
    # 1. Kết nối Supabase
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        print("❌ Lỗi: Vui lòng cấu hình SUPABASE_URL và SUPABASE_KEY trong file .env")
        return

    supabase: Client = create_client(url, key)
    embedder = DistilClipEmbedder()

    print("\n⏳ Đang quét các bài viết cần xử lý (PROCESSING/ACTIVE và chưa có vector)...")
    
    try:
        # Lấy các bài post có status hợp lệ VÀ content_embedding đang NULL
        # Join thêm bảng post_images để lấy danh sách ảnh
        response = supabase.table("posts") \
            .select("id, content, status, post_images(id, url)") \
            .in_("status", ["PROCESSING", "ACTIVE"]) \
            .is_("content_embedding", "null") \
            .execute()
        
        posts = response.data
        if not posts:
            print("💤 Không có bài viết nào cần xử lý.")
            return

        print(f"🔥 Tìm thấy {len(posts)} bài viết. Bắt đầu xử lý...\n")

        for post in posts:
            process_single_post(supabase, embedder, post)

    except Exception as e:
        print(f"❌ Lỗi Critical khi fetch data: {e}")

def process_single_post(supabase, embedder, post):
    post_id = post['id']
    content = post.get('content', '')
    images = post.get('post_images', [])
    original_status = post.get('status')

    print(f"🔹 [Post {post_id}] Status ban đầu: {original_status}")

    # --- BƯỚC 1: TÍNH TOÁN (Heavy Task) ---
    # Thực hiện việc nặng trước khi check DB lần cuối
    
    text_vector = None
    image_vectors_map = {} # Map id -> vector

    # A. Text Embedding
    if content:
        print(f"   ↳ Đang embedding nội dung ({len(content)} chars)...")
        text_vector = embedder.get_embedding(content, input_type='text')

    # B. Image Embedding
    if images:
        print(f"   ↳ Đang embedding {len(images)} ảnh...")
        for img in images:
            vec = embedder.get_embedding(img['url'], input_type='image')
            if vec:
                image_vectors_map[img['id']] = vec

    # --- BƯỚC 2: RACE CONDITION CHECK (Quan trọng) ---
    print("   🔍 Kiểm tra lại trạng thái trên DB trước khi lưu...")
    
    try:
        # Query lại đúng status của bài post này
        check_res = supabase.table("posts").select("status").eq("id", post_id).single().execute()
        
        if not check_res.data:
            print("   ⚠️ Bài viết đã bị xóa trong lúc đang xử lý. Bỏ qua.")
            return

        current_status = check_res.data['status']

        # Logic Race Condition: Nếu status đã đổi sang REJECTED -> Hủy
        if current_status == 'REJECTED':
            print(f"   ⛔ TỪ CHỐI LƯU. Bài viết đã bị Admin đổi sang {current_status}.")
            return
        
        # Nếu status là PROCESSING, ACTIVE, CLOSED... -> Vẫn lưu vector bình thường
        # để phục vụ search sau này (hoặc duyệt sau).

    except Exception as e:
        print(f"   ❌ Lỗi khi check status: {e}")
        return

    # --- BƯỚC 3: UPDATE DATABASE ---
    print(f"   💾 Đang lưu vector vào DB (Status hiện tại: {current_status})...")
    
    try:
        # Update Text Vector
        if text_vector:
            supabase.table("posts").update({
                "content_embedding": text_vector
            }).eq("id", post_id).execute()
            # print("      ✅ Đã lưu content_embedding")

        # Update Image Vectors (Loop từng ảnh vì mỗi ảnh update 1 row khác nhau)
        for img_id, vec in image_vectors_map.items():
            supabase.table("post_images").update({
                "embedding": vec
            }).eq("id", img_id).execute()
            # print(f"      ✅ Đã lưu embedding cho ảnh {img_id}")
            
        print("   ✅ Hoàn tất Post!")

    except Exception as e:
        print(f"   ❌ Lỗi khi update DB: {e}")

if __name__ == "__main__":
    # Chạy vòng lặp hoặc chạy 1 lần
    # Ở đây để chạy 1 lần rồi thoát (thường dùng cho Cron Job)
    run_worker()