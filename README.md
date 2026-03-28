# VoiceTrack

This repository contains the VoiceTrack frontend and backend services.

Detailed service docs:

- backend/README.md
- app/README.md

## Frontend

The frontend is a React + Vite application.

Common commands:

```bash
npm install
npm run dev
```

## Backend

The backend service lives in `backend/` and exposes the transaction-processing API.

Common commands:

```bash
cd backend
npm install
npm run dev
```

Main endpoint:

- `POST /process-text`

Example request:

```json
{
  "text": "Aaj 3 chai 10 ka aur 1 samosa 15 ka, 50 ka doodh liya"
}
```

Health check:

- `GET /health`
