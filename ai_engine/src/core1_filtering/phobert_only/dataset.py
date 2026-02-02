import torch
from torch.utils.data import Dataset
import pandas as pd
from transformers import AutoTokenizer

class PhoBertDataset(Dataset):
    def __init__(self, csv_file, tokenizer, max_len=256):
        """
        Args:
            csv_file (str): Đường dẫn đến file train.csv hoặc val.csv
            tokenizer: Tokenizer của PhoBERT
            max_len (int): Độ dài tối đa của câu
        """
        self.df = pd.read_csv(csv_file)
        self.tokenizer = tokenizer
        self.max_len = max_len
        
        # Đảm bảo cột content là string
        self.df['content'] = self.df['content'].fillna("").astype(str)

    def __len__(self):
        return len(self.df)

    def __getitem__(self, index):
        text = self.df.loc[index, 'content']
        
        # Lấy nhãn (Label)
        # Giả định mapping từ data_splitting.py: 0=Trash, 1=Lost, 2=Found
        # Bạn cần kiểm tra lại file CSV xem cột label tên là 'Label' hay 'label'
        try:
            label = int(self.df.loc[index, 'Label'])
        except KeyError:
            # Fallback nếu tên cột khác
            label = int(self.df.loc[index, 'label'])

        encoding = self.tokenizer.encode_plus(
            text,
            add_special_tokens=True,
            max_length=self.max_len,
            return_token_type_ids=False,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt',
        )

        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(label, dtype=torch.long)
        }