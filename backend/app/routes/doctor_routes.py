from fastapi import APIRouter, Depends, HTTPException
from app.database.connection import get_db
from app.middleware.auth_middleware import require_role
from app.models.appointment_model import SlotCreate
from app.services.slot_service import create_slot
from bson import ObjectId

router = APIRouter()

@router.post("/slots")
async def add_slot(slot: SlotCreate, user: dict = Depends(require_role(["doctor"]))):
    db = get_db()
    doctor = await db.users.find_one({"_id": ObjectId(user["user_id"])})
    if doctor.get("status") != "approved":
        raise HTTPException(status_code=403, detail="Doctor account not approved yet")
    
    slot_id = await create_slot(user["user_id"], slot.date, slot.start_time)
    if not slot_id:
        raise HTTPException(status_code=400, detail="Slot already exists")
    
    return {"message": "Slot created successfully", "id": slot_id}

@router.get("/slots")
async def get_doctor_slots(user: dict = Depends(require_role(["doctor"]))):
    db = get_db()
    slots = await db.slots.find({"doctor_id": user["user_id"]}).to_list(100)
    for s in slots:
        s["_id"] = str(s["_id"])
    return slots
    
@router.get("/appointments")
async def get_doctor_appointments(user: dict = Depends(require_role(["doctor"]))):
    db = get_db()
    appointments = await db.appointments.find({"doctor_id": user["user_id"]}).to_list(100)
    for appt in appointments:
        appt["_id"] = str(appt["_id"])
    return appointments
