# quantize_safety.py
import torch
import torch.nn as nn
from transformers import CLIPModel, CLIPProcessor
from torch.onnx import export
from onnxruntime.quantization import quantize_dynamic, QuantType
import os

# Cấu hình
MODEL_NAME = "openai/clip-vit-base-patch32" # Bạn có thể đổi thành model distilled khác nếu có
OUTPUT_DIR = "onnx_quantized"
os.makedirs(OUTPUT_DIR, exist_ok=True)

class TextEncoderWrapper(nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model
    
    def forward(self, input_ids, attention_mask):
        return self.model.get_text_features(input_ids=input_ids, attention_mask=attention_mask)

class ImageEncoderWrapper(nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model
    
    def forward(self, pixel_values):
        return self.model.get_image_features(pixel_values=pixel_values)

def export_and_quantize():
    print(f"--- Đang tải model {MODEL_NAME} ---")
    device = "cpu" # Export ONNX cho CPU thì nên để model ở CPU
    model = CLIPModel.from_pretrained(MODEL_NAME).to(device)
    model.eval()

    # Dummy inputs để trace graph
    # dummy_input_ids = torch.randint(0, 100, (1, 77)).to(device)
    # dummy_attention_mask = torch.ones((1, 77)).to(device)
    # dummy_image = torch.randn(1, 3, 224, 224).to(device)

    dummy_input_ids = torch.randint(0, 100, (1, 77), dtype=torch.long).to(device)
    # attention_mask: BẮT BUỘC phải là int64 (Long) để khớp với tokenizer
    dummy_attention_mask = torch.ones((1, 77), dtype=torch.long).to(device) 
    # pixel_values: float32
    dummy_image = torch.randn(1, 3, 224, 224, dtype=torch.float32).to(device)

    # 1. Export Text Encoder
    print("\n[1/4] Exporting Text Encoder to ONNX...")
    text_model = TextEncoderWrapper(model)
    text_onnx_path = f"{OUTPUT_DIR}/text_encoder.onnx"
    text_quant_path = f"{OUTPUT_DIR}/text_encoder_quant.onnx"
    
    export(
        text_model,
        (dummy_input_ids, dummy_attention_mask),
        text_onnx_path,
        input_names=['input_ids', 'attention_mask'],
        output_names=['text_embeddings'],
        dynamic_axes={'input_ids': {0: 'batch_size'}, 'attention_mask': {0: 'batch_size'}},
        opset_version=14
    )

    # 2. Quantize Text Encoder
    print("[2/4] Quantizing Text Encoder...")
    quantize_dynamic(
        text_onnx_path,
        text_quant_path,
        weight_type=QuantType.QUInt8
    )

    # 3. Export Image Encoder
    print("\n[3/4] Exporting Image Encoder to ONNX...")
    vision_model = ImageEncoderWrapper(model)
    vision_onnx_path = f"{OUTPUT_DIR}/vision_encoder.onnx"
    vision_quant_path = f"{OUTPUT_DIR}/vision_encoder_quant.onnx"
    
    export(
        vision_model,
        (dummy_image,),
        vision_onnx_path,
        input_names=['pixel_values'],
        output_names=['image_embeddings'],
        dynamic_axes={'pixel_values': {0: 'batch_size'}},
        opset_version=14
    )

    # 4. Quantize Image Encoder
    print("[4/4] Quantizing Image Encoder...")
    quantize_dynamic(
        vision_onnx_path,
        vision_quant_path,
        weight_type=QuantType.QUInt8
    )

    print(f"\n✅ Hoàn tất! Model đã được lưu tại: {OUTPUT_DIR}")
    print(f"File cần dùng cho inference: \n - {text_quant_path} \n - {vision_quant_path}")

if __name__ == "__main__":
    export_and_quantize()