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

@router.get("/approved-doctors")
async def get_approved_doctors(user: dict = Depends(require_role(["admin"]))):
    db = get_db()
    doctors = await db.users.find({"role": "doctor", "status": "approved"}).to_list(100)
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

@router.get("/stats")
async def get_admin_stats(user: dict = Depends(require_role(["admin"]))):
    db = get_db()
    total_doctors = await db.users.count_documents({"role": "doctor"})
    approved_doctors = await db.users.count_documents({"role": "doctor", "status": "approved"})
    pending_doctors = await db.users.count_documents({"role": "doctor", "status": "pending"})
    total_patients = await db.users.count_documents({"role": "patient"})
    
    total_appointments = await db.appointments.count_documents({})
    completed_appointments = await db.appointments.count_documents({"status": "completed"})
    
    total_reviews = await db.reviews.count_documents({})
    
    pipeline = [
        {"$group": {"_id": None, "avgRating": {"$avg": "$rating"}}}
    ]
    rating_result = await db.reviews.aggregate(pipeline).to_list(1)
    average_rating = round(rating_result[0]["avgRating"], 1) if rating_result else 0.0

    recent_activity = []
    
    recent_users = await db.users.find({"role": "doctor"}).sort("_id", -1).limit(2).to_list(2)
    for u in recent_users:
        status = u.get("status", "pending")
        recent_activity.append(f"Dr. {u.get('name', 'Unknown')} registered ({status})")

    recent_reviews = await db.reviews.find().sort("_id", -1).limit(2).to_list(2)
    for r in recent_reviews:
        # Try to fetch doctor name
        doc = await db.users.find_one({"_id": ObjectId(r.get("doctor_id"))})
        doc_name = doc.get("name", "Unknown") if doc else "Unknown"
        recent_activity.append(f"New review submitted for Dr. {doc_name}")
        
    recent_appointments = await db.appointments.find().sort("_id", -1).limit(2).to_list(2)
    for a in recent_appointments:
        doc_id = a.get("doctor_id")
        doc_name = "Unknown"
        if doc_id:
             doc = await db.users.find_one({"_id": ObjectId(doc_id)})
             if doc: doc_name = doc.get("name", "Unknown")
        recent_activity.append(f"Appointment booked with Dr. {doc_name} by {a.get('patient_name', 'Patient')}")

    return {
        "total_doctors": total_doctors,
        "approved_doctors": approved_doctors,
        "pending_doctors": pending_doctors,
        "total_patients": total_patients,
        "total_appointments": total_appointments,
        "completed_appointments": completed_appointments,
        "total_reviews": total_reviews,
        "average_rating": average_rating,
        "recent_activity": recent_activity
    }

@router.get("/doctors")
async def get_all_doctors(user: dict = Depends(require_role(["admin"]))):
    db = get_db()
    doctors = await db.users.find({"role": "doctor"}).to_list(1000)
    for doc in doctors:
        doc["_id"] = str(doc["_id"])
        if "password" in doc:
            del doc["password"]
    return doctors

@router.get("/doctors/{doctor_id}/reviews")
async def get_doctor_reviews(doctor_id: str, user: dict = Depends(require_role(["admin"]))):
    db = get_db()
    reviews = await db.reviews.find({"doctor_id": doctor_id}).to_list(1000)
    for review in reviews:
        review["_id"] = str(review["_id"])
    return reviews

@router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, user: dict = Depends(require_role(["admin"]))):
    db = get_db()
    result = await db.reviews.delete_one({"_id": ObjectId(review_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review deleted successfully"}
