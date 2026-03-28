# VoiceTrack Backend

Node.js + Express backend for authentication, business collaboration, transaction storage, analytics, assistant chat, and integrations.

## What This Service Does

- Handles user signup/login with JWT auth.
- Creates or joins collaborative businesses using a generated Business Code and business password.
- Extracts transaction data from text using an LLM-first extraction pipeline.
- Stores processed transactions and raw logs in MongoDB (with in-memory fallback when Mongo is unavailable for transaction store operations).
- Provides history and insights scoped by business (or by user if no business is linked).
- Supports assistant query endpoints with intent detection and context-aware replies.
- Provides chat endpoint with optional TTS audio URL output.
- Exposes webhook and protected profile endpoints.
- Boots Telegram bot integration on server start.

## Tech Stack

- Node.js, Express 5
- MongoDB + Mongoose
- JWT authentication
- Groq/Gemini/OpenAI integrations for LLM-related features
- Hugging Face embeddings + MongoDB vector search support
- Optional Python service integration for TTS/STT-related operations

## Project Structure

- src/app.js: Express app wiring and route registration.
- src/index.js: HTTP server startup, DB connection, Telegram bot lifecycle.
- src/config/env.js: environment variable loading and defaults.
- src/config/db.js: MongoDB connection setup.
- src/controllers: API handlers.
- src/routes: route modules.
- src/services: business logic and provider integrations.
- src/models: MongoDB models (User, Business, Transaction, RawLog).
- telegram/bot.js: Telegram bot flow.

## Setup

1. Install dependencies

npm install

2. Create backend environment file

Create backend/.env with required values (see Environment Variables section).

3. Start development server

npm run dev

4. Start production server

npm start

Default port from config is 5000 unless overridden by PORT.

## Environment Variables

Core

- PORT: backend port (default 5000)
- NODE_ENV: environment name
- MONGO_URI: MongoDB connection string
- JWT_SECRET: secret used to sign/verify JWTs

LLM and AI providers

- GROQ_API_KEY
- GROQ_MODEL (default llama-3.1-8b-instant)
- GEMINI_API_KEY
- GEMINI_MODEL
- OPENAI_API_KEY
- OPENAI_MODEL
- GEMINI_BASE_URL or OPENAI_BASE_URL (advanced compatibility)

Embeddings and retrieval

- HUGGINGFACE_API_KEY or HF_API_KEY
- HUGGINGFACE_EMBEDDING_URL

Python service bridge (TTS/STT compatible paths)

- PYTHON_SERVICE_URL (default http://127.0.0.1:8001)
- STT_PATH (default /stt)
- TTS_PATH (default /tts)
- TTS_TIMEOUT_MS (default 10000)

Telegram

- TELEGRAM_BOT_TOKEN or TELEGRAM_TOKEN
- BACKEND_URL (used by Telegram worker context)

## API Response Pattern

Most endpoints use a standard envelope via helper utilities:

- success: boolean
- data: payload object
- message: readable status string
- error: optional error details

Some endpoints may still return direct success/message payloads (legacy style), so clients should support both envelope and direct shapes.

## API Endpoints

Base/health

- GET /health
- GET /

Authentication and business

- GET /api/auth/status
  - Checks Bearer token validity and auth status.
- POST /api/auth/signup
  - Signup with create/join business mode.
- POST /api/auth/login
  - Login via identifier (phone/email) + password.
- GET /api/auth/business
  - Business visibility endpoint.
  - Query params: userId or businessCode or businessId.
  - Returns business snapshot including members and collaboration status.

Protected profile

- GET /api/protected
  - Requires Bearer token.

Transactions

- POST /api/transactions/process-text
  - LLM-first transaction extraction from free text.
  - Optional persistence controlled by save flag.
- POST /api/transactions/save
  - Save structured transaction payload directly.
- GET /api/transactions/history
  - Supports user and business-scoped retrieval.
  - Query params include userId, startDate, endDate, limit.

Insights

- GET /api/insights
  - Optional userId query param.
  - Returns totals and transaction count.

Assistant and chat

- POST /api/assistant/query
  - Intent-driven business Q&A with optional contextual retrieval.
- POST /chat
  - Conversational endpoint returning text reply and optional audio URL.

Webhooks

- POST /api/webhooks
  - Receives arbitrary payload and confirms receipt.

## Core Feature Details

### 1) Collaborative Business Flow

- Business model stores owner and member user IDs.
- Signup supports:
  - create mode: creates new business, generates unique code like BIZ-XXXXXX.
  - join mode: validates business code + business password, attaches user as staff member.
- Join/create flow is protected against orphan user creation by rollback logic if business linkage fails.
- Business detail endpoint exposes:
  - DB business ID
  - businessCode
  - owner and members
  - membersCount
  - collaborationEnabled flag

### 2) Auth and Security

- Passwords are hashed with crypto.scrypt + per-user salt.
- JWT token includes userId and identity fields.
- Auth middleware validates Bearer token for protected routes.

### 3) Transaction Extraction and Storage

- Primary extraction path is LLM-first (multi-provider fallback support in service layer).
- Structured output includes sales, expenses, and meta fields.
- On save:
  - Raw input is stored in RawLog.
  - Processed transaction is stored with totals auto-calculated in model pre-validation.
  - Optional semantic summary + embedding generation for retrieval.

### 4) Scope-aware Analytics and Querying

- If user has a businessId, records are filtered by business scope.
- If no business linked, filtering falls back to user scope.
- Query service supports intents like total sales, profit, product sales, top product, and transaction count.

### 5) Context Retrieval (RAG-like)

- Embeddings generated using Hugging Face model endpoint.
- Vector search over Transaction.embedding retrieves relevant summaries.
- Results are injected into response generation for better grounded answers.

### 6) Voice/TTS Integration

- Chat controller can request TTS from Python service and returns audio URL.
- TTS service gracefully handles unavailable provider responses and returns null audio URL if needed.

### 7) Telegram Bot Integration

- Telegram bot starts with backend server.
- Supports quick action buttons, voice note transcription path, and mapping queries to backend chat endpoint.
- Includes callback/voice handlers and graceful shutdown hooks.

## Data Models

User

- name, phone/email, role, passwordHash/passwordSalt, businessId

Business

- businessCode, name, type, owner, members
- secure business password hash/salt (excluded from JSON output)

Transaction

- userId, businessId, rawText, normalizedText, summary, embedding
- sales and expenses arrays
- totals (salesAmount, expenseAmount, netAmount)
- meta (confidence, source, clarification flags)

RawLog

- raw ingestion log for text processing metadata and status.

## Notes for Integrators

- Provide MONGO_URI for full auth/business capabilities.
- Without Mongo, auth and business features will reject requests by design, while transaction store has limited in-memory fallback behavior.
- Keep client-side parsing resilient to both wrapped and direct JSON response formats.
- For production, set strong JWT_SECRET and lock CORS origins.
