import pandas as pd
import os
from typing import List # Nếu dùng Python < 3.9

# Cú pháp chuẩn: input là list các string, output là DataFrame
def data_reading(data_dir: str, filenames: list[str]) -> pd.DataFrame:
    dfs = []
    # Lưu ý: Nên dùng os.path.join để nối đường dẫn an toàn, tránh lỗi thiếu dấu "/"
    
    for filename in filenames:
        file_path = os.path.join(data_dir, filename)
        
        # Cần kiểm tra đuôi file vì bạn có cả file Excel lẫn CSV
        try:
            if filename.endswith('.csv'):
                df = pd.read_csv(file_path)
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path)
            else:
                print(f"Bỏ qua file không hỗ trợ: {filename}")
                continue
            
            dfs.append(df)
        except Exception as e:
            print(f"Lỗi khi đọc file {filename}: {e}")

    # Kiểm tra nếu danh sách rỗng để tránh lỗi concat
    if not dfs:
        return pd.DataFrame() 
    
    combined_rows_df = pd.concat(dfs, axis=0, ignore_index=True)
    return combined_rows_df