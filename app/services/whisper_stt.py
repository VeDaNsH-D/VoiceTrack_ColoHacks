from typing import Dict, List
import whisper
from app.utils.config import WHISPER_MODEL_NAME
from app.utils.logger import logger

# Load once at import time for lower request latency.
model = whisper.load_model(WHISPER_MODEL_NAME)


def _estimate_confidence(result: Dict) -> float:
    segments: List[Dict] = result.get("segments") or []
    if not segments:
        return 0.7

    avg_logprobs = [segment.get("avg_logprob") for segment in segments if isinstance(segment.get("avg_logprob"), (float, int))]
    if not avg_logprobs:
        return 0.7

    # Convert approximate log-probability to a bounded 0-1 score.
    mean_logprob = sum(avg_logprobs) / len(avg_logprobs)
    confidence = max(0.0, min(1.0, 1.0 + (mean_logprob / 5.0)))
    return confidence

def transcribe_with_whisper(audio_path: str) -> Dict:
    """
    Transcribe audio using local Whisper model.
    """
    try:
        logger.info(f"Transcribing with Whisper: {audio_path}")

        result = model.transcribe(audio_path)

        text = result.get("text", "").strip()
        confidence = _estimate_confidence(result)

        logger.info(f"Whisper Output: {text}")

        return {
            "text": text,
            "confidence": confidence
        }

    except Exception as e:
        logger.error(f"Whisper Error: {e}")

        return {
            "text": "",
            "confidence": 0.0
        }