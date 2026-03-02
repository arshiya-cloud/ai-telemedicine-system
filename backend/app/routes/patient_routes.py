from fastapi import APIRouter, Depends, HTTPException
from app.database.connection import get_db
from app.middleware.auth_middleware import get_current_user, require_role
from bson import ObjectId

router = APIRouter()

from typing import Optional
from datetime import datetime, timedelta

@router.get("/doctors")
async def get_approved_doctors(specialization: Optional[str] = None, user: dict = Depends(get_current_user)):
    db = get_db()
    query = {"role": "doctor", "status": "approved"}
    if specialization:
        query["specialization"] = specialization
        
    doctors = await db.users.find(query).to_list(100)
    for doc in doctors:
        doc["_id"] = str(doc["_id"])
        del doc["password"]
    return doctors

@router.get("/doctors/specializations")
async def get_specializations(user: dict = Depends(get_current_user)):
    db = get_db()
    specs = await db.users.distinct("specialization", {"role": "doctor", "status": "approved"})
    return [s for s in specs if s]

@router.get("/doctor/{doctor_id}")
async def get_doctor_profile(doctor_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    doctor = await db.users.find_one({"_id": ObjectId(doctor_id), "role": "doctor", "status": "approved"})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    doctor["_id"] = str(doctor["_id"])
    del doctor["password"]
    return doctor

@router.get("/doctor/{doctor_id}/slots")
async def get_doctor_slots(doctor_id: str, date: str, user: dict = Depends(get_current_user)):
    db = get_db()
    doctor = await db.users.find_one({"_id": ObjectId(doctor_id), "role": "doctor", "status": "approved"})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    # Check if doctor is available on this day
    try:
        req_date = datetime.strptime(date, "%Y-%m-%d")
        day_name = req_date.strftime("%A")
        
        available_days = [d.strip() for d in doctor.get("available_days", "").split(",")]
        if day_name not in available_days:
            return []
            
        start_t = datetime.strptime(doctor.get("start_time", "09:00"), "%H:%M")
        end_t = datetime.strptime(doctor.get("end_time", "17:00"), "%H:%M")
        duration = int(doctor.get("slot_duration", 30))
        
        # Get booked appointments for this doctor on this date
        booked_appts = await db.appointments.find({
            "doctor_id": doctor_id,
            "date": date
        }).to_list(100)
        booked_times = [appt["start_time"] for appt in booked_appts]
        
        slots = []
        curr = start_t
        while curr + timedelta(minutes=duration) <= end_t:
            st_str = curr.strftime("%H:%M")
            en_str = (curr + timedelta(minutes=duration)).strftime("%H:%M")
            is_booked = st_str in booked_times
            
            slots.append({
                "slot_id": f"{doctor_id}_{date}_{st_str}",
                "start_time": st_str,
                "end_time": en_str,
                "is_booked": is_booked
            })
            curr += timedelta(minutes=duration)
            
        return slots
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")
