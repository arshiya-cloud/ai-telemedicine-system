import asyncio
import httpx
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
    date = "2026-03-11"
    doc_id = "69ab424cefe9e98529427ff0"
    
    async with httpx.AsyncClient() as client:
        res = await client.get(f"http://localhost:8000/api/patient/doctor/{doc_id}/slots?date={date}", headers=headers)
        print("Status", res.status_code)
        import json
        try:
            print("Response:", json.dumps(res.json(), indent=2))
        except:
            print("Text", res.text)

asyncio.run(make_req())
