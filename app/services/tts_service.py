from __future__ import annotations

import os
import re
import uuid
from typing import Optional

try:
    import edge_tts
except ModuleNotFoundError:
    edge_tts = None

try:
    from gtts import gTTS
except ModuleNotFoundError:
    gTTS = None

from app.utils.config import TEMP_AUDIO_DIR
from app.utils.logger import logger


def generate_unique_filename(prefix: str = "tts", extension: str = ".mp3") -> str:
    """Generate a unique file name for synthesized speech output."""
    return f"{prefix}_{uuid.uuid4().hex}{extension}"


def _detect_language(text: str) -> str:
    """Bonus auto-detection: English text -> en, otherwise Hindi -> hi."""
    if re.search(r"[A-Za-z]", text):
        return "en"
    return "hi"


def _normalize_lang(lang: str, text: str) -> str:
    requested_lang = (lang or "").strip().lower()
    if requested_lang not in {"hi", "en"}:
        requested_lang = _detect_language(text)
    return requested_lang


def _voice_for_lang(lang: str) -> str:
    return "hi-IN-SwaraNeural" if lang == "hi" else "en-IN-NeerjaNeural"


def _gtts_lang_for_lang(lang: str) -> str:
    return "hi" if lang == "hi" else "en"


def _synthesize_with_gtts(text: str, lang: str, output_path: str) -> bool:
    if gTTS is None:
        logger.error("TTS fallback unavailable: gTTS is not installed")
        return False

    try:
        gtts_lang = _gtts_lang_for_lang(lang)
        tts = gTTS(text=text.strip(), lang=gtts_lang)
        tts.save(output_path)
        logger.info("TTS output saved via gTTS to: %s", output_path)
        return True
    except Exception as exc:
        logger.error("gTTS generation failed: %s", exc)
        return False


async def text_to_speech(text: str, lang: str = "hi") -> Optional[str]:
    """Convert text to speech and return the generated mp3 file path."""
    logger.info("TTS request received. Text: %s", text)

    if not text or not text.strip():
        logger.error("TTS generation failed: text is empty")
        return None

    try:
        os.makedirs(TEMP_AUDIO_DIR, exist_ok=True)

        selected_lang = _normalize_lang(lang, text)
        voice = _voice_for_lang(selected_lang)

        filename = generate_unique_filename()
        output_path = os.path.join(TEMP_AUDIO_DIR, filename)

        if edge_tts is not None:
            try:
                communicate = edge_tts.Communicate(text.strip(), voice)
                await communicate.save(output_path)
                logger.info(
                    "TTS output saved via edge_tts to: %s", output_path)
                return output_path
            except Exception as edge_exc:
                logger.error(
                    "edge_tts generation failed, trying gTTS fallback: %s", edge_exc)
        else:
            logger.error("edge_tts not installed, trying gTTS fallback")

        if _synthesize_with_gtts(text, selected_lang, output_path):
            return output_path

        return None
    except Exception as exc:
        logger.error("TTS generation failed: %s", exc)
        return None
