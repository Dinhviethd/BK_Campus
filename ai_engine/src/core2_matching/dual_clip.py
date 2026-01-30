import requests
from PIL import Image
from io import BytesIO
from sentence_transformers import SentenceTransformer
import numpy as np
import pandas as pd

class DualCLIPEmbedder:
    def __init__(self):
        """
        Khởi tạo 2 model riêng biệt cho Text và Image nhưng chung không gian vector.
        """
        print("Dang tai model Text (Multilingual)...")
        # Model này chuyên xử lý Text tiếng Việt/Đa ngôn ngữ
        self.text_model = SentenceTransformer('sentence-transformers/clip-ViT-B-32-multilingual-v1')
        
        print("Dang tai model Image (Original CLIP)...")
        # Model này chuyên xử lý Ảnh
        self.img_model = SentenceTransformer('sentence-transformers/clip-ViT-B-32')
        
        print("Da san sang!")

    def _load_image_from_url(self, url):
        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(url, timeout=10, headers=headers)
            response.raise_for_status()
            img = Image.open(BytesIO(response.content))
            return img
        except Exception as e:
            print(f"Loi tai anh tu URL {url}: {e}")
            return None

    def get_embedding(self, input_data, input_type='text'):
        if not input_data or pd.isna(input_data) or input_data == 'N/A':
            return None

        try:
            if input_type == 'text':
                # Dùng Text Model
                embedding = self.text_model.encode(input_data)
                return embedding

            elif input_type == 'image':
                # Dùng Image Model
                image = self._load_image_from_url(input_data)
                if image:
                    # Model CLIP gốc xử lý ảnh tốt
                    embedding = self.img_model.encode(image)
                    return embedding
                else:
                    return None
            else:
                raise ValueError("input_type phai la 'text' hoac 'image'")

        except Exception as e:
            print(f"Loi khi tao embedding cho {input_type}: {e}")
            return None

# --- PHẦN CHẠY THỬ NGHIỆM ---
if __name__ == "__main__":
    embedder = DualCLIPEmbedder()

    # 1. Test với Text Tiếng Việt
    text_content = "con chó "
    print(f"\nInput Text: {text_content}")
    text_vector = embedder.get_embedding(text_content, input_type='text')
    
    if text_vector is not None:
        print(f"Text Vector Shape: {text_vector.shape}")

    # 2. Test với Image URL
    # img_url = "https://scontent.fdad3-4.fna.fbcdn.net/v/t39.30808-6/616506796_1393640662116109_7235991477098993853_n.jpg?stp=cp6_dst-jpg_p526x296_tt6&_nc_cat=105&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=MIBiUK78g2QQ7kNvwHl_onO&_nc_oc=AdljJBYkljY7tLUpJBsTl2eMr1AVS1fTEbLBMOMJhyXlJka2uCyzaIzLFttCsZCsHoc&_nc_zt=23&_nc_ht=scontent.fdad3-4.fna&_nc_gid=ltb8VpdYZpGJL5cuIiwz_g&oh=00_AfpNIwka3qxnkmh4mKEgSKAqK7_CExeisZEkJXqMrDA80g&oe=697A0F61"
    # img_url = "https://scontent.fdad3-5.fna.fbcdn.net/v/t39.30808-6/622366679_2207638409764208_7838786246628152631_n.jpg?stp=dst-jpg_s590x590_tt6&_nc_cat=107&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=J12w8g4-St0Q7kNvwGsb91b&_nc_oc=Adk3sI6pHqE-7tFt6Io9tQdm979OZYzMgLeq4aig9HCNrAvdJKSS64PGVFnJnC8QGQU&_nc_zt=23&_nc_ht=scontent.fdad3-5.fna&_nc_gid=F4KyfgXmHhhsYH8bPbtcHg&oh=00_Afr5knC8vl1KN95DbGk4ICRYPmxUWJK0D_UaZ8SQ5RBygg&oe=697FAD89"
    # img_url = "https://scontent.fdad3-5.fna.fbcdn.net/v/t39.30808-6/619078280_1235250771933632_2697639009820930573_n.jpg?stp=dst-jpg_s590x590_tt6&_nc_cat=102&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=s2NP-I7YVNEQ7kNvwHQBqHg&_nc_oc=AdmoDw9fLc_UHF10ECM1H9PmIdc8GQL49H4sSGk7VFlg57FmJQTnh56Yuq7NgLKyiBI&_nc_zt=23&_nc_ht=scontent.fdad3-5.fna&_nc_gid=C5kweJxzXvGrLqS-8DQ2rg&oh=00_AfovSTu6fCPS9qLh2SymSKCmthnc9Z5V80LdgPuryhVZkw&oe=697F7A31"
    # img_url = "ddata:image/jpeg;base64,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"
    img_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Yen_Bai_-_dogs_-_P1390010.JPG/1280px-Yen_Bai_-_dogs_-_P1390010.JPG"

    print(f"\nInput Image: {img_url}")
    img_vector = embedder.get_embedding(img_url, input_type='image')
    
    if img_vector is not None:
        print(f"Image Vector Shape: {img_vector.shape}")

    # 3. Kiểm tra độ tương đồng
    if text_vector is not None and img_vector is not None:
        similarity = np.dot(text_vector, img_vector) / (np.linalg.norm(text_vector) * np.linalg.norm(img_vector))
        print(f"\nCosine Similarity: {similarity:.4f}")
        
        if similarity > 0.25: # Ngưỡng (threshold) tuỳ chỉnh
            print("=> Kết luận: Ảnh và Text có nội dung liên quan.")
        else:
            print("=> Kết luận: Ít liên quan.")