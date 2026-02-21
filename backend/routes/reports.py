"""Report generation routes using Supabase."""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from database import get_supabase
from middleware.auth import get_current_user, AuthenticatedUser
from services.pdf_generator import generate_pdf_report
import logging
import os
import uuid

security = HTTPBearer(auto_error=False)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/{detection_id}")
async def generate_report(
    detection_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Generate PDF report for a detection."""
    supabase = get_supabase()

    # Get detection record
    try:
        det_resp = supabase.table("detections").select("*").eq("id", detection_id).single().execute()
        detection = det_resp.data
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detection not found")

    if not detection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detection not found")

    # Check access
    if detection["user_id"] != current_user.id and current_user.role not in ("investigator", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Check if report already exists and PDF file is still on disk
    existing_resp = supabase.table("reports").select("*").eq("detection_id", detection_id).execute()
    if existing_resp.data:
        existing = existing_resp.data[0]
        if os.path.exists(existing["pdf_path"]):
            return {
                "id": existing["id"],
                "detectionId": detection_id,
                "pdfUrl": f"/api/report/{existing['id']}/download",
                "createdAt": existing["created_at"],
            }
        # PDF file missing — delete stale record and regenerate
        logger.warning("PDF file missing for report %s, regenerating", existing["id"])
        supabase.table("reports").delete().eq("id", existing["id"]).execute()

    # Generate report
    report_id = str(uuid.uuid4())
    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"

    user_data = {"name": current_user.name, "email": current_user.email}

    try:
        pdf_path, tamper_proof_hash = await generate_pdf_report(
            detection, user_data, report_id, case_id
        )
    except Exception as e:
        logger.error(f"Error generating PDF report: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating PDF report",
        )

    # Save report record
    report_record = {
        "id": report_id,
        "detection_id": detection_id,
        "user_id": current_user.id,
        "pdf_path": pdf_path,
        "case_id": case_id,
        "tamper_proof_hash": tamper_proof_hash,
    }

    supabase.table("reports").insert(report_record).execute()

    return {
        "id": report_id,
        "detectionId": detection_id,
        "pdfUrl": f"/api/report/{report_id}/download",
        "createdAt": report_record.get("created_at"),
    }


@router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    token: Optional[str] = Query(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Download PDF report.

    Supports auth via:
    - Authorization: Bearer header (API calls)
    - ?token= query param (browser window.open)
    """
    supabase = get_supabase()

    # Resolve auth token from header or query param
    auth_token = None
    if credentials and credentials.credentials:
        auth_token = credentials.credentials
    elif token:
        auth_token = token

    if not auth_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    # Verify token
    try:
        user_response = supabase.auth.get_user(auth_token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user_id = user_response.user.id
        try:
            profile_resp = supabase.table("profiles").select("role").eq("id", user_id).single().execute()
            user_role = profile_resp.data.get("role", "user") if profile_resp.data else "user"
        except Exception:
            user_role = "user"
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed")

    try:
        resp = supabase.table("reports").select("*").eq("id", report_id).single().execute()
        report = resp.data
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    if report["user_id"] != user_id and user_role not in ("investigator", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if not os.path.exists(report["pdf_path"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF file not found")

    return FileResponse(
        report["pdf_path"],
        media_type="application/pdf",
        filename=f"report_{report_id}.pdf",
    )


@router.get("/{report_id}")
async def get_report(
    report_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Get report metadata."""
    supabase = get_supabase()

    try:
        resp = supabase.table("reports").select("*").eq("id", report_id).single().execute()
        report = resp.data
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    if report["user_id"] != current_user.id and current_user.role not in ("investigator", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return {
        "id": report["id"],
        "detectionId": report["detection_id"],
        "pdfUrl": f"/api/report/{report_id}/download",
        "createdAt": report["created_at"],
    }
