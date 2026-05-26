"""TTS API routes – synthesize, clone, design voice."""

from __future__ import annotations

import base64
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from models.schemas import TTSRequest, TTSResponse, VoiceCloneRequest, VoiceDesignRequest
from services.mimo_tts import tts_service

router = APIRouter(prefix="/api/tts", tags=["tts"])


@router.post("/synthesize")
async def synthesize(req: TTSRequest) -> TTSResponse:
    """Synthesize speech from text and return base64-encoded audio."""
    try:
        audio = await tts_service.synthesize(
            text=req.text,
            voice_description=req.voice_description,
            voice=req.voice,
            audio_format=req.audio_format,
        )
        return TTSResponse(
            audio_base64=base64.b64encode(audio).decode(),
            format=req.audio_format,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/synthesize/raw")
async def synthesize_raw(req: TTSRequest) -> Response:
    """Synthesize and return raw WAV audio bytes."""
    try:
        audio = await tts_service.synthesize(
            text=req.text,
            voice_description=req.voice_description,
            voice=req.voice,
            audio_format="wav",
        )
        return Response(content=audio, media_type="audio/wav")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/clone")
async def clone_voice(req: VoiceCloneRequest) -> TTSResponse:
    """Clone a voice from reference audio and speak sample text."""
    try:
        sample_text = f"Hello, this is the cloned voice named {req.name}."
        audio = await tts_service.clone_voice(
            reference_audio_base64=req.reference_audio_base64,
            text=sample_text,
            voice_name=req.name,
        )
        return TTSResponse(
            audio_base64=base64.b64encode(audio).decode(),
            format="wav",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/design")
async def design_voice(req: VoiceDesignRequest) -> TTSResponse:
    """Design a voice from a text description and speak sample text."""
    try:
        sample_text = f"Hello, this is my newly designed voice – {req.name}."
        audio = await tts_service.design_voice(
            description=req.description,
            text=sample_text,
            voice_name=req.name,
        )
        return TTSResponse(
            audio_base64=base64.b64encode(audio).decode(),
            format="wav",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
