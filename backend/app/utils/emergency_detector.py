EMERGENCY_KEYWORDS = [
    "chest pain", "severe bleeding", "breathing difficulty", "unconsciousness", "stroke symptoms"
]

def check_emergency(message: str) -> bool:
    message_lower = message.lower()
    for kw in EMERGENCY_KEYWORDS:
        if kw in message_lower:
            return True
    return False

def get_emergency_response() -> dict:
    return {
        "response_text": "EMERGENCY WARNING: Please seek immediate medical care at the nearest hospital or call an ambulance. This system cannot handle emergencies.",
        "recommended_specialist": "Emergency Room"
    }
