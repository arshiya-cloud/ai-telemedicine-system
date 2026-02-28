from app.database.connection import get_db
from bson import ObjectId

async def create_slot(doctor_id: str, date: str, start_time: str):
    db = get_db()
    
    existing = await db.slots.find_one({
        "doctor_id": doctor_id,
        "date": date,
        "start_time": start_time
    })
    if existing:
        return None
    
    slot = {
        "doctor_id": doctor_id,
        "date": date,
        "start_time": start_time,
        "status": "available"
    }
    result = await db.slots.insert_one(slot)
    return str(result.inserted_id)

async def book_slot(slot_id: str):
    db = get_db()
    # Atomic update
    result = await db.slots.update_one(
        {"_id": ObjectId(slot_id), "status": "available"},
        {"$set": {"status": "booked"}}
    )
    return result.modified_count > 0

async def release_slot(slot_id: str):
    db = get_db()
    await db.slots.update_one(
        {"_id": ObjectId(slot_id)},
        {"$set": {"status": "available"}}
    )
