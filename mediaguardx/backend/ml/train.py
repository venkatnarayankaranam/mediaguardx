"""Simple training script for deepfake detection using EfficientNet (torchvision).

Usage example:
    python -m backend.ml.train --data-dir "path/to/ffpp/images" --epochs 5 --batch-size 32 --save-path ../models/deepfake_detector.pth

Expect `data_dir` to have `train/` and `val/` subfolders with `real/` and `fake/` class folders (ImageFolder layout).
"""
import argparse
import os
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import models

from backend.ml.dataset import get_datasets


def build_model(num_classes=2, device="cpu"):
    model = models.efficientnet_b0(pretrained=True)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(nn.Dropout(p=0.2), nn.Linear(in_features, num_classes))
    return model.to(device)


def train_one_epoch(model, loader, criterion, optimizer, device):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    for images, labels in loader:
        images = images.to(device)
        labels = labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        preds = outputs.argmax(dim=1)
        correct += (preds == labels).sum().item()
        total += images.size(0)

    return running_loss / total, correct / total


def validate(model, loader, criterion, device):
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            labels = labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)
            running_loss += loss.item() * images.size(0)
            preds = outputs.argmax(dim=1)
            correct += (preds == labels).sum().item()
            total += images.size(0)

    return running_loss / total, correct / total


def main(args):
    device = torch.device("cuda" if torch.cuda.is_available() and not args.no_cuda else "cpu")
    train_ds, val_ds = get_datasets(args.data_dir, image_size=args.image_size)
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=4)

    model = build_model(num_classes=2, device=device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=args.lr)

    best_val_acc = 0.0
    os.makedirs(os.path.dirname(args.save_path) or ".", exist_ok=True)

    for epoch in range(1, args.epochs + 1):
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = validate(model, val_loader, criterion, device)
        print(f"Epoch {epoch}/{args.epochs} | Train loss: {train_loss:.4f} acc: {train_acc:.4f} | Val loss: {val_loss:.4f} acc: {val_acc:.4f}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save({
                "model_state_dict": model.state_dict(),
                "arch": "efficientnet_b0",
                "num_classes": 2,
                "class_to_idx": train_ds.class_to_idx
            }, args.save_path)
            print(f"Saved best model to {args.save_path} (val_acc={val_acc:.4f})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", required=True, help="Root images dir (must contain train/ and val/)")
    parser.add_argument("--save-path", default="../models/deepfake_detector.pth", help="Path to save model")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--no-cuda", action="store_true")
    args = parser.parse_args()
    main(args)
