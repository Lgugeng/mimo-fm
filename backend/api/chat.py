"""Chat API routes – streaming SSE and synchronous."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from models.schemas import ChatRequest, ChatResponse
from services.mimo_llm import llm_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/sync", response_model=ChatResponse)
async def chat_sync(req: ChatRequest) -> ChatResponse:
    """Non-streaming chat completion."""
    try:
        result = await llm_service.chat(
            messages=req.messages,
            model=req.model,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
        )
        return ChatResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("")
async def chat_stream(req: ChatRequest):
    """Streaming chat via Server-Sent Events."""

    async def event_generator():
        try:
            async for token in llm_service.chat_stream(
                messages=req.messages,
                model=req.model,
                temperature=req.temperature,
                max_tokens=req.max_tokens,
            ):
                yield {"data": token}
            yield {"data": "[DONE]"}
        except Exception as exc:
            yield {"data": f"[ERROR] {exc}"}

    return EventSourceResponse(event_generator())
