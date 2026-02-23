"""Train EfficientNet-B0 deepfake detector on local dataset.

Usage:
    python ml/train_model.py --data_dir ../test_dataset --epochs 30 --batch_size 16

The script:
1. Loads images from data_dir/fake/ and data_dir/real/
2. Splits 80/20 into train/val
3. Fine-tunes EfficientNet-B0 (pretrained on ImageNet) with aggressive augmentation
4. Saves the best checkpoint to models/deepfake_detector.pth
5. Prints accuracy metrics and confusion matrix
"""
import argparse
import logging
import os
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset, random_split
from torchvision import transforms, models
from PIL import Image
from sklearn.metrics import classification_report, confusion_matrix

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class DeepfakeDataset(Dataset):
    """Simple image dataset: fake/ and real/ folders."""

    def __init__(self, root_dir: str, transform=None):
        self.transform = transform
        self.samples = []
        self.class_to_idx = {"fake": 0, "real": 1}

        for label_name, label_idx in self.class_to_idx.items():
            folder = Path(root_dir) / label_name
            if not folder.exists():
                logger.warning("Missing folder: %s", folder)
                continue
            for img_path in sorted(folder.glob("*.jpg")):
                self.samples.append((str(img_path), label_idx))
            for img_path in sorted(folder.glob("*.png")):
                self.samples.append((str(img_path), label_idx))

        logger.info(
            "Dataset: %d images (%d fake, %d real)",
            len(self.samples),
            sum(1 for _, l in self.samples if l == 0),
            sum(1 for _, l in self.samples if l == 1),
        )

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label


def build_transforms():
    """Build train and val transforms with aggressive augmentation for training."""
    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomCrop(224),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.1),
        transforms.RandomGrayscale(p=0.1),
        transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 2.0)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        transforms.RandomErasing(p=0.2),
    ])

    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    return train_transform, val_transform


def build_model(num_classes: int = 2, freeze_backbone: bool = False):
    """Build EfficientNet-B0 with custom classifier head."""
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)

    if freeze_backbone:
        for param in model.features.parameters():
            param.requires_grad = False

    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(in_features, 128),
        nn.ReLU(),
        nn.Dropout(p=0.2),
        nn.Linear(128, num_classes),
    )

    return model


def train_one_epoch(model, loader, criterion, optimizer, device, scaler):
    """Train for one epoch with mixed precision."""
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()
        with torch.amp.autocast(device_type="cuda"):
            outputs = model(images)
            loss = criterion(outputs, labels)

        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()

        running_loss += loss.item() * images.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

    return running_loss / total, 100.0 * correct / total


@torch.no_grad()
def validate(model, loader, criterion, device):
    """Validate model on validation set."""
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    all_preds = []
    all_labels = []

    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)

        with torch.amp.autocast(device_type="cuda"):
            outputs = model(images)
            loss = criterion(outputs, labels)

        running_loss += loss.item() * images.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
        all_preds.extend(predicted.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())

    return running_loss / total, 100.0 * correct / total, all_preds, all_labels


def main():
    parser = argparse.ArgumentParser(description="Train deepfake detector")
    parser.add_argument("--data_dir", type=str, default="../test_dataset")
    parser.add_argument("--output", type=str, default="models/deepfake_detector.pth")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--val_split", type=float, default=0.2)
    parser.add_argument("--patience", type=int, default=8)
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("Device: %s", device)
    if device.type == "cuda":
        logger.info("GPU: %s", torch.cuda.get_device_name(0))

    # Build dataset
    train_tf, val_tf = build_transforms()
    full_dataset = DeepfakeDataset(args.data_dir, transform=None)

    if len(full_dataset) == 0:
        logger.error("No images found in %s", args.data_dir)
        sys.exit(1)

    # Split dataset
    val_size = int(len(full_dataset) * args.val_split)
    train_size = len(full_dataset) - val_size

    generator = torch.Generator().manual_seed(42)
    train_indices, val_indices = random_split(
        range(len(full_dataset)), [train_size, val_size], generator=generator
    )

    # Create datasets with appropriate transforms
    class TransformSubset(Dataset):
        def __init__(self, dataset, indices, transform):
            self.dataset = dataset
            self.indices = list(indices)
            self.transform = transform

        def __len__(self):
            return len(self.indices)

        def __getitem__(self, idx):
            path, label = self.dataset.samples[self.indices[idx]]
            img = Image.open(path).convert("RGB")
            if self.transform:
                img = self.transform(img)
            return img, label

    train_set = TransformSubset(full_dataset, train_indices, train_tf)
    val_set = TransformSubset(full_dataset, val_indices, val_tf)

    train_loader = DataLoader(
        train_set, batch_size=args.batch_size, shuffle=True,
        num_workers=0, pin_memory=True,
    )
    val_loader = DataLoader(
        val_set, batch_size=args.batch_size, shuffle=False,
        num_workers=0, pin_memory=True,
    )

    logger.info("Train: %d images, Val: %d images", len(train_set), len(val_set))

    # Phase 1: Freeze backbone, train classifier head (5 epochs)
    logger.info("=== Phase 1: Training classifier head (backbone frozen) ===")
    model = build_model(num_classes=2, freeze_backbone=True).to(device)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.lr, weight_decay=1e-4,
    )
    scaler = torch.amp.GradScaler()

    for epoch in range(5):
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device, scaler)
        val_loss, val_acc, _, _ = validate(model, val_loader, criterion, device)
        logger.info(
            "Phase1 Epoch %d/5: train_loss=%.4f train_acc=%.1f%% val_loss=%.4f val_acc=%.1f%%",
            epoch + 1, train_loss, train_acc, val_loss, val_acc,
        )

    # Phase 2: Unfreeze backbone, fine-tune everything with lower LR
    logger.info("=== Phase 2: Fine-tuning full model ===")
    for param in model.parameters():
        param.requires_grad = True

    optimizer = optim.AdamW(model.parameters(), lr=args.lr * 0.1, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)

    best_val_acc = 0.0
    patience_counter = 0
    best_state = None

    for epoch in range(args.epochs):
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device, scaler)
        val_loss, val_acc, preds, labels = validate(model, val_loader, criterion, device)
        scheduler.step()

        lr = optimizer.param_groups[0]["lr"]
        logger.info(
            "Phase2 Epoch %d/%d: train_loss=%.4f train_acc=%.1f%% val_loss=%.4f val_acc=%.1f%% lr=%.6f",
            epoch + 1, args.epochs, train_loss, train_acc, val_loss, val_acc, lr,
        )

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            patience_counter = 0
            best_state = {
                "model_state_dict": model.state_dict(),
                "arch": "efficientnet_b0",
                "num_classes": 2,
                "class_to_idx": {"fake": 0, "real": 1},
                "val_accuracy": val_acc,
                "epoch": epoch + 1,
            }
            logger.info("  New best! val_acc=%.1f%%", val_acc)
        else:
            patience_counter += 1
            if patience_counter >= args.patience:
                logger.info("Early stopping at epoch %d (patience=%d)", epoch + 1, args.patience)
                break

    # Save best model
    if best_state is None:
        logger.error("No improvement during training!")
        sys.exit(1)

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    torch.save(best_state, args.output)
    logger.info("Saved best model to %s (val_acc=%.1f%%)", args.output, best_val_acc)

    # Final report with best model
    model.load_state_dict(best_state["model_state_dict"])
    _, final_acc, final_preds, final_labels = validate(model, val_loader, criterion, device)

    print("\n" + "=" * 50)
    print("FINAL RESULTS: {:.1f}% validation accuracy".format(final_acc))
    print("=" * 50)
    print("\nClassification Report:")
    print(classification_report(final_labels, final_preds, target_names=["fake", "real"]))
    print("Confusion Matrix:")
    print(confusion_matrix(final_labels, final_preds))
    print()


if __name__ == "__main__":
    main()
