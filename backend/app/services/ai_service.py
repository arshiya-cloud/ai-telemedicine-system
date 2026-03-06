from app.utils.emergency_detector import check_emergency, get_emergency_response
from app.services.rule_engine import analyze_with_rules
from app.services.gemini_service import analyze_with_gemini

async def process_patient_message(message: str) -> dict:
    if check_emergency(message):
        return get_emergency_response()
        
    gemini_response = await analyze_with_gemini(message)
    
    # Append the disclaimer to the response text
    gemini_response["response_text"] = f"{gemini_response['response_text']}\n\nDisclaimer: This is general medical guidance and not a diagnosis."
    
    return gemini_response
