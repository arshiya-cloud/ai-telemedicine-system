from fastapi import APIRouter, Depends, HTTPException
from app.database.connection import get_db
from app.middleware.auth_middleware import require_role
from app.models.payment_model import PaymentCreate, PaymentVerify
from app.services.payment_service import create_order, verify_payment_signature
from app.services.slot_service import release_slot
from bson import ObjectId

router = APIRouter()

@router.post("/create-order")
async def create_payment_order(payment: PaymentCreate, user: dict = Depends(require_role(["patient"]))):
    db = get_db()
    appt = await db.appointments.find_one({"_id": ObjectId(payment.appointment_id)})
    if not appt or appt["patient_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    order = create_order(payment.amount)
    
    await db.appointments.update_one(
        {"_id": ObjectId(payment.appointment_id)},
        {"$set": {"razorpay_order_id": order["id"]}}
    )
    
    return {"order_id": order["id"], "amount": payment.amount}

@router.post("/verify")
async def verify_payment(verify: PaymentVerify, user: dict = Depends(require_role(["patient"]))):
    db = get_db()
    appt = await db.appointments.find_one({"_id": ObjectId(verify.appointment_id)})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if verify.razorpay_payment_id == "mock_failure":
        # Simulating payment failure
        await release_slot(appt["slot_id"])
        await db.appointments.delete_one({"_id": ObjectId(verify.appointment_id)})
        raise HTTPException(status_code=400, detail="Payment verification failed, appointment cancelled")
        
    is_valid = verify_payment_signature(
        verify.razorpay_order_id,
        verify.razorpay_payment_id,
        verify.razorpay_signature
    )
    
    if is_valid:
        await db.appointments.update_one(
            {"_id": ObjectId(verify.appointment_id)},
            {"$set": {"status": "confirmed"}}
        )
        return {"message": "Payment successful, appointment confirmed"}
    else:
        # Payment failed, release slot and delete appointment
        await release_slot(appt["slot_id"])
        await db.appointments.delete_one({"_id": ObjectId(verify.appointment_id)})
        raise HTTPException(status_code=400, detail="Payment verification failed, appointment cancelled")
