from fastapi import APIRouter, Depends, HTTPException
from app.database.connection import get_db
from app.middleware.auth_middleware import require_role
from app.models.appointment_model import AppointmentCreate
from app.models.review_model import ReviewCreate
from app.services.slot_service import book_slot
from bson import ObjectId

router = APIRouter()

@router.get("/slots/{doctor_id}")
async def get_available_slots(doctor_id: str):
    db = get_db()
    slots = await db.slots.find({"doctor_id": doctor_id, "status": "available"}).to_list(100)
    for s in slots:
        s["_id"] = str(s["_id"])
    return slots

@router.post("")
async def book_appointment(appt: AppointmentCreate, user: dict = Depends(require_role(["patient"]))):
    db = get_db()
    
    # Verify the doctor exists
    doctor = await db.users.find_one({"_id": ObjectId(appt.doctor_id), "role": "doctor"})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    new_appt = {
        "doctor_id": appt.doctor_id,
        "patient_id": user["user_id"],
        "date": appt.date,
        "start_time": appt.start_time,
        "patient_name": appt.patient_name,
        "age": appt.age,
        "symptoms": appt.symptoms,
        "notes": appt.notes,
        "status": "confirmed" # The frontend handles payment mock before calling this
    }
    
    # Atomic operation to prevent double booking
    result = await db.appointments.update_one(
        {
            "doctor_id": appt.doctor_id,
            "date": appt.date,
            "start_time": appt.start_time
        },
        {"$setOnInsert": new_appt},
        upsert=True
    )
    
    if result.upserted_id is None:
        raise HTTPException(status_code=400, detail="Slot is no longer available or already booked")
        
    return {"message": "Appointment confirmed successfully", "appointment_id": str(result.upserted_id)}

@router.get("/my-appointments")
async def my_appointments(user: dict = Depends(require_role(["patient"]))):
    db = get_db()
    appts = await db.appointments.find({"patient_id": user["user_id"]}).to_list(100)
    for a in appts:
        a["_id"] = str(a["_id"])
    return appts

@router.post("/review")
async def add_review(review: ReviewCreate, user: dict = Depends(require_role(["patient"]))):
    db = get_db()
    appt = await db.appointments.find_one({"_id": ObjectId(review.appointment_id)})
    if not appt or appt["patient_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if appt["status"] not in ["completed", "confirmed"]:
        raise HTTPException(status_code=400, detail="Only confirmed/completed appointments can be reviewed")
        
    existing_review = await db.reviews.find_one({"appointment_id": review.appointment_id})
    if existing_review:
        await db.reviews.update_one(
            {"_id": existing_review["_id"]},
            {"$set": {"rating": review.rating, "comment": review.comment, "edited": True}}
        )
        return {"message": "Review updated"}
    
    new_review = {
        "appointment_id": review.appointment_id,
        "doctor_id": appt["doctor_id"],
        "patient_id": user["user_id"],
        "rating": review.rating,
        "comment": review.comment,
        "edited": False
    }
    await db.reviews.insert_one(new_review)
    return {"message": "Review added"}

@router.get("/reviews/{doctor_id}")
async def get_doctor_reviews(doctor_id: str):
    db = get_db()
    reviews = await db.reviews.find({"doctor_id": doctor_id}).to_list(100)
    
    if not reviews:
        return {"average_rating": 0, "reviews": []}
        
    avg = sum(r["rating"] for r in reviews) / len(reviews)
    for r in reviews:
        r["_id"] = str(r["_id"])
        
    return {"average_rating": round(avg, 1), "reviews": reviews}
