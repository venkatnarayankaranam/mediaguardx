"""Create a tiny ImageFolder-style dataset for smoke-testing the training pipeline.

This copies example images from the FaceForensics `images/` folder into a
`target_root` directory with the structure:

  target_root/train/real/...
  target_root/train/fake/...
  target_root/val/real/...
  target_root/val/fake/...

Use this when you don't yet have extracted frames but want to verify the
training and model-loading end-to-end.
"""
import argparse
import os
import shutil
from pathlib import Path


def make_dummy(target_root: str, ffpp_images_root: str, copies: int = 10):
    src = Path(ffpp_images_root)
    if not src.exists():
        raise FileNotFoundError(f"Source FaceForensics images not found: {src}")

    target = Path(target_root)
    for split in ["train", "val"]:
        for cls in ["real", "fake"]:
            d = target / split / cls
            d.mkdir(parents=True, exist_ok=True)

    # Collect sample images from FaceForensics/images
    images = [p for p in src.iterdir() if p.suffix.lower() in ['.png', '.jpg', '.jpeg', '.gif']]
    if not images:
        raise RuntimeError("No sample images found in FaceForensics images folder")

    # Copy images into each class directory, duplicating if needed
    for split_ratio, split in [(0.8, 'train'), (0.2, 'val')]:
        for cls in ['real', 'fake']:
            dest_dir = target / split / cls
            # for fake class, just reuse same images (dummy)
            count = max(1, int(len(images) * copies * (split_ratio)))
            i = 0
            while i < count:
                src_img = images[i % len(images)]
                dst = dest_dir / f"{src_img.stem}_{i}{src_img.suffix}"
                shutil.copy(src_img, dst)
                i += 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', required=True, help='Target dataset root (e.g. D:/deep/ffpp_images)')
    parser.add_argument('--ffpp-images', default=str(Path(__file__).resolve().parents[2] / 'FaceForensics' / 'images'), help='Path to FaceForensics images folder')
    parser.add_argument('--copies', type=int, default=10, help='Number of copies multiplier')
    args = parser.parse_args()
    make_dummy(args.target, args.ffpp_images, copies=args.copies)
    print(f"Dummy dataset created at {args.target}")
