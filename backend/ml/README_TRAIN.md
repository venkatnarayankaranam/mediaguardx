Training and integration notes

1) Prepare dataset
   - Arrange images into ImageFolder layout:
       data_root/
         train/real/...
         train/fake/...
         val/real/...
         val/fake/...

   - FaceForensics++ `dataset/splits` may be used to extract frames per split.

2) Install dependencies
```
pip install -r requirements.txt
```

3) Train
```
python -m backend.ml.train --data-dir PATH/TO/data_root --epochs 10 --batch-size 32 --save-path backend/models/deepfake_detector.pth
```

4) After training the backend will automatically load `backend/models/deepfake_detector.pth` on first inference.

Notes:
- The training script saves `class_to_idx` so inference maps `real` vs `fake` correctly.
- For video inference the backend samples up to 12 frames and averages the model's real-probability.
