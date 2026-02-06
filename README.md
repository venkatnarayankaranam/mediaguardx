# MediaGuardX

A Scalable and Autonomous Framework for Deepfake Defense.

MediaGuardX is an advanced deepfake detection platform that provides real-time analysis of images, videos, and audio files using machine learning techniques.

## Features

- **Multi-Modal Detection** - Analyze images, videos, and audio for deepfake manipulation
- **10 Detection Features** - Comprehensive analysis including:
  - Face manipulation detection
  - Audio-visual sync analysis
  - Compression artifact detection
  - Emotion consistency analysis
  - Fingerprint analysis
  - Metadata verification
  - And more...
- **Real-Time Monitoring** - Live camera feed analysis
- **Trust Scoring** - 0-100 confidence scores with clear labels (Authentic/Suspicious/Deepfake)
- **PDF Reports** - Generate tamper-proof reports with QR codes
- **Role-Based Access** - User, Investigator, and Admin roles
- **Activity Logging** - Complete audit trails

## Tech Stack

### Backend
- **FastAPI** - Modern async Python web framework
- **MongoDB** - NoSQL database with Motor async driver
- **PyTorch** - Deep learning framework
- **OpenCV** - Computer vision processing
- **librosa** - Audio analysis

### Frontend
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Zustand** - State management
- **Recharts** - Data visualization

## Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB 6.0+

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/venkatnarayankaranam/mediaguardx.git
cd mediaguardx
```

### 2. Backend Setup

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

Create a `.env` file in the `backend` directory:

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
MONGO_URL=mongodb://localhost:27017/mediaguardx
PORT=8000
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

### 3. Frontend Setup

```bash
cd mediaguardx

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@mediaguardx.com | Admin123! |

**Important:** Change the default password after first login!

## API Documentation

Once the backend is running:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/detect/image` | Analyze image |
| POST | `/api/detect/video` | Analyze video |
| POST | `/api/detect/audio` | Analyze audio |
| GET | `/api/history/user` | User's detection history |
| POST | `/api/report/{id}` | Generate PDF report |
| GET | `/api/admin/stats` | System statistics |

## Project Structure

```
mediaguardx/
├── backend/                 # Python FastAPI backend
│   ├── main.py             # Application entry point
│   ├── config.py           # Configuration settings
│   ├── database.py         # MongoDB connection
│   ├── models/             # Pydantic data models
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic
│   │   ├── model_engine.py         # ML detection engine
│   │   ├── audio_analyzer.py       # Audio analysis
│   │   ├── compression_analyzer.py # Compression detection
│   │   ├── emotion_analyzer.py     # Emotion consistency
│   │   ├── fingerprint_analyzer.py # Fingerprint analysis
│   │   ├── metadata_analyzer.py    # Metadata verification
│   │   └── sync_analyzer.py        # A/V sync analysis
│   ├── middleware/         # Auth, rate limiting, errors
│   └── utils/              # Helper utilities
│
├── mediaguardx/            # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client
│   │   └── types/          # TypeScript types
│   └── package.json
│
├── ffpp_images/            # Training dataset (FaceForensics++)
└── README.md
```

## User Roles

| Role | Permissions |
|------|-------------|
| **User** | Upload media, view own detections, generate reports |
| **Investigator** | All user permissions + view all detections |
| **Admin** | All permissions + user management, system statistics |

## Development

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend build check
cd mediaguardx
npm run build
```

### API Testing

Use the included test script:

```bash
cd backend
python test_api.py
```

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Account lockout after failed attempts
- Rate limiting
- CORS protection
- Input validation
- Activity logging

## License

Proprietary - MediaGuardX

## Contributors

- Pradeep Team

---

For detailed backend documentation, see [backend/README.md](backend/README.md)
