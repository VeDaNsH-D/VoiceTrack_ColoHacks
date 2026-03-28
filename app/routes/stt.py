import os
import shutil
from uuid import uuid4
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from app.services.conversation_state import (
    clear_pending_conversation,
    get_pending_conversation,
    set_pending_conversation,
)
from app.services.llm_structurer import structure_transcript
from app.services.stt_pipeline import run_stt_pipeline
from app.services.tts_service import text_to_speech
from app.utils.logger import logger
from app.utils.config import TEMP_AUDIO_DIR

router = APIRouter()

@router.get("/")
def root():
    return {
        "service": "VoiceTrack STT API",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "stt": "POST /stt",
            "sttCompat": "POST /process-text/stt",
            "conversation": "POST /conversation",
            "process": "POST /process",
            "processCompat": "POST /process-text",
        },
    }

@router.get("/health")
def health():
    return {"status": "ok"}

async def handle_stt_upload(file: UploadFile) -> JSONResponse:
    logger.info("STT request received for file: %s", file.filename)
    content_type = file.content_type or ""
    if not content_type.startswith("audio/"):
        logger.error(f"Invalid file type: {file.content_type}")
        raise HTTPException(status_code=400, detail="Invalid audio file format.")
    os.makedirs(TEMP_AUDIO_DIR, exist_ok=True)
    original_name = file.filename or "upload.wav"
    temp_filename = f"{uuid4().hex}_{os.path.basename(original_name)}"
    temp_path = os.path.join(TEMP_AUDIO_DIR, temp_filename)
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Saved uploaded file to {temp_path}")
        result = run_stt_pipeline(temp_path)
        try:
            result["structured_data"] = structure_transcript(result.get("final_text", ""))
        except Exception as structuring_error:
            logger.error("Transcript structuring failed: %s", structuring_error)
            result["structured_data"] = None
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


@router.post("/stt")
@router.post("/process-text/stt")
async def stt(file: UploadFile = File(...)):
    return await handle_stt_upload(file)


async def _save_upload_to_temp(file: UploadFile) -> str:
    content_type = file.content_type or ""
    if not content_type.startswith("audio/"):
        logger.error("Invalid file type for conversation: %s", file.content_type)
        raise HTTPException(status_code=400, detail="Invalid audio file format.")

    os.makedirs(TEMP_AUDIO_DIR, exist_ok=True)
    original_name = file.filename or "upload.wav"
    temp_filename = f"{uuid4().hex}_{os.path.basename(original_name)}"
    temp_path = os.path.join(TEMP_AUDIO_DIR, temp_filename)

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return temp_path


def _build_assistant_reply(structured_data):
    if not isinstance(structured_data, dict):
        return "Mujhe transaction samajhne mein dikkat hui. Kripya dobara clearly batayiye."

    meta = structured_data.get("meta") or {}
    if meta.get("needs_clarification"):
        clarification_question = (meta.get("clarification_question") or "").strip()
        if clarification_question:
            return clarification_question
        return "Kripya transaction thoda clearly batayiye."

    sales = structured_data.get("sales") or []
    expenses = structured_data.get("expenses") or []

    if sales:
        parts = []
        for sale in sales:
            item = str(sale.get("item") or "item").strip()
            qty = sale.get("qty")
            price = sale.get("price")
            parts.append(f"{qty} {item} {price} rupaye ka")
        joined = ", ".join(parts)
        return f"Theek hai, maine note kar liya: {joined}."

    if expenses:
        parts = []
        for expense in expenses:
            item = str(expense.get("item") or "expense").strip()
            amount = expense.get("amount")
            parts.append(f"{item} par {amount} rupaye")
        joined = ", ".join(parts)
        return f"Theek hai, maine expense note kar liya: {joined}."

    return "Kripya transaction thoda aur clearly batayiye."


def _has_structured_entries(structured_data) -> bool:
    if not isinstance(structured_data, dict):
        return False
    sales = structured_data.get("sales") or []
    expenses = structured_data.get("expenses") or []
    return bool(sales or expenses)


def _looks_like_short_clarification_answer(transcript: str) -> bool:
    cleaned = " ".join(str(transcript or "").strip().lower().split())
    if not cleaned:
        return False

    short_answer_markers = {
        "haan",
        "han",
        "ha",
        "yes",
        "nahi",
        "nahin",
        "no",
        "cash",
        "online",
        "upi",
        "card",
    }
    if cleaned in short_answer_markers:
        return True

    tokens = cleaned.split()
    return len(tokens) <= 3 and any(char.isdigit() for char in cleaned)


def _should_start_new_transaction(user_id: str, transcript: str, standalone_data) -> bool:
    pending_state = get_pending_conversation(user_id)
    if not pending_state:
        return False

    if _looks_like_short_clarification_answer(transcript):
        return False

    meta = standalone_data.get("meta") if isinstance(standalone_data, dict) else {}
    standalone_finalized = _has_structured_entries(standalone_data) and not bool((meta or {}).get("needs_clarification"))
    return standalone_finalized


def _build_structuring_input(user_id: str, transcript: str) -> str:
    pending_state = get_pending_conversation(user_id)
    if not pending_state:
        return transcript

    original_text = (pending_state.get("original_text") or "").strip()
    previous_question = (pending_state.get("clarification_question") or "").strip()
    awaiting_clarification = bool(pending_state.get("awaiting_clarification"))
    clarification_turn_count = int(pending_state.get("clarification_turn_count") or 0)

    if not awaiting_clarification or not original_text:
        return transcript

    prompt_parts = [
        f"Original voice transaction: {original_text}",
    ]
    if previous_question:
        prompt_parts.append(f"Assistant follow-up question: {previous_question}")
    prompt_parts.append(f"User clarification answer: {transcript}")
    prompt_parts.append(
        "Combine the original transaction and the clarification answer into one final transaction if possible."
    )
    prompt_parts.append(
        "Only ask another clarification question if important transaction details are still missing."
    )
    prompt_parts.append(f"Clarification turn: {clarification_turn_count + 1}")
    return "\n".join(prompt_parts)


def _update_pending_state(user_id: str, transcript: str, structuring_input: str, structured_data) -> bool:
    existing_state = get_pending_conversation(user_id) or {}
    meta = structured_data.get("meta") if isinstance(structured_data, dict) else {}
    needs_clarification = bool((meta or {}).get("needs_clarification"))

    if needs_clarification:
        already_pending = bool(existing_state.get("awaiting_clarification"))
        set_pending_conversation(
            user_id,
            {
                "original_text": str(existing_state.get("original_text") or transcript).strip(),
                "latest_answer": transcript,
                "structuring_input": structuring_input,
                "clarification_question": str((meta or {}).get("clarification_question") or "").strip(),
                "awaiting_clarification": True,
                "clarification_turn_count": int(existing_state.get("clarification_turn_count") or 0) + (1 if already_pending else 0),
            },
        )
        return True

    clear_pending_conversation(user_id)
    return False


@router.post("/conversation")
async def conversation(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    start_new: str = Form("false"),
):
    logger.info("Conversation request received for user: %s", user_id)
    temp_path = await _save_upload_to_temp(file)

    try:
        stt_result = run_stt_pipeline(temp_path)
        transcript = (stt_result.get("final_text") or "").strip()
        if not transcript:
            raise HTTPException(status_code=400, detail="No transcript generated from audio.")

        force_start_new = str(start_new).strip().lower() in {"1", "true", "yes", "y"}
        standalone_data = None
        if get_pending_conversation(user_id):
            try:
                standalone_data = structure_transcript(transcript)
            except Exception as structuring_error:
                logger.error("Standalone transcript check failed during conversation: %s", structuring_error)
                standalone_data = None

        started_new = force_start_new or _should_start_new_transaction(user_id, transcript, standalone_data)
        if started_new:
            clear_pending_conversation(user_id)

        structuring_input = _build_structuring_input(user_id, transcript)

        try:
            structured_data = standalone_data if structuring_input == transcript and standalone_data is not None else structure_transcript(structuring_input)
        except Exception as structuring_error:
            logger.error("Transcript structuring failed during conversation: %s", structuring_error)
            structured_data = None

        clarification_pending = _update_pending_state(user_id, transcript, structuring_input, structured_data)
        assistant_reply = _build_assistant_reply(structured_data)
        if not assistant_reply:
            raise HTTPException(status_code=502, detail="Conversation reply was empty.")

        reply_audio_path = text_to_speech(assistant_reply)
        if not reply_audio_path:
            raise HTTPException(status_code=500, detail="Reply audio generation failed.")

        response_payload = {
            "user_id": user_id,
            "transcript": transcript,
            "structuring_input": structuring_input,
            "stt": {
                "source": stt_result.get("source"),
                "confidence": stt_result.get("confidence"),
                "debug": stt_result.get("debug"),
            },
            "structured_data": structured_data,
            "conversation_state": {
                "clarification_pending": clarification_pending,
                "finalized": not clarification_pending,
                "started_new": started_new,
            },
            "assistant": {
                "reply": assistant_reply,
                "audio_path": reply_audio_path,
                "audio_needed": True,
            },
        }
        logger.info("Conversation pipeline completed for user: %s", user_id)
        return JSONResponse(content=response_payload)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Conversation pipeline failed: %s", exc)
        raise HTTPException(status_code=500, detail="Conversation pipeline failed.") from exc
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass
