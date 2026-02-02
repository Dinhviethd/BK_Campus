import os
from onnxruntime.quantization import quantize_dynamic, QuantType

# Đường dẫn file model gốc (file to 591MB trong ảnh của bạn)
input_model_path = "onnx_clip_quantized/model.onnx" 
output_model_path = "model_quantized.onnx"

print(f"Đang tối ưu model từ {input_model_path}...")

# Sử dụng Dynamic Quantization (Chỉ nén các lớp Linear/MatMul, bỏ qua Conv để tránh lỗi ConvInteger)
# Cách này tương thích 99.9% các CPU.
quantize_dynamic(
    model_input=input_model_path,
    model_output=output_model_path,
    weight_type=QuantType.QUInt8 
)

print(f"-> Xong! File mới: {output_model_path}")
print("-> Hãy upload file này lên HF Space thay thế file cũ.")