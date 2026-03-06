import os
import httpx
import json
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

ALLOWED_DEPARTMENTS = [
    "General Physician", "Cardiologist", "Orthopedic Doctor", 
    "Dermatologist", "Neurologist", "ENT Specialist", "Gastroenterologist"
]

async def analyze_with_gemini(message: str) -> dict:
    default_response = {
        "response_text": "I understand you are feeling unwell. Based on your symptoms, we recommend consulting a doctor.",
        "recommended_specialist": "General Physician"
    }

    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key":
        return default_response
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    prompt = f"""
    You are an empathetic and professional medical triage assistant.
    Analyze the patient's message: "{message}".
    
    1. Provide a brief, comforting, and informative response explaining possible common reasons for their symptom or general advice. Provide basic first aid suggestions and temporary relief methods if applicable. Explain when to see a doctor. (DO NOT diagnose or prescribe medicine).
    2. Suggest the most appropriate department for a checkup from this list ONLY: {', '.join(ALLOWED_DEPARTMENTS)}.
    
    Return ONLY a valid JSON object in this exact format, with no markdown:
    {{
        "response_text": "your comforting, informative response here",
        "recommended_specialist": "specialist_name"
    }}
    """
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.4
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
                    spec = parsed.get("recommended_specialist", "General Physician")
                    advice = parsed.get("response_text", default_response["response_text"])
                    if spec not in ALLOWED_DEPARTMENTS:
                        spec = "General Physician"
                    return {
                        "response_text": advice,
                        "recommended_specialist": spec
                    }
                except:
                    pass
    except Exception as e:
        print(f"Gemini error: {e}")
        
    return default_response
