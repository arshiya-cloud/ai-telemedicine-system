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

@router.post("/book")
async def book_appointment(appt: AppointmentCreate, user: dict = Depends(require_role(["patient"]))):
    db = get_db()
    slot = await db.slots.find_one({"_id": ObjectId(appt.slot_id)})
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
        
    doctor_id = slot["doctor_id"]
    
    success = await book_slot(appt.slot_id)
    if not success:
        raise HTTPException(status_code=400, detail="Slot is no longer available")
        
    new_appt = {
        "slot_id": appt.slot_id,
        "doctor_id": doctor_id,
        "patient_id": user["user_id"],
        "status": "pending_payment",
        "date": slot["date"],
        "start_time": slot["start_time"]
    }
    
    res = await db.appointments.insert_one(new_appt)
    return {"message": "Appointment pending payment", "appointment_id": str(res.inserted_id)}

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
