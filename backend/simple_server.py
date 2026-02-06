"""Simple test server to verify the API works."""
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import random
import os
import uuid

app = FastAPI(title="MediaGuardX Simple API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory
os.makedirs("uploads", exist_ok=True)


@app.get("/")
async def root():
    return {"message": "MediaGuardX API", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/detect/{detection_id}")
async def get_detection(detection_id: str):
    """Get detection result."""
    trust_score = random.randint(70, 95)
    label = "Authentic" if trust_score >= 80 else ("Suspicious" if trust_score >= 50 else "Deepfake")

    return {
        "status": "success",
        "mediaType": "image",
        "trustScore": trust_score,
        "label": label,
        "anomalies": [],
        "heatmapUrl": None,
        "fileUrl": f"/api/detect/{detection_id}/file",
        "reportId": "",
        "detectionId": detection_id
    }


@app.post("/api/detect/image")
async def detect_image(file: UploadFile = File(...)):
    """Detect deepfake in image."""
    # Save file
    file_id = str(uuid.uuid4())
    file_path = f"uploads/{file_id}_{file.filename}"

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Generate random result
    trust_score = random.randint(70, 95)
    label = "Authentic" if trust_score >= 80 else ("Suspicious" if trust_score >= 50 else "Deepfake")

    return {
        "status": "success",
        "mediaType": "image",
        "trustScore": trust_score,
        "label": label,
        "anomalies": [
            {"type": "compression", "severity": "low", "description": "Minor artifacts", "confidence": 75}
        ] if trust_score < 90 else [],
        "heatmapUrl": None,
        "fileUrl": f"/api/detect/{file_id}/file",
        "reportId": "",
        "detectionId": file_id
    }


@app.post("/api/detect/video")
async def detect_video(file: UploadFile = File(...)):
    """Detect deepfake in video."""
    file_id = str(uuid.uuid4())
    file_path = f"uploads/{file_id}_{file.filename}"

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    trust_score = random.randint(65, 90)
    label = "Authentic" if trust_score >= 80 else ("Suspicious" if trust_score >= 50 else "Deepfake")

    return {
        "status": "success",
        "mediaType": "video",
        "trustScore": trust_score,
        "label": label,
        "anomalies": [],
        "heatmapUrl": None,
        "fileUrl": f"/api/detect/{file_id}/file",
        "reportId": "",
        "detectionId": file_id
    }


@app.post("/api/detect/audio")
async def detect_audio(file: UploadFile = File(...)):
    """Detect deepfake in audio."""
    file_id = str(uuid.uuid4())
    file_path = f"uploads/{file_id}_{file.filename}"

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    trust_score = random.randint(75, 95)
    label = "Authentic" if trust_score >= 80 else ("Suspicious" if trust_score >= 50 else "Deepfake")

    return {
        "status": "success",
        "mediaType": "audio",
        "trustScore": trust_score,
        "label": label,
        "anomalies": [],
        "heatmapUrl": None,
        "fileUrl": f"/api/detect/{file_id}/file",
        "reportId": "",
        "detectionId": file_id
    }


if __name__ == "__main__":
    import uvicorn
    import sys

    # Default port is 8001, can be changed via command line: python simple_server.py 8002
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8001

    print(f"Starting Simple MediaGuardX Server on port {port}...")
    print(f"API URL: http://localhost:{port}/api")
    print("Press Ctrl+C to stop")
    uvicorn.run(app, host="0.0.0.0", port=port)
