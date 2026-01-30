from data_preprocessing import preprocessing
from data_reading import data_reading
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from lazypredict.Supervised import LazyClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import LinearSVC
from sklearn.metrics import classification_report
from underthesea import word_tokenize
import os

data_dir = "C:/Contests_2025/AIReFound/ai_engine/data"
file_names = [f for f in os.listdir(data_dir) if f.endswith(('.csv', '.xlsx'))]

# Data Reading
combined_rows_df = data_reading(data_dir, file_names)

print("--- Trước khi downsample ---")
print(combined_rows_df['Label'].value_counts())

# Data Preprocessing
df = preprocessing(combined_rows_df)
# print(df['Label'].value_counts())
# exit(0)

# Data Converting to training for ML
df['Label'] = df['Label'].replace(2, 1)
print("--- Sau khi lọc rule based ---")
print(df['Label'].value_counts())

# Balancing data
# 1. Tách dữ liệu thành 2 phần: Class 0 và Các class còn lại
class_0_data = df[df['Label'] == 0]
other_classes_data = df[df['Label'] != 0]

# 2. Lấy ngẫu nhiên 40 mẫu từ Class 0
if len(class_0_data) >= 400:
    class_0_downsampled = class_0_data.sample(n=400, random_state=42)
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

# Data Splitting and Training
x = df["content"]
y = df["Label"]
x_train, x_test, y_train, y_test = train_test_split(
    x,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

def vietnamese_tokenizer(text):
    # word_tokenize trả về list: ['Học máy', 'là', ...]
    tokens = word_tokenize(text)
    return tokens

model = Pipeline(steps=[
    ("vectorizer",  TfidfVectorizer(tokenizer=vietnamese_tokenizer, ngram_range=(1, 2), min_df=1)),
    # ("scaler", StandardScaler()),
    ("classifer", LinearSVC(random_state=42, tol=1e-5))

])

model.fit(x_train, y_train)
y_predict = model.predict(x_test)
print(classification_report(y_test, y_predict))

import joblib
joblib.dump(model, 'ml_model_svc.joblib')

# --- BENCHMARKING MODELS ---
# vectorizer = TfidfVectorizer(tokenizer=vietnamese_tokenizer, ngram_range=(1, 2), min_df=1)

# x_train = vectorizer.fit_transform(x_train)
# x_test = vectorizer.transform(x_test)

# clf = LazyClassifier(verbose=0, ignore_warnings=True, custom_metric=None)
# models, predictions = clf.fit(x_train.toarray(), x_test.toarray(), y_train, y_test)

# # Create a DataFrame
# df_2 = pd.DataFrame(models)
# # Write DataFrame to a CSV file
# df_2.to_csv('output.csv')

# # 3. PHÂN TÍCH KẾT QUẢ

# # Case A: False Negative (NGUY HIỂM NHẤT)
# # Là những bài Label=1 (Quan trọng) nhưng Filter=0 (Bị xóa)
# wrongly_removed = df[(df['Label'] == 1) & (df['Label'] == 2) & (df['prefilter'] == 0)]

# # Case B: True Negative (Lọc đúng)
# # Là những bài Label=0 (Rác) và Filter=0 (Đã xóa đúng)
# correctly_removed = df[(df['Label'] == 0) & (df['prefilter'] == 0)]

# # Case C: False Positive (Lọt lưới)
# # Là những bài Label=0 (Rác) nhưng Filter=1 (Vẫn giữ lại) -> Cái này model ML sau này sẽ lo
# missed_spam = df[(df['Label'] == 0) & (df['prefilter'] == 1)]
# # 4. IN BÁO CÁO
# print(f"\n=== KẾT QUẢ ĐÁNH GIÁ ===")
# print(f"1. Số bài quan trọng bị xóa nhầm (False Negative): {len(wrongly_removed)} (Cần = 0 là tốt nhất)")
# print(f"2. Số bài rác đã lọc được (True Negative): {len(correctly_removed)}")
# print(f"3. Số bài rác bị lọt lưới (False Positive): {len(missed_spam)}")
# exit(0)