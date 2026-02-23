# MediaGuardX

A Scalable and Autonomous Framework for Deepfake Defense.

MediaGuardX is an advanced deepfake detection platform that provides real-time analysis of images, videos, and audio files using machine learning and multi-layered heuristic analysis.

## Features

- **Multi-Modal Detection** - Analyze images, videos, and audio for deepfake manipulation
- **ML-Powered Detection** - EfficientNet-B0 model retrained to 95% validation accuracy
- **Composite Scoring** - Weighted combination of ML model (40%), Sightengine API (20%), and heuristic analyzers (40%)
- **10 Detection Features** - Comprehensive analysis including:
  - ML model deepfake classification (primary detector)
  - Sightengine API deepfake analysis
  - Fingerprint analysis (StyleGAN, frequency-domain)
  - Metadata verification (EXIF, timestamps)
  - Compression artifact detection
  - Emotion consistency analysis
  - Audio-visual sync analysis
- **Grad-CAM Heatmaps** - Explainable AI visualization of detected manipulation regions
- **Adaptive Learning** - Users submit feedback to improve the model over time
- **Real-Time Monitoring** - Live camera feed analysis via WebSocket
- **Trust Scoring** - 0-100 confidence scores with clear labels (Authentic/Suspicious/Deepfake)
- **PDF Reports** - Generate tamper-proof reports with QR codes
- **Role-Based Access** - User, Investigator, and Admin roles
- **Activity Logging** - Complete audit trails

## Tech Stack

### Backend
- **FastAPI** - Modern async Python web framework
- **Supabase** - PostgreSQL database with Row Level Security + Auth
- **PyTorch** - EfficientNet-B0 deep learning classifier
- **Sightengine API** - External deepfake detection service
- **OpenCV** - Computer vision processing + Grad-CAM heatmaps
- **librosa** - Audio analysis

### Frontend
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Zustand** - State management
- **Supabase JS** - Authentication client

## Prerequisites

- Python 3.10+
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

## Quick Start (Windows)

```bash
# Verify your setup is correct
check-setup.bat

# Start both backend and frontend
start-all.bat
```

This opens two terminal windows:
- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/venkatnarayankaranam/mediaguardx.git
cd mediaguardx
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL Editor
3. Note your project URL and service role key

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory (see `backend/.env.example`):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SIGHTENGINE_API_USER=your-sightengine-user-id
SIGHTENGINE_API_SECRET=your-sightengine-api-secret
PORT=8000
HOST=0.0.0.0
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

Seed the admin user:

```bash
python seed.py
```

Start the backend server:

```bash
python main.py
```

The API will be available at `http://localhost:8000`

### 4. Frontend Setup

```bash
cd mediaguardx

# Install dependencies
npm install
```

Create a `.env` file in the `mediaguardx` directory (see `mediaguardx/.env.example`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=http://localhost:8000/api
```

Start the frontend:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Default Credentials

After running `seed.py`, an admin account is created in Supabase Auth. Change the password after first login.

| Role | Email |
|------|-------|
| Admin | admin@mediaguardx.com |

## API Documentation

Once the backend is running:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/me` | Get current user profile |
| POST | `/api/detect/image` | Analyze image |
| POST | `/api/detect/video` | Analyze video |
| POST | `/api/detect/audio` | Analyze audio |
| POST | `/api/detect/url` | Analyze media from URL |
| POST | `/api/detect/{id}/feedback` | Submit feedback (adaptive learning) |
| GET | `/api/history/user` | User's detection history |
| POST | `/api/report/{id}` | Generate PDF report |
| GET | `/api/admin/stats` | System statistics |
| WS | `/api/live/ws` | Real-time camera analysis |

## Project Structure

```
mediaguardx/
├── backend/                 # Python FastAPI backend
│   ├── main.py             # Application entry point
│   ├── config.py           # Configuration settings
│   ├── database.py         # Supabase client
│   ├── models/             # ML model checkpoint
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic
│   │   ├── model_engine.py         # ML detection + adaptive learning
│   │   ├── sightengine_client.py   # Sightengine API client
│   │   ├── audio_analyzer.py       # Audio analysis
│   │   ├── compression_analyzer.py # Compression detection
│   │   ├── emotion_analyzer.py     # Emotion consistency
│   │   ├── fingerprint_analyzer.py # Fingerprint / GAN detection
│   │   ├── metadata_analyzer.py    # EXIF metadata verification
│   │   └── sync_analyzer.py        # A/V sync analysis
│   ├── middleware/         # Auth, rate limiting, errors
│   ├── ml/                 # Training scripts
│   └── utils/              # Helper utilities
│
├── mediaguardx/            # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── guards/         # Route protection
│   │   ├── store/          # Zustand state stores
│   │   ├── services/       # API client
│   │   └── types/          # TypeScript types
│   └── package.json
│
├── test_dataset/           # 200 curated test images (100 fake + 100 real)
├── supabase/               # Database migrations
└── README.md
```

## User Roles

| Role | Permissions |
|------|-------------|
| **User** | Upload media, view own detections, generate reports, submit feedback |
| **Investigator** | All user permissions + view all detections + trigger model retraining |
| **Admin** | All permissions + user management, system statistics |

## Security Features

- Supabase Auth (JWT-based authentication)
- Row Level Security (RLS) on all database tables
- SSRF protection on URL detection endpoint
- Rate limiting on all API endpoints
- Streaming file upload with size limits
- WebSocket frame rate + payload size limiting
- CORS protection
- Input validation
- Activity logging

## Test Dataset

The `test_dataset/` directory contains 200 curated images:
- `fake/` - 100 AI-generated face images
- `real/` - 100 authentic face images

Used for model training, validation, and benchmarking.

## License

Proprietary - MediaGuardX

## Contributors

- Pradeep Team
