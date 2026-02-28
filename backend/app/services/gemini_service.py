import os
import httpx
import json
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

ALLOWED_DEPARTMENTS = [
    "Cardiology", "Dermatology", "Orthopedics", 
    "Neurology", "General Medicine", "Psychiatry", "Pediatrics"
]

async def analyze_with_gemini(message: str) -> str:
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key":
        return "General Medicine"
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    prompt = f"""
    You are a medical triage assistant. Analyze this symptom: "{message}".
    Determine the most appropriate department from this list ONLY:
    {', '.join(ALLOWED_DEPARTMENTS)}.
    Return ONLY a valid JSON object in this exact format, with no markdown:
    {{
        "department": "department_name"
    }}
    """
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                text = text.replace('```json', '').replace('```', '')
                try:
                    parsed = json.loads(text)
                    dept = parsed.get("department")
                    if dept in ALLOWED_DEPARTMENTS:
                        return dept
                except:
                    pass
    except Exception as e:
        print(f"Gemini error: {e}")
        
    return "General Medicine"
