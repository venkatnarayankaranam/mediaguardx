# Codebase Concerns

**Analysis Date:** 2026-02-06

## Tech Debt

**Placeholder ML Model Engine (Critical):**
- Issue: The core detection engine at `backend/services/model_engine.py` falls back to a deterministic placeholder when no trained model `.pth` file is present. The placeholder generates trust scores from an MD5 hash of the first 64KB of the file, which has zero correlation with actual deepfake presence. Anomalies are also labelled with `type="placeholder"` which violates the `Anomaly` Pydantic model's `Literal` constraint (allowed types are `face_blending`, `texture_artifacts`, etc.).
- Files: `backend/services/model_engine.py` (lines 218-236), `backend/models/detection.py` (lines 11-17)
- Impact: All detections produce random-seeming results. The `type="placeholder"` value causes a Pydantic validation error when the `Anomaly` model is instantiated with it, because the `Literal` type on `Anomaly.type` does not include `"placeholder"`. This may crash detection requests or silently produce invalid data if validation is bypassed at the dict level.
- Fix approach: Either add `"placeholder"` and `"model_prediction"` to the `Anomaly.type` Literal union in `backend/models/detection.py`, or use an existing valid type like `"texture_artifacts"` for placeholder anomalies. Long-term: train and deploy the EfficientNet model using the existing `backend/ml/train.py` pipeline against the `ffpp_images/` dataset.

**Hardcoded Admin Credentials in Seed Script:**
- Issue: Default admin password `Admin123!` and email `admin@mediaguardx.com` are hardcoded in the seed script and the test script.
- Files: `backend/seed.py` (line 27), `backend/test_api.py` (lines 26-27)
- Impact: If the seed script is run in production without changing the password, the system has a known default credential. The test script also hardcodes these credentials.
- Fix approach: Accept admin password as a CLI argument or environment variable in the seed script. Remove hardcoded credentials from the test script and use environment variables instead.

**Entirely Fake Frontend Admin Dashboard:**
- Issue: `AdminDashboard.tsx` renders completely hardcoded static data for stats ("1,234 users", "567 detections", "98% health"), user tables (John Doe, Jane Smith, Bob Wilson), system monitoring values ("120ms", "2.3s"), and log entries. None of this data comes from the backend API, even though the backend has `/api/admin/stats` and `/api/admin/users` endpoints that return real data.
- Files: `mediaguardx/src/pages/AdminDashboard.tsx` (entire file, lines 5-10, 105-108, 151-156)
- Impact: Admin users see fictional data rather than actual system state. The backend endpoints exist and work, but the frontend never calls them.
- Fix approach: Wire `AdminDashboard.tsx` to call `GET /api/admin/stats` for statistics and `GET /api/admin/users` for user management. Replace hardcoded system monitoring and logs with data from the activity log API.

**Entirely Fake Investigator Dashboard:**
- Issue: `InvestigatorDashboard.tsx` uses hardcoded case data (lines 8-25), a hardcoded timeline (lines 148-153), and the "Create Case" form does not submit to any backend endpoint. There is no cases API on the backend at all.
- Files: `mediaguardx/src/pages/InvestigatorDashboard.tsx` (entire file)
- Impact: The investigator role is non-functional. Cases cannot be created, viewed, or managed. The "View Case" and "Export PDF" buttons do nothing.
- Fix approach: Implement a cases API on the backend (`/api/cases` CRUD) and wire the frontend to use it.

**Placeholder Live Monitoring (Both Ends):**
- Issue: The backend `live.py` returns a hardcoded `simulated_score = 75.0` and a UUID frame ID with no actual frame analysis. The frontend `LiveCameraDetector.tsx` uses `Math.random() > 0.995` to randomly trigger fake deepfake alerts. The `CameraMonitoring.tsx` page has a hardcoded `trustScore` of 85 that never changes.
- Files: `backend/routes/live.py` (entire file), `mediaguardx/src/components/LiveCameraDetector.tsx` (lines 24-31), `mediaguardx/src/pages/CameraMonitoring.tsx` (line 10)
- Impact: The live monitoring feature is entirely simulated. Users may believe they are getting real-time deepfake analysis when they are not.
- Fix approach: Implement WebSocket-based frame streaming from the frontend to the backend, run frame-by-frame inference using the ML model, and return real scores.

**Placeholder Forgot Password Flow:**
- Issue: The backend `forgot_password` endpoint in `backend/routes/auth.py` only logs the request but does not send any email (SMTP is unconfigured). The frontend `ForgotPassword.tsx` does not even call the backend endpoint -- it sets `submitted = true` locally without making any API request.
- Files: `backend/routes/auth.py` (lines 183-199), `mediaguardx/src/pages/ForgotPassword.tsx` (lines 10-13), `backend/config.py` (lines 38-42)
- Impact: Password reset is completely non-functional. Users who forget their password have no recovery path.
- Fix approach: Configure SMTP settings, implement token-based password reset email in the backend, create a `/api/auth/reset-password` endpoint, and wire the frontend to call the API.

**Placeholder Adaptive Learning:**
- Issue: `AdaptiveLearner.tsx` uses a `setTimeout` with `alert()` instead of making any API call. There is no corresponding backend endpoint for adaptive learning sample submission.
- Files: `mediaguardx/src/components/AdaptiveLearner.tsx` (lines 15-23)
- Impact: The feature is entirely cosmetic. Users believe samples are being submitted for learning.
- Fix approach: Create an adaptive learning endpoint on the backend, store submitted samples, and implement a retraining pipeline.

**Placeholder Heatmap Generation:**
- Issue: `generate_heatmap_placeholder` in `model_engine.py` creates a synthetic striped image that has no relation to the analyzed media. It generates colored horizontal bars rather than any actual spatial analysis.
- Files: `backend/services/model_engine.py` (lines 169-186)
- Impact: Heatmaps displayed to users are meaningless visual noise. Even when the real ML model is active, the heatmap is still a placeholder (line 213 calls `generate_heatmap_placeholder` regardless).
- Fix approach: When the ML model is loaded, implement Grad-CAM or similar XAI technique to generate meaningful heatmaps. Only fall back to placeholder when no model is available.

**File Upload Reads Entire File Into Memory Before Size Check:**
- Issue: In `save_uploaded_file`, `contents = await file.read()` loads the entire file into RAM, then checks the size. With `max_file_size_mb = 500` (500 MB), a malicious upload could consume 500 MB of server memory per request before being rejected.
- Files: `backend/utils/file_handler.py` (lines 55-61)
- Impact: Memory exhaustion under concurrent large uploads. Even with rate limiting, a few simultaneous 500 MB uploads could crash the server.
- Fix approach: Stream the upload to disk in chunks, checking size incrementally. Reject the upload mid-stream if the threshold is exceeded.

**Video Frame Analysis Writes Temp Files to CWD:**
- Issue: `_predict_video_prob_real` writes temporary frame images to the current working directory (`.tmp_frame.jpg`, `.tmp_frame_{idx}.jpg`). Under concurrent requests, multiple processes may write to the same `.tmp_frame.jpg` path.
- Files: `backend/services/model_engine.py` (lines 131-133, 149-150)
- Impact: Race conditions under concurrent video analysis. Temp files may not be cleaned up on errors. CWD pollution.
- Fix approach: Use `tempfile.NamedTemporaryFile` or process frames in memory using PIL/BytesIO without writing to disk.

**Bare `except:` Clauses Throughout Backend:**
- Issue: Multiple bare `except:` clauses catch all exceptions (including `KeyboardInterrupt`, `SystemExit`) and silently convert them to HTTP errors.
- Files: `backend/middleware/auth.py` (line 41), `backend/routes/detection.py` (lines 162, 223), `backend/routes/reports.py` (lines 29, 124, 165), `backend/routes/history.py` (line 72)
- Impact: Masks unexpected errors, makes debugging difficult. Could swallow critical system exceptions.
- Fix approach: Replace bare `except:` with `except (ValueError, Exception) as e:` with appropriate logging.

**Duplicate `_log_activity` Functions:**
- Issue: The `_log_activity` helper function is duplicated in both `backend/routes/auth.py` (lines 202-220) and `backend/routes/detection.py` (lines 270-287). The implementations differ slightly (auth version uses `ObjectId(user_id)`, detection version uses raw `user_id`).
- Files: `backend/routes/auth.py` (lines 202-220), `backend/routes/detection.py` (lines 270-287)
- Impact: Inconsistent activity log data (user_id stored as ObjectId vs string). Code duplication makes maintenance harder.
- Fix approach: Extract into a shared utility function in `backend/utils/` or a dedicated service. Standardize `user_id` storage format.

## Known Bugs

**Anomaly Type Validation Mismatch:**
- Symptoms: When the placeholder model engine creates anomalies, it uses `type="placeholder"` and `type="model_prediction"` which are not in the `Anomaly` Pydantic model's `Literal` type constraint. This causes validation failures.
- Files: `backend/services/model_engine.py` (lines 211, 234), `backend/models/detection.py` (lines 11-17)
- Trigger: Any detection request when either the ML model is active (`type="model_prediction"`) or the placeholder is used (`type="placeholder"`).
- Workaround: The anomalies are converted to dicts before DB insertion in `backend/routes/detection.py` (lines 44-52), which may bypass Pydantic validation. But any code path that validates the `Anomaly` model directly will fail.

**Admin History Endpoint N+1 Query Problem:**
- Symptoms: The admin history endpoint fetches detections then loops through each to query the user by ID individually.
- Files: `backend/routes/history.py` (lines 85-88)
- Trigger: Any call to `GET /api/history/admin` with multiple results.
- Workaround: None currently. Performance degrades linearly with result count.

**Frontend ProtectedRoute Role Check is Too Restrictive:**
- Symptoms: Admin users cannot access the investigator dashboard. The `ProtectedRoute` component checks `user?.role !== requiredRole` with strict equality, so an admin (role="admin") is redirected away from `/investigator` (which requires `requiredRole="investigator"`).
- Files: `mediaguardx/src/App.tsx` (lines 23-24, 67-70)
- Trigger: Admin user navigating to `/investigator`.
- Workaround: Admin must use direct API calls. The backend correctly allows admin access to investigator endpoints.

**Report Download Never Actually Downloads:**
- Symptoms: After generating a report, the frontend shows `alert('Report generated successfully! (Mock - PDF would be downloaded)')` but does not trigger a download or navigate to the PDF URL.
- Files: `mediaguardx/src/pages/DetectionResult.tsx` (line 157)
- Trigger: Clicking "Generate Report" on any detection result.
- Workaround: Manually construct the PDF download URL from the API response.

## Security Considerations

**User Role Self-Assignment at Registration (Critical):**
- Risk: The `UserCreate` schema accepts a `role` field with default `"user"` but allows any of `"user"`, `"investigator"`, or `"admin"`. The registration endpoint at `POST /api/auth/register` uses `user_data.role` directly without overriding it. Any user can register as an admin by sending `{"role": "admin"}` in the request body.
- Files: `backend/models/user.py` (lines 41-46), `backend/routes/auth.py` (lines 33, 37)
- Current mitigation: None.
- Recommendations: Remove the `role` field from `UserCreate` or always force it to `"user"` in the registration endpoint. Implement a separate admin-only endpoint for role assignment.

**JWT Token Has 24-Hour Expiry With No Refresh Mechanism:**
- Risk: Access tokens are valid for 24 hours with no refresh token rotation. If a token is stolen, the attacker has full access for an entire day.
- Files: `backend/config.py` (line 12), `backend/utils/auth.py` (lines 21-29)
- Current mitigation: None.
- Recommendations: Reduce access token TTL to 15-30 minutes and implement a refresh token flow with token rotation.

**No CSRF Protection:**
- Risk: The frontend stores auth tokens in localStorage (via zustand `persist` middleware with `name: 'auth-storage'`). While JWT in headers mitigates traditional CSRF, the combination with `allow_credentials=True` in CORS could be exploitable.
- Files: `backend/main.py` (lines 46-52), `mediaguardx/src/store/authStore.ts` (lines 29-31)
- Current mitigation: JWT Bearer token in Authorization header (not cookies). Partial mitigation.
- Recommendations: Review CORS origins for production. Remove wildcard methods/headers. Consider token binding.

**CORS Allows Localhost Origins in All Environments:**
- Risk: `allow_origins` includes `http://localhost:5173` and `http://localhost:3000` regardless of environment. In production, this allows local development servers to make authenticated cross-origin requests.
- Files: `backend/main.py` (line 48)
- Current mitigation: None.
- Recommendations: Conditionally include localhost origins only when `node_env == "development"`.

**No Password Complexity Validation on Backend:**
- Risk: The frontend enforces `password.length < 8` but the backend `UserCreate` model has no password validation. Direct API calls can register users with any password, including empty strings.
- Files: `backend/models/user.py` (line 45 - `password: str` with no validator), `mediaguardx/src/pages/Register.tsx` (lines 21-29)
- Current mitigation: Frontend-only check (easily bypassed).
- Recommendations: Add a Pydantic validator for password strength on `UserCreate.password` in the backend.

**No File Content Validation (MIME Type Spoofing):**
- Risk: File upload validation only checks `Content-Type` header (`file.content_type.startswith("image/")`) and file extension. An attacker can upload malicious files (executables, scripts) with spoofed MIME types and image extensions.
- Files: `backend/routes/detection.py` (lines 110-114, 125-129, 141-145), `backend/utils/file_handler.py` (lines 25-35)
- Current mitigation: Extension whitelist in `file_handler.py`.
- Recommendations: Validate file magic bytes using `python-magic` or similar. Scan uploaded content for embedded scripts.

**MongoDB Connection String Logged at INFO Level:**
- Risk: The database connection string (which may contain credentials) is logged when connecting.
- Files: `backend/database.py` (line 20)
- Current mitigation: None.
- Recommendations: Mask or omit the connection string from log output.

**Heatmap Static Files Served Without Authentication:**
- Risk: The `/heatmaps` directory is mounted as public static files. Anyone with a heatmap URL can access detection heatmaps without authentication.
- Files: `backend/main.py` (lines 62-63)
- Current mitigation: Heatmap filenames contain detection IDs (not easily guessable ObjectIds).
- Recommendations: Serve heatmaps through an authenticated endpoint like detection files, or use signed URLs with expiry.

## Performance Bottlenecks

**Full File Read Into Memory on Upload:**
- Problem: Every uploaded file is fully read into memory before being written to disk.
- Files: `backend/utils/file_handler.py` (line 55)
- Cause: `contents = await file.read()` loads the entire file. With 500 MB max, this can consume significant RAM.
- Improvement path: Stream file to disk using chunked reads (`async for chunk in file`). Check accumulated size per chunk.

**Admin History N+1 Database Queries:**
- Problem: For each detection in the admin history list, a separate `db.users.find_one()` query is made.
- Files: `backend/routes/history.py` (lines 85-88)
- Cause: Missing JOIN-like aggregation or batch user lookup.
- Improvement path: Collect unique user_ids, batch-fetch all users in one query, then map them into results.

**Admin Stats Makes 8 Separate Count Queries:**
- Problem: The `/api/admin/stats` endpoint makes 8 separate `count_documents` calls to MongoDB.
- Files: `backend/routes/admin.py` (lines 53-65)
- Cause: No aggregation pipeline used.
- Improvement path: Use a single MongoDB aggregation pipeline with `$facet` to compute all counts in one round-trip.

**No Database Indexes Defined:**
- Problem: No MongoDB indexes are created for any collection. Queries filter on `user_id`, `email`, `media_type`, `label`, and `created_at` without index support.
- Files: `backend/database.py` (entire file - no index creation), `backend/routes/history.py`, `backend/routes/admin.py`
- Cause: Index creation was never implemented.
- Improvement path: Add index creation during startup in `connect_db()`. At minimum: `users.email` (unique), `detections.user_id`, `detections.created_at`, `reports.detection_id`, `activity_logs.user_id`.

**Synchronous ML Inference in Async Context:**
- Problem: `_predict_image_prob_real` and `_predict_video_prob_real` are synchronous CPU-bound functions called within the async `analyze_media` function. They block the event loop during inference.
- Files: `backend/services/model_engine.py` (lines 87-110, 113-157, 189-236)
- Cause: PyTorch inference is CPU-intensive and synchronous.
- Improvement path: Run inference in a thread pool using `asyncio.get_event_loop().run_in_executor()` or use a task queue (Celery/RQ) for heavy inference jobs.

## Fragile Areas

**Model Engine Fallback Chain:**
- Files: `backend/services/model_engine.py`
- Why fragile: The model engine has a multi-level fallback (ML model -> deterministic placeholder) controlled by global mutable state (`_MODEL`, `_DEVICE`, etc.). The lazy loading on line 195 (`_MODEL is not None or load_model_if_available()`) is not thread-safe. If ML libraries are partially available but model loading fails, the state may be inconsistent.
- Safe modification: Always test with both `ML_AVAILABLE=True` (model present) and `ML_AVAILABLE=False` paths. Add explicit model state management rather than relying on global variables.
- Test coverage: Zero automated tests for model engine.

**Frontend Detection Store Persistence:**
- Files: `mediaguardx/src/store/detectionStore.ts`
- Why fragile: Detection history is persisted to localStorage via zustand `persist`. If the `DetectionResult` type changes, deserialization of old cached data may fail silently or produce stale/invalid results. Blob URLs from previous sessions are stored but are invalid after page reload.
- Safe modification: Add a version key to the persisted store and implement migration logic for schema changes.
- Test coverage: No frontend tests exist at all.

**CORS and URL Construction:**
- Files: `backend/routes/detection.py` (lines 77-79, 187-193), `mediaguardx/src/services/api.ts` (lines 93-103)
- Why fragile: File and heatmap URLs are constructed by string manipulation of `request.base_url` on the backend and `API_BASE_URL.replace('/api', '')` on the frontend. Any change to URL structure, proxy configuration, or deployment behind a reverse proxy breaks URL construction.
- Safe modification: Centralize URL construction into a single utility function. Consider storing relative paths and resolving at request time.
- Test coverage: None.

## Scaling Limits

**File Storage on Local Disk:**
- Current capacity: Limited by server disk space. Uploaded media at up to 500 MB each.
- Limit: Single server disk. No replication or CDN.
- Scaling path: Migrate to object storage (S3, GCS, or MinIO). Store file references in the database. Serve via CDN or signed URLs.

**No Request Queue for ML Inference:**
- Current capacity: One inference at a time (blocking the event loop).
- Limit: Concurrent detection requests will queue in the FastAPI threadpool. Video analysis (12 frames) takes significant time.
- Scaling path: Implement a task queue (Celery + Redis/RabbitMQ) for async inference. Return a pending status and allow polling.

**MongoDB Without Indexes:**
- Current capacity: Fine for small datasets (hundreds of records).
- Limit: Full collection scans on user_id, email lookups as data grows to thousands of records.
- Scaling path: Add indexes as described in Performance Bottlenecks section.

## Dependencies at Risk

**`python-jose` for JWT:**
- Risk: The `python-jose` library has had security advisories and is not as actively maintained as alternatives.
- Impact: Potential JWT validation bypasses.
- Migration plan: Consider migrating to `PyJWT` which is more actively maintained and widely used.

**No `requirements.txt` or `pyproject.toml` Found:**
- Risk: Python backend dependencies are not explicitly pinned in a visible requirements file. Dependency versions may drift across environments.
- Impact: Builds may break or behave differently on different machines.
- Migration plan: Generate a `requirements.txt` or `pyproject.toml` with pinned versions.

## Missing Critical Features

**No Audio Deepfake Detection:**
- Problem: The `/api/detect/audio` endpoint accepts audio uploads but the model engine returns a hardcoded `prob_real = 0.5` for audio (line 205 of `model_engine.py`). No audio analysis model exists.
- Blocks: Audio deepfake detection, voice cloning detection, audio-visual synchronization analysis.

**No Multi-Layer Analysis Backend:**
- Problem: The frontend has extensive UI components for multi-layer analysis (audio analysis, metadata analysis, fingerprinting, emotion mismatch, lip-sync analysis, XAI regions) defined in the TypeScript types, but the backend never populates any of these fields. They are always `undefined`/`null`.
- Files: `mediaguardx/src/types/index.ts` (lines 26-57), `mediaguardx/src/components/MultiLayerPanel.tsx`, `mediaguardx/src/components/FingerprintPanel.tsx`, `mediaguardx/src/components/EmotionMismatchPanel.tsx`, `mediaguardx/src/components/SyncAnalysisPanel.tsx`, `mediaguardx/src/components/SocialMediaPanel.tsx`
- Blocks: All these panels always display "No data available" messages. The UI suggests capabilities the system does not have.

**No Email Infrastructure:**
- Problem: SMTP configuration is defined but optional (all `None` defaults). No email sending function exists. Password reset, account notifications, and alert emails are non-functional.
- Files: `backend/config.py` (lines 38-42)
- Blocks: Password reset, user notifications, admin alerts.

**No File Cleanup/Retention Policy:**
- Problem: Uploaded files, heatmaps, and PDF reports accumulate on disk with no cleanup mechanism. There is no scheduled job to remove old files.
- Files: `backend/utils/file_handler.py`, `backend/services/model_engine.py`, `backend/services/pdf_generator.py`
- Blocks: Long-term operation without manual disk management.

## Test Coverage Gaps

**Zero Automated Tests:**
- What's not tested: The entire application. There are no unit tests, integration tests, or end-to-end tests anywhere in the codebase. The only test file is `backend/test_api.py`, which is a manual smoke test script that requires a running server and interactive input (`input()` on line 116).
- Files: `backend/test_api.py` (manual script, not automated), no `tests/` directory exists, no test configuration files (pytest.ini, jest.config, vitest.config)
- Risk: Any code change could introduce regressions undetected. Critical paths (authentication, detection, report generation, file upload) have zero automated verification.
- Priority: High - implement at minimum: auth endpoint tests, detection upload/retrieve tests, role-based access control tests, and model engine unit tests (both ML and placeholder paths).

**No Frontend Tests:**
- What's not tested: All React components and pages, zustand stores, API service layer, routing and auth guards.
- Files: No `*.test.tsx`, `*.spec.tsx`, or test configuration files in `mediaguardx/`
- Risk: UI regressions, broken auth flows, incorrect data display.
- Priority: High - add component tests for critical flows (Login, Register, Dashboard upload, DetectionResult display).

---

*Concerns audit: 2026-02-06*
