import razorpay
import os
from dotenv import load_dotenv

load_dotenv()

key_id = os.getenv("RAZORPAY_KEY_ID")
key_secret = os.getenv("RAZORPAY_KEY_SECRET")

client = None
if key_id and key_secret and key_id != "your_razorpay_key_id":
    client = razorpay.Client(auth=(key_id, key_secret))

def create_order(amount: float, currency: str = "INR"):
    if not client:
        return {"id": "mock_order_id_" + os.urandom(4).hex()}
        
    data = {
        "amount": int(amount * 100),
        "currency": currency,
        "payment_capture": "1"
    }
    return client.order.create(data=data)

def verify_payment_signature(razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str):
    if not client:
        return True # mock success if razorpay keys are not provided
        
    try:
        client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        })
        return True
    except Exception as e:
        return False
