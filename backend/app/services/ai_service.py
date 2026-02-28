from app.utils.emergency_detector import check_emergency, get_emergency_response
from app.services.rule_engine import analyze_with_rules
from app.services.gemini_service import analyze_with_gemini

async def process_patient_message(message: str) -> str:
    if check_emergency(message):
        return get_emergency_response()
        
    dept = analyze_with_rules(message)
    if not dept:
        dept = await analyze_with_gemini(message)
        
    return f"Based on your symptoms, we recommend consulting our {dept} department.\nFor accurate diagnosis, please consult a doctor. We do not provide medical diagnosis or suggest medicines."
