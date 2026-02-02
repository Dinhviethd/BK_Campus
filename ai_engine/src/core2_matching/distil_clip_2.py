# distil_clip.py
import onnxruntime as ort
import numpy as np
from transformers import CLIPProcessor
from deep_translator import GoogleTranslator
from PIL import Image
import requests
from io import BytesIO
import os

# Đường dẫn model
TEXT_MODEL_PATH = "onnx_quantized/text_encoder_quant.onnx"
VISION_MODEL_PATH = "onnx_quantized/vision_encoder_quant.onnx"
BASE_MODEL_NAME = "openai/clip-vit-base-patch32"

class DistilClipEmbedder:
    def __init__(self):
        print("Đang khởi tạo DistilCLIP (ONNX Quantized)...")
        
        if not os.path.exists(TEXT_MODEL_PATH):
            raise FileNotFoundError("Chưa thấy file ONNX. Hãy chạy quantize_safety.py trước!")

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
            print(f"Lỗi load model ONNX: {e}")

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
            print(f"Không thể tải ảnh: {e}")
            return None

    def _normalize(self, vector):
        norm = np.linalg.norm(vector, ord=2, axis=-1, keepdims=True)
        return vector / (norm + 1e-12)

    def get_embedding(self, input_data, input_type='text'):
        if input_type == 'text':
            english_text = self.translate_text(input_data)
            # Tokenize
            inputs = self.processor(text=[english_text], return_tensors="np", padding="max_length", max_length=77, truncation=True)
            
            # CHẮC CHẮN ÉP KIỂU SANG INT64
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
            
            # CHẮC CHẮN ÉP KIỂU SANG FLOAT32
            onnx_inputs = {
                'pixel_values': inputs['pixel_values'].astype(np.float32)
            }
            
            outputs = self.vision_session.run(None, onnx_inputs)
            embedding = outputs[0]

        else:
            raise ValueError("input_type fail")

        embedding = self._normalize(embedding)
        return embedding[0].tolist()

if __name__ == "__main__":
    embedder = DistilClipEmbedder()

    print("\n--- TEST TEXT ---")
    # post_content = "Có bạn nào thấy mặt dây chuyền hình như thế này ở trường không ạ."
    post_content = "Có bạn nào thấy cái kính như thế này ở trường không ạ."
    text_vector = embedder.get_embedding(post_content, input_type='text')
    
    if text_vector:
        print(f"Text Vector OK, size: {len(text_vector)}")

    print("\n--- TEST IMAGE ---")
    image_url = "https://file.hstatic.net/1000269337/article/hato-crt-6625-0221_5a2bbbb3bd4a46429884a678a95bcb2c_master_bcb2e2ba639a4876875ded1773bf39ce_1024x1024.jpg"
    image_vector = embedder.get_embedding(image_url, input_type='image')

    if image_vector:
        print(f"Image Vector OK, size: {len(image_vector)}")

    if text_vector is not None and image_vector is not None:
        similarity = np.dot(text_vector, image_vector) / (np.linalg.norm(text_vector) * np.linalg.norm(image_vector))
        print(f"\nCosine Similarity: {similarity:.4f}")
        
        if similarity > 0.25: # Ngưỡng (threshold) tuỳ chỉnh
            print("=> Kết luận: Ảnh và Text có nội dung liên quan.")
        else:
            print("=> Kết luận: Ít liên quan.")