"""API router aggregation – import all sub-routers."""

from api.chat import router as chat_router
from api.radio import router as radio_router
from api.spotify import router as spotify_router
from api.tts import router as tts_router

__all__ = ["chat_router", "radio_router", "spotify_router", "tts_router"]
