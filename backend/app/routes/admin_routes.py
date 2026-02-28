from fastapi import APIRouter, Depends, HTTPException
from app.database.connection import get_db
from app.middleware.auth_middleware import require_role
from bson import ObjectId

router = APIRouter()

@router.get("/pending-doctors")
async def get_pending_doctors(user: dict = Depends(require_role(["admin"]))):
    db = get_db()
    doctors = await db.users.find({"role": "doctor", "status": "pending"}).to_list(100)
    for doc in doctors:
        doc["_id"] = str(doc["_id"])
        del doc["password"]
    return doctors

@router.post("/approve-doctor/{doctor_id}")
async def approve_doctor(doctor_id: str, user: dict = Depends(require_role(["admin"]))):
    db = get_db()
    result = await db.users.update_one(
        {"_id": ObjectId(doctor_id), "role": "doctor"},
        {"$set": {"status": "approved"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found or already approved")
    return {"message": "Doctor approved successfully"}

@router.post("/reject-doctor/{doctor_id}")
async def reject_doctor(doctor_id: str, user: dict = Depends(require_role(["admin"]))):
    db = get_db()
    result = await db.users.update_one(
        {"_id": ObjectId(doctor_id), "role": "doctor"},
        {"$set": {"status": "rejected"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found or already processed")
    return {"message": "Doctor rejected successfully"}
