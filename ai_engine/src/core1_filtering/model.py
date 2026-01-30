import torch
import torch.nn as nn
from transformers import AutoModel
import torchvision.models as models

class MultimodalClassifier(nn.Module):
    def __init__(self, n_classes=3, text_model_name="vinai/phobert-base-v2"):
        super(MultimodalClassifier, self).__init__()
        
        # Text Encoder: PhoBERT
        self.text_encoder = AutoModel.from_pretrained(text_model_name)
        self.text_hidden_size = 768
        
        # Image Encoder: EfficientNet B0
        self.image_encoder = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
        self.image_hidden_size = 1280
        self.image_encoder.classifier = nn.Identity() # Bỏ lớp classifier cuối
        
        # Fusion Layer
        self.fusion = nn.Sequential(
            nn.Linear(self.text_hidden_size + self.image_hidden_size, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, n_classes)
        )

    def forward(self, input_ids, attention_mask, pixel_values):
        # Text
        text_out = self.text_encoder(input_ids=input_ids, attention_mask=attention_mask)
        text_features = text_out.last_hidden_state[:, 0, :] # CLS token
        
        # Image
        image_features = self.image_encoder(pixel_values)
        
        # Concat
        combined_features = torch.cat((text_features, image_features), dim=1)
        
        # Output
        logits = self.fusion(combined_features)
        return logits