# Technology Stack

**Analysis Date:** 2026-02-06

## Languages

**Primary:**
- TypeScript ~5.9.3 - Frontend SPA (`mediaguardx/src/**/*.{ts,tsx}`)
- Python 3.10+ (inferred from type hints, `asynccontextmanager`, `list[str]` syntax) - Backend API (`backend/**/*.py`)

**Secondary:**
- CSS (Tailwind utility classes) - Styling (`mediaguardx/src/style.css`)
- HTML - Single entry point (`mediaguardx/index.html`)

## Runtime

**Frontend Environment:**
- Node.js (version unspecified; no `.nvmrc` present)
- npm (lockfile present: `mediaguardx/package-lock.json`)
- Vite ^7.2.4 dev server on port 5173

**Backend Environment:**
- Python 3.10+ (required by Pydantic v2, `match` patterns, `list[str]` generics)
- Uvicorn 0.24.0 ASGI server on port 8000
- No virtual environment configuration committed (no `pyproject.toml`, `Pipfile`, or `poetry.lock`)

**Package Managers:**
- npm - Frontend (lockfile: `mediaguardx/package-lock.json`)
- pip - Backend (no lockfile; only `backend/requirements.txt` with pinned versions)

## Frameworks

**Core:**
- React ^19.2.3 - Frontend UI library (`mediaguardx/src/main.tsx`)
- React Router DOM ^7.11.0 - Client-side routing (`mediaguardx/src/App.tsx`)
- FastAPI 0.104.1 - Backend REST API framework (`backend/main.py`)
- Pydantic 2.5.0 / Pydantic Settings 2.1.0 - Data validation and settings (`backend/config.py`, `backend/models/*.py`)

**Machine Learning:**
- PyTorch >=2.0.0 - Deep learning inference and training (`backend/services/model_engine.py`, `backend/ml/train.py`)
- TorchVision >=0.15.0 - Pre-trained EfficientNet-B0 model, image transforms (`backend/ml/dataset.py`)
- OpenCV (opencv-python) >=4.7.0 - Video frame extraction (`backend/services/model_engine.py`)
- Pillow 10.1.0 - Image manipulation, heatmap generation (`backend/services/model_engine.py`, `backend/services/pdf_generator.py`)

**State Management:**
- Zustand ^5.0.9 with `persist` middleware - Frontend global state (`mediaguardx/src/store/authStore.ts`, `mediaguardx/src/store/detectionStore.ts`)

**Styling:**
- Tailwind CSS ^3.4.19 - Utility-first CSS (`mediaguardx/tailwind.config.js`)
- PostCSS ^8.5.6 + Autoprefixer ^10.4.23 - CSS processing (`mediaguardx/postcss.config.js`)

**Testing:**
- pytest 7.4.3 - Backend unit testing (`backend/test_api.py`)
- pytest-asyncio 0.21.1 - Async test support
- No frontend testing framework configured

**Build/Dev:**
- Vite ^7.2.4 - Frontend bundler and dev server (`mediaguardx/vite.config.ts`)
- @vitejs/plugin-react ^5.1.2 - React Fast Refresh and JSX transform
- TypeScript ~5.9.3 - Type checking (strict mode enabled in `mediaguardx/tsconfig.app.json`)

## Key Dependencies

**Critical (Frontend):**
- `react` ^19.2.3 - UI rendering
- `react-dom` ^19.2.3 - DOM rendering
- `react-router-dom` ^7.11.0 - SPA routing with `BrowserRouter`, `Routes`, `Route`, `Navigate`
- `zustand` ^5.0.9 - Lightweight state management with localStorage persistence
- `axios` ^1.13.2 - HTTP client with interceptors for JWT auth (`mediaguardx/src/services/api.ts`)
- `recharts` ^3.6.0 - Data visualization charts (dashboards)
- `lucide-react` ^0.562.0 - Icon library

**Critical (Backend):**
- `fastapi` 0.104.1 - API framework with automatic OpenAPI docs
- `uvicorn[standard]` 0.24.0 - ASGI server with hot reload in dev
- `motor` 3.3.2 - Async MongoDB driver (`backend/database.py`)
- `pymongo` 4.6.0 - MongoDB driver (used for `ObjectId`, error types)
- `python-jose[cryptography]` 3.3.0 - JWT token creation and validation (`backend/utils/auth.py`)
- `passlib[bcrypt]` 1.7.4 + `bcrypt` 3.2.2 - Password hashing (`backend/utils/auth.py`)
- `pydantic` 2.5.0 + `pydantic-settings` 2.1.0 - Schema validation and env config
- `torch` >=2.0.0 + `torchvision` >=0.15.0 - ML inference (lazy-loaded, optional)
- `opencv-python` >=4.7.0 - Video frame extraction (lazy-loaded, optional)

**Infrastructure (Backend):**
- `python-multipart` 0.0.6 - File upload support for FastAPI
- `python-dotenv` 1.0.0 - `.env` file loading
- `slowapi` 0.1.9 - Rate limiting middleware (`backend/middleware/rate_limiter.py`)
- `email-validator` 2.1.0 - Email validation for Pydantic `EmailStr`
- `reportlab` 4.0.7 - PDF report generation (`backend/services/pdf_generator.py`)
- `qrcode[pil]` 7.4.2 - QR code generation for tamper-proof reports
- `tqdm` >=4.65.0 - Progress bars for ML training

**Type Definitions (Frontend devDependencies):**
- `@types/react` ^19.2.7
- `@types/react-dom` ^19.2.3
- `@types/node` ^25.0.3

## Configuration

**Environment Variables (Backend):**
- Loaded via `pydantic-settings` from `.env` file (`backend/config.py`)
- Required: `jwt_secret`, `mongo_url`
- Optional with defaults: `jwt_algorithm` (HS256), `jwt_access_token_expire_minutes` (1440), `port` (8000), `host` (0.0.0.0), `node_env` (development), `frontend_url` (http://localhost:5173), `max_file_size_mb` (500), `upload_dir` (uploads), `reports_dir` (reports), `heatmaps_dir` (heatmaps), `rate_limit_per_minute` (60), `max_failed_login_attempts` (5), `account_lockout_minutes` (30)
- Placeholder/unused: `smtp_host`, `smtp_port`, `smtp_user`, `smtp_password`

**Environment Variables (Frontend):**
- `VITE_API_URL` - Backend API base URL (defaults to `http://localhost:8000/api`) (`mediaguardx/src/services/api.ts`)

**TypeScript Configuration:**
- Target: ES2020 for app code, ES2022 for Node/Vite config
- Strict mode enabled with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- Module resolution: `bundler`
- Path alias: `@/*` maps to `./src/*` (`mediaguardx/tsconfig.json`, `mediaguardx/vite.config.ts`)
- JSX: `react-jsx` (automatic runtime)

**Build Configuration:**
- Frontend build: `tsc && vite build` (type-check then bundle)
- Dev server: `vite` (Vite dev server with HMR)
- Preview: `vite preview` (serve production build locally)
- Backend: `python main.py` or `uvicorn main:app --reload`

**Tailwind Configuration (`mediaguardx/tailwind.config.js`):**
- Custom color palette: `primary` (teal/green tones), `dark` (slate tones)
- Custom background image: `gradient-radial`
- Content paths: `./index.html`, `./src/**/*.{js,ts,jsx,tsx}`

## Platform Requirements

**Development:**
- Node.js (latest LTS recommended, no version pinned)
- Python 3.10+
- MongoDB instance (local or remote, connection string via `MONGO_URL`)
- Optional: CUDA-capable GPU for ML model inference/training
- Optional: PyTorch + OpenCV installed for real ML inference (graceful fallback to deterministic placeholder)

**Production:**
- No deployment configuration committed (no Dockerfile, docker-compose, Procfile, vercel.json, or CI/CD pipeline)
- Backend serves static files (heatmaps) via FastAPI `StaticFiles` mount
- Frontend builds to static assets via Vite
- MongoDB required as primary data store
- File system access required for uploads, reports, and heatmaps directories

## ML Pipeline

**Model Architecture:**
- EfficientNet-B0 (from `torchvision.models`) fine-tuned for binary classification (real vs. fake)
- Input: 224x224 RGB images normalized with ImageNet stats
- Output: 2-class softmax probabilities
- Checkpoint format: `.pth` file containing `model_state_dict`, `arch`, `num_classes`, `class_to_idx`
- Expected location: `backend/models/deepfake_detector.pth`

**Training Pipeline:**
- Script: `backend/ml/train.py`
- Dataset: `backend/ml/dataset.py` (ImageFolder layout with `train/` and `val/` splits containing `real/` and `fake/` subfolders)
- Dataset source: FaceForensics++ (sample data in project: `FaceForensics/`, `ffpp_images/`)
- Dummy dataset generator: `backend/ml/make_dummy_dataset.py`
- Optimizer: Adam with default lr=1e-4
- Loss: CrossEntropyLoss

**Inference:**
- Service: `backend/services/model_engine.py`
- ML libraries loaded lazily with graceful fallback if unavailable
- Image analysis: single forward pass through EfficientNet-B0
- Video analysis: extract up to 12 evenly-spaced frames, average prediction probabilities
- Audio analysis: not implemented (returns 0.5 placeholder score)
- Fallback: deterministic hash-based scoring when no model is loaded

---

*Stack analysis: 2026-02-06*
