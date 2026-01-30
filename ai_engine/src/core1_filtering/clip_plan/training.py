import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
from sklearn.model_selection import train_test_split

# ==========================================
# 1. CẤU HÌNH (CONFIG)
# ==========================================
CONFIG = {
    'input_dim': 512,       # Kích thước vector của CLIP (ViT-B/32 là 512, ViT-L/14 là 768)
    'hidden_dim': 256,      # Số node lớp ẩn
    'num_classes': 3,       # 0: Tìm chủ, 1: Tìm đồ, 2: Rác
    'dropout_rate': 0.3,    # Tránh overfit
    'batch_size': 32,
    'learning_rate': 1e-3,
    'num_epochs': 20,
    'device': 'cuda' if torch.cuda.is_available() else 'cpu'
}

print(f"Using device: {CONFIG['device']}")

# ==========================================
# 2. XÂY DỰNG DATASET
# ==========================================
class LostFoundDataset(Dataset):
    def __init__(self, img_embeds, text_embeds, labels):
        """
        img_embeds: Tensor shape [N, 512]
        text_embeds: Tensor shape [N, 512]
        labels: Tensor shape [N] (0, 1, hoặc 2)
        """
        self.img_embeds = img_embeds
        self.text_embeds = text_embeds
        self.labels = labels

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        return {
            'img': self.img_embeds[idx],
            'text': self.text_embeds[idx],
            'label': self.labels[idx]
        }

# ==========================================
# 3. KIẾN TRÚC MODEL (SIMPLE FUSION)
# ==========================================
class SimpleFusionClassifier(nn.Module):
    def __init__(self, input_dim, hidden_dim, num_classes, dropout_rate):
        super(SimpleFusionClassifier, self).__init__()
        
        # Tổng input dim = dim ảnh + dim text
        self.fusion_dim = input_dim * 2 
        
        self.network = nn.Sequential(
            # Layer 1: Fusion & Processing
            nn.Linear(self.fusion_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim), # Giúp hội tụ nhanh và ổn định hơn
            nn.ReLU(),
            nn.Dropout(dropout_rate),   # Quan trọng để tránh học vẹt
            
            # Layer 2: Classification Head
            nn.Linear(hidden_dim, num_classes)
        )

    def forward(self, img_emb, text_emb):
        # 1. Fusion: Nối 2 vector lại với nhau (Concatenation)
        # img_emb: [Batch, 512], text_emb: [Batch, 512] -> combined: [Batch, 1024]
        combined = torch.cat((img_emb, text_emb), dim=1)
        
        # 2. Feed forward
        logits = self.network(combined)
        return logits

# ==========================================
# 4. CHUẨN BỊ DỮ LIỆU GIẢ LẬP (DUMMY DATA)
# ==========================================
# Trong thực tế, bạn sẽ load file .npy hoặc .pt mà bạn đã trích xuất từ CLIP
def generate_dummy_data(num_samples=1000):
    # Tạo vector ngẫu nhiên giả lập output của CLIP
    img_data = torch.randn(num_samples, CONFIG['input_dim'])
    text_data = torch.randn(num_samples, CONFIG['input_dim'])
    # Nhãn ngẫu nhiên 0, 1, 2
    labels = torch.randint(0, CONFIG['num_classes'], (num_samples,))
    return img_data, text_data, labels

print("Đang tạo dữ liệu giả lập...")
X_img, X_text, y = generate_dummy_data()

# Chia train/val
X_img_train, X_img_val, X_text_train, X_text_val, y_train, y_val = train_test_split(
    X_img, X_text, y, test_size=0.2, random_state=42
)

# Tạo DataLoader
train_dataset = LostFoundDataset(X_img_train, X_text_train, y_train)
val_dataset = LostFoundDataset(X_img_val, X_text_val, y_val)

train_loader = DataLoader(train_dataset, batch_size=CONFIG['batch_size'], shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=CONFIG['batch_size'], shuffle=False)

# ==========================================
# 5. HUẤN LUYỆN (TRAINING LOOP)
# ==========================================
def train():
    # Khởi tạo model
    model = SimpleFusionClassifier(
        CONFIG['input_dim'], 
        CONFIG['hidden_dim'], 
        CONFIG['num_classes'], 
        CONFIG['dropout_rate']
    ).to(CONFIG['device'])

    # Loss và Optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=CONFIG['learning_rate'])

    print("Bắt đầu training...")
    
    for epoch in range(CONFIG['num_epochs']):
        # --- TRAIN ---
        model.train()
        running_loss = 0.0
        correct_train = 0
        total_train = 0
        
        for batch in train_loader:
            img = batch['img'].to(CONFIG['device'])
            text = batch['text'].to(CONFIG['device'])
            labels = batch['label'].to(CONFIG['device'])

            # Zero gradients
            optimizer.zero_grad()

            # Forward
            outputs = model(img, text)
            loss = criterion(outputs, labels)

            # Backward
            loss.backward()
            optimizer.step()

            # Thống kê
            running_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total_train += labels.size(0)
            correct_train += (predicted == labels).sum().item()

        epoch_loss = running_loss / len(train_loader)
        train_acc = 100 * correct_train / total_train

        # --- VALIDATION ---
        model.eval()
        correct_val = 0
        total_val = 0
        with torch.no_grad():
            for batch in val_loader:
                img = batch['img'].to(CONFIG['device'])
                text = batch['text'].to(CONFIG['device'])
                labels = batch['label'].to(CONFIG['device'])

                outputs = model(img, text)
                _, predicted = torch.max(outputs.data, 1)
                total_val += labels.size(0)
                correct_val += (predicted == labels).sum().item()
        
        val_acc = 100 * correct_val / total_val

        print(f"Epoch [{epoch+1}/{CONFIG['num_epochs']}] "
              f"Loss: {epoch_loss:.4f} | Train Acc: {train_acc:.2f}% | Val Acc: {val_acc:.2f}%")

    print("Training hoàn tất!")
    
    # Lưu model
    torch.save(model.state_dict(), "fusion_classifier.pth")
    print("Đã lưu model tại 'fusion_classifier.pth'")

# ==========================================
# 6. HÀM INFERENCE (DỰ ĐOÁN THỰC TẾ)
# ==========================================
def predict_single(model, img_vector, text_vector):
    """
    Hàm này dùng khi bạn đưa vào hệ thống thật
    """
    model.eval()
    with torch.no_grad():
        # Đảm bảo input có dimension batch [1, 512]
        if img_vector.dim() == 1: img_vector = img_vector.unsqueeze(0)
        if text_vector.dim() == 1: text_vector = text_vector.unsqueeze(0)
        
        outputs = model(img_vector.to(CONFIG['device']), text_vector.to(CONFIG['device']))
        probabilities = torch.nn.functional.softmax(outputs, dim=1)
        _, predicted_class = torch.max(outputs, 1)
        
        classes = ["Tìm chủ", "Tìm đồ", "Rác"]
        return classes[predicted_class.item()], probabilities

# CHẠY TRAINING
if __name__ == "__main__":
    train()