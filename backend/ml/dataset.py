from torchvision import transforms
from torchvision.datasets import ImageFolder


def get_transforms(image_size=224):
    return transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])


def get_datasets(data_dir: str, image_size=224):
    tr = get_transforms(image_size)
    val = transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    train_ds = ImageFolder(f"{data_dir}/train", transform=tr)
    val_ds = ImageFolder(f"{data_dir}/val", transform=val)
    return train_ds, val_ds
