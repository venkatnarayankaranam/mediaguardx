# Architecture

**Analysis Date:** 2026-02-06

## Pattern Overview

**Overall:** Layered Monolithic with separate Frontend SPA and Backend API

MediaGuardX is a deepfake detection platform built as two independent applications: a React SPA frontend and a FastAPI Python backend, communicating via REST/JSON over HTTP. The backend follows a route-service-model layered pattern. An ML inference subsystem (PyTorch EfficientNet) is embedded within the backend service layer.

**Key Characteristics:**
- Decoupled frontend/backend communicating via REST API with JWT authentication
- Backend uses a service-layer pattern: Routes (controllers) -> Services (business logic) -> Database (MongoDB via Motor async driver)
- Pydantic models serve dual purpose: data validation schemas AND domain models (no separate ORM layer -- MongoDB is schemaless)
- Role-based access control (RBAC) with three roles: `user`, `investigator`, `admin`
- ML model loaded lazily at first inference request; falls back to deterministic placeholder if model file or ML libs are unavailable
- File-based artifact storage (uploads, heatmaps, PDF reports) on local disk with paths stored in MongoDB

## Layers

**Frontend (React SPA):**
- Purpose: User interface for media upload, detection results, dashboards, and report viewing
- Location: `mediaguardx/mediaguardx/src/`
- Contains: Pages, components, API service, Zustand stores, TypeScript types
- Depends on: Backend REST API at `http://localhost:8000/api`
- Used by: End users via browser

**API Route Layer (FastAPI Routers):**
- Purpose: HTTP request handling, input validation, response formatting, authorization checks
- Location: `backend/routes/`
- Contains: 6 router modules (`auth.py`, `detection.py`, `history.py`, `reports.py`, `admin.py`, `live.py`)
- Depends on: Models (Pydantic schemas), Services, Middleware (auth), Database, Utils
- Used by: Frontend via HTTP

**Service Layer:**
- Purpose: Core business logic -- ML inference and PDF report generation
- Location: `backend/services/`
- Contains: `model_engine.py` (deepfake detection ML inference), `pdf_generator.py` (ReportLab PDF generation)
- Depends on: PyTorch/torchvision (optional), Pillow, OpenCV, ReportLab, config, models
- Used by: Route handlers in `backend/routes/detection.py` and `backend/routes/reports.py`

**Model Layer (Pydantic Schemas):**
- Purpose: Data validation, serialization, and domain type definitions
- Location: `backend/models/`
- Contains: `user.py`, `detection.py`, `report.py`, `activity_log.py`
- Depends on: Pydantic, bson.ObjectId
- Used by: Routes (request/response validation), middleware (auth user object)

**Middleware Layer:**
- Purpose: Cross-cutting concerns -- authentication, error handling, rate limiting
- Location: `backend/middleware/`
- Contains: `auth.py` (JWT validation + RBAC), `error_handler.py` (global exception handling), `rate_limiter.py` (slowapi)
- Depends on: Database, models, utils/auth
- Used by: Route handlers via FastAPI `Depends()`

**Utility Layer:**
- Purpose: Shared helper functions
- Location: `backend/utils/`
- Contains: `auth.py` (password hashing, JWT encode/decode), `file_handler.py` (upload handling), `formatters.py` (label conversion)
- Depends on: passlib, python-jose, config
- Used by: Routes, middleware

**ML Training Subsystem:**
- Purpose: Offline model training scripts (not part of the runtime API)
- Location: `backend/ml/`
- Contains: `train.py` (training loop), `dataset.py` (data loaders), `make_dummy_dataset.py`
- Depends on: PyTorch, torchvision
- Used by: Developers offline; produces `backend/models/deepfake_detector.pth`

**Training Data:**
- Purpose: FaceForensics++ image dataset for model training
- Location: `ffpp_images/` (with `train/real/`, `train/fake/`, `val/real/`, `val/fake/` subdirectories)
- Contains: Training and validation images in ImageFolder layout
- Used by: `backend/ml/train.py`

**State Management Layer (Frontend):**
- Purpose: Client-side state with localStorage persistence
- Location: `mediaguardx/mediaguardx/src/store/`
- Contains: `authStore.ts` (user session + JWT token), `detectionStore.ts` (detection result history cache)
- Depends on: Zustand with persist middleware
- Used by: All pages and components

## Data Flow

**Primary Flow -- Media Upload & Detection:**

1. User selects file in `Dashboard` page (`mediaguardx/mediaguardx/src/pages/Dashboard.tsx`)
2. `FileUploader` component (`mediaguardx/mediaguardx/src/components/FileUploader.tsx`) captures file via drag-and-drop or file input
3. `uploadMedia()` in `mediaguardx/mediaguardx/src/services/api.ts` determines media type from MIME, creates FormData, POSTs to `/api/detect/{image|video|audio}`
4. Backend route handler in `backend/routes/detection.py` validates auth (JWT via `get_current_user`), validates content type
5. `save_uploaded_file()` in `backend/utils/file_handler.py` saves to `uploads/{media_type}/{user_id}/{uuid}.ext`
6. `analyze_media()` in `backend/services/model_engine.py` runs inference (PyTorch model or deterministic fallback)
7. Detection record (trust_score, label, anomalies, heatmap_url) stored in MongoDB `detections` collection
8. Activity logged to MongoDB `activity_logs` collection
9. `DetectionResponse` returned to frontend with `detectionId`
10. Frontend calls `getDetectionResult()` which GETs `/api/detect/{id}` to fetch full result
11. Result stored in Zustand `detectionStore` and user navigated to `/detection/{id}`
12. `DetectionResult` page (`mediaguardx/mediaguardx/src/pages/DetectionResult.tsx`) renders trust gauge, heatmap, anomalies, analysis panels

**Authentication Flow:**

1. User submits credentials on Login page (`mediaguardx/mediaguardx/src/pages/Login.tsx`)
2. `login()` in `mediaguardx/mediaguardx/src/services/api.ts` POSTs to `/api/auth/login`
3. Backend `backend/routes/auth.py` validates credentials, checks account lockout, creates JWT with `{sub: user_id, role: role}`
4. JWT + user info returned; frontend stores in Zustand `authStore` (persisted to localStorage as `auth-storage`)
5. Axios request interceptor in `mediaguardx/mediaguardx/src/services/api.ts` attaches `Authorization: Bearer {token}` to all subsequent requests
6. Backend middleware `backend/middleware/auth.py` extracts token, decodes JWT, fetches user from MongoDB, validates active/unlocked status
7. On 401 response, Axios response interceptor auto-clears auth state and redirects to `/login`

**Report Generation Flow:**

1. User clicks "Generate Report" on DetectionResult page
2. `generateReport()` POSTs to `/api/report/{detection_id}`
3. Backend `backend/routes/reports.py` validates access, checks for existing report, fetches detection + user data
4. `generate_pdf_report()` in `backend/services/pdf_generator.py` generates PDF with ReportLab (case ID, trust score, anomalies table, QR code, tamper-proof SHA-256 hash)
5. PDF saved to `reports/report_{id}.pdf`, report metadata stored in MongoDB `reports` collection
6. Report downloadable via GET `/api/report/{id}/download` (returns FileResponse)

**State Management:**
- **Frontend:** Zustand stores with `persist` middleware backed by localStorage
  - `authStore`: `{ user, token, isAuthenticated }` -- persisted as `auth-storage`
  - `detectionStore`: `{ history: DetectionResult[] }` -- persisted as `detection-storage`
- **Backend:** Stateless per-request; database is the single source of truth
- **ML Model:** Global module-level singleton (`_MODEL`, `_DEVICE`, `_TRANSFORM` in `backend/services/model_engine.py`), lazily loaded on first inference call

## Key Abstractions

**User (RBAC):**
- Purpose: Represents an authenticated user with role-based permissions
- Backend Model: `backend/models/user.py` -- `User`, `UserCreate`, `UserLogin`, `UserResponse`, `TokenResponse`
- Frontend Type: `mediaguardx/mediaguardx/src/types/index.ts` -- `User`, `UserRole`
- Roles: `"user"` (default, can upload/detect), `"investigator"` (can view all detections), `"admin"` (full system access)
- Pattern: JWT claim `role` checked by middleware dependency factories (`require_admin`, `require_investigator`, `require_user` in `backend/middleware/auth.py`)

**DetectionResult:**
- Purpose: Core domain object representing the output of a deepfake analysis
- Backend Model: `backend/models/detection.py` -- `DetectionRecord`, `DetectionResponse`, `Anomaly`
- Frontend Type: `mediaguardx/mediaguardx/src/types/index.ts` -- `DetectionResult`, `Anomaly`
- Fields: `trustScore` (0-100), `label` ("Authentic"/"Suspicious"/"Deepfake"), `status` ("authentic"/"suspected"/"deepfake"), `anomalies[]`, `heatmapUrl`, optional multi-layer analysis fields
- Note: Frontend `DetectionResult` type has additional optional fields (`audioAnalysis`, `metadataAnalysis`, `fingerprint`, `compressionInfo`, `emotionMismatch`, `syncAnalysis`, `xaiRegions`) that are not yet populated by the backend

**Report:**
- Purpose: Tamper-proof PDF report tied to a detection
- Backend Model: `backend/models/report.py` -- `Report`, `ReportResponse`
- Frontend Type: `mediaguardx/mediaguardx/src/types/index.ts` -- `Report`
- Pattern: One report per detection (checked via `detection_id` lookup before generation)

**Anomaly:**
- Purpose: Individual deepfake indicator within a detection
- Types: `face_blending`, `texture_artifacts`, `lighting_inconsistency`, `audio_sync_mismatch`, `metadata_tampering`
- Severities: `low`, `medium`, `high`
- Currently only `model_prediction` or `placeholder` type anomalies are generated by `backend/services/model_engine.py`

## Entry Points

**Backend API Server:**
- Location: `backend/main.py`
- Triggers: `python main.py` or `uvicorn main:app`
- Responsibilities: Creates FastAPI app, configures CORS, registers middleware (error handlers, rate limiting), mounts static files (`/heatmaps`), includes 6 routers, manages DB connection lifecycle via lifespan context manager

**Frontend SPA:**
- Location: `mediaguardx/mediaguardx/src/main.tsx`
- Triggers: `npm run dev` (Vite dev server on port 5173)
- Responsibilities: Renders `<App />` inside React StrictMode, mounts to `#root`

**App Router:**
- Location: `mediaguardx/mediaguardx/src/App.tsx`
- Responsibilities: Defines all client-side routes with `react-router-dom` BrowserRouter; implements `ProtectedRoute` component for auth guard and role-based route protection

**Database Seed:**
- Location: `backend/seed.py`
- Triggers: `python seed.py`
- Responsibilities: Creates default admin user (`admin@mediaguardx.com` / `Admin123!`)

**ML Training:**
- Location: `backend/ml/train.py`
- Triggers: `python -m backend.ml.train --data-dir ffpp_images`
- Responsibilities: Trains EfficientNet-B0 binary classifier, saves checkpoint to `backend/models/deepfake_detector.pth`

## API Route Map

All backend API routes are prefixed with `/api` and registered in `backend/main.py`:

| Prefix | Module | Tag | Endpoints |
|--------|--------|-----|-----------|
| `/api/auth` | `backend/routes/auth.py` | Authentication | `POST /register`, `POST /login`, `GET /me`, `POST /forgot-password` |
| `/api/detect` | `backend/routes/detection.py` | Detection | `POST /image`, `POST /video`, `POST /audio`, `GET /{detection_id}`, `GET /{detection_id}/file` |
| `/api/history` | `backend/routes/history.py` | History | `GET /user`, `GET /admin` |
| `/api/report` | `backend/routes/reports.py` | Reports | `POST /{detection_id}`, `GET /{report_id}/download`, `GET /{report_id}` |
| `/api/admin` | `backend/routes/admin.py` | Admin | `GET /users`, `GET /stats` |
| `/api/live` | `backend/routes/live.py` | Live Monitoring | `GET /monitor` (placeholder) |

**Static mounts:**
- `/heatmaps` -> `heatmaps/` directory (served via FastAPI StaticFiles)

## Frontend Route Map

Defined in `mediaguardx/mediaguardx/src/App.tsx`:

| Path | Page Component | Auth Required | Role Required |
|------|---------------|---------------|---------------|
| `/` | `Landing` | No | - |
| `/login` | `Login` | No | - |
| `/register` | `Register` | No | - |
| `/forgot-password` | `ForgotPassword` | No | - |
| `/dashboard` | `Dashboard` | Yes | - |
| `/detection/:id` | `DetectionResult` | Yes | - |
| `/admin` | `AdminDashboard` | Yes | `admin` |
| `/investigator` | `InvestigatorDashboard` | Yes | `investigator` |
| `/camera` | `CameraMonitoring` | Yes | - |
| `*` | Redirect to `/` | No | - |

## Error Handling

**Strategy:** Multi-layer exception handling with global catch-all

**Backend Patterns:**
- Global exception handlers registered in `backend/middleware/error_handler.py` via `setup_error_handlers(app)`:
  - `AppException` -> custom HTTP error with message
  - `RequestValidationError` -> 422 with field-level error details
  - `DuplicateKeyError` (MongoDB) -> 409 Conflict
  - Generic `Exception` -> 500 with "Internal server error" (no details leaked)
- Route-level: `HTTPException` raised directly for auth failures (401), forbidden (403), not found (404), bad request (400)
- Service-level: Exceptions bubble up from services; routes catch `ValueError` for 400, generic `Exception` for 500

**Frontend Patterns:**
- Axios response interceptor in `mediaguardx/mediaguardx/src/services/api.ts`: 401 -> auto-logout + redirect to `/login`
- Page-level try/catch in async handlers with `alert()` for user feedback (basic error UX)
- `console.error()` for development debugging

## Cross-Cutting Concerns

**Logging:**
- Backend uses Python `logging` module with `basicConfig(level=INFO, format=...)` set in `backend/main.py`
- Each module creates its own logger: `logger = logging.getLogger(__name__)`
- Activity audit logging: user actions (login, detection, password reset) written to MongoDB `activity_logs` collection via `_log_activity()` helper (duplicated in `backend/routes/auth.py` and `backend/routes/detection.py`)

**Validation:**
- Backend: Pydantic v2 models for request body validation (`UserCreate`, `UserLogin`, `Anomaly`, etc.)
- File type validation in `backend/utils/file_handler.py` (allowed extensions per media type)
- File size validation against `settings.max_file_size_mb` (default 500MB)
- Frontend: Minimal client-side validation; relies on backend for enforcement

**Authentication:**
- JWT-based with `python-jose` (`backend/utils/auth.py`)
- Password hashing: bcrypt via `passlib` (`backend/utils/auth.py`)
- Token includes `sub` (user ID) and `role` claims
- Token expiry: 24 hours (configurable via `jwt_access_token_expire_minutes`)
- Account lockout after 5 failed attempts for 30 minutes (configurable)

**Authorization (RBAC):**
- Three roles: `user`, `investigator`, `admin`
- Middleware dependency factories in `backend/middleware/auth.py`:
  - `get_current_user` -- validates JWT, returns User (used for any authenticated endpoint)
  - `require_admin` = `require_role(["admin"])`
  - `require_investigator` = `require_role(["investigator", "admin"])`
  - `require_user` = `require_role(["user", "investigator", "admin"])`
- Frontend: `ProtectedRoute` component in `App.tsx` checks `isAuthenticated` and optionally `requiredRole`
- Sidebar menu items in `mediaguardx/mediaguardx/src/components/Sidebar.tsx` differ by role

**CORS:**
- Configured in `backend/main.py` allowing origins: `settings.frontend_url`, `http://localhost:5173`, `http://localhost:3000`
- All methods and headers allowed; credentials enabled

**Rate Limiting:**
- `slowapi` with `get_remote_address` key function in `backend/middleware/rate_limiter.py`
- Default limit: 60 requests/minute (configurable via `rate_limit_per_minute`)
- Note: Per-route rate limits are not explicitly configured; only the global limiter is set up

## Database Schema (MongoDB Collections)

**`users`:**
```
{
  _id: ObjectId,
  email: string (unique),
  name: string,
  password_hash: string,
  role: "user" | "investigator" | "admin",
  is_active: bool,
  is_locked: bool,
  failed_login_attempts: int,
  locked_until: datetime | null,
  created_at: datetime,
  updated_at: datetime
}
```

**`detections`:**
```
{
  _id: ObjectId,
  user_id: string,
  filename: string,
  media_type: "image" | "video" | "audio",
  file_path: string,
  file_size: int,
  trust_score: float (0-100),
  label: "Authentic" | "Suspicious" | "Deepfake",
  anomalies: [{type, severity, description, confidence}],
  heatmap_url: string | null,
  metadata: {},
  decision_notes: string | null,
  created_at: datetime,
  updated_at: datetime
}
```

**`reports`:**
```
{
  _id: ObjectId,
  detection_id: ObjectId,
  user_id: ObjectId,
  pdf_path: string,
  case_id: string (format: "CASE-XXXXXXXX"),
  tamper_proof_hash: string (SHA-256),
  created_at: datetime
}
```

**`activity_logs`:**
```
{
  _id: ObjectId,
  user_id: ObjectId | null,
  action: string,
  resource_type: "user" | "detection" | "report" | "admin",
  resource_id: string,
  ip_address: string | null,
  user_agent: string | null,
  created_at: datetime
}
```

## ML Model Architecture

**Model:** EfficientNet-B0 (binary classifier: real vs fake)
- Defined in `backend/ml/train.py` -- `build_model()` replaces classifier head: `nn.Sequential(nn.Dropout(0.2), nn.Linear(in_features, 2))`
- Trained on FaceForensics++ dataset (`ffpp_images/train/{real,fake}/`)
- Checkpoint saved at `backend/models/deepfake_detector.pth` with keys: `model_state_dict`, `arch`, `num_classes`, `class_to_idx`
- Input: 224x224 RGB image normalized with ImageNet stats
- Output: softmax probability; `prob_real * 100` = trust_score

**Inference Pipeline (`backend/services/model_engine.py`):**
1. `load_model_if_available()` -- attempts lazy load of `.pth` checkpoint
2. For images: single forward pass through model
3. For videos: sample up to 12 frames evenly, average per-frame probabilities (uses temp files for frame extraction via OpenCV)
4. For audio: falls back to 0.5 (no audio model exists)
5. `get_label_from_score()`: >=70 = "Authentic", >=40 = "Suspicious", <40 = "Deepfake"
6. Generates placeholder heatmap image (colored stripes, not actual attention map)
7. If model unavailable: deterministic fallback using MD5 hash of file content + file size

## Component Architecture (Frontend)

**Layout Components:**
- `Layout` (`mediaguardx/mediaguardx/src/components/Layout.tsx`) -- wrapper with Navbar + optional Sidebar
- `Navbar` (`mediaguardx/mediaguardx/src/components/Navbar.tsx`) -- top nav with role-based links
- `Sidebar` (`mediaguardx/mediaguardx/src/components/Sidebar.tsx`) -- left nav with role-specific menu items

**Shared UI Components:**
- `Card` (`mediaguardx/mediaguardx/src/components/Card.tsx`) -- glass-morphism card wrapper
- `StatusBadge` (`mediaguardx/mediaguardx/src/components/StatusBadge.tsx`) -- colored badge for detection status
- `LoadingSkeleton` (`mediaguardx/mediaguardx/src/components/LoadingSkeleton.tsx`) -- loading placeholder
- `FileUploader` (`mediaguardx/mediaguardx/src/components/FileUploader.tsx`) -- drag-and-drop + URL input

**Detection Result Components:**
- `TrustScoreGauge` (`mediaguardx/mediaguardx/src/components/TrustScoreGauge.tsx`) -- donut chart via recharts
- `HeatmapDisplay` (`mediaguardx/mediaguardx/src/components/HeatmapDisplay.tsx`) -- image display for XAI heatmap
- `AnomalyList` (`mediaguardx/mediaguardx/src/components/AnomalyList.tsx`) -- list of detected anomalies
- `ExplainabilityPanel` (`mediaguardx/mediaguardx/src/components/ExplainabilityPanel.tsx`) -- heatmap + XAI regions
- `MultiLayerPanel` (`mediaguardx/mediaguardx/src/components/MultiLayerPanel.tsx`) -- visual/audio/metadata analysis summary
- `SocialMediaPanel` (`mediaguardx/mediaguardx/src/components/SocialMediaPanel.tsx`) -- social media compression info
- `FingerprintPanel` (`mediaguardx/mediaguardx/src/components/FingerprintPanel.tsx`) -- source fingerprint info
- `EmotionMismatchPanel` (`mediaguardx/mediaguardx/src/components/EmotionMismatchPanel.tsx`) -- face/audio emotion comparison
- `SyncAnalysisPanel` (`mediaguardx/mediaguardx/src/components/SyncAnalysisPanel.tsx`) -- lip-sync mismatch analysis
- `AdaptiveLearner` (`mediaguardx/mediaguardx/src/components/AdaptiveLearner.tsx`) -- user feedback for model improvement
- `PDFReportPreview` (`mediaguardx/mediaguardx/src/components/PDFReportPreview.tsx`) -- in-browser report preview
- `LiveCameraDetector` (`mediaguardx/mediaguardx/src/components/LiveCameraDetector.tsx`) -- webcam feed with mock detection

**Note:** Many analysis panels (MultiLayer, SocialMedia, Fingerprint, EmotionMismatch, SyncAnalysis) display placeholder/empty states because the backend does not populate the corresponding optional fields on `DetectionResult` (e.g., `audioAnalysis`, `metadataAnalysis`, `fingerprint`, `emotionMismatch`, `syncAnalysis`, `xaiRegions`).

---

*Architecture analysis: 2026-02-06*
