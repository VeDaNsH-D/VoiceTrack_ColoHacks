import re
from typing import Dict, List
from app.utils.logger import logger

def evaluate_transcript(text: str) -> Dict:
    logger.info(f"Evaluating transcript: {text}")
    issues: List[str] = []
    score = 1.0
    is_valid = True
    # Extract numbers
    numbers = re.findall(r'\d+', text)
    if not numbers:
        issues.append("No numbers found")
        score -= 0.3
        is_valid = False
    # Check keywords
    keywords = ["chai", "samosa", "milk"]
    if not any(k in text.lower() for k in keywords):
        issues.append("No keywords found")
        score -= 0.3
        is_valid = False
    # Minimum length
    if len(text) < 5:
        issues.append("Text too short")
        score -= 0.2
        is_valid = False
    # Simple pattern: qty-item-price
    pattern = r"(\d+\s+\w+\s+\d+)"
    if not re.search(pattern, text):
        issues.append("Pattern qty-item-price not found")
        score -= 0.2
        is_valid = False
    score = max(0.0, score)
    return {
        "is_valid": is_valid,
        "score": score,
        "issues": issues
    }
