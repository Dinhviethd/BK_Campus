import pandas as pd
import numpy as np
from tqdm import tqdm
import ast
import os

# Import class từ file origin_clip.py
# Đảm bảo file origin_clip.py nằm cùng thư mục với script này
try:
    from origin_clip import ClipEmbedder
except ImportError:
    print("Lỗi: Không tìm thấy file 'origin_clip.py'. Hãy đảm bảo file này nằm cùng thư mục.")
    exit()

def process_csv_to_embeddings(input_csv_path, output_csv_path):
    # 1. Khởi tạo Model
    print("--- Đang khởi tạo Model CLIP ---")
    embedder = ClipEmbedder()
    
    # 2. Đọc dữ liệu
    print(f"--- Đang đọc file: {input_csv_path} ---")
    try:
        df = pd.read_csv(input_csv_path)
    except Exception as e:
        print(f"Lỗi đọc file CSV: {e}")
        return

    # Kiểm tra các cột cần thiết
    if 'Label' not in df.columns:
        print("Lỗi: File CSV thiếu cột 'Label'")
        return
    
    # Tạo cột image_url giả định nếu chưa có (để script không lỗi nếu file thiếu cột này)
    # Nếu file của bạn cột ảnh tên là 'images' hoặc 'image_path', hãy đổi tên ở đây
    image_col_name = 'image_url' 
    if image_col_name not in df.columns:
        print(f"Cảnh báo: Không thấy cột '{image_col_name}'. Sẽ coi như không có ảnh.")
        df[image_col_name] = np.nan

    # 3. Lọc dữ liệu: Chỉ lấy Label != 0 (Class tìm đồ/mất đồ)
    print(f"Số lượng mẫu ban đầu: {len(df)}")
    df_filtered = df[df['Label'] != 0].copy()
    print(f"Số lượng mẫu sau khi lọc (Label != 0): {len(df_filtered)}")

    # Reset index để loop cho đẹp
    df_filtered.reset_index(drop=True, inplace=True)

    # List chứa kết quả
    text_embeddings = []
    image_embeddings = []

    # 4. Vòng lặp xử lý (Dùng tqdm để hiện thanh tiến trình)
    print("--- Bắt đầu tạo Embedding ---")
    for index, row in tqdm(df_filtered.iterrows(), total=df_filtered.shape[0]):
        
        # --- XỬ LÝ TEXT ---
        content = str(row['content']) if pd.notna(row['content']) else ""
        if content.strip():
            # Gọi hàm từ class của bạn
            # Lưu ý: Class của bạn có tích hợp dịch (Google Translator) nên sẽ tốn chút thời gian
            vec_text = embedder.get_embedding(content, input_type='text')
        else:
            vec_text = None
        text_embeddings.append(vec_text)

        # --- XỬ LÝ ẢNH ---
        # Class của bạn đang viết hàm get_image_from_url -> Nhận vào URL
        img_url = row[image_col_name]
        vec_img = None
        
        if pd.notna(img_url) and str(img_url).strip() != "":
            try:
                # Gọi hàm embedding ảnh
                vec_img = embedder.get_embedding(img_url, input_type='image')
            except Exception as e:
                # Nếu lỗi tải ảnh thì bỏ qua
                vec_img = None
        
        image_embeddings.append(vec_img)

    # 5. Gán kết quả vào DataFrame
    df_filtered['text_embedding'] = text_embeddings
    df_filtered['image_embedding'] = image_embeddings

    # Xóa các dòng mà cả text và image đều lỗi (không có vector nào)
    df_final = df_filtered.dropna(subset=['text_embedding', 'image_embedding'], how='all')

    # 6. Lưu file
    print(f"--- Đang lưu kết quả ra: {output_csv_path} ---")
    # Lưu dưới dạng string representation của list để dễ đọc lại sau này, hoặc dùng pickle
    df_final.to_csv(output_csv_path, index=False)
    print("Hoàn tất!")

if __name__ == "__main__":
    # Đổi tên file input của bạn ở đây
    INPUT_FILE = "merged_data.csv" # Hoặc "_daihocbachkhoadanang2021.csv"
    OUTPUT_FILE = "embedded_data.csv"
    
    process_csv_to_embeddings(INPUT_FILE, OUTPUT_FILE)