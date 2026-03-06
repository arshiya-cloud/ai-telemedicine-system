import os
from fastapi import APIRouter, Depends, HTTPException
from app.database.connection import get_db
from app.middleware.auth_middleware import require_role
from bson import ObjectId
from pydantic import BaseModel
from reportlab.pdfgen import canvas
from datetime import datetime

router = APIRouter()

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

    prescriptions_dir = "app/uploads/prescriptions"
    os.makedirs(prescriptions_dir, exist_ok=True)
    filename = f"prescription_{appointment_id}_{datetime.now().timestamp()}.pdf"
    filepath = os.path.join(prescriptions_dir, filename)

    c = canvas.Canvas(filepath)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(200, 800, "Medical Prescription")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, 750, f"Doctor: {doctor.get('name', 'Doctor')}")
    c.drawString(50, 730, f"Patient: {patient_name}")
    c.drawString(50, 710, f"Date: {appt.get('date', '')}")
    
    c.drawString(50, 670, "Medicine:")
    c.drawString(200, 670, presc.medicine_name)
    
    c.drawString(50, 650, "Dosage:")
    c.drawString(200, 650, presc.dosage_instructions)
    
    c.drawString(50, 630, "Usage:")
    c.drawString(200, 630, presc.usage_instructions)
    
    c.drawString(50, 610, "Additional Notes:")
    c.drawString(200, 610, presc.additional_notes)
    
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
