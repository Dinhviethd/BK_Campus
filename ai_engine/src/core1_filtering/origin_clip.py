import torch
from PIL import Image
import requests
from io import BytesIO
from transformers import CLIPProcessor, CLIPModel
from deep_translator import GoogleTranslator
import numpy as np

class ClipEmbedder:
    def __init__(self, model_name="openai/clip-vit-base-patch32"):
        """
        Khởi tạo model CLIP và Processor
        """
        print("Đang tải model CLIP... Vui lòng chờ.")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = CLIPModel.from_pretrained(model_name).to(self.device)
        self.processor = CLIPProcessor.from_pretrained(model_name)
        self.translator = GoogleTranslator(source='vi', target='en')
        print(f"Model đã tải xong trên thiết bị: {self.device}")

    def translate_text(self, text):
        """
        Dịch tiếng Việt sang tiếng Anh
        """
        try:
            translated = self.translator.translate(text)
            print(f"Original: {text} -> Translated: {translated}")
            return translated
        except Exception as e:
            print(f"Lỗi dịch thuật: {e}")
            return text # Trả về text gốc nếu lỗi

    def get_image_from_url(self, url):
        """
        Tải ảnh từ URL
        """
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return Image.open(BytesIO(response.content))
        except Exception as e:
            print(f"Không thể tải ảnh từ URL: {e}")
            return None

    def get_embedding(self, input_data, input_type='text'):
        """
        Hàm chính để lấy embedding vector.
        Args:
            input_data: Nội dung text hoặc URL ảnh
            input_type: 'text' hoặc 'image'
        Returns:
            List[float]: Vector embedding (thường là 512 chiều)
        """
        inputs = None
        
        # 1. Xử lý nều là TEXT
        if input_type == 'text':
            # Dịch tiếng Việt -> Anh
            english_text = self.translate_text(input_data)
            # Tokenize và chuẩn bị input cho model
            inputs = self.processor(text=[english_text], return_tensors="pt", padding=True)

        # 2. Xử lý nếu là ẢNH (Image URL)
        elif input_type == 'image':
            image = self.get_image_from_url(input_data)
            if image is None:
                return None
            # Preprocess ảnh
            inputs = self.processor(images=image, return_tensors="pt")
        
        else:
            raise ValueError("input_type phải là 'text' hoặc 'image'")

        # Đẩy input vào device (CPU/GPU)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # 3. Inference qua Model để lấy features
        with torch.no_grad():
            if input_type == 'text':
                outputs = self.model.get_text_features(**inputs)
            else:
                outputs = self.model.get_image_features(**inputs)

        # 4. Chuẩn hóa vector (Normalize) - Quan trọng để tính Cosine Similarity sau này
        outputs = outputs / outputs.norm(p=2, dim=-1, keepdim=True)

        # Chuyển về dạng list Python đơn giản
        return outputs.cpu().numpy()[0].tolist()

# --- PHẦN CHẠY THỬ (MAIN) ---
if __name__ == "__main__":
    embedder = ClipEmbedder()

    print("\n--- TEST TEXT EMBEDDING ---")
    post_content = "Có bạn nào thấy mặt dây chuyền hình như thế này ở trường không ạ . Ai nhặt được cho mình xin lại với ạ ,do đó là đồ quang trọng của mình nên bạn nào nhặt đc liên hệ vs mik nha"
    text_vector = embedder.get_embedding(post_content, input_type='text')
    
    if text_vector:
        print(f"Độ dài vector text: {len(text_vector)}") # Thường là 512
        print(f"5 giá trị đầu: {text_vector[:5]}")

    print("\n--- TEST IMAGE EMBEDDING ---")
    # image_url = "https://img.freepik.com/free-photo/cute-domestic-kitten-sits-window-staring-outside-generative-ai_188544-12519.jpg"
    # image_url = "https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(75)/2024_1_1_638397211036390474_hinh-nen-cay-xanh.png"
    image_url = "https://scontent.fdad3-5.fna.fbcdn.net/v/t39.30808-6/619078280_1235250771933632_2697639009820930573_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=s2NP-I7YVNEQ7kNvwHQBqHg&_nc_oc=AdmoDw9fLc_UHF10ECM1H9PmIdc8GQL49H4sSGk7VFlg57FmJQTnh56Yuq7NgLKyiBI&_nc_zt=23&_nc_ht=scontent.fdad3-5.fna&_nc_gid=usS50PObYvP8oSktozmbgQ&oh=00_AfrUhQaNOJHbpPdysxwWoi_GFJFXBG7mLzH67mBWNcoM_Q&oe=697FB271"
    image_vector = embedder.get_embedding(image_url, input_type='image')

    if image_vector:
        print(f"Độ dài vector image: {len(image_vector)}")
        print(f"5 giá trị đầu: {image_vector[:5]}")


    if text_vector is not None and image_vector is not None:
        similarity = np.dot(text_vector, image_vector) / (np.linalg.norm(text_vector) * np.linalg.norm(image_vector))
        print(f"\nCosine Similarity: {similarity:.4f}")
        
        if similarity > 0.25: # Ngưỡng (threshold) tuỳ chỉnh
            print("=> Kết luận: Ảnh và Text có nội dung liên quan.")
        else:
            print("=> Kết luận: Ít liên quan.")