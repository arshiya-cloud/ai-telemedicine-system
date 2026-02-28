EMERGENCY_KEYWORDS = [
    "unconscious", "severe bleeding", "heart attack", "suicide", "difficulty breathing"
]

def check_emergency(message: str) -> bool:
    message_lower = message.lower()
    for kw in EMERGENCY_KEYWORDS:
        if kw in message_lower:
            return True
    return False

def get_emergency_response() -> str:
    return "Please immediately contact the hospital emergency department."
