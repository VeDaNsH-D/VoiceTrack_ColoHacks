from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.llm_structurer import structure_transcript
from app.utils.logger import logger

router = APIRouter()

class ProcessRequest(BaseModel):
    text: str

class ProcessResponse(BaseModel):
    structured: bool
    original: str
    data: Dict[str, Any]

@router.post("/process")
def process_text(request: ProcessRequest):
    """Use the transcript as LLM input and return structured JSON."""
    if not request.text:
        raise HTTPException(status_code=400, detail="Text is required.")
    try:
        structured_data = structure_transcript(request.text)
        return ProcessResponse(
            structured=True,
            original=request.text,
            data=structured_data,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("LLM processing failed: %s", exc)
        raise HTTPException(status_code=500, detail="LLM processing failed.") from exc
