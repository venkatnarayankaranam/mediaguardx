# MediaGuardX Backend API

Production-ready backend for MediaGuardX deepfake detection platform.

## Architecture

- **FastAPI** - Async Python web framework
- **Supabase** - PostgreSQL database + Auth (service role key for backend operations)
- **PyTorch** - EfficientNet-B0 deepfake classifier (95% validation accuracy)
- **Sightengine API** - External deepfake detection service
- **Heuristic Analyzers** - Metadata, fingerprint, compression, emotion, sync, audio analysis

## Setup

1. Create a `.env` file from `.env.example`
2. Install dependencies: `pip install -r requirements.txt`
3. Run: `python main.py`

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | Health check |
| GET | `/api/auth/me` | Yes | Current user profile |
| POST | `/api/detect/image` | Yes | Analyze image |
| POST | `/api/detect/video` | Yes | Analyze video |
| POST | `/api/detect/audio` | Yes | Analyze audio |
| POST | `/api/detect/url` | Yes | Analyze media from URL |
| GET | `/api/detect/{id}` | Yes | Get detection result |
| POST | `/api/detect/{id}/feedback` | Yes | Submit feedback (adaptive learning) |
| GET | `/api/history/user` | Yes | User detection history |
| GET | `/api/history/admin` | Admin | All detections |
| POST | `/api/report/{id}` | Yes | Generate PDF report |
| GET | `/api/admin/stats` | Admin | System statistics |
| WS | `/api/live/ws` | Yes | Real-time camera analysis |

## Detection Pipeline

1. **File Upload** - Streamed with size validation (max 50MB)
2. **Parallel Analysis** - All analyzers run concurrently:
   - ML Model (40% weight) - EfficientNet-B0 classifier
   - Sightengine API (20% weight) - External deepfake detection
   - Fingerprint (12%) - GAN signature / frequency-domain analysis
   - Metadata (8%) - EXIF verification
   - Compression (8%) - Artifact detection
   - Audio (4%) - Voice clone detection
   - Emotion (4%) - Facial expression consistency
   - Sync (4%) - Audio-visual synchronization
3. **Composite Score** - Weighted average with multi-flag penalty
4. **Grad-CAM Heatmap** - Visual explanation of detected manipulation regions
5. **Storage** - Results saved to Supabase with activity logging
