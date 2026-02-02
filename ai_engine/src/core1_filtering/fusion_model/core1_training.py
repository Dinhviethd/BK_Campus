import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from dataset import LostFoundDataset
from model import MultimodalClassifier
from tqdm import tqdm
import os

# CONFIG
BATCH_SIZE = 8 # Giảm nếu báo lỗi CUDA Out of Memory
EPOCHS = 15
LEARNING_RATE = 2e-5
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

def train_epoch(model, dataloader, criterion, optimizer):
    model.train()
    total_loss = 0
    correct = 0
    total = 0
    
    loop = tqdm(dataloader, desc='Train')
    for batch in loop:
        # Move data to GPU
        input_ids = batch['input_ids'].to(DEVICE)
        attention_mask = batch['attention_mask'].to(DEVICE)
        pixel_values = batch['pixel_values'].to(DEVICE)
        labels = batch['labels'].to(DEVICE)
        
        optimizer.zero_grad()
        
        # Forward -> Loss -> Backward
        outputs = model(input_ids, attention_mask, pixel_values)
        loss = criterion(outputs, labels)
        
        loss.backward()
        optimizer.step()
        
        # Metrics
        total_loss += loss.item()
        _, predicted = torch.max(outputs, 1)
        total += labels.size(0)
        correct += (predicted == labels).sum().item()
        
        loop.set_postfix(loss=total_loss/len(dataloader), acc=correct/total)
        
    return total_loss / len(dataloader), correct / total

def eval_epoch(model, dataloader, criterion):
    model.eval()
    total_loss = 0
    correct = 0
    total = 0
    
    with torch.no_grad():
        for batch in tqdm(dataloader, desc='Val'):
            input_ids = batch['input_ids'].to(DEVICE)
            attention_mask = batch['attention_mask'].to(DEVICE)
            pixel_values = batch['pixel_values'].to(DEVICE)
            labels = batch['labels'].to(DEVICE)
            
            outputs = model(input_ids, attention_mask, pixel_values)
            loss = criterion(outputs, labels)
            
            total_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
            
    return total_loss / len(dataloader), correct / total

def main():
    print(f"Using Device: {DEVICE}")
    
    # 1. Load Data
    # Lưu ý: Cần chạy data_splitting.py trước để có file csv này
    if not os.path.exists('data/train.csv'):
        print("Lỗi: Không tìm thấy file data/train.csv. Vui lòng chạy data_splitting.py trước!")
        return

    train_dataset = LostFoundDataset('data/train.csv')
    val_dataset = LostFoundDataset('data/val.csv')
    
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE)
    
    # 2. Model
    print("Loading Model (EfficientNet + PhoBERT)...")
    model = MultimodalClassifier(n_classes=3) 
    model.to(DEVICE)
    
    # 3. Setup
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE)
    
    best_acc = 0
    os.makedirs('checkpoints', exist_ok=True)
    
    # 4. Loop
    for epoch in range(EPOCHS):
        print(f"\nEpoch {epoch+1}/{EPOCHS}")
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer)
        val_loss, val_acc = eval_epoch(model, val_loader, criterion)
        
        print(f"Result: Train Loss: {train_loss:.4f}, Acc: {train_acc:.4f} || Val Loss: {val_loss:.4f}, Acc: {val_acc:.4f}")
        
        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(model.state_dict(), 'checkpoints/best_model.pth')
            print("--> Saved Best Model!")

if __name__ == "__main__":
    main()