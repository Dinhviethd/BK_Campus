import torch
from torch.utils.data import Dataset
from PIL import Image
import pandas as pd
from transformers import AutoTokenizer
from torchvision import transforms
import os

class LostFoundDataset(Dataset):
    def __init__(self, csv_file, tokenizer_name="vinai/phobert-base-v2", max_len=256, transform=None):
        self.data = pd.read_csv(csv_file)
        self.tokenizer = AutoTokenizer.from_pretrained(tokenizer_name)
        self.max_len = max_len
        self.transform = transform or self.get_default_transform()
        
    def get_default_transform(self):
        return transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def load_image(self, image_path):
        # Trường hợp 1: Không có ảnh (NO_IMAGE) hoặc path rỗng
        if pd.isna(image_path) or image_path == 'NO_IMAGE':
            return self.get_black_image()
        
        # Trường hợp 2: Có path ảnh
        try:
            if os.path.exists(image_path):
                return Image.open(image_path).convert("RGB")
            else:
                # File không tồn tại -> trả về ảnh đen
                return self.get_black_image()
        except Exception:
            return self.get_black_image()

    def get_black_image(self):
        # Tạo ảnh đen kích thước chuẩn
        return Image.new('RGB', (224, 224), color='black')

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        row = self.data.iloc[idx]
        text = str(row['content'])
        image_path = row['image_path']
        label = int(row['Label'])

        # Xử lý Text
        encoding = self.tokenizer.encode_plus(
            text,
            add_special_tokens=True,
            max_length=self.max_len,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt',
        )

        # Xử lý Image
        image = self.load_image(image_path)
        if self.transform:
            image = self.transform(image)

        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'pixel_values': image,
            'labels': torch.tensor(label, dtype=torch.long)
        }