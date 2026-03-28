import os
import shutil
import numpy as np
import soundfile as sf
import noisereduce as nr
import webrtcvad
import subprocess
from uuid import uuid4
from scipy.io import wavfile
from app.utils.config import TEMP_AUDIO_DIR, CLEANED_AUDIO_FILENAME
from app.utils.logger import logger


def _resolve_ffmpeg_executable() -> str:
    env_candidate = os.getenv("FFMPEG_BIN", "").strip()
    if env_candidate and os.path.exists(env_candidate):
        return env_candidate

    path_candidate = shutil.which("ffmpeg")
    if path_candidate:
        return path_candidate

    if os.name == "nt":
        local_app_data = os.getenv("LOCALAPPDATA", "")
        windows_profile = os.path.expanduser("~")
        candidates = [
            os.path.join(local_app_data, "Microsoft", "WinGet", "Links", "ffmpeg.exe") if local_app_data else "",
            os.path.join(windows_profile, "AppData", "Local", "Microsoft", "WinGet", "Links", "ffmpeg.exe"),
            os.path.join(os.getenv("ProgramFiles", ""), "ffmpeg", "bin", "ffmpeg.exe"),
            os.path.join(os.getenv("ProgramFiles", ""), "FFmpeg", "bin", "ffmpeg.exe"),
        ]
        for candidate in candidates:
            if candidate and os.path.exists(candidate):
                return candidate

    raise FileNotFoundError(
        "ffmpeg executable not found. Install ffmpeg and ensure it is available on PATH or set FFMPEG_BIN."
    )

def convert_audio(input_path: str, output_path: str) -> None:
    """
    Convert audio to mono, 16kHz WAV using ffmpeg.
    """
    logger.info(f"Converting {input_path} to mono 16kHz WAV at {output_path}")
    ffmpeg_bin = _resolve_ffmpeg_executable()
    cmd = [
        ffmpeg_bin, '-y', '-i', input_path,
        '-ac', '1', '-ar', '16000', '-vn', output_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

def reduce_noise(audio: np.ndarray, sr: int) -> np.ndarray:
    logger.info("Reducing noise")
    return nr.reduce_noise(y=audio, sr=sr)

def apply_vad(audio: np.ndarray, sr: int) -> np.ndarray:
    logger.info("Applying VAD")
    vad = webrtcvad.Vad(2)
    frame_duration = 20  # ms
    frame_length = int(sr * frame_duration / 1000)
    voiced_audio = []
    for i in range(0, len(audio), frame_length):
        frame = audio[i:i+frame_length]
        if len(frame) < frame_length:
            break
        pcm = (frame * 32767).astype(np.int16).tobytes()
        if vad.is_speech(pcm, sr):
            voiced_audio.extend(frame)
    if not voiced_audio:
        logger.warning("VAD removed all frames. Using original signal.")
        return audio
    return np.array(voiced_audio, dtype=np.float32)

def normalize_audio(audio: np.ndarray) -> np.ndarray:
    logger.info("Normalizing audio")
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak <= 1e-8:
        return audio
    return audio / peak

def preprocess_audio(input_path: str) -> str:
    """
    Run all preprocessing steps and save cleaned audio.
    """
    logger.info(f"Preprocessing audio: {input_path}")
    os.makedirs(TEMP_AUDIO_DIR, exist_ok=True)
    temp_id = uuid4().hex
    temp_wav = os.path.join(TEMP_AUDIO_DIR, f'converted_{temp_id}.wav')
    convert_audio(input_path, temp_wav)
    sr, audio = wavfile.read(temp_wav)
    audio = audio.astype(np.float32) / 32768.0
    audio = reduce_noise(audio, sr)
    audio = apply_vad(audio, sr)
    audio = normalize_audio(audio)
    cleaned_path = os.path.join(TEMP_AUDIO_DIR, f'{temp_id}_{CLEANED_AUDIO_FILENAME}')
    sf.write(cleaned_path, audio, sr)
    logger.info(f"Cleaned audio saved at {cleaned_path}")

    try:
        os.remove(temp_wav)
    except OSError:
        logger.warning("Could not delete temporary converted audio: %s", temp_wav)

    return cleaned_path
