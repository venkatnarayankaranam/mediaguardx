"""Report generation routes using Supabase."""
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import FileResponse
from database import get_supabase
from middleware.auth import get_current_user, AuthenticatedUser
from services.pdf_generator import generate_pdf_report
import logging
import os
import uuid

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

    # Check if report already exists
    existing_resp = supabase.table("reports").select("*").eq("detection_id", detection_id).execute()
    if existing_resp.data:
        existing = existing_resp.data[0]
        return {
            "id": existing["id"],
            "detectionId": detection_id,
            "pdfUrl": f"/api/report/{existing['id']}/download",
            "createdAt": existing["created_at"],
        }

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
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Download PDF report."""
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
