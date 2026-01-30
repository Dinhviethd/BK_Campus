import requests
from PIL import Image
from io import BytesIO
from sentence_transformers import SentenceTransformer
import numpy as np
import pandas as pd

class MultilingualCLIPEmbedder:
    def __init__(self, model_name='clip-ViT-B-32-multilingual-v1'):
        """
        Khởi tạo model CLIP đa ngôn ngữ.
        Model này map text (50+ ngôn ngữ) và ảnh vào chung 1 vector space.
        """
        print(f"Dang tai model {model_name}...")
        self.model = SentenceTransformer(model_name)
        print("Model da san sang!")

    def _load_image_from_url(self, url):
        """Hàm phụ trợ để tải ảnh từ URL"""
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            img = Image.open(BytesIO(response.content))
            return img
        except Exception as e:
            print(f"Loi tai anh tu URL {url}: {e}")
            return None

    def get_embedding(self, input_data, input_type='text'):
        """
        Tạo embedding vector.
        
        Args:
            input_data (str): Nội dung text hoặc URL ảnh.
            input_type (str): 'text' hoặc 'image'.
            
        Returns:
            numpy.ndarray: Vector embedding (512 dimensions) hoặc None nếu lỗi.
        """
        if not input_data or pd.isna(input_data) or input_data == 'N/A':
            return None

        try:
            if input_type == 'text':
                # Model tự động xử lý tokenization cho text
                embedding = self.model.encode(input_data)
                return embedding

            elif input_type == 'image':
                # Tải ảnh và xử lý
                image = self._load_image_from_url(input_data)
                if image:
                    # Model tự động xử lý resize/crop ảnh
                    embedding = self.model.encode([image])
                    return embedding
                else:
                    return None
            else:
                raise ValueError("input_type phai la 'text' hoac 'image'")

        except Exception as e:
            print(f"Loi khi tao embedding: {e}")
            return None

# --- PHẦN CHẠY THỬ NGHIỆM ---
if __name__ == "__main__":
    # 1. Khởi tạo
    embedder = MultilingualCLIPEmbedder()

    # 2. Test với Text (Tiếng Việt)
    text_content = "Nhặt được chiếc ví màu đen tại khu F"
    text_vector = embedder.get_embedding(text_content, input_type='text')
    
    print(f"\nInput Text: {text_content}")
    if text_vector is not None:
        print(f"Text Embedding Shape: {text_vector.shape}") # Kết quả sẽ là (512,)
        print(f"Vector preview: {text_vector[:5]}...")

    # 3. Test với Image URL (Lấy từ file csv của bạn)
    img_url = "https://scontent.fdad3-4.fna.fbcdn.net/v/t39.30808-6/616506796_1393640662116109_7235991477098993853_n.jpg?stp=cp6_dst-jpg_p526x296_tt6&_nc_cat=105&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=MIBiUK78g2QQ7kNvwHl_onO&_nc_oc=AdljJBYkljY7tLUpJBsTl2eMr1AVS1fTEbLBMOMJhyXlJka2uCyzaIzLFttCsZCsHoc&_nc_zt=23&_nc_ht=scontent.fdad3-4.fna&_nc_gid=ltb8VpdYZpGJL5cuIiwz_g&oh=00_AfpNIwka3qxnkmh4mKEgSKAqK7_CExeisZEkJXqMrDA80g&oe=697A0F61"
    
    img_vector = embedder.get_embedding(img_url, input_type='image')
    
    print(f"\nInput Image: {img_url}")
    if img_vector is not None:
        print(f"Image Embedding Shape: {img_vector.shape}")
        print(f"Vector preview: {img_vector[:5]}...")

    # 4. Tính độ tương đồng (Cosine Similarity)
    # Đây là cách bạn kiểm tra xem Text và Ảnh có khớp nhau không
    if text_vector is not None and img_vector is not None:
        similarity = np.dot(text_vector, img_vector) / (np.linalg.norm(text_vector) * np.linalg.norm(img_vector))
        print(f"\nDo tuong dong (Cosine Similarity) giua Text va Anh: {similarity:.4f}")