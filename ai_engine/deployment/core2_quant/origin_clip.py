import torch
from PIL import Image
import requests
from io import BytesIO
from deep_translator import GoogleTranslator
import numpy as np
import os

# Dùng Optimum để load model từ các file config bạn vừa up
from optimum.onnxruntime import ORTModelForFeatureExtraction
from transformers import CLIPProcessor

class ClipEmbedder:
    def __init__(self, model_path="."):
        """
        Khởi tạo model CLIP ONNX.
        model_path=".": Tìm file ngay tại thư mục gốc
        """
        print("--- LOADING ONNX CLIP MODEL ---")
        
        # 1. Load Model Lượng tử hóa
        # file_name="model_quantized.onnx" khớp với tên file trong ảnh bạn gửi
        try:
            print(f"Đang tìm file model_quantized.onnx tại {os.path.abspath(model_path)}")
            self.model = ORTModelForFeatureExtraction.from_pretrained(
                model_path,
                file_name="model_quantized.onnx", 
                provider="CPUExecutionProvider"
            )
        except Exception as e:
            print(f"Lỗi load model: {e}")
            print("Hãy chắc chắn bạn đã upload file 'model_quantized.onnx' và các file json config lên Space.")
            raise e

        # 2. Load Processor (Tokenizer & Image Config)
        try:
            self.processor = CLIPProcessor.from_pretrained(model_path)
        except OSError:
            # Fallback nếu thiếu file config thì tải từ HF Hub gốc để chữa cháy
            print("Thiếu config cục bộ, tải config gốc từ openai/clip-vit-base-patch32...")
            self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

        self.translator = GoogleTranslator(source='vi', target='en')
        print("Model ONNX đã sẵn sàng!")

    def translate_text(self, text):
        try:
            return self.translator.translate(text)
        except Exception:
            return text

    def get_image_from_url(self, url):
        try:
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            return Image.open(BytesIO(response.content))
        except Exception as e:
            print(f"Lỗi tải ảnh: {e}")
            return None

    def get_embedding(self, input_data, input_type='text'):
        inputs = None
        
        # Xử lý TEXT
        if input_type == 'text':
            eng_text = self.translate_text(input_data)
            inputs = self.processor(text=[eng_text], return_tensors="pt", padding=True)

        # Xử lý IMAGE
        elif input_type == 'image':
            image = self.get_image_from_url(input_data)
            if image is None: return None
            inputs = self.processor(images=image, return_tensors="pt")
        
        else:
            return None

        # Inference
        with torch.no_grad():
            outputs = self.model(**inputs)

        # Lấy features dựa trên loại input
        if input_type == 'text':
            embeds = outputs.text_embeds
        else:
            embeds = outputs.image_embeds

        # Chuyển về Numpy và Normalize
        if isinstance(embeds, torch.Tensor):
            embeds = embeds.numpy()
            
        # Normalize (L2 norm)
        norm = np.linalg.norm(embeds, axis=1, keepdims=True)
        embeds = embeds / (norm + 1e-12)

        return embeds[0].tolist()

if __name__ == "__main__":
    # Test nhanh
    embedder = ClipEmbedder()
    vec = embedder.get_embedding("test", "text")
    print(f"Vector size: {len(vec)}")