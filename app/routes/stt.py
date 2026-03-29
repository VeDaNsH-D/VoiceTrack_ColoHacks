import os
import shutil
from uuid import uuid4
import requests
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import JSONResponse
from app.services.conversation_state import (
    clear_pending_conversation,
    get_pending_conversation,
    set_pending_conversation,
)
from app.services.assistant_reply import generate_assistant_reply
from app.services.assistant_reply import get_pipeline_results
from app.services.llm_structurer import structure_transcript
from app.services.stt_pipeline import run_stt_pipeline
from app.services.tts_service import text_to_speech
from app.routes.tts import build_audio_url
from app.utils.api_response import success_response
from app.utils.logger import logger
from app.utils.config import BACKEND_BASE_URL, BACKEND_SAVE_PATH, TEMP_AUDIO_DIR

router = APIRouter()


@router.get("/")
def root():
    return success_response({
        "service": "VoiceTrack STT API",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "stt": "POST /stt",
            "sttCompat": "POST /process-text/stt",
            "uploadAudio": "POST /upload-audio",
            "conversation": "POST /conversation",
            "process": "POST /process",
            "processCompat": "POST /process-text",
        },
    }, "Service info")


@router.get("/health")
def health():
    return success_response({"status": "ok"}, "Health check OK")


async def handle_stt_upload(file: UploadFile) -> JSONResponse:
    logger.info("STT request received for file: %s", file.filename)
    content_type = file.content_type or ""
    if not content_type.startswith("audio/"):
        logger.error(f"Invalid file type: {file.content_type}")
        raise HTTPException(
            status_code=400, detail="Invalid audio file format.")
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
            result["structured_data"] = structure_transcript(
                result.get("final_text", ""))
        except Exception as structuring_error:
            logger.error("Transcript structuring failed: %s",
                         structuring_error)
            result["structured_data"] = None
        logger.info(f"STT pipeline result: {result}")
        return JSONResponse(content=success_response(result, "STT completed"))
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
@router.post("/upload-audio")
async def stt(file: UploadFile = File(...)):
    return await handle_stt_upload(file)


async def _save_upload_to_temp(file: UploadFile) -> str:
    content_type = file.content_type or ""
    if not content_type.startswith("audio/"):
        logger.error("Invalid file type for conversation: %s",
                     file.content_type)
        raise HTTPException(
            status_code=400, detail="Invalid audio file format.")

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
        clarification_question = (
            meta.get("clarification_question") or "").strip()
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


def _detect_tts_language(text: str) -> str:
    value = str(text or "")
    if any("\u0900" <= char <= "\u097F" for char in value):
        return "hi"
    return "en"


def _looks_like_agent_query(transcript: str, structured_data, pending_state) -> bool:
    cleaned = " ".join(str(transcript or "").strip().lower().split())
    if not cleaned:
        return False

    if pending_state and bool((pending_state or {}).get("awaiting_clarification")):
        return False

    if _has_structured_entries(structured_data):
        return False

    meta = structured_data.get("meta") if isinstance(structured_data, dict) else {}
    if (meta or {}).get("needs_clarification"):
        # If utterance itself is clearly non-transactional, skip transaction clarification loop.
        transaction_markers = [
            "becha", "bechi", "sold", "sale", "expense", "kharcha", "qty", "quantity", "price", "amount", "rupaye", "rupees",
        ]
        if any(marker in cleaned for marker in transaction_markers):
            return False

    question_markers = [
        "what", "why", "how", "when", "which", "who", "show", "tell", "suggest", "recommend",
        "kya", "kaise", "kab", "kitna", "kitni", "batao", "dikhao", "samjhao", "salah",
    ]
    business_query_markers = [
        "sales", "profit", "loss", "trend", "insight", "top", "history", "transaction history", "dashboard", "heatmap", "map", "area", "customer", "business", "growth", "plan",
        "bikri", "fayda", "nuksan", "trend", "insight", "history", "len den", "dashboard", "heatmap", "naksha", "area", "grahak", "vyapar",
    ]

    is_question_shape = "?" in cleaned or any(marker in cleaned for marker in question_markers)
    has_business_query_marker = any(marker in cleaned for marker in business_query_markers)
    has_numeric_transaction_signal = any(char.isdigit() for char in cleaned)

    if has_numeric_transaction_signal:
        return False

    return is_question_shape or has_business_query_marker


def _has_structured_entries(structured_data) -> bool:
    if not isinstance(structured_data, dict):
        return False
    sales = structured_data.get("sales") or []
    expenses = structured_data.get("expenses") or []
    return bool(sales or expenses)


def _is_finalized_structured_data(structured_data) -> bool:
    if not _has_structured_entries(structured_data):
        return False
    meta = structured_data.get("meta") if isinstance(
        structured_data, dict) else {}
    return not bool((meta or {}).get("needs_clarification"))


def _requires_low_confidence_confirmation(stt_result, structured_data) -> bool:
    quality_gate = stt_result.get(
        "quality_gate") if isinstance(stt_result, dict) else {}
    confidence_engine = stt_result.get(
        "confidence_engine") if isinstance(stt_result, dict) else {}

    final_confidence = float((confidence_engine or {}).get(
        "final") or stt_result.get("confidence") or 0.0)
    quality_needs_confirmation = bool(
        (quality_gate or {}).get("needs_confirmation"))

    if isinstance(structured_data, dict):
        meta = structured_data.get("meta") or {}
        if meta.get("needs_clarification"):
            return False

        # If extraction is finalized and model confidence is already strong,
        # avoid asking another confirmation based only on STT confidence.
        if _is_finalized_structured_data(structured_data):
            structured_confidence = float(meta.get("confidence") or 0.0)
            if structured_confidence >= 0.75:
                return False

    return quality_needs_confirmation or final_confidence < 0.6


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


def _is_low_signal_transcript(transcript: str) -> bool:
    cleaned = " ".join(str(transcript or "").strip().split())
    if not cleaned:
        return True

    words = cleaned.split()
    if len(words) <= 1:
        return True

    has_digit = any(ch.isdigit() for ch in cleaned)
    informative_tokens = [w for w in words if len(w) > 2]
    return (not has_digit) and len(informative_tokens) <= 1


def _should_start_new_transaction(user_id: str, transcript: str, standalone_data) -> bool:
    pending_state = get_pending_conversation(user_id)
    if not pending_state:
        return False

    if _looks_like_short_clarification_answer(transcript):
        return False

    return _is_finalized_structured_data(standalone_data)


def _build_structuring_input(user_id: str, transcript: str) -> str:
    pending_state = get_pending_conversation(user_id)
    if not pending_state:
        return transcript

    original_text = (pending_state.get("original_text") or "").strip()
    previous_question = (pending_state.get(
        "clarification_question") or "").strip()
    awaiting_clarification = bool(pending_state.get("awaiting_clarification"))
    clarification_turn_count = int(
        pending_state.get("clarification_turn_count") or 0)

    if not awaiting_clarification or not original_text:
        return transcript

    prompt_parts = [
        f"Original voice transaction: {original_text}",
    ]
    if previous_question:
        prompt_parts.append(
            f"Assistant follow-up question: {previous_question}")
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
    meta = structured_data.get("meta") if isinstance(
        structured_data, dict) else {}
    needs_clarification = bool((meta or {}).get("needs_clarification"))

    if needs_clarification:
        set_pending_conversation(
            user_id,
            {
                "original_text": str(existing_state.get("original_text") or transcript).strip(),
                "latest_answer": transcript,
                "structuring_input": structuring_input,
                "clarification_question": str((meta or {}).get("clarification_question") or "").strip(),
                "awaiting_clarification": True,
                "clarification_turn_count": int(existing_state.get("clarification_turn_count") or 0) + 1,
            },
        )
        return True

    clear_pending_conversation(user_id)
    return False


def _persist_finalized_transaction(user_id: str, transcript: str, normalized_text: str, structured_data) -> bool:
    if not isinstance(structured_data, dict):
        return False

    backend_url = f"{BACKEND_BASE_URL.rstrip('/')}{BACKEND_SAVE_PATH}"
    payload = {
        "userId": str(user_id or "").strip(),
        "rawText": transcript,
        "normalizedText": normalized_text,
        "sales": structured_data.get("sales") or [],
        "expenses": structured_data.get("expenses") or [],
        "meta": structured_data.get("meta") or {},
    }

    try:
        response = requests.post(backend_url, json=payload, timeout=25)
        if response.status_code >= 400:
            logger.error("Failed to persist conversation transaction (%s): %s",
                         response.status_code, response.text)
            return False
        return True
    except Exception as exc:
        logger.error("Conversation transaction persistence failed: %s", exc)
        return False


@router.post("/conversation")
async def conversation(
    request: Request,
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
            raise HTTPException(
                status_code=400, detail="No transcript generated from audio.")

        pending_before = get_pending_conversation(user_id)
        had_pending_clarification = bool(
            pending_before and pending_before.get("awaiting_clarification")
        )

        # If we're awaiting clarification but current STT text is too noisy,
        # do not merge it into previous transaction context.
        if had_pending_clarification and _is_low_signal_transcript(transcript) and not _looks_like_short_clarification_answer(transcript):
            assistant_reply = "Audio clear nahi aaya. Kripya last transaction item, quantity aur amount dobara batayiye."
            reply_audio_path = await text_to_speech(
                assistant_reply,
                _detect_tts_language(assistant_reply),
            )
            audio_url = build_audio_url(
                request, reply_audio_path) if reply_audio_path else ""
            audio_needed = bool(reply_audio_path)

            response_payload = {
                "user_id": user_id,
                "transcript": transcript,
                "structuring_input": transcript,
                "stt": {
                    "source": stt_result.get("source"),
                    "confidence": stt_result.get("confidence"),
                    "raw_text": stt_result.get("raw_text"),
                    "quality_gate": stt_result.get("quality_gate"),
                    "preprocessing": stt_result.get("preprocessing"),
                    "confidence_engine": stt_result.get("confidence_engine"),
                    "debug": stt_result.get("debug"),
                },
                "structured_data": None,
                "conversation_state": {
                    "clarification_pending": True,
                    "finalized": False,
                    "started_new": False,
                    "requires_confirmation": False,
                    "saved_to_history": False,
                },
                "assistant": {
                    "reply": assistant_reply,
                    "audio_path": reply_audio_path,
                    "audio_url": audio_url,
                    "audio_needed": audio_needed,
                },
            }
            logger.info(
                "Low-signal clarification answer detected; retained pending transaction context")
            return JSONResponse(content=success_response(response_payload, "Conversation completed"))

        force_start_new = str(start_new).strip().lower() in {
            "1", "true", "yes", "y"}
        standalone_data = None
        if get_pending_conversation(user_id):
            try:
                standalone_data = structure_transcript(transcript, user_id)
            except Exception as structuring_error:
                logger.error(
                    "Standalone transcript check failed during conversation: %s", structuring_error)
                standalone_data = None

        started_new = force_start_new or _should_start_new_transaction(
            user_id, transcript, standalone_data)
        if started_new:
            clear_pending_conversation(user_id)

        structuring_input = _build_structuring_input(user_id, transcript)

        try:
            structured_data = standalone_data if structuring_input == transcript and standalone_data is not None else structure_transcript(
                structuring_input, user_id)
        except Exception as structuring_error:
            logger.error(
                "Transcript structuring failed during conversation: %s", structuring_error)
            structured_data = None

        if _looks_like_agent_query(transcript, structured_data, pending_before):
            pipeline_results = {}
            try:
                pipeline_results = get_pipeline_results(user_id)
            except Exception as pipeline_error:
                logger.warning("Pipeline result snapshot failed: %s", pipeline_error)

            try:
                assistant_reply = generate_assistant_reply(
                    user_id=user_id,
                    transcript=transcript,
                    structured_data=None,
                    stt_provider=str(stt_result.get("source") or "sarvam"),
                    mode="agent",
                )
            except Exception as assistant_error:
                logger.error("Agent-mode reply generation failed: %s", assistant_error)
                assistant_reply = (
                    "Maine aapka sawal samjha, lekin iss waqt detailed answer generate nahi ho paaya. "
                    "Kripya ek baar phir se poochiye."
                )

            reply_audio_path = await text_to_speech(
                assistant_reply,
                _detect_tts_language(assistant_reply),
            )
            audio_url = build_audio_url(request, reply_audio_path) if reply_audio_path else ""

            response_payload = {
                "user_id": user_id,
                "transcript": transcript,
                "structuring_input": transcript,
                "stt": {
                    "source": stt_result.get("source"),
                    "confidence": stt_result.get("confidence"),
                    "raw_text": stt_result.get("raw_text"),
                    "quality_gate": stt_result.get("quality_gate"),
                    "preprocessing": stt_result.get("preprocessing"),
                    "confidence_engine": stt_result.get("confidence_engine"),
                    "debug": stt_result.get("debug"),
                },
                "structured_data": None,
                "conversation_state": {
                    "clarification_pending": bool(
                        pending_before and pending_before.get("awaiting_clarification")
                    ),
                    "finalized": False,
                    "started_new": False,
                    "requires_confirmation": False,
                    "saved_to_history": False,
                    "agent_mode": True,
                },
                "assistant": {
                    "reply": assistant_reply,
                    "audio_path": reply_audio_path,
                    "audio_url": audio_url,
                    "audio_needed": bool(reply_audio_path),
                },
                "pipeline_results": pipeline_results,
            }

            logger.info("Conversation handled in agent mode for user: %s", user_id)
            return JSONResponse(content=success_response(response_payload, "Conversation completed"))

        clarification_pending = _update_pending_state(
            user_id, transcript, structuring_input, structured_data)
        try:
            assistant_reply = generate_assistant_reply(
                user_id=user_id,
                transcript=transcript,
                structured_data=structured_data,
                stt_provider=str(stt_result.get("source") or "sarvam"),
            )
        except Exception as assistant_error:
            logger.error(
                "LLM assistant reply generation failed: %s", assistant_error)
            assistant_reply = _build_assistant_reply(structured_data)
        if not assistant_reply:
            raise HTTPException(
                status_code=502, detail="Conversation reply was empty.")

        requires_confirmation = _requires_low_confidence_confirmation(
            stt_result, structured_data)
        resolved_clarification_this_turn = (
            had_pending_clarification
            and not clarification_pending
            and _is_finalized_structured_data(structured_data)
        )
        short_confirmation_answer = (
            had_pending_clarification
            and _looks_like_short_clarification_answer(transcript)
        )
        effective_requires_confirmation = (
            requires_confirmation
            and not clarification_pending
            and not resolved_clarification_this_turn
            and not short_confirmation_answer
        )

        if effective_requires_confirmation:
            assistant_reply = (
                f"{assistant_reply} "
                "Kripya confirm kariye ki maine aapki baat sahi samjhi hai."
            ).strip()

        reply_audio_path = await text_to_speech(
            assistant_reply,
            _detect_tts_language(assistant_reply),
        )
        audio_url = build_audio_url(
            request, reply_audio_path) if reply_audio_path else ""
        audio_needed = bool(reply_audio_path)

        if not reply_audio_path:
            logger.warning(
                "Reply audio generation unavailable for user: %s", user_id)

        finalized = _is_finalized_structured_data(structured_data)
        saved_to_history = False
        if finalized:
            # Persist meaningful raw text after clarification/confirmation turns.
            # If user said a short answer like "haan", store the original transaction instead.
            raw_text_for_save = transcript
            if had_pending_clarification and _looks_like_short_clarification_answer(transcript):
                raw_text_for_save = str(
                    (pending_before or {}).get("original_text") or transcript
                ).strip() or transcript

            saved_to_history = _persist_finalized_transaction(
                user_id=user_id,
                transcript=raw_text_for_save,
                normalized_text=structuring_input,
                structured_data=structured_data,
            )

        response_payload = {
            "user_id": user_id,
            "transcript": transcript,
            "structuring_input": structuring_input,
            "stt": {
                "source": stt_result.get("source"),
                "confidence": stt_result.get("confidence"),
                "raw_text": stt_result.get("raw_text"),
                "quality_gate": stt_result.get("quality_gate"),
                "preprocessing": stt_result.get("preprocessing"),
                "confidence_engine": stt_result.get("confidence_engine"),
                "debug": stt_result.get("debug"),
            },
            "structured_data": structured_data,
            "conversation_state": {
                "clarification_pending": clarification_pending,
                "finalized": finalized,
                "started_new": started_new,
                "requires_confirmation": effective_requires_confirmation,
                "saved_to_history": saved_to_history,
            },
            "assistant": {
                "reply": assistant_reply,
                "audio_path": reply_audio_path,
                "audio_url": audio_url,
                "audio_needed": audio_needed,
            },
        }
        logger.info("Conversation pipeline completed for user: %s", user_id)
        return JSONResponse(content=success_response(response_payload, "Conversation completed"))
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Conversation pipeline failed: %s", exc)
        raise HTTPException(
            status_code=500, detail="Conversation pipeline failed.") from exc
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass
