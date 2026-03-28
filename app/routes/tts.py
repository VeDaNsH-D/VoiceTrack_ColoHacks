from __future__ import annotations

import os

from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

from app.services.tts_service import text_to_speech
from app.utils.config import TEMP_AUDIO_DIR
from app.utils.logger import logger

router = APIRouter()


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1)
    language: str | None = None


def build_audio_url(request: Request, audio_path: str) -> str:
    filename = os.path.basename(audio_path)
    return str(request.url_for("get_generated_audio", filename=filename))


@router.post("/tts")
async def tts(request: TTSRequest, http_request: Request):
    logger.info("/tts request received")

    audio_path = await text_to_speech(request.text, request.language or "hi")
    if not audio_path:
        raise HTTPException(status_code=500, detail="TTS generation failed")

    return {"audioUrl": f"/audio/{os.path.basename(audio_path)}"}

@router.get("/audio/{filename}", name="get_generated_audio")
def get_generated_audio(filename: str):
    safe_filename = os.path.basename(filename)
    audio_path = os.path.join(TEMP_AUDIO_DIR, safe_filename)
    if not os.path.isfile(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(audio_path, media_type="audio/mpeg", filename=safe_filename)
