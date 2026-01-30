import pandas as pd
import os
import requests
from io import BytesIO
from PIL import Image
from sklearn.model_selection import train_test_split
from tqdm import tqdm
import concurrent.futures

# print("--- DEBUG PATH ---")
# print("Thư mục hiện tại (CWD):", os.getcwd())
# print("Danh sách đường dẫn Python tìm kiếm (sys.path):")
# import sys
# for p in sys.path:
#     print(p)
# print("------------------")
# exit(0)
from ml_prefiltering.data_reading import data_reading

# Cấu hình
IMAGE_DIR = 'images'
DATA_DIR = 'data'
os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

def download_single_image(url, save_path):
    """Hàm tải 1 ảnh, trả về path nếu thành công, None nếu lỗi"""
    if pd.isna(url) or url == 'NO_IMAGE':
        return 'NO_IMAGE'
    
    if os.path.exists(save_path):
        return save_path

    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            image = Image.open(BytesIO(response.content)).convert("RGB")
            image.save(save_path)
            return save_path
    except Exception as e:
        # print(f"Error downloading {url}: {e}")
        pass
    return None

def prepare_data():
    print(">>> Đang đọc và xử lý dữ liệu...")

    data_dir = "C:/Contests_2025/AIReFound/ai_engine/data"
    file_names = [f for f in os.listdir(data_dir) if f.endswith(('.csv', '.xlsx')) and f != "C:/Contests_2025/AIReFound/ai_engine/data/_DaiHocKienTruc.xlsx"]
    df_label = data_reading(data_dir, file_names)

    data_dir = "C:/Contests_2025/AIReFound/ai_engine/data/raw_data"
    file_names = [f for f in os.listdir(data_dir) if f.endswith(('.csv', '.xlsx'))]
    df_info = data_reading(data_dir, file_names)
    # 1. Đọc dữ liệu
    # df_label = pd.read_csv('_daihocbachkhoadanang2021.csv')
    # df_info = pd.read_csv('daihocbachkhoadanang2021.csv')

    # 2. Xử lý sơ bộ
    df_label = df_label.drop_duplicates(subset=['content'])
    df_info = df_info.drop_duplicates(subset=['content'])

    # 3. Merge dữ liệu
    df = pd.merge(df_label, df_info, on='content', how='inner')
    print(f"Tổng số bài viết sau khi merge: {len(df)}")

    # Limit "Label = 0"
    class_0_data = df[df['Label'] == 0]
    other_classes_data = df[df['Label'] != 0]

    # 2. Lấy ngẫu nhiên 40 mẫu từ Class 0
    if len(class_0_data) >= 120:
        class_0_downsampled = class_0_data.sample(n=120, random_state=42)
    else:
        print(f"Cảnh báo: Class 0 chỉ có {len(class_0_data)} mẫu (ít hơn 40). Đang giữ nguyên.")
        class_0_downsampled = class_0_data

    # 3. Gộp lại thành DataFrame mới
    df = pd.concat([class_0_downsampled, other_classes_data], axis=0, ignore_index=True)

    # 4. Xáo trộn lại toàn bộ dataframe (Shuffle)
    # Bước này quan trọng để khi train/test split không bị dồn cục class 0 vào một chỗ
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    print("\n--- Sau khi downsample (Class 0 còn 40) ---")
    print(df['Label'].value_counts())
    # exit(0)
    df_full = df

    # 4. Xử lý trường hợp KHÔNG CÓ ẢNH (NaN)
    # Gán giá trị đặc biệt để dataset biết mà tạo ảnh đen
    df_full['image_url'] = df_full['image_url'].fillna('NO_IMAGE')

    # 5. Xử lý trường hợp NHIỀU ẢNH (ngăn cách bởi dấu phẩy hoặc xuống dòng)
    # Giả sử link cách nhau bởi dấu phẩy, nếu là ký tự khác bạn đổi dòng này
    df_full['image_url'] = df_full['image_url'].astype(str).str.replace('\n', ',')
    df_full['image_url'] = df_full['image_url'].str.split(',')
    
    # Explode: Tách 1 dòng chứa list ảnh thành nhiều dòng
    df_full = df_full.explode('image_url')
    
    # Xóa các link rỗng sau khi split (nếu có)
    df_full = df_full[df_full['image_url'].str.strip() != '']
    print(f"Tổng số mẫu training (sau khi tách ảnh): {len(df_full)}")

    # 6. Download ảnh (Sử dụng đa luồng để tải nhanh)
    print(">>> Đang tải ảnh về thư mục 'images/'...")
    
    image_paths = []
    urls = df_full['image_url'].tolist()
    
    # Tạo tên file ảnh dựa trên index để tránh trùng
    # (Lưu ý: cách này đơn giản, nhưng nếu chạy lại cần đảm bảo index khớp)
    # Tốt hơn là dùng hash của URL, nhưng ở đây dùng index cho gọn
    save_names = [os.path.join(IMAGE_DIR, f"img_{i}.jpg") for i in range(len(urls))]

    # Dùng ThreadPoolExecutor để tải song song
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = list(tqdm(executor.map(download_single_image, urls, save_names), total=len(urls)))
    
    df_full['image_path'] = results
    
    # Lọc bỏ những ảnh lỗi tải về (nhưng giữ lại NO_IMAGE)
    # Nếu muốn giữ lại bài viết kể cả khi lỗi ảnh -> thay None bằng 'NO_IMAGE'
    df_full['image_path'] = df_full['image_path'].fillna('NO_IMAGE')
    
    # 7. Phân chia Train/Val
    train_df, val_df = train_test_split(
        df_full, test_size=0.2, random_state=42, stratify=df_full['Label']
    )

    # 8. Lưu kết quả
    train_df.to_csv(f'{DATA_DIR}/train.csv', index=False)
    val_df.to_csv(f'{DATA_DIR}/val.csv', index=False)
    print(">>> Hoàn tất! Đã lưu data/train.csv và data/val.csv")

if __name__ == "__main__":
    prepare_data()