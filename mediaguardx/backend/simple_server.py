"""Simple test server to verify the API works with ALL detection features."""
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import random
import os
import uuid
from datetime import datetime

app = FastAPI(title="MediaGuardX Simple API")


def generate_xai_regions():
    """Generate mock XAI heatmap regions."""
    regions = []
    num_regions = random.randint(2, 5)
    for i in range(num_regions):
        regions.append({
            "id": str(uuid.uuid4()),
            "x": random.randint(50, 300),
            "y": random.randint(50, 200),
            "width": random.randint(50, 150),
            "height": random.randint(50, 150),
            "confidence": round(random.uniform(0.6, 0.95), 2),
            "label": random.choice(["face_region", "eye_area", "mouth_area", "skin_texture", "hair_boundary"]),
            "severity": random.choice(["low", "medium", "high"])
        })
    return regions


def generate_audio_analysis():
    """Generate mock audio analysis data."""
    return {
        "hasAudio": True,
        "duration": round(random.uniform(5, 120), 2),
        "sampleRate": random.choice([44100, 48000, 22050]),
        "spectralAnalysis": {
            "fundamentalFrequency": round(random.uniform(100, 300), 2),
            "harmonicRatio": round(random.uniform(0.7, 0.95), 3),
            "spectralCentroid": round(random.uniform(1000, 4000), 2),
            "spectralRolloff": round(random.uniform(3000, 8000), 2),
            "zeroCrossingRate": round(random.uniform(0.02, 0.15), 4)
        },
        "pitchAnalysis": {
            "meanPitch": round(random.uniform(100, 250), 2),
            "pitchVariation": round(random.uniform(10, 50), 2),
            "pitchConfidence": round(random.uniform(0.75, 0.98), 2),
            "abnormalPitchSegments": random.randint(0, 3)
        },
        "formantAnalysis": {
            "f1Mean": round(random.uniform(300, 800), 2),
            "f2Mean": round(random.uniform(1000, 2500), 2),
            "f3Mean": round(random.uniform(2500, 3500), 2),
            "formantStability": round(random.uniform(0.7, 0.95), 2)
        },
        "voiceAuthenticity": {
            "score": random.randint(70, 95),
            "naturalness": round(random.uniform(0.7, 0.95), 2),
            "consistency": round(random.uniform(0.75, 0.98), 2),
            "artifacts": random.randint(0, 5)
        },
        "anomalies": [
            {"type": "pitch_discontinuity", "timestamp": round(random.uniform(1, 10), 2), "severity": "low"},
            {"type": "spectral_artifact", "timestamp": round(random.uniform(10, 30), 2), "severity": "medium"}
        ] if random.random() > 0.5 else []
    }


def generate_metadata_analysis():
    """Generate mock metadata analysis data."""
    software_list = ["Adobe Photoshop CC 2024", "GIMP 2.10", "Lightroom Classic", "iPhone Camera", "Samsung Camera", "Canon EOS", "Unknown"]
    return {
        "hasMetadata": True,
        "exifData": {
            "make": random.choice(["Apple", "Samsung", "Canon", "Nikon", "Sony", "Unknown"]),
            "model": random.choice(["iPhone 15 Pro", "Galaxy S24", "EOS R5", "D850", "A7 IV", "Unknown"]),
            "software": random.choice(software_list),
            "dateTime": datetime.now().isoformat(),
            "imageWidth": random.choice([1920, 3840, 4032, 6000]),
            "imageHeight": random.choice([1080, 2160, 3024, 4000]),
            "colorSpace": random.choice(["sRGB", "Adobe RGB", "ProPhoto RGB"]),
            "bitDepth": random.choice([8, 16, 24])
        },
        "gpsData": {
            "hasLocation": random.choice([True, False]),
            "latitude": round(random.uniform(-90, 90), 6) if random.random() > 0.5 else None,
            "longitude": round(random.uniform(-180, 180), 6) if random.random() > 0.5 else None
        },
        "timestamps": {
            "created": datetime.now().isoformat(),
            "modified": datetime.now().isoformat(),
            "accessed": datetime.now().isoformat(),
            "isConsistent": random.choice([True, True, True, False])
        },
        "editHistory": {
            "hasBeenEdited": random.choice([True, False]),
            "editCount": random.randint(0, 5),
            "lastEditor": random.choice(software_list),
            "suspiciousEdits": random.randint(0, 2)
        },
        "integrityScore": random.randint(70, 98)
    }


def generate_compression_info():
    """Generate mock compression analysis data."""
    return {
        "format": random.choice(["JPEG", "PNG", "WebP", "HEIC"]),
        "qualityScore": random.randint(60, 100),
        "compressionLevel": random.choice(["low", "medium", "high"]),
        "estimatedRecompression": random.randint(0, 5),
        "artifacts": {
            "blockingArtifacts": round(random.uniform(0, 0.3), 3),
            "ringingArtifacts": round(random.uniform(0, 0.2), 3),
            "colorBanding": round(random.uniform(0, 0.15), 3),
            "mosquitoNoise": round(random.uniform(0, 0.1), 3)
        },
        "socialMediaSignatures": {
            "detected": random.choice([True, False]),
            "platform": random.choice(["Instagram", "Facebook", "Twitter", "TikTok", "WhatsApp", None]),
            "confidence": round(random.uniform(0.6, 0.95), 2) if random.random() > 0.3 else None
        },
        "compressionHistory": [
            {"level": "original", "quality": random.randint(90, 100)},
            {"level": "recompressed", "quality": random.randint(70, 85)}
        ] if random.random() > 0.5 else [{"level": "original", "quality": random.randint(85, 100)}]
    }


def generate_fingerprint():
    """Generate mock deepfake fingerprint data."""
    models = ["StyleGAN2", "StyleGAN3", "DeepFaceLab", "FaceSwap", "First Order Motion", "Wav2Lip", "Unknown"]
    return {
        "hash": uuid.uuid4().hex,
        "perceptualHash": uuid.uuid4().hex[:16],
        "modelSignature": {
            "detected": random.choice([True, False, False]),
            "model": random.choice(models) if random.random() > 0.6 else None,
            "confidence": round(random.uniform(0.5, 0.9), 2),
            "version": f"v{random.randint(1, 3)}.{random.randint(0, 9)}" if random.random() > 0.5 else None
        },
        "generationArtifacts": {
            "ganFingerprint": random.choice([True, False]),
            "upscalingArtifacts": random.choice([True, False]),
            "blendingBoundaries": random.choice([True, False]),
            "temporalInconsistencies": random.choice([True, False])
        },
        "similarityMatches": [
            {"source": "known_deepfake_db", "similarity": round(random.uniform(0.3, 0.7), 2)},
            {"source": "gan_artifact_db", "similarity": round(random.uniform(0.2, 0.5), 2)}
        ] if random.random() > 0.5 else []
    }


def generate_emotion_mismatch():
    """Generate mock emotion mismatch analysis data."""
    emotions = ["happy", "sad", "angry", "surprised", "neutral", "fearful", "disgusted"]
    facial_emotion = random.choice(emotions)
    audio_emotion = random.choice(emotions)
    return {
        "hasAnalysis": True,
        "facialEmotion": {
            "primary": facial_emotion,
            "confidence": round(random.uniform(0.7, 0.95), 2),
            "secondary": random.choice([e for e in emotions if e != facial_emotion]),
            "timeline": [
                {"timestamp": i * 2, "emotion": random.choice(emotions), "confidence": round(random.uniform(0.6, 0.9), 2)}
                for i in range(5)
            ]
        },
        "audioEmotion": {
            "primary": audio_emotion,
            "confidence": round(random.uniform(0.65, 0.9), 2),
            "secondary": random.choice([e for e in emotions if e != audio_emotion]),
            "timeline": [
                {"timestamp": i * 2, "emotion": random.choice(emotions), "confidence": round(random.uniform(0.5, 0.85), 2)}
                for i in range(5)
            ]
        },
        "mismatchScore": round(random.uniform(0, 0.4), 2) if facial_emotion == audio_emotion else round(random.uniform(0.3, 0.8), 2),
        "mismatchSegments": [
            {"start": round(random.uniform(0, 5), 2), "end": round(random.uniform(5, 10), 2), "severity": random.choice(["low", "medium", "high"])}
        ] if random.random() > 0.6 else [],
        "overallConsistency": round(random.uniform(0.6, 0.95), 2)
    }


def generate_sync_analysis():
    """Generate mock voice-face synchronization analysis data."""
    return {
        "hasAnalysis": True,
        "lipSyncScore": random.randint(70, 98),
        "audioVideoOffset": round(random.uniform(-0.1, 0.1), 3),
        "phonemeAlignment": {
            "accuracy": round(random.uniform(0.75, 0.98), 2),
            "misalignedCount": random.randint(0, 5),
            "totalPhonemes": random.randint(50, 200)
        },
        "temporalConsistency": {
            "score": round(random.uniform(0.7, 0.95), 2),
            "frameDrops": random.randint(0, 3),
            "jitterScore": round(random.uniform(0, 0.15), 3)
        },
        "blinkAnalysis": {
            "naturalBlinkRate": random.choice([True, True, True, False]),
            "blinksPerMinute": round(random.uniform(12, 20), 1),
            "averageBlinkDuration": round(random.uniform(0.1, 0.4), 2)
        },
        "mouthMovement": {
            "naturalness": round(random.uniform(0.7, 0.95), 2),
            "articulationScore": round(random.uniform(0.75, 0.98), 2),
            "suspiciousFrames": random.randint(0, 10)
        },
        "overallSyncScore": random.randint(75, 98)
    }

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
    """Get detection result with ALL features."""
    trust_score = random.randint(70, 95)
    label = "Authentic" if trust_score >= 80 else ("Suspicious" if trust_score >= 50 else "Deepfake")
    media_type = random.choice(["image", "video", "audio"])

    return {
        "status": "success",
        "mediaType": media_type,
        "trustScore": trust_score,
        "label": label,
        "anomalies": [
            {"type": "compression", "severity": "low", "description": "Minor compression artifacts detected", "confidence": 75},
            {"type": "metadata", "severity": "medium", "description": "Inconsistent metadata timestamps", "confidence": 82},
            {"type": "facial", "severity": "low", "description": "Slight boundary irregularities", "confidence": 68}
        ] if trust_score < 90 else [],
        "heatmapUrl": f"/api/detect/{detection_id}/heatmap",
        "fileUrl": f"/api/detect/{detection_id}/file",
        "reportId": str(uuid.uuid4()),
        "detectionId": detection_id,
        # XAI Heatmap regions
        "xaiRegions": generate_xai_regions(),
        # Audio Analysis
        "audioAnalysis": generate_audio_analysis() if media_type in ["video", "audio"] else None,
        # Metadata Analysis
        "metadataAnalysis": generate_metadata_analysis(),
        # Compression Info
        "compressionInfo": generate_compression_info(),
        # Deepfake Fingerprint
        "fingerprint": generate_fingerprint(),
        # Emotion Mismatch
        "emotionMismatch": generate_emotion_mismatch() if media_type == "video" else None,
        # Voice-Face Sync Analysis
        "syncAnalysis": generate_sync_analysis() if media_type == "video" else None
    }


@app.post("/api/detect/image")
async def detect_image(file: UploadFile = File(...)):
    """Detect deepfake in image with ALL analysis features."""
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
            {"type": "compression", "severity": "low", "description": "Minor compression artifacts detected", "confidence": 75},
            {"type": "facial", "severity": "medium", "description": "Slight boundary irregularities around face region", "confidence": 82},
            {"type": "texture", "severity": "low", "description": "Skin texture inconsistencies detected", "confidence": 68}
        ] if trust_score < 90 else [],
        "heatmapUrl": f"/api/detect/{file_id}/heatmap",
        "fileUrl": f"/api/detect/{file_id}/file",
        "reportId": str(uuid.uuid4()),
        "detectionId": file_id,
        # XAI Heatmap regions
        "xaiRegions": generate_xai_regions(),
        # Metadata Analysis
        "metadataAnalysis": generate_metadata_analysis(),
        # Compression Info
        "compressionInfo": generate_compression_info(),
        # Deepfake Fingerprint
        "fingerprint": generate_fingerprint(),
        # No audio/emotion/sync for images
        "audioAnalysis": None,
        "emotionMismatch": None,
        "syncAnalysis": None
    }


@app.post("/api/detect/video")
async def detect_video(file: UploadFile = File(...)):
    """Detect deepfake in video with ALL analysis features."""
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
        "anomalies": [
            {"type": "temporal", "severity": "medium", "description": "Frame-to-frame inconsistencies detected", "confidence": 78},
            {"type": "facial", "severity": "low", "description": "Minor face boundary artifacts", "confidence": 72},
            {"type": "audio_visual", "severity": "medium", "description": "Slight lip-sync discrepancy", "confidence": 81}
        ] if trust_score < 85 else [],
        "heatmapUrl": f"/api/detect/{file_id}/heatmap",
        "fileUrl": f"/api/detect/{file_id}/file",
        "reportId": str(uuid.uuid4()),
        "detectionId": file_id,
        # XAI Heatmap regions
        "xaiRegions": generate_xai_regions(),
        # Audio Analysis (video has audio)
        "audioAnalysis": generate_audio_analysis(),
        # Metadata Analysis
        "metadataAnalysis": generate_metadata_analysis(),
        # Compression Info
        "compressionInfo": generate_compression_info(),
        # Deepfake Fingerprint
        "fingerprint": generate_fingerprint(),
        # Emotion Mismatch (video has facial + audio)
        "emotionMismatch": generate_emotion_mismatch(),
        # Voice-Face Sync Analysis
        "syncAnalysis": generate_sync_analysis()
    }


@app.post("/api/detect/audio")
async def detect_audio(file: UploadFile = File(...)):
    """Detect deepfake in audio with ALL analysis features."""
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
        "anomalies": [
            {"type": "voice_clone", "severity": "high", "description": "Voice cloning patterns detected", "confidence": 85},
            {"type": "frequency", "severity": "medium", "description": "Unnatural frequency patterns in voice", "confidence": 76},
            {"type": "spectral", "severity": "low", "description": "Minor spectral artifacts present", "confidence": 68}
        ] if trust_score < 85 else [],
        "heatmapUrl": None,
        "fileUrl": f"/api/detect/{file_id}/file",
        "reportId": str(uuid.uuid4()),
        "detectionId": file_id,
        # Audio Analysis (primary for audio files)
        "audioAnalysis": generate_audio_analysis(),
        # Metadata Analysis
        "metadataAnalysis": generate_metadata_analysis(),
        # Compression Info
        "compressionInfo": generate_compression_info(),
        # Deepfake Fingerprint
        "fingerprint": generate_fingerprint(),
        # No visual features for audio-only
        "xaiRegions": None,
        "emotionMismatch": None,
        "syncAnalysis": None
    }


# ============== FEATURE 7: PDF REPORT GENERATION ==============
@app.get("/api/report/{detection_id}")
async def get_report(detection_id: str):
    """Generate PDF report data for a detection."""
    trust_score = random.randint(70, 95)
    label = "Authentic" if trust_score >= 80 else ("Suspicious" if trust_score >= 50 else "Deepfake")

    return {
        "reportId": str(uuid.uuid4()),
        "detectionId": detection_id,
        "generatedAt": datetime.now().isoformat(),
        "summary": {
            "trustScore": trust_score,
            "verdict": label,
            "confidence": round(random.uniform(0.75, 0.98), 2),
            "mediaType": random.choice(["image", "video", "audio"]),
            "analysisTime": round(random.uniform(1.5, 8.0), 2)
        },
        "visualAnalysis": {
            "faceDetected": True,
            "manipulationProbability": round(random.uniform(0.1, 0.5), 2),
            "artifactsFound": random.randint(0, 5),
            "regions": generate_xai_regions()
        },
        "audioAnalysis": generate_audio_analysis(),
        "metadataAnalysis": generate_metadata_analysis(),
        "compressionAnalysis": generate_compression_info(),
        "fingerprintAnalysis": generate_fingerprint(),
        "emotionAnalysis": generate_emotion_mismatch(),
        "syncAnalysis": generate_sync_analysis(),
        "modelInfo": {
            "version": "MediaGuardX v1.0.0",
            "modelName": "EfficientNet-B0 + AudioNet",
            "lastUpdated": "2026-02-01"
        },
        "legalDisclaimer": "This report is generated by MediaGuardX deepfake detection system. Results are probabilistic and should be verified by forensic experts for legal proceedings."
    }


@app.post("/api/report/{detection_id}/download")
async def download_report(detection_id: str):
    """Download PDF report (returns download URL)."""
    return {
        "status": "success",
        "downloadUrl": f"/api/report/{detection_id}/pdf",
        "expiresAt": datetime.now().isoformat(),
        "reportId": str(uuid.uuid4())
    }


# ============== FEATURE 5: ADAPTIVE LEARNING ==============
@app.post("/api/adaptive/submit")
async def submit_sample(file: UploadFile = File(...), label: str = "deepfake"):
    """Submit a sample for adaptive learning."""
    file_id = str(uuid.uuid4())
    file_path = f"uploads/samples/{file_id}_{file.filename}"

    os.makedirs("uploads/samples", exist_ok=True)
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    return {
        "status": "success",
        "message": "Sample submitted for training",
        "sampleId": file_id,
        "label": label,
        "queuePosition": random.randint(1, 50),
        "estimatedProcessing": f"{random.randint(1, 24)} hours"
    }


@app.get("/api/adaptive/status")
async def adaptive_status():
    """Get adaptive learning system status."""
    return {
        "status": "active",
        "totalSamples": random.randint(1000, 5000),
        "pendingSamples": random.randint(10, 100),
        "lastRetrained": "2026-02-05T10:30:00",
        "modelAccuracy": round(random.uniform(0.92, 0.98), 3),
        "supportedApps": [
            {"name": "Reface", "detected": True, "samples": random.randint(100, 500)},
            {"name": "FaceSwap", "detected": True, "samples": random.randint(200, 600)},
            {"name": "DeepFaceLab", "detected": True, "samples": random.randint(150, 400)},
            {"name": "FaceFusion", "detected": True, "samples": random.randint(50, 200)},
            {"name": "HeyGen", "detected": True, "samples": random.randint(30, 150)},
            {"name": "Wav2Lip", "detected": True, "samples": random.randint(80, 300)}
        ]
    }


# ============== FEATURE 8: LIVE CAMERA DETECTION ==============
@app.post("/api/live/frame")
async def analyze_live_frame(file: UploadFile = File(...)):
    """Analyze a single frame from live camera feed."""
    contents = await file.read()

    trust_score = random.randint(70, 98)
    is_deepfake = trust_score < 75

    return {
        "status": "success",
        "frameId": str(uuid.uuid4()),
        "timestamp": datetime.now().isoformat(),
        "trustScore": trust_score,
        "isDeepfake": is_deepfake,
        "alerts": [
            {"type": "face_filter", "confidence": 0.85, "message": "Face filter detected"},
            {"type": "lip_sync", "confidence": 0.72, "message": "Lip sync delay detected"}
        ] if is_deepfake else [],
        "faceDetected": True,
        "processingTime": round(random.uniform(0.05, 0.15), 3),
        "recommendations": ["Continue monitoring", "No immediate action required"] if not is_deepfake else ["Verify identity", "Request additional verification"]
    }


@app.get("/api/live/status")
async def live_status():
    """Get live detection system status."""
    return {
        "status": "ready",
        "maxFps": 30,
        "recommendedResolution": "720p",
        "latency": f"{random.randint(50, 150)}ms",
        "gpuAvailable": True
    }


# ============== DASHBOARD ENDPOINTS ==============
@app.get("/api/admin/stats")
async def admin_stats():
    """Get admin dashboard statistics."""
    return {
        "totalDetections": random.randint(5000, 15000),
        "deepfakesDetected": random.randint(1000, 3000),
        "authenticsVerified": random.randint(3000, 10000),
        "suspiciousMedia": random.randint(500, 2000),
        "activeUsers": random.randint(50, 200),
        "apiCalls24h": random.randint(1000, 5000),
        "systemHealth": "healthy",
        "modelVersion": "v1.0.0"
    }


@app.get("/api/investigator/cases")
async def investigator_cases():
    """Get investigator dashboard cases."""
    cases = []
    for i in range(random.randint(5, 15)):
        cases.append({
            "caseId": str(uuid.uuid4()),
            "title": f"Case #{1000 + i}",
            "mediaType": random.choice(["image", "video", "audio"]),
            "status": random.choice(["pending", "in_progress", "resolved"]),
            "trustScore": random.randint(20, 95),
            "submittedAt": datetime.now().isoformat(),
            "priority": random.choice(["low", "medium", "high", "critical"])
        })
    return {"cases": cases, "totalCases": len(cases)}


if __name__ == "__main__":
    import uvicorn
    import sys

    # Default port is 8001, can be changed via command line: python simple_server.py 8002
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8001

    print(f"Starting Simple MediaGuardX Server on port {port}...")
    print(f"API URL: http://localhost:{port}/api")
    print("Press Ctrl+C to stop")
    uvicorn.run(app, host="0.0.0.0", port=port)
