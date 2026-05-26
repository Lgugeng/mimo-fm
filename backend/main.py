"""MiMo FM – AI Radio backend entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import chat_router, radio_router, spotify_router, tts_router
from database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    await init_db()
    yield


app = FastAPI(
    title="MiMo FM – AI Radio",
    description="A Claudio FM clone powered by Xiaomi MiMo APIs",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS – allow all origins for dev; tighten in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(chat_router)
app.include_router(tts_router)
app.include_router(spotify_router)
app.include_router(radio_router)


@app.get("/health")
async def health() -> dict:
    """Health-check endpoint."""
    return {"status": "ok", "service": "mimo-fm"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
