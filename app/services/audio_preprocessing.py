import os
import numpy as np
import soundfile as sf
import noisereduce as nr
import webrtcvad
import subprocess
from scipy.io import wavfile
from app.utils.config import TEMP_AUDIO_DIR, CLEANED_AUDIO_FILENAME
from app.utils.logger import logger

def convert_audio(input_path: str, output_path: str) -> None:
    """
    Convert audio to mono, 16kHz WAV using ffmpeg.
    """
    logger.info(f"Converting {input_path} to mono 16kHz WAV at {output_path}")
    cmd = [
        'ffmpeg', '-y', '-i', input_path,
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
    return np.array(voiced_audio, dtype=np.float32)

def normalize_audio(audio: np.ndarray) -> np.ndarray:
    logger.info("Normalizing audio")
    return audio / np.max(np.abs(audio))

def preprocess_audio(input_path: str) -> str:
    """
    Run all preprocessing steps and save cleaned audio.
    """
    logger.info(f"Preprocessing audio: {input_path}")
    os.makedirs(TEMP_AUDIO_DIR, exist_ok=True)
    temp_wav = os.path.join(TEMP_AUDIO_DIR, 'converted.wav')
    convert_audio(input_path, temp_wav)
    sr, audio = wavfile.read(temp_wav)
    audio = audio.astype(np.float32) / 32768.0
    audio = reduce_noise(audio, sr)
    audio = apply_vad(audio, sr)
    audio = normalize_audio(audio)
    cleaned_path = os.path.join(TEMP_AUDIO_DIR, CLEANED_AUDIO_FILENAME)
    sf.write(cleaned_path, audio, sr)
    logger.info(f"Cleaned audio saved at {cleaned_path}")
    return cleaned_path
