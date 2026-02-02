# Sử dụng Image có sẵn Playwright + Python
FROM mcr.microsoft.com/playwright/python:v1.58.0-jammy

# Ngăn Python buffer output, giúp log hiện ngay lập tức trên HF Spaces
ENV PYTHONUNBUFFERED=1

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy requirements và cài đặt thư viện Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ code vào
COPY . .

# Mở cổng 7860 (Cổng mặc định của Hugging Face Spaces)
EXPOSE 7860

# Lệnh chạy server FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]