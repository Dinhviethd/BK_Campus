import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from transformers import AutoTokenizer, get_linear_schedule_with_warmup
from torch.optim import AdamW
import numpy as np
from tqdm import tqdm
import os
import sys

from dataset import PhoBertDataset
from model import TextClassifier

current_script_path = os.path.abspath(__file__)
core1_dir = os.path.dirname(current_script_path)

# 2. Lấy folder cha (folder chứa cả core1 và data)
parent_dir = os.path.dirname(core1_dir)

# 3. Tạo đường dẫn tuyệt đối đến folder data
data_dir = os.path.join(parent_dir, 'data')
DATA_DIR = data_dir
# --- CẤU HÌNH ---
# DATA_DIR = 'data' # Thư mục chứa train.csv, val.csv
MODEL_SAVE_PATH = 'best_model.pth'
PRETRAINED_MODEL = 'vinai/phobert-base-v2'
MAX_LEN = 256
BATCH_SIZE = 8 # Giảm xuống 8 nếu VRAM yếu
EPOCHS = 15
LEARNING_RATE = 2e-5
NUM_CLASSES = 3 # Trash, Lost, Found

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Training on: {device}")

def train_epoch(model, data_loader, loss_fn, optimizer, scheduler, device, n_examples):
    model = model.train()
    losses = []
    correct_predictions = 0

    for d in tqdm(data_loader, desc="Training"):
        input_ids = d["input_ids"].to(device)
        attention_mask = d["attention_mask"].to(device)
        targets = d["labels"].to(device)

        outputs = model(
            input_ids=input_ids,
            attention_mask=attention_mask
        )

        _, preds = torch.max(outputs, dim=1)
        loss = loss_fn(outputs, targets)

        correct_predictions += torch.sum(preds == targets)
        losses.append(loss.item())

        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
        scheduler.step()
        optimizer.zero_grad()

    return correct_predictions.double() / n_examples, np.mean(losses)

def eval_model(model, data_loader, loss_fn, device, n_examples):
    model = model.eval()
    losses = []
    correct_predictions = 0

    with torch.no_grad():
        for d in data_loader:
            input_ids = d["input_ids"].to(device)
            attention_mask = d["attention_mask"].to(device)
            targets = d["labels"].to(device)

            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            _, preds = torch.max(outputs, dim=1)
            loss = loss_fn(outputs, targets)

            correct_predictions += torch.sum(preds == targets)
            losses.append(loss.item())

    return correct_predictions.double() / n_examples, np.mean(losses)

def main():
    tokenizer = AutoTokenizer.from_pretrained(PRETRAINED_MODEL)

    train_dataset = PhoBertDataset(os.path.join(DATA_DIR, 'train.csv'), tokenizer, MAX_LEN)
    val_dataset = PhoBertDataset(os.path.join(DATA_DIR, 'val.csv'), tokenizer, MAX_LEN)

    train_data_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    val_data_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE)

    model = TextClassifier(NUM_CLASSES, PRETRAINED_MODEL)
    model = model.to(device)

    optimizer = AdamW(model.parameters(), lr=LEARNING_RATE)
    total_steps = len(train_data_loader) * EPOCHS
    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=0,
        num_training_steps=total_steps
    )
    loss_fn = nn.CrossEntropyLoss().to(device)

    best_accuracy = 0

    for epoch in range(EPOCHS):
        print(f'Epoch {epoch + 1}/{EPOCHS}')
        print('-' * 10)

        train_acc, train_loss = train_epoch(
            model, train_data_loader, loss_fn, optimizer, scheduler, device, len(train_dataset)
        )
        print(f'Train loss {train_loss} accuracy {train_acc}')

        val_acc, val_loss = eval_model(
            model, val_data_loader, loss_fn, device, len(val_dataset)
        )
        print(f'Val   loss {val_loss} accuracy {val_acc}')

        if val_acc > best_accuracy:
            torch.save(model.state_dict(), MODEL_SAVE_PATH)
            best_accuracy = val_acc
            print(f"=> New best model saved with accuracy: {best_accuracy}")

if __name__ == '__main__':
    main()