import torch
from transformers import AutoTokenizer
from model import TextClassifier

# --- CẤU HÌNH ---
MODEL_PATH = 'best_model.pth'
PRETRAINED_MODEL = 'vinai/phobert-base-v2'
MAX_LEN = 256
CLASS_NAMES = ['TRASH', 'LOST', 'FOUND'] # Mapping theo Label: 0, 1, 2

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

class InferenceHandler:
    def __init__(self):
        print(">>> Loading Core1 Filtering Model...")
        self.tokenizer = AutoTokenizer.from_pretrained(PRETRAINED_MODEL)
        self.model = TextClassifier(n_classes=len(CLASS_NAMES), model_name=PRETRAINED_MODEL)
        
        # Load weights
        try:
            self.model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
        except FileNotFoundError:
            print(f"Lỗi: Không tìm thấy file model tại {MODEL_PATH}. Hãy chạy training.py trước.")
        
        self.model.to(device)
        self.model.eval()
        print(">>> Model loaded successfully.")

    def predict(self, text):
        if not text:
            return "TRASH", 0.0

        encoded_review = self.tokenizer.encode_plus(
            text,
            max_length=MAX_LEN,
            add_special_tokens=True,
            return_token_type_ids=False,
            padding='max_length', # Pad để đảm bảo kích thước tensor cố định
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt',
        )

        input_ids = encoded_review['input_ids'].to(device)
        attention_mask = encoded_review['attention_mask'].to(device)

        with torch.no_grad():
            output = self.model(input_ids, attention_mask)
            # Dùng Softmax để lấy xác suất
            probs = torch.nn.functional.softmax(output, dim=1)
            
            # Lấy class có xác suất cao nhất
            max_prob, idx = torch.max(probs, dim=1)
            
        return CLASS_NAMES[idx.item()], max_prob.item()

# --- DEMO ---
if __name__ == "__main__":
    handler = InferenceHandler()
    
    test_texts = [
        "Mình có nhặt được một cái ví màu đen ở khu A, ai mất liên hệ nhé",
        "Cần tìm thẻ sinh viên tên Nguyễn Văn A rơi ở nhà xe",
        "Bán điện thoại iphone 15 giá rẻ bất ngờ",
        "Mọi người ơi cho mình hỏi lịch thi môn giải tích với ạ",
        "Mình làm rớt vòng tay ở khu F, ai nhặt được liên hệ mình với ạ"
    ]
    
    print("\n--- KẾT QUẢ DỰ ĐOÁN ---")
    for t in test_texts:
        label, conf = handler.predict(t)
        print(f"Text: {t}\nResult: {label} (Confidence: {conf:.2f})\n")