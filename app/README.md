# VoiceTrack App Service

Python FastAPI service for speech-to-text, transcript structuring, conversation handling, and text-to-speech.

## What This Service Does

- Accepts uploaded audio and runs STT pipeline.
- Uses dual STT providers with quality-based fallback:
  - Sarvam STT (primary)
  - Local Whisper (fallback/comparison)
- Preprocesses audio before transcription (ffmpeg conversion, noise reduction, VAD, normalization).
- Structures transcript into sales/expense JSON using LLM providers with fallback chain.
- Manages multi-turn clarification state for conversation-style transaction completion.
- Generates TTS audio for assistant responses and serves generated audio files.
- Exposes processing endpoints compatible with backend/frontend flows.

## Tech Stack

- FastAPI + Uvicorn
- Whisper (local model)
- Sarvam STT API
- edge-tts with gTTS fallback
- NumPy, SciPy, noisereduce, webrtcvad for audio preprocessing
- Requests-based provider integrations

## Project Structure

- main.py: FastAPI app setup, middleware, router registration, static audio mount.
- routes/stt.py: STT and conversation endpoints.
- routes/process.py: text-to-structured-transaction endpoint.
- routes/tts.py: text-to-speech endpoint and generated audio serving.
- services/stt_pipeline.py: provider orchestration and quality gate logic.
- services/audio_preprocessing.py: cleaning and normalization.
- services/llm_structurer.py: transcript-to-JSON extraction with LLM fallback chain.
- services/assistant_reply.py: assistant response generation and clarification logic.
- services/conversation_state.py: in-memory pending clarification store.
- utils/config.py: env configuration.

## Setup

Option A: quick start scripts (recommended)

- Linux/macOS: app/start.sh
- Windows PowerShell: app/start.ps1

What it does:

- installs ffmpeg automatically if missing (required for voice preprocessing)
- creates app/venv if missing
- installs requirements
- starts uvicorn app.main:app on PORT (default 8001)

Run:

Linux/macOS:

./app/start.sh

Windows PowerShell:

powershell -ExecutionPolicy Bypass -File app/start.ps1

Option B: manual setup

1. Create virtual environment

python -m venv app/venv

2. Activate environment

Windows:
app\\venv\\Scripts\\activate

Linux/macOS:
source app/venv/bin/activate

3. Install dependencies

pip install -r app/requirements.txt

4. Run service

uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

## Environment Variables

Configured in app/.env (loaded by app/utils/config.py).

STT

- SARVAM_API_KEY
- SARVAM_STT_URL (default https://api.sarvam.ai/speech-to-text)
- WHISPER_MODEL_NAME (default base)
- STT_FORCE_PROVIDER (default sarvam)

LLM structuring and assistant

- GROQ_API_KEY
- GROQ_MODEL
- GEMINI_API_KEY
- GEMINI_MODEL
- OPENAI_API_KEY
- OPENAI_MODEL
- OPENAI_BASE_URL

Backend bridge

- BACKEND_BASE_URL (default http://127.0.0.1:5001)
- BACKEND_PROCESS_PATH (default /api/transactions/process-text)
- BACKEND_CHAT_PATH (default /chat)
- BACKEND_SAVE_PATH (default /api/transactions/save)

CORS

- ALLOWED_ORIGINS (comma-separated; default *)

## API Endpoints

Service and health

- GET /
  - service metadata and available endpoints.
- GET /health

STT uploads

- POST /stt
- POST /process-text/stt
- POST /upload-audio
  - multipart audio upload.
  - runs STT pipeline + structuring attempt.

Conversation pipeline

- POST /conversation
  - multi-turn endpoint using pending conversation state.
  - can combine previous context with clarification answer.
  - returns transcript, structured_data, assistant reply, audio metadata, and conversation flags.

Text processing

- POST /process
- POST /process-text
  - input text to structured transaction JSON.

TTS

- POST /tts
  - body: text, optional language.
  - returns audio URL path.
- GET /audio/{filename}
  - serves generated audio file.

## Core Feature Details

### 1) STT Quality Gate and Fallback

- Pipeline preprocesses audio first.
- Attempts Sarvam STT.
- Evaluates transcript quality.
- Falls back to Whisper when needed.
- Compares candidate scores and chooses best transcript.
- Returns quality_gate and confidence_engine metadata.

### 2) Audio Preprocessing

- ffmpeg conversion to mono 16kHz wav.
- noise reduction.
- voice activity detection.
- signal normalization.

This improves STT robustness for real-world vendor recordings.

### 3) Transcript Structuring (LLM-driven)

- Converts transcript into structured sales/expenses JSON.
- Uses multi-provider strategy (Groq, Gemini, OpenAI fallbacks in service logic).
- Normalizes and validates output fields.
- Emits clarification question when data is incomplete/ambiguous.

### 4) Clarification-aware Conversation State

- Keeps pending clarification state in memory per user ID.
- Merges original utterance and follow-up response when needed.
- Prevents repetitive clarification where enough confidence exists.
- Supports starting new transaction when transcript indicates intent shift.

### 5) Assistant Reply Generation

- Builds short speech-friendly confirmations.
- Adapts style for Hindi, Hinglish, and English.
- Can route to backend chat path for advanced responses.

### 6) Text-to-Speech

- Primary: edge-tts voices (Hindi/English mappings).
- Fallback: gTTS if edge-tts fails/unavailable.
- Stores generated MP3 under temp audio directory and serves via /audio path.

## Response Format

Routes use utility helpers that typically return:

- success
- data
- message

Errors are standardized via HTTP exception handlers with structured error payloads.

## Operational Notes

- This service keeps pending conversation state in process memory. Restart clears state.
- Whisper model loads at import time for lower runtime latency but higher startup memory/time.
- ffmpeg is auto-installed by quick start scripts when possible; otherwise install manually and ensure it is on PATH.
- For production, prefer pinned ALLOWED_ORIGINS and process manager supervision.
