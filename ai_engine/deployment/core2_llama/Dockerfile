FROM python:3.10

WORKDIR /app

# Copy các file cần thiết
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Mở port 7860 (Port mặc định của HF Spaces)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]