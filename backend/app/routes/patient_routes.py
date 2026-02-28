from fastapi import APIRouter, Depends, HTTPException
from app.database.connection import get_db
from app.middleware.auth_middleware import get_current_user, require_role
from bson import ObjectId

router = APIRouter()

@router.get("/doctors")
async def get_approved_doctors(user: dict = Depends(get_current_user)):
    db = get_db()
    doctors = await db.users.find({"role": "doctor", "status": "approved"}).to_list(100)
    for doc in doctors:
        doc["_id"] = str(doc["_id"])
        del doc["password"]
    return doctors

@router.get("/doctor/{doctor_id}")
async def get_doctor_profile(doctor_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    doctor = await db.users.find_one({"_id": ObjectId(doctor_id), "role": "doctor", "status": "approved"})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    doctor["_id"] = str(doctor["_id"])
    del doctor["password"]
    return doctor
