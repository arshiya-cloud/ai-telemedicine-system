import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_data():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.telemedicine
    
    await db.users.delete_many({})
    await db.slots.delete_many({})
    
    admin = {
        "name": "Admin System",
        "email": "admin@example.com",
        "password": pwd_context.hash("admin123"),
        "role": "admin"
    }
    await db.users.insert_one(admin)
    
    doctor = {
        "name": "Dr. AI Specialist",
        "email": "doctor@example.com",
        "password": pwd_context.hash("doctor123"),
        "role": "doctor",
        "specialization": "Cardiology",
        "status": "approved"
    }
    doc_res = await db.users.insert_one(doctor)
    
    slots = [
        {
            "doctor_id": str(doc_res.inserted_id),
            "date": "2026-03-01",
            "start_time": "10:00",
            "status": "available"
        },
        {
            "doctor_id": str(doc_res.inserted_id),
            "date": "2026-03-01",
            "start_time": "11:00",
            "status": "available"
        }
    ]
    await db.slots.insert_many(slots)
    
    print("Seed data inserted successfully.")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
