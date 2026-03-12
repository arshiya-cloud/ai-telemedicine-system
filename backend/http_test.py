import asyncio
import httpx
from pydantic import BaseModel
from jose import jwt
from app.utils.security import create_access_token
import os

def create_token():
    payload = {"user_id": "69ab42c5efe9e98529427ff1", "role": "patient"}
    token = create_access_token(payload)
    return token

async def make_req():
    token = create_token()
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "doctor_id": "69ab424cefe9e98529427ff0",
        "date": "2026-03-10",
        "start_time": "13:00",
        "patient_name": "babu",
        "age": 64,
        "symptoms": "cough",
        "notes": ""
    }
    
    async with httpx.AsyncClient() as client:
        res = await client.post("http://localhost:8000/api/appointments", json=payload, headers=headers)
        print("Status", res.status_code)
        print("Text", res.text)

asyncio.run(make_req())
