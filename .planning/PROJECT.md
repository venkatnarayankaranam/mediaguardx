# MediaGuardX

## What This Is

A deepfake detection platform that lets users upload images, videos, and audio to get a multi-layered authenticity analysis — trust score, explainable heatmaps, audio/metadata cross-checks, emotion analysis, and lip-sync verification. Built as a college final year project with a FastAPI backend, React/TypeScript frontend, and EfficientNet-B0 ML model trained on FaceForensics++ data. Runs locally for demo.

## Core Value

When someone uploads suspect media, the system gives a clear, explainable, multi-layered verdict — not just "real or fake" but why and where, backed by a tamper-proof PDF report.

## Requirements

### Validated

- ✓ JWT authentication with role-based access (user/investigator/admin) — existing
- ✓ User registration and login with account lockout — existing
- ✓ Image upload and analysis endpoint — existing (placeholder ML)
- ✓ Video upload and analysis endpoint — existing (placeholder ML)
- ✓ Audio upload endpoint — existing (placeholder, returns 0.5)
- ✓ Trust score generation (0-100) with labels — existing (deterministic placeholder)
- ✓ Detection history with pagination — existing
- ✓ PDF report generation with tamper-proof SHA-256 hash and QR code — existing
- ✓ Admin user management and system stats endpoints — existing
- ✓ Rate limiting and CORS middleware — existing
- ✓ Frontend SPA with dashboard, detection results, admin panel, investigator panel — existing
- ✓ Frontend UI components for all 10 features (panels show "no data" state) — existing
- ✓ ML training pipeline with EfficientNet-B0 — existing (backend/ml/train.py)
- ✓ FaceForensics++ dataset (680 samples, train/val split) — existing

### Active

- [ ] Real ML-powered trust score meter (replace placeholder with trained EfficientNet-B0)
- [ ] Multi-layer detection: visual analysis with real model inference
- [ ] Multi-layer detection: audio analysis (voice cloning, robotic tone, frequency patterns)
- [ ] Multi-layer detection: metadata analysis (camera details, timestamps, compression)
- [ ] Explainable detection with Grad-CAM heatmaps (real spatial analysis, not placeholder stripes)
- [ ] Social-media mode: detect deepfakes in compressed video (WhatsApp, Instagram, TikTok compression)
- [ ] Adaptive learning: endpoint to submit new samples and retrain/update model
- [ ] Deepfake fingerprint detection: identify which tool/app created the deepfake
- [ ] Emotion mismatch detection: face emotion vs audio emotion cross-check
- [ ] Voice-face synchronization analysis: lip-sync and phoneme matching
- [ ] Live camera deepfake detection (real-time frame analysis via webcam)
- [ ] Wire admin dashboard to real backend data (currently hardcoded)
- [ ] Wire investigator dashboard to real backend data (currently hardcoded)
- [ ] Fix report download (frontend shows alert instead of downloading PDF)
- [ ] Fix security: prevent role self-assignment at registration
- [ ] Fix anomaly type validation mismatch (placeholder/model_prediction not in Literal)

### Out of Scope

- Cloud deployment (Docker, CI/CD) — local demo only for college presentation
- Email service for password reset — placeholder acceptable for demo
- OAuth/social login — email/password sufficient
- Mobile app — web-only
- Redis caching — not needed at demo scale
- API versioning — single version for college project

## Context

- **Project type:** College final year project, evaluated by faculty panel
- **Demo scenario:** Upload media -> see trust score + heatmap + multi-layer analysis + PDF report
- **ML approach:** EfficientNet-B0 fine-tuned on FaceForensics++ (680 GIF samples for training)
- **Frontend state:** All 10 feature UI panels already exist but display empty/placeholder states
- **Backend state:** Full API infrastructure built, but detection engine is placeholder (deterministic hash-based scoring)
- **Key insight:** The frontend-backend contract is already defined via TypeScript types (audioAnalysis, metadataAnalysis, fingerprint, emotionMismatch, syncAnalysis, xaiRegions fields on DetectionResult). Backend needs to populate these fields.
- **Known bugs:** Anomaly type validation mismatch, admin/investigator dashboards use hardcoded data, report download doesn't work, role self-assignment vulnerability, ProtectedRoute too restrictive for admin accessing investigator pages

## Constraints

- **Tech stack**: Python/FastAPI backend + React/TypeScript/Vite frontend + MongoDB — existing, don't change
- **ML framework**: PyTorch + EfficientNet-B0 — existing training pipeline, extend don't replace
- **Dataset**: FaceForensics++ (680 samples in ffpp_images/) — limited size, augmentation needed
- **Runtime**: Local machine (no GPU guarantee) — models must work on CPU with reasonable speed
- **Compatibility**: Backend responses must match existing frontend TypeScript interfaces exactly
- **Dependencies**: Existing package versions (FastAPI 0.104.1, React 19, PyTorch >=2.0) — don't upgrade unless necessary

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| EfficientNet-B0 for visual detection | Already in training pipeline, lightweight for CPU inference | — Pending |
| FaceForensics++ dataset | Already in repo, standard deepfake benchmark | — Pending |
| Grad-CAM for explainability | Standard XAI technique for CNNs, works with EfficientNet | — Pending |
| librosa for audio analysis | Standard Python audio library, lightweight | — Pending |
| Local-only deployment | College demo doesn't need cloud infrastructure | ✓ Good |
| Extend existing API contracts | Frontend types already define the shape, backend populates | ✓ Good |

---
*Last updated: 2026-02-06 after initialization*
