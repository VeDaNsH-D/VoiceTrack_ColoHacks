import os
from pathlib import Path

from dotenv import load_dotenv


APP_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = APP_DIR / ".env"
load_dotenv(ENV_PATH)

TEMP_AUDIO_DIR = str(APP_DIR / "temp_audio")
CLEANED_AUDIO_FILENAME = "cleaned_audio.wav"

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_STT_URL = os.getenv("SARVAM_STT_URL", "https://api.sarvam.ai/speech-to-text")

WHISPER_MODEL_NAME = os.getenv("WHISPER_MODEL_NAME", "base")
