import torch.nn as nn
from transformers import AutoModel

class TextClassifier(nn.Module):
    def __init__(self, n_classes=3, model_name='vinai/phobert-base-v2'):
        super(TextClassifier, self).__init__()
        self.bert = AutoModel.from_pretrained(model_name)
        self.drop = nn.Dropout(p=0.3)
        # Hidden size của PhoBERT base thường là 768
        self.out = nn.Linear(self.bert.config.hidden_size, n_classes)

    def forward(self, input_ids, attention_mask):
        # PhoBERT trả về tuple, phần tử đầu tiên là last_hidden_state
        # output shape: (batch_size, sequence_length, hidden_size)
        outputs = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask
        )
        
        # Lấy vector đặc trưng của token [CLS] (token đầu tiên) để phân loại
        # shape: (batch_size, hidden_size)
        cls_output = outputs.last_hidden_state[:, 0, :]
        
        output = self.drop(cls_output)
        return self.out(output)