from pydantic import BaseModel

class ReviewCreate(BaseModel):
    appointment_id: str
    rating: int  # 1 to 5
    comment: str

class ReviewResponse(BaseModel):
    id: str
    doctor_id: str
    patient_id: str
    rating: int
    comment: str
    edited: bool
