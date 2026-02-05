"""Main FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import logging
from contextlib import asynccontextmanager
import os

from config import settings
from database import connect_db, close_db
from middleware.error_handler import setup_error_handlers
from middleware.rate_limiter import setup_rate_limiting
from routes import auth, detection, history, reports, admin, live

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting MediaGuardX backend...")
    await connect_db()
    logger.info("Database connected")
    yield
    # Shutdown
    logger.info("Shutting down MediaGuardX backend...")
    await close_db()
    logger.info("Database disconnected")


app = FastAPI(
    title="MediaGuardX API",
    description="Scalable and Autonomous Framework for Deepfake Defense",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup error handlers
setup_error_handlers(app)

# Setup rate limiting
setup_rate_limiting(app)

# Static file serving for heatmaps
# Ensure directory exists before mounting
os.makedirs(settings.heatmaps_dir, exist_ok=True)
app.mount("/heatmaps", StaticFiles(directory=settings.heatmaps_dir), name="heatmaps")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(detection.router, prefix="/api/detect", tags=["Detection"])
app.include_router(history.router, prefix="/api/history", tags=["History"])
app.include_router(reports.router, prefix="/api/report", tags=["Reports"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(live.router, prefix="/api/live", tags=["Live Monitoring"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "MediaGuardX API",
        "version": "1.0.0",
        "status": "operational"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.node_env == "development"
    )

