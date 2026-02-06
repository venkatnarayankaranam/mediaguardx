"""PDF report generation service."""
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfgen import canvas
import qrcode
from io import BytesIO
from PIL import Image as PILImage
from datetime import datetime
from pathlib import Path
from config import settings
import hashlib
import logging

logger = logging.getLogger(__name__)


def generate_tamper_proof_hash(content: str) -> str:
    """Generate tamper-proof hash for PDF content."""
    return hashlib.sha256(content.encode()).hexdigest()


def generate_qr_code(data: str) -> BytesIO:
    """Generate QR code image."""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to BytesIO
    img_bytes = BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    return img_bytes


async def generate_pdf_report(
    detection_data: dict,
    user_data: dict,
    report_id: str,
    case_id: str
) -> tuple[str, str]:
    """Generate tamper-proof PDF report.
    
    Returns:
        tuple: (pdf_path, tamper_proof_hash)
    """
    try:
        # Create reports directory if it doesn't exist
        reports_path = Path(settings.reports_dir)
        reports_path.mkdir(parents=True, exist_ok=True)
        
        pdf_filename = f"report_{report_id}.pdf"
        pdf_path = reports_path / pdf_filename
        
        # Create PDF document
        doc = SimpleDocTemplate(
            str(pdf_path),
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        # Container for PDF elements
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a237e'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#283593'),
            spaceAfter=12,
            spaceBefore=12
        )
        
        # Title
        story.append(Paragraph("MediaGuardX Detection Report", title_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Report metadata
        report_date = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        
        metadata_data = [
            ["Case ID:", case_id],
            ["Report ID:", report_id],
            ["Date:", report_date],
            ["User:", user_data.get("name", "N/A")],
            ["Email:", user_data.get("email", "N/A")],
        ]
        
        metadata_table = Table(metadata_data, colWidths=[2*inch, 4*inch])
        metadata_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e3f2fd')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        
        story.append(metadata_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Media Information
        story.append(Paragraph("Media Information", heading_style))
        
        media_data = [
            ["Filename:", detection_data.get("filename", "N/A")],
            ["Media Type:", detection_data.get("media_type", "N/A").upper()],
            ["File Size:", f"{detection_data.get('file_size', 0) / 1024:.2f} KB"],
            ["Analysis Date:", detection_data.get("created_at", datetime.utcnow()).strftime("%Y-%m-%d %H:%M:%S UTC") if isinstance(detection_data.get("created_at"), datetime) else str(detection_data.get("created_at", "N/A"))],
        ]
        
        media_table = Table(media_data, colWidths=[2*inch, 4*inch])
        media_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3e5f5')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        
        story.append(media_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Trust Score
        story.append(Paragraph("Trust Score Assessment", heading_style))
        
        trust_score = detection_data.get("trust_score", 0)
        label = detection_data.get("label", "Unknown")
        
        # Trust meter visualization (text-based)
        trust_meter_text = f"Trust Score: {trust_score:.2f}/100"
        story.append(Paragraph(trust_meter_text, styles['Heading3']))
        story.append(Paragraph(f"Classification: <b>{label}</b>", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        
        # Anomalies
        anomalies = detection_data.get("anomalies", [])
        if anomalies:
            story.append(Paragraph("Detected Anomalies", heading_style))
            
            anomaly_data = [["Type", "Severity", "Description", "Confidence"]]
            for anomaly in anomalies:
                anomaly_data.append([
                    anomaly.get("type", "N/A").replace("_", " ").title(),
                    anomaly.get("severity", "N/A").upper(),
                    anomaly.get("description", "N/A"),
                    f"{anomaly.get('confidence', 0):.1f}%"
                ])
            
            anomaly_table = Table(anomaly_data, colWidths=[1.5*inch, 0.8*inch, 2.7*inch, 1*inch])
            anomaly_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#424242')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')])
            ]))
            
            story.append(anomaly_table)
        else:
            story.append(Paragraph("No anomalies detected. Media appears authentic.", styles['Normal']))
        
        story.append(Spacer(1, 0.3*inch))
        
        # Decision Notes
        decision_notes = detection_data.get("decision_notes")
        if decision_notes:
            story.append(Paragraph("Decision Notes", heading_style))
            story.append(Paragraph(decision_notes, styles['Normal']))
            story.append(Spacer(1, 0.3*inch))
        
        # Footer with QR Code and Hash
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph("Report Verification", heading_style))
        
        # Generate verification data
        verification_data = f"CaseID:{case_id}|ReportID:{report_id}|Date:{report_date}"
        qr_img_bytes = generate_qr_code(verification_data)
        qr_img = Image(qr_img_bytes, width=1.5*inch, height=1.5*inch)
        story.append(qr_img)
        story.append(Spacer(1, 0.1*inch))
        
        # Generate tamper-proof hash
        hash_content = f"{case_id}{report_id}{report_date}{trust_score}{label}"
        tamper_proof_hash = generate_tamper_proof_hash(hash_content)
        
        story.append(Paragraph(f"Tamper-Proof Hash: <font face='Courier'>{tamper_proof_hash}</font>", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph("This report was generated by MediaGuardX Deepfake Detection System.", 
                              ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey, alignment=TA_CENTER)))
        
        # Build PDF
        doc.build(story)
        
        return str(pdf_path), tamper_proof_hash
        
    except Exception as e:
        logger.error(f"Error generating PDF: {e}", exc_info=True)
        raise

