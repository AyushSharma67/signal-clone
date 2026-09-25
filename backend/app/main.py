from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from . import models
from .routers import conversations
from .routers import messages
from .routers import auth
from .routers.conversations import router as conversations_router
app = FastAPI(title="Signal Clone API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(conversations_router)
app.include_router(conversations.router)
app.include_router(messages.router)
@app.get("/")
def root():
    return {
        "message": "Signal Clone API is running"
    }