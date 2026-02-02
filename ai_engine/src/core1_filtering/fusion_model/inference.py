import torch
from transformers import AutoTokenizer
from torchvision import transforms
from PIL import Image
import requests
from io import BytesIO
from model import MultimodalClassifier
import os
import numpy as np

# CẤU HÌNH LABEL
# Lưu ý: Cần đảm bảo thứ tự này khớp với Label Encoder lúc train
# Dựa trên dữ liệu mẫu: 0=Trash/Other, 2=Lost. Bạn hãy kiểm tra lại dataset để điền chính xác.
ID2LABEL = {
    0: "Trash/Other",   # Rác hoặc không liên quan
    1: "Found",         # Nhặt được đồ (Tìm chủ)
    2: "Lost"           # Mất đồ (Tìm đồ)
}

class InferenceModel:
    def __init__(self, model_path='checkpoints/best_model.pth', device=None):
        """
        Khởi tạo model và load weights 1 lần duy nhất để tối ưu tốc độ.
        """
        self.device = device if device else torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Inference device: {self.device}")
        
        # 1. Khởi tạo kiến trúc model
        self.model = MultimodalClassifier(n_classes=3)
        
        # 2. Load Weights từ file checkpoint
        if os.path.exists(model_path):
            state_dict = torch.load(model_path, map_location=self.device)
            self.model.load_state_dict(state_dict)
            print(f"Đã load model từ: {model_path}")
        else:
            print(f"CẢNH BÁO: Không tìm thấy '{model_path}'. Model đang dùng weight ngẫu nhiên!")
            
        self.model.to(self.device)
        self.model.eval() # Chuyển sang chế độ evaluation (tắt Dropout, Batchnorm update)
        
        # 3. Load Tokenizer & Image Transform
        # Tokenizer phải giống hệt lúc train
        self.tokenizer = AutoTokenizer.from_pretrained("vinai/phobert-base-v2")
        
        # Transform phải giống hệt lúc train
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def preprocess_image(self, image_source):
        """
        Xử lý input ảnh từ nhiều nguồn khác nhau:
        - image_source=None -> Trả về ảnh đen
        - image_source="http..." -> Tải ảnh từ URL
        - image_source="path/to/img" -> Đọc file local
        - image_source=PIL.Image -> Dùng trực tiếp
        """
        image = None
        try:
            if image_source is None:
                image = self._get_black_image()
            elif isinstance(image_source, str):
                if image_source.startswith(('http://', 'https://')): # Là URL
                    response = requests.get(image_source, timeout=3)
                    if response.status_code == 200:
                        image = Image.open(BytesIO(response.content)).convert("RGB")
                    else:
                        image = self._get_black_image()
                elif os.path.exists(image_source): # Là Local Path
                    image = Image.open(image_source).convert("RGB")
                else: # String rác
                    image = self._get_black_image()
            elif isinstance(image_source, Image.Image): # Là object ảnh
                image = image_source.convert("RGB")
            else:
                image = self._get_black_image()
        except Exception as e:
            # print(f"Lỗi xử lý ảnh: {e}")
            image = self._get_black_image()
            
        # Transform và thêm dimension Batch (C,H,W -> 1,C,H,W)
        return self.transform(image).unsqueeze(0).to(self.device)

    def _get_black_image(self):
        return Image.new('RGB', (224, 224), color='black')

    def preprocess_text(self, text):
        encoding = self.tokenizer.encode_plus(
            text,
            add_special_tokens=True,
            max_length=256,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt',
        )
        return (encoding['input_ids'].to(self.device), 
                encoding['attention_mask'].to(self.device))

    def predict(self, text, image_source=None):
        """
        Hàm dự đoán chính.
        Input: 
            - text: Nội dung bài viết
            - image_source: Link ảnh, path ảnh hoặc None
        Output: Dictionary chứa kết quả
        """
        # Preprocess
        input_ids, attention_mask = self.preprocess_text(str(text))
        pixel_values = self.preprocess_image(image_source)
        
        # Inference
        with torch.no_grad():
            logits = self.model(input_ids, attention_mask, pixel_values)
            probs = torch.softmax(logits, dim=1) # Chuyển logits thành xác suất
            pred_idx = torch.argmax(probs, dim=1).item() # Lấy index có xác suất cao nhất
            
        return {
            "label_id": pred_idx,
            "label_name": ID2LABEL.get(pred_idx, "Unknown"),
            "confidence": probs[0][pred_idx].item(), # Độ tin cậy (0.0 - 1.0)
            "probabilities": probs[0].cpu().numpy().tolist() # Chi tiết xác suất cả 3 lớp
        }

# --- PHẦN TEST (Chạy trực tiếp file này) ---
if __name__ == "__main__":
    # 1. Khởi tạo engine
    classifier = InferenceModel(model_path='checkpoints/best_model.pth')
    
    print("\n--- DEMO 1: Có text, không có ảnh ---")
    text1 = "Góc tìm đồ: Mình có đánh rơi thẻ sinh viên ở khu F, ai thấy cho mình xin lại ạ."
    result1 = classifier.predict(text1, image_source=None)
    print(f"Content: {text1}")
    print(f"Prediction: {result1['label_name']} ({result1['confidence']:.2%})")

    print("\n--- DEMO 2: Có text, có URL ảnh ---")
    text2 = "Nhặt được ví này ở nhà xe, ai là chủ nhân liên hệ mình nhé."
    # Thay link ảnh thật của bạn vào đây để test
    url2 = "https://m.media-amazon.com/images/I/81WIcyHQ7oL._SX679_.jpg" 
    result2 = classifier.predict(text2, image_source=url2)
    print(f"Content: {text2}")
    print(f"Prediction: {result2['label_name']} ({result2['confidence']:.2%})")