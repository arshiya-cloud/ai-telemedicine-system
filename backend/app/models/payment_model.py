from pydantic import BaseModel

class PaymentCreate(BaseModel):
    appointment_id: str
    amount: float

class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    appointment_id: str
