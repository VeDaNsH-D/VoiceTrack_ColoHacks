from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import process, stt
from app.utils.logger import logger

app = FastAPI()

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
