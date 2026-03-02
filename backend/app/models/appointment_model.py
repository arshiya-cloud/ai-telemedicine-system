from pydantic import BaseModel
from typing import Optional
from datetime import date, time

class SlotCreate(BaseModel):
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM

class SlotResponse(BaseModel):
    id: str
    doctor_id: str
    date: str
    start_time: str
    status: str

class AppointmentCreate(BaseModel):
    doctor_id: str
    date: str
    start_time: str
    patient_name: str
    age: int
    symptoms: str
    notes: Optional[str] = None
