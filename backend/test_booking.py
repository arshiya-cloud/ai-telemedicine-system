import asyncio
from app.models.appointment_model import AppointmentCreate
from app.routes.appointment_routes import book_appointment
from fastapi import HTTPException
from app.database.connection import get_db, connect_to_mongo

async def test_booking():
    await connect_to_mongo()
    
    appt = AppointmentCreate(
        doctor_id="69ab424cefe9e98529427ff0",
        date="2026-03-10",
        start_time="10:00",
        patient_name="test user",
        age=30,
        symptoms="test symptoms",
        notes=""
    )
    user = {"user_id": "69ab42c5efe9e98529427ff1", "role": "patient"}
    
    try:
        res = await book_appointment(appt=appt, user=user)
        print("Success:", res)
    except Exception as e:
        print("Error:", type(e), e)
        if hasattr(e, "detail"):
            print("Detail:", e.detail)

asyncio.run(test_booking())
