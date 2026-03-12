import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from app.database.connection import get_db
from app.middleware.auth_middleware import require_role
from bson import ObjectId
from pydantic import BaseModel
from reportlab.pdfgen import canvas
from datetime import datetime

router = APIRouter()

@router.get("/view")
async def view_file(file_url: str):
    # Prevent directory traversal
    if ".." in file_url or not file_url.startswith("app/uploads/"):
        raise HTTPException(status_code=400, detail="Invalid file path")
        
    if not os.path.exists(file_url):
        raise HTTPException(status_code=404, detail="File not found")
        
    # We use 'inline' to tell the browser to render it natively.
    # We deliberately do not include filename="xxxx.pdf" to prevent IDM from aggressively intercepting it.
    return FileResponse(path=file_url, media_type='application/pdf', headers={"Content-Disposition": "inline"})

class PrescriptionCreate(BaseModel):
    medicine_name: str
    dosage_instructions: str
    usage_instructions: str
    additional_notes: str

@router.post("/{appointment_id}")
async def create_prescription(appointment_id: str, presc: PrescriptionCreate, user: dict = Depends(require_role(["doctor"]))):
    db = get_db()
    appt = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if appt["doctor_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to prescribe for this appointment")
        
    doctor = await db.users.find_one({"_id": ObjectId(user["user_id"])})
    patient_name = appt.get('patient_name', 'Unknown')
    
    patient_id = appt.get('patient_id')
    patient = await db.users.find_one({"_id": ObjectId(patient_id)}) if patient_id else None
    patient_age = patient.get('age', 'N/A') if patient else 'N/A'

    prescriptions_dir = "app/uploads/prescriptions"
    os.makedirs(prescriptions_dir, exist_ok=True)
    filename = f"prescription_{appointment_id}_{datetime.now().timestamp()}.pdf"
    filepath = os.path.join(prescriptions_dir, filename)

    c = canvas.Canvas(filepath)
    
    # Top Section (Header)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(50, 800, "Telemedicine Platform Name")
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 770, doctor.get('name', 'Doctor'))
    c.setFont("Helvetica", 12)
    spec = doctor.get('specialization', 'Professional').title()
    c.drawString(50, 755, spec)

    # Divider
    c.line(50, 740, 550, 740)
    
    # Patient Information
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 715, "Patient Information")
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 690, "Patient Name:")
    c.setFont("Helvetica", 12)
    c.drawString(140, 690, patient_name)
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 670, "Age:")
    c.setFont("Helvetica", 12)
    c.drawString(140, 670, str(patient_age))
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(330, 690, "Consultation Date:")
    c.setFont("Helvetica", 12)
    c.drawString(450, 690, appt.get('date', ''))

    # Divider
    c.line(50, 650, 550, 650)
    
    # Prescription Section
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 625, "Prescription Section")
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 595, "Medicine Name:")
    c.setFont("Helvetica", 12)
    c.drawString(200, 595, presc.medicine_name)
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 565, "Dosage Instructions:")
    c.setFont("Helvetica", 12)
    c.drawString(200, 565, presc.dosage_instructions)
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 535, "Usage Instructions:")
    c.setFont("Helvetica", 12)
    c.drawString(200, 535, presc.usage_instructions)
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 505, "Additional Notes:")
    c.setFont("Helvetica", 12)
    c.drawString(200, 505, presc.additional_notes)
    
    # Footer
    c.line(50, 100, 550, 100)
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(50, 80, "This prescription was generated digitally through the telemedicine consultation platform.")
    
    c.save()
    
    prescription_url = f"app/uploads/prescriptions/{filename}"
    
    from app.routes.chat_routes import manager
    import json

    await db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {"prescription_url": prescription_url}}
    )

    # Also drop a bot message in chat to notify patient
    chat_msg = {
        "appointment_id": appointment_id,
        "sender": "system",
        "message": f"A new prescription has been generated: [{filename}](/{prescription_url})",
        "timestamp": datetime.utcnow().isoformat()
    }
    res = await db.chats.insert_one(chat_msg)
    chat_msg["_id"] = str(res.inserted_id)
    await manager.broadcast_to_room(json.dumps(chat_msg), appointment_id)
    
    return {"message": "Prescription generated", "url": prescription_url}
