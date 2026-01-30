import pandas as pd
df1 = pd.read_csv("C:/Users/PC/Downloads/_daihocbachkhoadanang2021.csv")
df2 = pd.read_csv("C:/Users/PC/Downloads/daihocbachkhoadanang2021.csv")


df = pd.merge(df1, df2, on='content')
print(df.head(10))
df.to_csv("merged_data.csv")