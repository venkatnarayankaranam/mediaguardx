# Codebase Structure

**Analysis Date:** 2026-02-06

## Directory Layout

```
mediaguardx/                          # Project root (git repo)
├── backend/                          # FastAPI Python backend
│   ├── main.py                       # App entry point, router registration, middleware setup
│   ├── config.py                     # Pydantic Settings (env vars)
│   ├── database.py                   # MongoDB connection (Motor async driver)
│   ├── seed.py                       # Admin user seeder script
│   ├── test_api.py                   # Integration test script (requests-based)
│   ├── requirements.txt              # Python dependencies
│   ├── __init__.py                   # Package marker
│   ├── .gitignore                    # Backend-specific ignores
│   ├── middleware/                    # Cross-cutting middleware
│   │   ├── __init__.py
│   │   ├── auth.py                   # JWT auth + RBAC dependency factories
│   │   ├── error_handler.py          # Global exception handlers
│   │   └── rate_limiter.py           # Slowapi rate limiting setup
│   ├── models/                       # Pydantic schemas (also stores ML model artifact)
│   │   ├── __init__.py
│   │   ├── user.py                   # User, UserCreate, UserLogin, TokenResponse schemas
│   │   ├── detection.py              # DetectionRecord, DetectionResponse, Anomaly schemas
│   │   ├── report.py                 # Report, ReportResponse schemas
│   │   ├── activity_log.py           # ActivityLog schema
│   │   ├── deepfake_detector.pth     # Trained PyTorch model checkpoint (binary)
│   │   └── .gitkeep
│   ├── routes/                       # API route handlers (FastAPI routers)
│   │   ├── __init__.py
│   │   ├── auth.py                   # /api/auth/* endpoints
│   │   ├── detection.py              # /api/detect/* endpoints
│   │   ├── history.py                # /api/history/* endpoints
│   │   ├── reports.py                # /api/report/* endpoints
│   │   ├── admin.py                  # /api/admin/* endpoints
│   │   └── live.py                   # /api/live/* endpoints (placeholder)
│   ├── services/                     # Business logic services
│   │   ├── __init__.py
│   │   ├── model_engine.py           # ML inference (PyTorch EfficientNet + fallback)
│   │   └── pdf_generator.py          # ReportLab PDF report generation
│   ├── utils/                        # Shared utilities
│   │   ├── __init__.py
│   │   ├── auth.py                   # Password hashing (bcrypt), JWT encode/decode
│   │   ├── file_handler.py           # File upload saving, type validation
│   │   └── formatters.py             # Label-to-status mapping
│   └── ml/                           # ML training scripts (offline)
│       ├── train.py                  # EfficientNet training loop
│       ├── dataset.py                # ImageFolder data loading + transforms
│       ├── make_dummy_dataset.py     # Dummy dataset generator for testing
│       └── README_TRAIN.md           # Training documentation
├── mediaguardx/                      # React/Vite frontend application
│   ├── index.html                    # Vite HTML entry point
│   ├── package.json                  # NPM dependencies + scripts
│   ├── package-lock.json             # Lockfile
│   ├── vite.config.ts                # Vite config (React plugin, @ alias)
│   ├── tsconfig.json                 # Root TypeScript config
│   ├── tsconfig.app.json             # App TypeScript config
│   ├── tsconfig.node.json            # Node TypeScript config
│   ├── tailwind.config.js            # Tailwind CSS config
│   ├── postcss.config.js             # PostCSS config
│   ├── .gitignore                    # Frontend-specific ignores
│   ├── public/                       # Static public assets
│   │   └── vite.svg
│   └── src/                          # Source code
│       ├── main.tsx                  # React entry point (renders App)
│       ├── App.tsx                   # Router + route definitions + ProtectedRoute
│       ├── style.css                 # Global CSS (Tailwind imports + custom styles)
│       ├── vite-env.d.ts             # Vite type declarations
│       ├── components/               # Reusable UI components
│       │   ├── AdaptiveLearner.tsx    # User feedback submission for model improvement
│       │   ├── AnomalyList.tsx        # Anomaly items list display
│       │   ├── Card.tsx               # Glass-morphism card wrapper
│       │   ├── EmotionMismatchPanel.tsx # Face/audio emotion comparison
│       │   ├── ExplainabilityPanel.tsx  # XAI heatmap + suspicious regions
│       │   ├── FileUploader.tsx        # Drag-and-drop file upload + URL input
│       │   ├── FingerprintPanel.tsx     # Source fingerprint display
│       │   ├── HeatmapDisplay.tsx       # Heatmap image viewer
│       │   ├── Layout.tsx              # Page layout (Navbar + Sidebar + content)
│       │   ├── LiveCameraDetector.tsx   # Webcam feed with mock detection
│       │   ├── LoadingSkeleton.tsx      # Loading placeholder animation
│       │   ├── MultiLayerPanel.tsx      # Visual/audio/metadata analysis summary
│       │   ├── Navbar.tsx              # Top navigation bar (role-aware)
│       │   ├── PDFReportPreview.tsx     # In-browser report preview
│       │   ├── Sidebar.tsx             # Left sidebar navigation (role-aware menu)
│       │   ├── SocialMediaPanel.tsx     # Social media compression analysis
│       │   ├── StatusBadge.tsx          # Color-coded status indicator
│       │   ├── SyncAnalysisPanel.tsx    # Lip-sync mismatch display
│       │   └── TrustScoreGauge.tsx      # Donut chart trust score (recharts)
│       ├── pages/                    # Page-level components (one per route)
│       │   ├── AdminDashboard.tsx     # Admin: stats, users, logs (mostly hardcoded)
│       │   ├── CameraMonitoring.tsx   # Live camera feed page
│       │   ├── Dashboard.tsx          # Main user dashboard: upload + history
│       │   ├── DetectionResult.tsx    # Full detection result view
│       │   ├── ForgotPassword.tsx     # Password reset request page
│       │   ├── InvestigatorDashboard.tsx # Investigator: cases, timeline (mostly hardcoded)
│       │   ├── Landing.tsx            # Public landing page (hero, features, CTA)
│       │   ├── Login.tsx              # Login form page
│       │   └── Register.tsx           # Registration form page
│       ├── services/                 # API communication layer
│       │   └── api.ts                # Axios instance, interceptors, API functions
│       ├── store/                    # Zustand state management
│       │   ├── authStore.ts          # Auth state (user, token, isAuthenticated)
│       │   └── detectionStore.ts     # Detection history cache
│       └── types/                    # TypeScript type definitions
│           └── index.ts              # User, DetectionResult, Anomaly, Case, Report types
├── FaceForensics/                    # FaceForensics tools (currently empty)
├── ffpp_images/                      # Training dataset (ImageFolder layout)
│   ├── train/
│   │   ├── fake/                     # Fake training images
│   │   └── real/                     # Real training images
│   └── val/
│       ├── fake/                     # Fake validation images
│       └── real/                     # Real validation images
└── .planning/                        # GSD planning documents
    └── codebase/                     # Codebase analysis documents
```

## Directory Purposes

**`backend/`:**
- Purpose: Complete FastAPI backend application
- Contains: Python source, Pydantic models, route handlers, services, middleware, utils, ML training scripts
- Key files: `main.py` (entry point), `config.py` (settings), `database.py` (MongoDB connection)

**`backend/routes/`:**
- Purpose: FastAPI APIRouter modules -- one per API domain
- Contains: 6 router files, each defining related endpoints
- Key files: `detection.py` (core detection logic), `auth.py` (authentication)

**`backend/services/`:**
- Purpose: Core business logic decoupled from HTTP concerns
- Contains: ML inference engine, PDF report generator
- Key files: `model_engine.py` (deepfake analysis), `pdf_generator.py` (ReportLab reports)

**`backend/models/`:**
- Purpose: Pydantic data schemas for validation and serialization; also stores trained ML model artifact
- Contains: Schema files for each domain entity + `deepfake_detector.pth` binary
- Key files: `user.py`, `detection.py`, `report.py`, `activity_log.py`

**`backend/middleware/`:**
- Purpose: Request pipeline middleware (auth, errors, rate limiting)
- Contains: Auth dependency factories, exception handlers, rate limiter setup
- Key files: `auth.py` (JWT validation + RBAC)

**`backend/utils/`:**
- Purpose: Stateless helper functions shared across routes/services
- Contains: Password hashing, JWT helpers, file upload handling, response formatting
- Key files: `auth.py` (crypto), `file_handler.py` (upload management)

**`backend/ml/`:**
- Purpose: Offline ML training scripts (not part of runtime API server)
- Contains: Training loop, dataset loader, dummy data generator
- Key files: `train.py`, `dataset.py`

**`mediaguardx/mediaguardx/src/components/`:**
- Purpose: Reusable React UI components
- Contains: 19 `.tsx` component files
- Key files: `Layout.tsx`, `FileUploader.tsx`, `TrustScoreGauge.tsx`, `Navbar.tsx`, `Sidebar.tsx`

**`mediaguardx/mediaguardx/src/pages/`:**
- Purpose: Page-level components, one per route
- Contains: 9 `.tsx` page files
- Key files: `Dashboard.tsx` (main user page), `DetectionResult.tsx` (result view), `Landing.tsx` (public home)

**`mediaguardx/mediaguardx/src/services/`:**
- Purpose: API communication abstraction layer
- Contains: Single file with Axios instance, interceptors, and all API call functions
- Key files: `api.ts`

**`mediaguardx/mediaguardx/src/store/`:**
- Purpose: Client-side state management with persistence
- Contains: Zustand stores for auth and detection history
- Key files: `authStore.ts`, `detectionStore.ts`

**`mediaguardx/mediaguardx/src/types/`:**
- Purpose: Shared TypeScript type definitions
- Contains: All domain types and interfaces
- Key files: `index.ts`

**`ffpp_images/`:**
- Purpose: FaceForensics++ training/validation image dataset
- Contains: Organized in `train/{real,fake}` and `val/{real,fake}` ImageFolder layout
- Generated: Partially (via `make_dummy_dataset.py`) or sourced externally
- Committed: No (large binary files, should be in .gitignore)

## Key File Locations

**Entry Points:**
- `backend/main.py`: Backend FastAPI application entry point
- `mediaguardx/mediaguardx/src/main.tsx`: Frontend React entry point
- `mediaguardx/mediaguardx/src/App.tsx`: Frontend router and route definitions
- `backend/seed.py`: Database admin user seeder

**Configuration:**
- `backend/config.py`: Backend settings (reads `.env`)
- `backend/.env`: Environment variables (not committed, must be created)
- `mediaguardx/mediaguardx/vite.config.ts`: Vite build config
- `mediaguardx/mediaguardx/tsconfig.json`: TypeScript config
- `mediaguardx/mediaguardx/tailwind.config.js`: Tailwind CSS config
- `mediaguardx/mediaguardx/postcss.config.js`: PostCSS config

**Core Logic:**
- `backend/services/model_engine.py`: ML inference pipeline (most complex backend file)
- `backend/services/pdf_generator.py`: PDF report generation
- `backend/routes/detection.py`: Detection upload and retrieval API
- `backend/routes/auth.py`: Authentication and registration
- `mediaguardx/mediaguardx/src/services/api.ts`: All frontend API calls

**Auth System:**
- `backend/utils/auth.py`: JWT + password hashing utilities
- `backend/middleware/auth.py`: Auth middleware and RBAC factories
- `mediaguardx/mediaguardx/src/store/authStore.ts`: Frontend auth state

**Data Models:**
- `backend/models/user.py`: User schema
- `backend/models/detection.py`: Detection schema
- `backend/models/report.py`: Report schema
- `mediaguardx/mediaguardx/src/types/index.ts`: All frontend TypeScript types

**Testing:**
- `backend/test_api.py`: Manual integration test script (not pytest)

## Naming Conventions

**Files (Backend - Python):**
- Snake_case for all Python files: `model_engine.py`, `file_handler.py`, `activity_log.py`
- Module names match their domain: `auth.py`, `detection.py`, `user.py`
- `__init__.py` in every package directory

**Files (Frontend - TypeScript/React):**
- PascalCase for component files: `FileUploader.tsx`, `TrustScoreGauge.tsx`, `DetectionResult.tsx`
- camelCase for non-component modules: `api.ts`, `authStore.ts`, `detectionStore.ts`
- `index.ts` for type barrel exports

**Directories:**
- Lowercase, singular for backend: `routes/`, `models/`, `services/`, `middleware/`, `utils/`, `ml/`
- Lowercase, plural for frontend: `components/`, `pages/`, `services/`, `store/`, `types/`

## Where to Add New Code

**New Backend API Endpoint:**
1. If it belongs to an existing domain, add to the corresponding router in `backend/routes/{domain}.py`
2. If it's a new domain: create `backend/routes/{domain}.py` with `router = APIRouter()`, then register in `backend/main.py` with `app.include_router(router, prefix="/api/{domain}", tags=["DomainName"])`
3. Add request/response Pydantic schemas to `backend/models/{domain}.py`
4. If complex business logic is needed, add to `backend/services/{name}.py`

**New Backend Service:**
- Create `backend/services/{name}.py`
- Import and call from route handlers
- Follow the pattern of `model_engine.py` (module-level state, async functions)

**New Backend Middleware:**
- Create `backend/middleware/{name}.py`
- Register in `backend/main.py` (either as middleware or exception handler)
- For auth-related: add dependency factory functions following `require_role()` pattern in `backend/middleware/auth.py`

**New Backend Utility:**
- Add to existing `backend/utils/{relevant}.py` or create new file
- Keep utilities stateless and focused

**New Pydantic Model:**
- Add to `backend/models/{domain}.py`
- Follow pattern: internal model (`Model`), create schema (`ModelCreate`), response schema (`ModelResponse`)

**New Frontend Page:**
1. Create `mediaguardx/mediaguardx/src/pages/{PageName}.tsx`
2. Add route in `mediaguardx/mediaguardx/src/App.tsx`, wrap in `<ProtectedRoute>` if auth required
3. Use `Layout` component as wrapper if the page needs Navbar + Sidebar

**New Frontend Component:**
- Create `mediaguardx/mediaguardx/src/components/{ComponentName}.tsx`
- Use PascalCase filename
- Export as default
- Accept props via interface defined in the same file
- Use Tailwind CSS classes for styling (dark theme: `bg-dark-*`, `text-gray-*`, `border-dark-*`)

**New Frontend API Call:**
- Add exported async function to `mediaguardx/mediaguardx/src/services/api.ts`
- Use the `api` Axios instance (auto-attaches auth token)
- Return typed response matching types from `mediaguardx/mediaguardx/src/types/index.ts`

**New TypeScript Type:**
- Add to `mediaguardx/mediaguardx/src/types/index.ts`

**New Zustand Store:**
- Create `mediaguardx/mediaguardx/src/store/{name}Store.ts`
- Follow pattern: `create<StateType>()(persist((set, get) => ({...}), { name: '{name}-storage' }))`

## Special Directories

**`backend/models/` (dual purpose):**
- Purpose: Contains BOTH Pydantic schema definitions (.py files) AND the trained ML model artifact (.pth file)
- Generated: `deepfake_detector.pth` is generated by `backend/ml/train.py`
- Committed: `.pth` file is committed (tracked in git)
- Note: This is unusual; consider separating ML artifacts from code models in the future

**`uploads/` (runtime, not in repo):**
- Purpose: Stores uploaded media files at `uploads/{media_type}/{user_id}/{uuid}.ext`
- Generated: Yes, at runtime by `backend/utils/file_handler.py`
- Committed: No (created dynamically, should be in .gitignore)

**`reports/` (runtime, not in repo):**
- Purpose: Stores generated PDF reports at `reports/report_{id}.pdf`
- Generated: Yes, at runtime by `backend/services/pdf_generator.py`
- Committed: No

**`heatmaps/` (runtime, not in repo):**
- Purpose: Stores generated heatmap images at `heatmaps/heatmap_{id}.png`
- Generated: Yes, at runtime by `backend/services/model_engine.py`
- Committed: No
- Served: Mounted as static files at `/heatmaps` in `backend/main.py`

**`ffpp_images/`:**
- Purpose: Training dataset for ML model
- Generated: Partially (dummy generator available), or sourced from FaceForensics++ dataset
- Committed: Should not be committed (large binary data)

**`.planning/`:**
- Purpose: GSD planning and analysis documents
- Generated: By codebase analysis tools
- Committed: At developer discretion

## Path Aliases

**Frontend (Vite):**
- `@` -> `mediaguardx/mediaguardx/src/` (configured in `mediaguardx/mediaguardx/vite.config.ts`)
- Note: Alias is configured but NOT currently used in imports -- all imports use relative paths (`./`, `../`)

**Backend (Python):**
- No path aliases; uses relative imports from `backend/` root (e.g., `from config import settings`, `from models.user import User`)
- Backend must be run with `backend/` as the working directory

---

*Structure analysis: 2026-02-06*
