import pickle
import joblib
import pandas as pd
from data_reading import data_reading
from data_preprocessing import preprocessing
from sklearn.metrics import classification_report
import os

from underthesea import word_tokenize
def vietnamese_tokenizer(text):
    # word_tokenize trả về list: ['Học máy', 'là', ...]
    tokens = word_tokenize(text)
    return tokens

# with open('ml_model_svc.pkl', 'rb') as file:
#     model = pickle.load(file)

model = joblib.load('ml_model_svc.joblib')

data_dir = "C:/Contests_2025/AIReFound/ai_engine/data"
file_names = [f for f in os.listdir(data_dir) if f.endswith(('.csv', '.xlsx'))]

# Data Reading
combined_rows_df = data_reading(data_dir, file_names)
# Data Preprocessing
df = preprocessing(combined_rows_df)
# Data Converting to inference
# df['Label'] = df['Label'].replace(2, 1)

x = df["content"]
y = df["Label"]
# x = ["cần tìm hộp bút như hình ạ", "tìm được hộp bút ở phòng F103, liên hệ phòng nước để lấy lại nha"]
y_predict = model.predict(x)
print(y_predict)
# exit(0)

print(classification_report(y, y_predict))
print("--Actual--")
print(pd.Series(y).value_counts())
print("--Predict--")
print(pd.Series(y_predict).value_counts())



