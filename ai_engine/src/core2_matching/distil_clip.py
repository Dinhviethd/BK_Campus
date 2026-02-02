# distil_clip.py
import onnxruntime as ort
import numpy as np
from transformers import CLIPProcessor
from deep_translator import GoogleTranslator
from PIL import Image
import requests
from io import BytesIO
import os

# Đường dẫn đến file model đã quantize (tạo từ file quantize_safety.py)
TEXT_MODEL_PATH = "onnx_quantized/text_encoder_quant.onnx"
VISION_MODEL_PATH = "onnx_quantized/vision_encoder_quant.onnx"
BASE_MODEL_NAME = "openai/clip-vit-base-patch32" # Dùng để load processor

class DistilClipEmbedder:
    def __init__(self):
        """
        Khởi tạo DistilClipEmbedder sử dụng ONNX Runtime
        """
        print("Đang khởi tạo DistilCLIP (ONNX Quantized)...")
        
        # Kiểm tra file tồn tại
        if not os.path.exists(TEXT_MODEL_PATH) or not os.path.exists(VISION_MODEL_PATH):
            raise FileNotFoundError("Vui lòng chạy 'quantize_safety.py' trước để tạo file model!")

        # Load Processor (dùng chung cho cả text và ảnh)
        self.processor = CLIPProcessor.from_pretrained(BASE_MODEL_NAME)
        self.translator = GoogleTranslator(source='vi', target='en')

        # Load ONNX Sessions (Inference Engine)
        # Sử dụng CPUExecutionProvider cho môi trường CPU
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        
        print(f"Loading Text Encoder: {TEXT_MODEL_PATH}")
        self.text_session = ort.InferenceSession(TEXT_MODEL_PATH, sess_options, providers=['CPUExecutionProvider'])
        
        print(f"Loading Vision Encoder: {VISION_MODEL_PATH}")
        self.vision_session = ort.InferenceSession(VISION_MODEL_PATH, sess_options, providers=['CPUExecutionProvider'])
        
        print("✅ Model loaded successfully on CPU!")

    def translate_text(self, text):
        try:
            translated = self.translator.translate(text)
            print(f"Original: {text} -> Translated: {translated}")
            return translated
        except Exception as e:
            print(f"Lỗi dịch thuật: {e}")
            return text

    def get_image_from_url(self, url):
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return Image.open(BytesIO(response.content))
        except Exception as e:
            print(f"Không thể tải ảnh từ URL: {e}")
            return None

    def _normalize(self, vector):
        """Chuẩn hóa vector (L2 norm)"""
        norm = np.linalg.norm(vector, ord=2, axis=-1, keepdims=True)
        return vector / (norm + 1e-12) # Tránh chia cho 0

    def get_embedding(self, input_data, input_type='text'):
        """
        Lấy embedding sử dụng ONNX Runtime
        """
        if input_type == 'text':
            # 1. Xử lý Text
            english_text = self.translate_text(input_data)
            inputs = self.processor(text=[english_text], return_tensors="np", padding=True)
            
            # Chuyển input sang chuẩn ONNX (int64)
            onnx_inputs = {
                'input_ids': inputs['input_ids'].astype(np.int64),
                'attention_mask': inputs['attention_mask'].astype(np.int64)
            }
            
            # Inference Text Encoder
            outputs = self.text_session.run(None, onnx_inputs)
            embedding = outputs[0] # Shape (1, 512)

        elif input_type == 'image':
            # 2. Xử lý Ảnh
            image = self.get_image_from_url(input_data)
            if image is None: return None
            
            inputs = self.processor(images=image, return_tensors="np")
            
            # Chuyển input sang chuẩn ONNX (float32)
            onnx_inputs = {
                'pixel_values': inputs['pixel_values'].astype(np.float32)
            }
            
            # Inference Vision Encoder
            outputs = self.vision_session.run(None, onnx_inputs)
            embedding = outputs[0]

        else:
            raise ValueError("input_type phải là 'text' hoặc 'image'")

        # 3. Normalize kết quả
        embedding = self._normalize(embedding)
        
        # Trả về list Python phẳng
        return embedding[0].tolist()

# --- MAIN TEST ---
if __name__ == "__main__":
    embedder = DistilClipEmbedder()

    print("\n--- TEST TEXT EMBEDDING (ONNX) ---")
    post_content = "Có bạn nào thấy mặt dây chuyền hình như thế này ở trường không ạ . Ai nhặt được cho mình xin lại với ạ."
    text_vector = embedder.get_embedding(post_content, input_type='text')
    
    if text_vector:
        print(f"Vector size: {len(text_vector)}")
        print(f"Preview: {text_vector[:5]}")

    print("\n--- TEST IMAGE EMBEDDING (ONNX) ---")
    image_url = "https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(75)/2024_1_1_638397211036390474_hinh-nen-cay-xanh.png"
    image_vector = embedder.get_embedding(image_url, input_type='image')

    if image_vector:
        print(f"Vector size: {len(image_vector)}")
        print(f"Preview: {image_vector[:5]}")

    if text_vector is not None and image_vector is not None:
        # Tính Cosine Similarity bằng numpy thuần
        sim = np.dot(text_vector, image_vector) # Đã normalize nên chỉ cần dot product
        print(f"\nCosine Similarity: {sim:.4f}")