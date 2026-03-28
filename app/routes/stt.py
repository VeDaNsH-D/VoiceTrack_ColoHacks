import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from app.services.stt_pipeline import run_stt_pipeline
from app.utils.logger import logger
from app.utils.config import TEMP_AUDIO_DIR

router = APIRouter()

@router.get("/")
def root():
    return {
        "service": "VoiceTrack STT API",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }

@router.get("/health")
def health():
    return {"status": "ok"}

@router.post("/stt")
async def stt(file: UploadFile = File(...)):
    logger.info("/stt request received")
    if not file.content_type.startswith("audio/"):
        logger.error(f"Invalid file type: {file.content_type}")
        raise HTTPException(status_code=400, detail="Invalid audio file format.")
    os.makedirs(TEMP_AUDIO_DIR, exist_ok=True)
    temp_path = os.path.join(TEMP_AUDIO_DIR, file.filename)
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Saved uploaded file to {temp_path}")
        result = run_stt_pipeline(temp_path)
        logger.info(f"STT pipeline result: {result}")
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"STT processing failed: {e}")
        raise HTTPException(status_code=500, detail="STT processing failed.")
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass
