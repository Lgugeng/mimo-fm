"""MiMo TTS service – voice synthesis, cloning, and design."""

from __future__ import annotations

import base64
import io
import struct
import wave
from typing import AsyncGenerator, Optional

from openai import AsyncOpenAI

from config import settings


def _pcm_to_wav(pcm_bytes: bytes, sample_rate: int = 24000, channels: int = 1, sampwidth: int = 2) -> bytes:
    """Wrap raw PCM16 data in a WAV container."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sampwidth)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_bytes)
    return buf.getvalue()


class MiMoTTSService:
    """Text-to-speech via the MiMo TTS models."""

    def __init__(self) -> None:
        self.client = AsyncOpenAI(
            api_key=settings.MIMO_API_KEY,
            base_url=settings.MIMO_BASE_URL,
        )

    async def synthesize(
        self,
        text: str,
        voice_description: str = "A warm, friendly radio DJ",
        voice: str = "Chloe",
        audio_format: str = "wav",
    ) -> bytes:
        """Synthesize speech from text. Returns WAV or raw PCM16 bytes.

        Uses the MiMo TTS chat-completions interface where the *user* message
        carries the voice/style description and the *assistant* message carries
        the text to speak.
        """
        resp = await self.client.chat.completions.create(
            model="mimo-v2.5-tts",
            messages=[
                {"role": "user", "content": voice_description},
                {"role": "assistant", "content": text},
            ],
            modalities=["text", "audio"],
            audio={"format": "pcm16", "voice": voice},
        )

        audio_data = resp.choices[0].message.audio
        if audio_data is None:
            raise RuntimeError("TTS response contained no audio data")

        pcm_bytes = base64.b64decode(audio_data.data)
        if audio_format == "wav":
            return _pcm_to_wav(pcm_bytes)
        return pcm_bytes

    async def synthesize_stream(
        self,
        text: str,
        voice_description: str = "A warm, friendly radio DJ",
        voice: str = "Chloe",
        chunk_size: int = 48000,
    ) -> AsyncGenerator[bytes, None]:
        """Stream synthesized audio in chunks (PCM16)."""
        pcm = await self.synthesize(text, voice_description, voice, audio_format="pcm16")
        for i in range(0, len(pcm), chunk_size):
            yield pcm[i : i + chunk_size]

    async def clone_voice(
        self,
        reference_audio_base64: str,
        text: str,
        voice_name: str = "ClonedVoice",
    ) -> bytes:
        """Clone a voice from reference audio and synthesize text.

        Returns WAV bytes.
        """
        resp = await self.client.chat.completions.create(
            model="mimo-v2.5-tts-voiceclone",
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"[voice clone reference audio: data:audio/wav;base64,{reference_audio_base64}]\n"
                        f"Speak with this voice."
                    ),
                },
                {"role": "assistant", "content": text},
            ],
            modalities=["text", "audio"],
            audio={"format": "pcm16", "voice": voice_name},
        )
        audio_data = resp.choices[0].message.audio
        if audio_data is None:
            raise RuntimeError("Voice-clone response contained no audio data")
        pcm_bytes = base64.b64decode(audio_data.data)
        return _pcm_to_wav(pcm_bytes)

    async def design_voice(
        self,
        description: str,
        text: str,
        voice_name: str = "DesignedVoice",
    ) -> bytes:
        """Create a voice from a natural-language description and speak *text*.

        Returns WAV bytes.
        """
        resp = await self.client.chat.completions.create(
            model="mimo-v2.5-tts-voicedesign",
            messages=[
                {"role": "user", "content": description},
                {"role": "assistant", "content": text},
            ],
            modalities=["text", "audio"],
            audio={"format": "pcm16", "voice": voice_name},
        )
        audio_data = resp.choices[0].message.audio
        if audio_data is None:
            raise RuntimeError("Voice-design response contained no audio data")
        pcm_bytes = base64.b64decode(audio_data.data)
        return _pcm_to_wav(pcm_bytes)


tts_service = MiMoTTSService()
