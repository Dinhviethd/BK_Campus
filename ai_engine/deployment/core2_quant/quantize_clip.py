import os
from optimum.onnxruntime import ORTModelForFeatureExtraction, ORTQuantizer
from optimum.onnxruntime.configuration import AutoQuantizationConfig
from transformers import CLIPProcessor

# 1. Cấu hình
MODEL_ID = "openai/clip-vit-base-patch32"
OUTPUT_DIR = "onnx_clip_quantized"

def quantize_model():
    print(f"--- Bắt đầu tải và chuyển đổi model: {MODEL_ID} ---")
    
    # Bước 1: Load model và Export sang ONNX (chưa nén)
    # export=True sẽ tự động chuyển PyTorch -> ONNX
    model = ORTModelForFeatureExtraction.from_pretrained(
        MODEL_ID, 
        export=True
    )
    processor = CLIPProcessor.from_pretrained(MODEL_ID)
    
    # Lưu model ONNX gốc và processor
    model.save_pretrained(OUTPUT_DIR)
    processor.save_pretrained(OUTPUT_DIR)
    print("-> Đã export sang ONNX thành công.")

    # Bước 2: Lượng tử hóa (Quantization) sang Int8
    print("--- Bắt đầu lượng tử hóa (Int8) ---")
    quantizer = ORTQuantizer.from_pretrained(model)
    
    # Cấu hình lượng tử hóa Dynamic (Tối ưu cho CPU và các input độ dài thay đổi như text/ảnh)
    qconfig = AutoQuantizationConfig.avx512_vnni(is_static=False, per_channel=False)
    
    # Áp dụng lượng tử hóa lên file model.onnx vừa tạo
    quantizer.quantize(
        save_dir=OUTPUT_DIR,
        quantization_config=qconfig,
    )
    print(f"-> Hoàn tất! Model đã được lưu tại thư mục: {OUTPUT_DIR}")
    print("-> Hãy upload thư mục này lên HF Space.")

if __name__ == "__main__":
    quantize_model()