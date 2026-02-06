# MediaGuardX - Beginner Setup Guide

A step-by-step guide to set up and run MediaGuardX on your laptop from scratch.

---

## What is MediaGuardX?

MediaGuardX is a deepfake detection platform that uses AI (EfficientNet-B0 CNN) to analyze images, videos, and audio files. It includes 10 features: trust scoring, heatmap visualization, multi-layer analysis, audio cloning detection, metadata forensics, emotion mismatch detection, lip-sync analysis, AI fingerprinting, social media compression tracking, and live camera monitoring.

---

## Prerequisites

Install these before starting:

### 1. Python (3.10 or higher)

- Download from: https://www.python.org/downloads/
- During installation, **check "Add Python to PATH"**
- Verify: Open terminal and run:
  ```
  python --version
  ```
  You should see `Python 3.10.x` or higher.

### 2. Node.js (18 or higher)

- Download from: https://nodejs.org/ (choose LTS version)
- Verify: Open terminal and run:
  ```
  node --version
  npm --version
  ```

### 3. MongoDB (Community Edition)

- Download from: https://www.mongodb.com/try/download/community
- Install with default settings
- Make sure MongoDB service is running (it starts automatically on Windows)
- Verify: Open terminal and run:
  ```
  mongosh
  ```
  If it connects, MongoDB is running. Type `exit` to close.

> **Note:** If you don't have MongoDB installed, the app will still work using a local JSON file fallback. However, MongoDB is recommended for full functionality.

### 4. Git

- Download from: https://git-scm.com/downloads
- Verify:
  ```
  git --version
  ```

---

## Step 1: Clone or Copy the Project

If you received the project as a zip file, extract it to a folder.

If cloning from Git:
```bash
git clone <repository-url>
cd media-guard-Pradeep-team-project/mediaguardx
```

Your folder structure should look like:
```
mediaguardx/
  backend/          <-- Python FastAPI server
  mediaguardx/      <-- React frontend app
  .planning/        <-- Project planning docs
```

---

## Step 2: Set Up the Backend (Python/FastAPI)

### 2.1 Open a terminal and navigate to the backend folder:
```bash
cd mediaguardx/backend
```

### 2.2 Create a virtual environment (recommended):
```bash
python -m venv venv
```

### 2.3 Activate the virtual environment:

**Windows (Command Prompt):**
```bash
venv\Scripts\activate
```

**Windows (PowerShell):**
```bash
venv\Scripts\Activate.ps1
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

You should see `(venv)` at the beginning of your terminal prompt.

### 2.4 Install Python dependencies:
```bash
pip install -r requirements.txt
```

> **Note:** This will install PyTorch, which is large (~2 GB). If you have an NVIDIA GPU and want GPU acceleration, install the CUDA version instead:
> ```bash
> pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
> pip install -r requirements.txt
> ```
> If you don't have a GPU, the CPU version works fine (just slower for analysis).

### 2.5 Verify the `.env` file exists:

The file `backend/.env` should contain:
```
JWT_SECRET=mediaguardx-dev-secret-key-change-in-production
MONGO_URL=mongodb://localhost:27017/mediaguardx
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
PORT=8001
```

If the file doesn't exist, create it with the above content.

### 2.6 Create required directories:
```bash
mkdir uploads heatmaps reports
```
(If they already exist, that's fine.)

### 2.7 Start the backend server:
```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Wait for the output to show:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Application startup complete.
```

> **First startup may take 30-60 seconds** because PyTorch loads the ML model.

### 2.8 Test the backend:

Open a browser and go to: http://localhost:8001

You should see:
```json
{"message": "MediaGuardX API", "version": "1.0.0", "status": "operational"}
```

You can also visit http://localhost:8001/docs for the interactive API documentation.

**Keep this terminal open!** The backend needs to keep running.

---

## Step 3: Set Up the Frontend (React/Vite)

### 3.1 Open a NEW terminal and navigate to the frontend folder:
```bash
cd mediaguardx/mediaguardx
```

### 3.2 Install Node.js dependencies:
```bash
npm install
```

### 3.3 Verify the `.env` file exists:

The file `mediaguardx/mediaguardx/.env` should contain:
```
VITE_API_URL=http://localhost:8001/api
```

If the file doesn't exist, create it with the above content.

### 3.4 Start the frontend dev server:
```bash
npm run dev
```

You should see:
```
VITE v7.x.x  ready in XXX ms

  -> Local:   http://localhost:5173/
```

### 3.5 Open the app:

Open your browser and go to: **http://localhost:5173**

You should see the MediaGuardX landing page.

**Keep this terminal open too!** The frontend dev server needs to keep running.

---

## Step 4: Using the App

### 4.1 Register an Account
1. Click "Get Started" on the landing page
2. Click "Register" to create a new account
3. Enter your name, email, and password
4. Click Register

### 4.2 Upload Media for Detection
1. After logging in, you'll be on the Dashboard
2. Click "Upload" or drag-and-drop an image/video/audio file
3. Wait for the analysis to complete
4. View the detection result with:
   - Trust Score (0-100%)
   - Status (Authentic / Suspicious / Deepfake)
   - Grad-CAM Heatmap (for images)
   - Multi-layer analysis panels
   - Anomaly details

### 4.3 Generate PDF Report
1. On any detection result page, click "Generate Report"
2. A PDF report will be downloaded automatically

### 4.4 Live Camera Monitoring
1. Go to the Camera Monitoring page from the sidebar
2. Click "Start" to begin live webcam analysis
3. The system analyzes frames in real-time via WebSocket

### 4.5 Admin Dashboard
- Access at `/admin` (requires admin role)
- Shows system-wide stats: total users, detections, deepfakes found

### 4.6 Investigator Dashboard
- Access at `/investigator` (requires investigator or admin role)
- Shows all detections across all users for investigation

---

## Quick Start Summary (TL;DR)

Open **two terminals** and run:

**Terminal 1 - Backend:**
```bash
cd mediaguardx/backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Frontend:**
```bash
cd mediaguardx/mediaguardx
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## Troubleshooting

### "Module not found" error in backend
Make sure your virtual environment is activated (`(venv)` shows in your prompt) and all dependencies are installed:
```bash
pip install -r requirements.txt
```

### "ENOENT" or "command not found" for npm
Make sure Node.js is installed and added to your system PATH. Restart your terminal after installing.

### Backend won't connect to MongoDB
If MongoDB isn't installed, the app automatically falls back to local JSON file storage. This works for development but isn't recommended for production.

To check if MongoDB is running:
```bash
mongosh --eval "db.adminCommand('ping')"
```

### Port already in use
If port 8001 or 5173 is already in use:
- Kill the existing process, or
- Change the port:
  - Backend: Edit `backend/.env` and change `PORT=8002`, then run with `--port 8002`
  - Frontend: Run `npm run dev -- --port 5174`
  - Update `mediaguardx/mediaguardx/.env` to match: `VITE_API_URL=http://localhost:8002/api`

### PyTorch installation fails
If `pip install torch` fails due to memory or network issues:
```bash
pip install torch --no-cache-dir
pip install torchvision --no-cache-dir
```

Or install the CPU-only version (smaller download):
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

### Frontend shows "Loading..." forever
- Check that the backend is running on port 8001
- Check browser console (F12) for CORS or network errors
- Make sure `mediaguardx/mediaguardx/.env` has `VITE_API_URL=http://localhost:8001/api`

### Images don't load on detection result page
This is usually an authentication issue. Make sure you're logged in and the backend is running.

---

## Tech Stack Reference

| Component       | Technology                    |
|----------------|-------------------------------|
| Frontend       | React 19 + TypeScript + Vite  |
| Styling        | Tailwind CSS                  |
| State Mgmt     | Zustand                       |
| Backend        | FastAPI (Python)              |
| Database       | MongoDB (with JSON fallback)  |
| ML Model       | EfficientNet-B0 (PyTorch)     |
| Auth           | JWT (JSON Web Tokens)         |
| PDF Reports    | ReportLab                     |

---

## Project Structure

```
mediaguardx/
  backend/
    main.py              # FastAPI entry point
    config.py            # Settings from .env
    database.py          # MongoDB connection + local fallback
    routes/
      auth.py            # Login, Register, Password reset
      detection.py       # Upload & analyze media
      history.py         # Detection history
      reports.py         # PDF report generation
      admin.py           # Admin stats & user management
      live.py            # WebSocket live camera analysis
    services/
      model_engine.py    # EfficientNet-B0 ML inference + Grad-CAM
      audio_analyzer.py  # Audio cloning detection (librosa)
      metadata_analyzer.py  # EXIF & metadata forensics
      emotion_analyzer.py   # Face vs audio emotion mismatch
      sync_analyzer.py      # Lip-sync analysis
      compression_analyzer.py  # Social media compression detection
      fingerprint_analyzer.py  # AI model fingerprinting
      pdf_generator.py   # PDF report creation
    middleware/
      auth.py            # JWT authentication middleware
      rate_limiter.py    # API rate limiting
      error_handler.py   # Global error handling
    ml/
      efficientnet_model.py  # Model architecture definition
      train.py           # Training script (optional)
    .env                 # Backend environment variables

  mediaguardx/           # Frontend (React)
    src/
      pages/
        Landing.tsx      # Home page
        Login.tsx        # Login form
        Register.tsx     # Registration form
        Dashboard.tsx    # Main dashboard with upload
        DetectionResult.tsx  # Detection analysis view
        AdminDashboard.tsx   # Admin panel
        InvestigatorDashboard.tsx  # Investigator view
        CameraMonitoring.tsx  # Live camera page
      components/
        Layout.tsx       # App shell (navbar + sidebar)
        LiveCameraDetector.tsx  # WebSocket camera component
        TrustScoreGauge.tsx     # Animated score gauge
        HeatmapDisplay.tsx      # Grad-CAM heatmap viewer
        MultiLayerPanel.tsx     # Analysis panels
        ...
      services/
        api.ts           # API client (axios)
      store/
        authStore.ts     # Authentication state (Zustand)
        detectionStore.ts  # Detection history state
      types/
        index.ts         # TypeScript interfaces
    .env                 # Frontend environment variables
    package.json         # Node.js dependencies
```

---

## Need Help?

If you encounter issues not covered here, check:
1. **Backend logs** in the terminal running the backend server
2. **Browser console** (press F12 in Chrome/Edge) for frontend errors
3. **API docs** at http://localhost:8001/docs for testing endpoints directly
