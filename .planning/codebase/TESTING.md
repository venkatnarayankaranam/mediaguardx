# Testing Patterns

**Analysis Date:** 2026-02-06

## Test Framework

**Backend Runner:**
- pytest 7.4.3 + pytest-asyncio 0.21.1
- Config: No `pytest.ini`, `pyproject.toml`, or `setup.cfg` configuration file detected
- Tests run with default pytest discovery

**Frontend Runner:**
- **No test framework configured.** No jest, vitest, or testing-library packages in `mediaguardx/package.json`
- No test runner config files (`jest.config.*`, `vitest.config.*`) detected
- No `test` script in `mediaguardx/package.json` scripts section
- The `package.json` scripts only include: `dev`, `build`, `preview`

**Run Commands:**
```bash
# Backend tests (from backend/ directory)
pytest test_api.py              # Run the single test file
pytest                          # Default pytest discovery (finds test_api.py)

# Frontend tests
# NOT AVAILABLE - no test framework installed
```

## Test File Organization

**Backend:**
- Location: Single test file at project root level: `backend/test_api.py`
- No test directory structure
- No `conftest.py` or shared fixtures

**Frontend:**
- No test files exist (no `*.test.tsx`, `*.test.ts`, `*.spec.tsx`, `*.spec.ts`)

**Structure:**
```
backend/
  test_api.py                  # Single integration/smoke test
mediaguardx/
  (no test files)
```

## Test Structure (Backend)

**The only test file is `backend/test_api.py`:**

This is NOT a standard pytest test file. It is a manual integration/smoke test script designed to be run interactively against a running server.

**Characteristics:**
- Requires a running backend server (`python main.py`) and MongoDB instance
- Requires seeded admin user (`python seed.py`)
- Uses `requests` library for HTTP calls (not `httpx` or FastAPI `TestClient`)
- Prompts for user input before running: `input()` on line 116
- Does NOT use pytest assertions (`assert`). Uses `print()` for results
- Does NOT use pytest fixtures
- Hardcoded credentials: `admin@mediaguardx.com` / `Admin123!`
- Tests a single workflow: login -> upload 5 test images -> print summary

**Test Script Pattern:**
```python
"""Test script to verify the detection API with real image uploads."""
import requests
from PIL import Image
import tempfile

API_BASE_URL = "http://localhost:8000/api"

def create_test_image(file_path: str, size: tuple = (640, 480)):
    """Create a test image file."""
    img = Image.new('RGB', size, color='red')
    img.save(file_path, 'JPEG')

def test_detection_api():
    """Test the detection API with image uploads."""
    # Step 1: Login with hardcoded credentials
    response = requests.post(f"{API_BASE_URL}/auth/login", json=login_data)
    token = response.json()["access_token"]

    # Step 2: Upload multiple images
    with tempfile.TemporaryDirectory() as tmpdir:
        for i in range(5):
            create_test_image(test_image_path)
            with open(test_image_path, 'rb') as f:
                response = requests.post(f"{API_BASE_URL}/detect/image", ...)

    # Step 3: Print summary (no assertions)
    print("Test Results Summary:")

if __name__ == "__main__":
    input()  # Wait for user
    test_detection_api()
```

## Mocking

**Framework:** Not applicable - no mocking framework installed or used

**Current State:**
- Backend `test_api.py` tests against real server with real MongoDB -- no mocking
- The `backend/services/model_engine.py` has a built-in fallback/placeholder path when ML libraries are unavailable (uses deterministic hash-based scoring), which functions as a form of graceful degradation but is NOT a test mock
- The `backend/routes/live.py` is entirely a placeholder with simulated values

**What SHOULD Be Mocked (if tests are added):**
- MongoDB database operations (use `mongomock` or mock the `get_database()` function)
- ML model inference in `backend/services/model_engine.py`
- File system operations in `backend/utils/file_handler.py`
- External API calls (if any are added)
- For frontend: API service calls from `mediaguardx/src/services/api.ts`

## Fixtures and Factories

**Test Data:**
- No pytest fixtures defined
- No test data factories
- `backend/test_api.py` creates test images dynamically using PIL:
  ```python
  img = Image.new('RGB', size, color='red')
  img.save(file_path, 'JPEG')
  ```
- Uses Python `tempfile.TemporaryDirectory()` for cleanup

**Seed Data:**
- `backend/seed.py` creates a default admin user with hardcoded credentials
- This is a deployment/setup script, not a test fixture

**Location:**
- No dedicated fixtures directory
- No shared test helpers

## Coverage

**Requirements:** None enforced. No coverage tooling configured.

**View Coverage:**
```bash
# Not configured. Would require:
pip install pytest-cov
pytest --cov=. --cov-report=html
```

## Test Types

**Unit Tests:**
- **None exist.** No unit tests for:
  - Backend utility functions (`utils/auth.py`, `utils/file_handler.py`, `utils/formatters.py`)
  - Backend models/schemas (Pydantic validation)
  - Frontend components
  - Frontend stores
  - Frontend service functions

**Integration Tests:**
- `backend/test_api.py` is a manual integration test that exercises the login + detection workflow
- It requires real infrastructure (running server, MongoDB, seeded data)
- It is not automated (requires user interaction)

**E2E Tests:**
- Not used. No Cypress, Playwright, or similar framework configured.

## What Testing Infrastructure Exists

**Backend (minimal):**
- `pytest` and `pytest-asyncio` are listed in `backend/requirements.txt`
- FastAPI provides `TestClient` (via Starlette) which could be used but is NOT currently used
- The test file uses `requests` instead of `TestClient`

**Frontend (none):**
- No testing library in `package.json` dependencies or devDependencies
- No test configuration files
- No test scripts

## Recommended Testing Approach (for future development)

**Backend Unit Tests (highest priority):**
```python
# Example: backend/tests/test_auth_utils.py
from utils.auth import verify_password, get_password_hash, create_access_token, decode_access_token

def test_password_hash_and_verify():
    password = "TestPassword123!"
    hashed = get_password_hash(password)
    assert verify_password(password, hashed) is True
    assert verify_password("wrong", hashed) is False

def test_create_and_decode_token():
    data = {"sub": "user123", "role": "user"}
    token = create_access_token(data)
    decoded = decode_access_token(token)
    assert decoded["sub"] == "user123"
    assert decoded["role"] == "user"
```

**Backend Integration Tests (with TestClient):**
```python
# Example: backend/tests/test_routes.py
import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "operational"

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
```

**Frontend Tests (with Vitest + Testing Library):**
```bash
# Install test dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

```typescript
// Example: src/components/__tests__/StatusBadge.test.tsx
import { render, screen } from '@testing-library/react';
import StatusBadge from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders authentic status', () => {
    render(<StatusBadge status="authentic" />);
    expect(screen.getByText('Authentic')).toBeInTheDocument();
  });
});
```

## Test Gaps Summary

| Area | Test Coverage | Priority |
|------|--------------|----------|
| Auth utilities (`backend/utils/auth.py`) | None | High |
| File validation (`backend/utils/file_handler.py`) | None | High |
| Pydantic model validation (`backend/models/*.py`) | None | High |
| API route handlers (`backend/routes/*.py`) | Manual smoke test only | High |
| ML model engine (`backend/services/model_engine.py`) | None | Medium |
| PDF generation (`backend/services/pdf_generator.py`) | None | Medium |
| Frontend components (`mediaguardx/src/components/*.tsx`) | None | Medium |
| Frontend stores (`mediaguardx/src/store/*.ts`) | None | Medium |
| Frontend API service (`mediaguardx/src/services/api.ts`) | None | Medium |
| Middleware auth + error handling (`backend/middleware/*.py`) | None | High |
| Frontend routing + protected routes (`mediaguardx/src/App.tsx`) | None | Low |
| E2E user workflows | None | Low |

---

*Testing analysis: 2026-02-06*
