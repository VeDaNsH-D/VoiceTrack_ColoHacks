from pathlib import Path
from typing import Any, Dict, Optional

import requests

from app.utils.config import SARVAM_API_KEY, SARVAM_STT_URL
from app.utils.logger import logger


def _extract_text(payload: Dict[str, Any]) -> str:
    candidates = [
        payload.get("text"),
        payload.get("transcript"),
        payload.get("result", {}).get("text") if isinstance(payload.get("result"), dict) else None,
    ]
    for value in candidates:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def _extract_confidence(payload: Dict[str, Any]) -> Optional[float]:
    candidates = [
        payload.get("confidence"),
        payload.get("result", {}).get("confidence") if isinstance(payload.get("result"), dict) else None,
    ]
    for value in candidates:
        if isinstance(value, (float, int)):
            return float(max(0.0, min(1.0, value)))
    return None


def transcribe_with_sarvam(audio_path: str) -> Dict[str, float | str]:
    """Transcribe audio with Sarvam STT using the API key from app/.env."""
    logger.info("Transcribing with Sarvam: %s", audio_path)

    if not SARVAM_API_KEY:
        raise RuntimeError("SARVAM_API_KEY is missing in app/.env")

    audio_file = Path(audio_path)
    if not audio_file.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    headers = {"Authorization": f"Bearer {SARVAM_API_KEY}"}
    files = {"file": (audio_file.name, audio_file.open("rb"), "audio/wav")}

    try:
        response = requests.post(SARVAM_STT_URL, headers=headers, files=files, timeout=120)
    finally:
        files["file"][1].close()

    if response.status_code >= 400:
        logger.error("Sarvam STT request failed (%s): %s", response.status_code, response.text)
        raise RuntimeError(f"Sarvam STT request failed with status {response.status_code}")

    payload = response.json()
    text = _extract_text(payload)
    confidence = _extract_confidence(payload)

    if not text:
        raise RuntimeError("Sarvam STT returned empty transcript")

    if confidence is None:
        confidence = 0.75

    logger.info("Sarvam output: %s", text)
    return {"text": text, "confidence": confidence}
