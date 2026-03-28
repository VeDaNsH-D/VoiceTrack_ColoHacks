import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routes import process, stt
from app.routes import tts
from app.utils.config import TEMP_AUDIO_DIR
from app.utils.logger import logger

app = FastAPI()
os.makedirs(TEMP_AUDIO_DIR, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    logger.info("FastAPI server started.")

app.include_router(stt.router)
app.include_router(process.router)
app.include_router(tts.router)
app.mount("/audio", StaticFiles(directory=TEMP_AUDIO_DIR), name="audio")
