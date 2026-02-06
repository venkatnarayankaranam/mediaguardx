"""Report generation routes."""
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import FileResponse
from database import get_database
from models.user import User
from models.report import Report, ReportResponse
from middleware.auth import get_current_user
from services.pdf_generator import generate_pdf_report
from bson import ObjectId
from datetime import datetime
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/{detection_id}", response_model=ReportResponse)
async def generate_report(
    detection_id: str,
    current_user: User = Depends(get_current_user)
):
    """Generate PDF report for a detection."""
    db = get_database()
    
    try:
        detection_obj_id = ObjectId(detection_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid detection ID"
        )
    
    # Get detection record
    detection_dict = await db.detections.find_one({"_id": detection_obj_id})
    if not detection_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Detection not found"
        )
    
    # Check access (owner, investigator, or admin)
    if (str(detection_dict["user_id"]) != str(current_user.id) and 
        current_user.role not in ["investigator", "admin"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Check if report already exists
    existing_report = await db.reports.find_one({"detection_id": detection_obj_id})
    if existing_report:
        return ReportResponse(
            id=str(existing_report["_id"]),
            detectionId=detection_id,
            pdfUrl=f"/api/report/{existing_report['_id']}/download",
            createdAt=existing_report["created_at"]
        )
    
    # Get user data
    user_dict = await db.users.find_one({"_id": detection_dict["user_id"]})
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user_data = {
        "name": user_dict.get("name"),
        "email": user_dict.get("email")
    }
    
    # Generate report ID and case ID
    report_id = str(ObjectId())
    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    
    # Generate PDF
    try:
        pdf_path, tamper_proof_hash = await generate_pdf_report(
            detection_dict,
            user_data,
            report_id,
            case_id
        )
    except Exception as e:
        logger.error(f"Error generating PDF report: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating PDF report"
        )
    
    # Save report record
    report_dict = {
        "_id": ObjectId(report_id),
        "detection_id": detection_obj_id,
        "user_id": detection_dict["user_id"],
        "pdf_path": pdf_path,
        "case_id": case_id,
        "tamper_proof_hash": tamper_proof_hash,
        "created_at": datetime.utcnow()
    }
    
    await db.reports.insert_one(report_dict)
    
    return ReportResponse(
        id=report_id,
        detectionId=detection_id,
        pdfUrl=f"/api/report/{report_id}/download",
        createdAt=report_dict["created_at"]
    )


@router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    current_user: User = Depends(get_current_user)
):
    """Download PDF report."""
    db = get_database()
    
    try:
        report_obj_id = ObjectId(report_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report ID"
        )
    
    # Get report record
    report_dict = await db.reports.find_one({"_id": report_obj_id})
    if not report_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    # Check access
    if (str(report_dict["user_id"]) != str(current_user.id) and 
        current_user.role not in ["investigator", "admin"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    pdf_path = report_dict["pdf_path"]
    
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"report_{report_id}.pdf"
    )


@router.get("/{report_id}")
async def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get report metadata."""
    db = get_database()
    
    try:
        report_obj_id = ObjectId(report_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report ID"
        )
    
    report_dict = await db.reports.find_one({"_id": report_obj_id})
    if not report_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    # Check access
    if (str(report_dict["user_id"]) != str(current_user.id) and 
        current_user.role not in ["investigator", "admin"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return ReportResponse(
        id=str(report_dict["_id"]),
        detectionId=str(report_dict["detection_id"]),
        pdfUrl=f"/api/report/{report_id}/download",
        createdAt=report_dict["created_at"]
    )

