import pandas as pd
from ml_prefiltering.data_reading import data_reading

file_names = [
    "_daihocduytanlabel.csv", 
    "_daihocsuphamlabel.csv",
    "_daihocbachkhoadanang2021.csv",
    "_DUTnew.csv",
    "_UEDnew.csv"
]
data_dir = "C:/Contests_2025/AIReFound/ai_engine/data"
df_label = data_reading(data_dir, file_names)

file_names = [
    "daihocduytan.csv", 
    "daihocsupham.csv",
    "daihocbachkhoadanang2021.csv",
    "DUTnew.csv",
    "UEDnew.csv"
]
data_dir = "C:/Contests_2025/AIReFound/ai_engine/data/raw_data"
df_main = data_reading(data_dir, file_names)

# # 1. Đọc dữ liệu từ 2 file csv
# # File chứa thông tin ảnh
# df_main = pd.read_csv("daihocbachkhoadanang2021.csv")
# # File chứa nhãn (Label)
# df_label = pd.read_csv("_daihocbachkhoadanang2021.csv")

# 2. Gộp nhãn vào dataframe chính (giả sử thứ tự dòng tương ứng nhau)
# Kiểm tra sơ bộ thì 2 file này khớp nhau về số dòng và nội dung
df_main['Label'] = df_label['Label']

# 3. Định nghĩa các điều kiện
# Điều kiện 1: Label khác 0
cond_label_diff_0 = df_main['Label'] != 0

# Điều kiện 2: Không có link ảnh (NaN, chuỗi rỗng hoặc 'N/A')
# image_url là NaN
cond_img_nan = df_main['image_url'].isna()
# image_url là chuỗi rỗng
cond_img_empty = df_main['image_url'] == ''
# image_url là "N/A" (nếu có)
cond_img_na_str = df_main['image_url'].astype(str).str.lower() == 'n/a'

cond_no_img = cond_img_nan | cond_img_empty | cond_img_na_str

# 4. Lọc dữ liệu và đếm
result_df = df_main[cond_label_diff_0 & cond_no_img]
count = len(result_df)

print(f"Số lượng sample có label khác 0 và không có link ảnh là: {count}")

# (Tùy chọn) Xem các dòng này
# print(result_df[['content', 'Label', 'image_url']])