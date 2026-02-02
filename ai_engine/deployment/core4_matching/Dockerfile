# Sử dụng Python 3.10
FROM python:3.10-slim

# Cài đặt các system dependencies và Redis server
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Thiết lập user non-root (Bắt buộc đối với Hugging Face Spaces)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Thiết lập thư mục làm việc
WORKDIR $HOME/app

# Copy requirements và cài đặt
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ code
COPY --chown=user . .

# Cấp quyền thực thi cho script khởi động
RUN chmod +x start.sh

# Expose port 7860 (Port mặc định của HF Spaces)
EXPOSE 7860

# Chạy script khởi động
CMD ["./start.sh"]