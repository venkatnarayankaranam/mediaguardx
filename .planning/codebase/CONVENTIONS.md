# Coding Conventions

**Analysis Date:** 2026-02-06

## Naming Patterns

**Files (Frontend - React/TypeScript):**
- Components: PascalCase `.tsx` files in `mediaguardx/src/components/` (e.g., `FileUploader.tsx`, `TrustScoreGauge.tsx`, `StatusBadge.tsx`)
- Pages: PascalCase `.tsx` files in `mediaguardx/src/pages/` (e.g., `Dashboard.tsx`, `DetectionResult.tsx`, `AdminDashboard.tsx`)
- Stores: camelCase `.ts` files in `mediaguardx/src/store/` (e.g., `authStore.ts`, `detectionStore.ts`)
- Services: camelCase `.ts` files in `mediaguardx/src/services/` (e.g., `api.ts`)
- Types: camelCase `.ts` files in `mediaguardx/src/types/` (e.g., `index.ts`)
- Styles: lowercase `.css` files (e.g., `style.css`)
- Entry point: `main.tsx`

**Files (Backend - Python/FastAPI):**
- Modules: snake_case `.py` files (e.g., `file_handler.py`, `model_engine.py`, `pdf_generator.py`)
- Routes: snake_case `.py` matching resource name (e.g., `auth.py`, `detection.py`, `history.py`, `reports.py`)
- Models: snake_case `.py` matching entity name (e.g., `user.py`, `detection.py`, `report.py`, `activity_log.py`)
- Config: `config.py` for settings, `database.py` for DB connection
- Seed scripts: `seed.py`
- Test files: `test_*.py` prefix (e.g., `test_api.py`)

**Functions (Frontend):**
- React components: PascalCase function names exported as default (e.g., `export default function FileUploader()`)
- Event handlers: `handle` prefix with camelCase (e.g., `handleFileSelect`, `handleSubmit`, `handleLogout`, `handleDrag`)
- Helper functions: camelCase (e.g., `getColor`, `getStatus`, `getRecommendation`)
- API service functions: camelCase verbs (e.g., `login`, `register`, `uploadMedia`, `getDetectionResult`, `generateReport`)

**Functions (Backend):**
- Route handlers: snake_case with descriptive async verbs (e.g., `async def register()`, `async def detect_image()`, `async def get_detection()`)
- Private/internal helpers: underscore prefix (e.g., `async def _detect_media()`, `async def _log_activity()`)
- Utility functions: snake_case (e.g., `verify_password`, `get_password_hash`, `create_access_token`, `label_to_status`)

**Variables (Frontend):**
- State hooks: camelCase with descriptive names (e.g., `[uploading, setUploading]`, `[loading, setLoading]`, `[error, setError]`)
- Refs: camelCase with `Ref` suffix (e.g., `videoRef`)
- Constants: camelCase (e.g., `menuItems`, `API_BASE_URL`)
- Store variables: camelCase (e.g., `isAuthenticated`, `detectionId`, `trustScore`)

**Variables (Backend):**
- Module-level globals: UPPER_SNAKE_CASE for constants (e.g., `ALLOWED_IMAGE_EXTENSIONS`, `ML_AVAILABLE`)
- Module-level globals: lowercase with underscore prefix for mutable state (e.g., `_MODEL`, `_DEVICE`)
- Local variables: snake_case (e.g., `user_dict`, `detection_record`, `file_path`)
- Settings fields: snake_case (e.g., `jwt_secret`, `mongo_url`, `max_file_size_mb`)

**Types (Frontend):**
- Interfaces: PascalCase with descriptive name (e.g., `DetectionResult`, `User`, `Anomaly`, `FileUploaderProps`, `AuthState`)
- Type aliases: PascalCase (e.g., `UserRole`)
- Union types: string literal unions (e.g., `'authentic' | 'suspected' | 'deepfake'`)
- Component props: interface named `{ComponentName}Props` or short `Props` for single-use

**Types (Backend):**
- Pydantic models: PascalCase (e.g., `User`, `UserCreate`, `UserLogin`, `TokenResponse`, `DetectionRecord`)
- Literal types: use `Literal[...]` from typing (e.g., `Literal["user", "investigator", "admin"]`)

## Code Style

**Formatting:**
- No Prettier or ESLint config detected in the frontend project
- No Black, isort, flake8, or ruff config detected in the backend project
- Indentation: 2 spaces in TypeScript/TSX files, 4 spaces in Python files
- Semicolons: not used in TypeScript (no trailing semicolons observed in most code, but some inconsistency exists)
- Quotes: single quotes dominant in TypeScript, double quotes in Python
- Trailing commas: used in TypeScript objects and function params
- Line length: no enforced limit; some lines in `backend/services/model_engine.py` and `backend/services/pdf_generator.py` exceed 120 characters

**Linting:**
- No ESLint configuration (`.eslintrc*` or `eslint.config.*`) detected
- No Prettier configuration detected
- No Python linting tools configured (no `pyproject.toml`, `setup.cfg`, `.flake8`, or `ruff.toml`)
- TypeScript `strict: true` is enabled in `mediaguardx/tsconfig.app.json` with `noUnusedLocals` and `noUnusedParameters`
- The `tsc` build step (`tsc && vite build`) provides type checking at build time

## Import Organization

**Frontend Import Order (observed pattern):**
1. React hooks and React core (`import { useState, useEffect } from 'react'`)
2. Third-party libraries (`import { BrowserRouter, Routes } from 'react-router-dom'`, `import axios from 'axios'`)
3. Local stores (`import { useAuthStore } from '../store/authStore'`)
4. Local services/api (`import { login, uploadMedia } from '../services/api'`)
5. Local components (`import Card from '../components/Card'`)
6. Local types (`import type { DetectionResult } from '../types'`)
7. Icons last (`import { Download, FileText } from 'lucide-react'`)

**Note:** The `type` keyword is used for type-only imports: `import type { DetectionResult } from '../types'`

**Backend Import Order (observed pattern):**
1. Standard library (`from datetime import datetime`, `import logging`, `import os`)
2. Third-party packages (`from fastapi import APIRouter`, `from bson import ObjectId`)
3. Local modules (`from database import get_database`, `from models.user import User`)

**Note:** Some `from bson import ObjectId` imports are deferred inside function bodies (in `backend/routes/auth.py` lines 98, 118, 145 and `backend/middleware/auth.py` line 38), which is inconsistent with module-level imports.

**Path Aliases:**
- Frontend uses `@/*` alias mapped to `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`)
- However, observed imports use relative paths (`../store/authStore`, `../services/api`) rather than the alias (`@/store/authStore`)
- Convention: Use relative paths for imports within the `src/` directory

## Error Handling

**Frontend Patterns:**
- Try/catch in async event handlers with `console.error` for logging:
  ```typescript
  try {
    const { detectionId } = await uploadMedia(file);
    // success path
  } catch (error) {
    console.error('Upload failed:', error);
    alert('Upload failed. Please try again.');
  } finally {
    setUploading(false);
  }
  ```
- User-facing errors displayed via `alert()` calls (10 instances across the codebase) -- no toast/notification system
- Generic error messages shown to users (e.g., `'Invalid credentials. Please try again.'`) -- backend error details not exposed
- Inline error state in forms using `useState<string>('')` for error messages:
  ```typescript
  {error && (
    <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
      {error}
    </div>
  )}
  ```
- Axios response interceptor auto-redirects on 401 to `/login` (`mediaguardx/src/services/api.ts` line 27-33)
- No global error boundary component

**Backend Patterns:**
- FastAPI `HTTPException` for known errors with proper status codes:
  ```python
  raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Invalid email or password"
  )
  ```
- Global exception handlers registered in `backend/middleware/error_handler.py`:
  - `AppException` (custom base exception)
  - `RequestValidationError` (422)
  - `DuplicateKeyError` from pymongo (409)
  - Generic `Exception` catch-all (500)
- **Bare except clauses** in 7 locations (see CONCERNS.md for details) -- these catch all exceptions including `SystemExit`, `KeyboardInterrupt`:
  - `backend/routes/detection.py` lines 162, 223
  - `backend/routes/history.py` line 72
  - `backend/routes/reports.py` lines 29, 124, 165
  - `backend/middleware/auth.py` line 41
- Activity logging errors are silently swallowed with `logger.error()` in `_log_activity()` functions
- Generic error messages returned to clients for 500 errors (`"Error processing media file"`, `"Internal server error"`)

## Logging

**Backend Framework:** Python `logging` module

**Patterns:**
- Each module creates its own logger: `logger = logging.getLogger(__name__)`
- Root logger configured in `backend/main.py` with `logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')`
- Info level for startup/shutdown events and successful operations
- Error level with `exc_info=True` for exceptions: `logger.error(f"Error in detection: {e}", exc_info=True)`
- Warning level for validation errors
- f-strings used in log messages (not lazy `%s` formatting consistently, though `model_engine.py` uses `%s` style)

**Frontend Logging:** Raw `console.error()` and `console.log()` calls (20 occurrences across 5 files)
- No structured logging framework
- Debug `console.log` statements left in production code (e.g., `DetectionResult.tsx` lines 52-57, 79, 108, 119)
- Use `console.error` for error conditions

## Comments

**When to Comment:**
- Module-level docstrings on every Python file (e.g., `"""Authentication routes."""`, `"""Main FastAPI application entry point."""`)
- Function-level docstrings on all Python functions describing purpose
- Inline comments for "why" explanations and step numbering (e.g., `# Step 1: Login`, `# Check if user has access`)
- JSX section comments in React components (e.g., `{/* Stats Grid */}`, `{/* Media Preview */}`)
- No JSDoc/TSDoc used on frontend functions or components

**Guidelines:**
- Use docstrings on all Python functions
- Use inline `#` comments to explain non-obvious logic
- Use `{/* */}` comments in JSX to label sections
- Do not use JSDoc on TypeScript functions (current convention)

## Function Design

**Size:**
- Components: most are 30-80 lines, with `DetectionResult.tsx` (341 lines) and `AdminDashboard.tsx` (180 lines) being the largest
- Backend route handlers: 20-60 lines each
- Helper functions: 5-20 lines
- The `_detect_media` function in `backend/routes/detection.py` is the most complex route handler (~70 lines)

**Parameters (Frontend):**
- Props via destructured interface parameters:
  ```typescript
  export default function FileUploader({
    onFileSelect,
    onUrlSubmit,
    accept = 'image/*,video/*,audio/*',
    maxSize = 100,
  }: FileUploaderProps) {
  ```
- Default parameter values in destructuring

**Parameters (Backend):**
- FastAPI dependency injection via `Depends()`:
  ```python
  async def detect_image(
      file: UploadFile = File(...),
      current_user: User = Depends(get_current_user),
      request: Request = None
  ):
  ```
- Pydantic models for request body validation

**Return Values (Frontend):**
- Components return JSX
- API service functions return typed promises: `async (detectionId: string): Promise<DetectionResult>`
- Store actions return void

**Return Values (Backend):**
- Routes return Pydantic response models or dicts
- Utility functions return simple types or tuples

## Module Design

**Exports (Frontend):**
- One default export per file (component or store)
- Named exports for API service functions in `mediaguardx/src/services/api.ts`
- Named export + default export pattern: `export const useAuthStore = ...` plus `export default api`
- All types exported as named exports from `mediaguardx/src/types/index.ts`

**Exports (Backend):**
- Router instances exported as module-level `router = APIRouter()`
- Settings singleton: `settings = Settings()` in `backend/config.py`
- Database functions exported directly from `backend/database.py`

**Barrel Files:**
- `mediaguardx/src/types/index.ts` acts as a barrel for types
- Python `__init__.py` files exist in all backend packages but are empty (no re-exports)

## Component Patterns

**React Component Structure:**
1. Imports
2. Interface definition for props
3. Default export function component
4. Hooks at top of function body (useState, useEffect, useNavigate, custom stores)
5. Event handler functions
6. Helper/render functions
7. Early returns for loading/error states
8. JSX return

**Example Pattern:**
```typescript
import { useState } from 'react';
import type { DetectionResult } from '../types';

interface Props {
  detection: DetectionResult;
}

export default function ComponentName({ detection }: Props) {
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    // ...
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="glass rounded-xl p-6">
      {/* content */}
    </div>
  );
}
```

## Styling Conventions

**Approach:** Tailwind CSS utility classes (no CSS modules or styled-components)

**Custom Utilities:**
- `glass` class: `bg-dark-800/50 backdrop-blur-md border border-dark-700/50` (defined in `mediaguardx/src/style.css`)
- `glass-strong` class: `bg-dark-800/80 backdrop-blur-lg border border-dark-600/50`

**Color System:**
- Custom `primary` palette (teal-based: `primary-50` through `primary-900`)
- Custom `dark` palette (slate-based: `dark-50` through `dark-900`)
- Status colors: green for authentic, amber for suspected, red for deepfake
- Defined in `mediaguardx/tailwind.config.js`

**Layout:**
- `max-w-7xl mx-auto` for page content width
- `space-y-{n}` for vertical stacking
- `grid lg:grid-cols-{n} gap-6` for responsive grid layouts
- Responsive breakpoints: `md:` and `lg:` used

**Component Styling Pattern:**
```typescript
<div className={`px-2 py-1 rounded-full text-xs ${
  status === 'authentic'
    ? 'bg-green-500/20 text-green-400'
    : status === 'suspected'
    ? 'bg-amber-500/20 text-amber-400'
    : 'bg-red-500/20 text-red-400'
}`}>
```

## State Management

**Pattern:** Zustand stores with `persist` middleware for localStorage

**Auth Store (`mediaguardx/src/store/authStore.ts`):**
- Persisted as `auth-storage` in localStorage
- State: `user`, `token`, `isAuthenticated`
- Actions: `login`, `logout`, `updateUser`

**Detection Store (`mediaguardx/src/store/detectionStore.ts`):**
- Persisted as `detection-storage` in localStorage
- State: `history` (array of `DetectionResult`)
- Actions: `addDetection`, `updateDetection`, `getDetection`, `clearHistory`

**Convention:**
- Define store interface first, then `create<Interface>()(persist(...))`
- Access store outside React via `useAuthStore.getState()`
- Store accessed in components via hook: `const { user } = useAuthStore()`

## API Communication Patterns

**Frontend-to-Backend:**
- Axios instance with base URL from `VITE_API_URL` env var, default `http://localhost:8000/api`
- Auth token injected via request interceptor
- 401 responses trigger logout + redirect via response interceptor
- File uploads use `FormData` with `multipart/form-data` header

**Backend API Naming:**
- Route prefixes: `/api/auth`, `/api/detect`, `/api/history`, `/api/report`, `/api/admin`, `/api/live`
- Response field naming: camelCase for frontend-facing fields (`trustScore`, `mediaType`, `detectionId`)
- Internal field naming: snake_case for database fields (`trust_score`, `media_type`, `detection_id`)
- Manual mapping between snake_case (DB) and camelCase (API response) in route handlers

---

*Convention analysis: 2026-02-06*
