RULE_MAPPINGS = {
    "chest": "Cardiology",
    "heart": "Cardiology",
    "skin": "Dermatology",
    "rash": "Dermatology",
    "acne": "Dermatology",
    "headache": "Neurology",
    "migraine": "Neurology",
    "bone": "Orthopedics",
    "fracture": "Orthopedics",
    "joint": "Orthopedics",
    "depression": "Psychiatry",
    "anxiety": "Psychiatry",
    "child": "Pediatrics",
    "baby": "Pediatrics"
}

def analyze_with_rules(message: str) -> str:
    message_lower = message.lower()
    for kw, dept in RULE_MAPPINGS.items():
        if kw in message_lower:
            return dept
    return None
