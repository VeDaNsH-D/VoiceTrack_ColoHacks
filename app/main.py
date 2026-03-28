from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
<<<<<<< HEAD
from app.routes import process, stt
=======
from app.routes import stt
>>>>>>> 7c6236cefe4cb587fe6f29e808950e0afcf9b5e0
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
