from __future__ import annotations

import os

from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from app.services.tts_service import text_to_speech
from app.utils.logger import logger

router = APIRouter()


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1)
    language: str | None = None


@router.post("/tts")
def tts(request: TTSRequest):
    logger.info("/tts request received")

    audio_path = text_to_speech(request.text, request.language or "hi")
    if not audio_path:
        raise HTTPException(status_code=500, detail="TTS generation failed")

    return {"audioUrl": f"/audio/{os.path.basename(audio_path)}"}
