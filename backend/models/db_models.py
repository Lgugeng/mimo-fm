"""SQLAlchemy ORM models."""

import uuid
from datetime import datetime
from typing import Optional

from cryptography.fernet import Fernet
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import relationship

from config import settings
from database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


# Encryption helper for tokens
_fernet: Optional[Fernet] = None


def get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        _fernet = Fernet(settings.ENCRYPTION_KEY.encode())
    return _fernet


def encrypt_token(token: str) -> str:
    """Encrypt a token before storing in database."""
    return get_fernet().encrypt(token.encode()).decode()


def decrypt_token(enc_token: str) -> str:
    """Decrypt a token retrieved from database."""
    try:
        return get_fernet().decrypt(enc_token.encode()).decode()
    except Exception:
        # If decryption fails, the token is invalid/expired
        return ""


class User(Base):
    """Persisted user (Spotify-linked)."""

    __tablename__ = "users"

    id = Column(String(32), primary_key=True, default=_uuid)
    spotify_id = Column(String(128), unique=True, nullable=True, index=True)  # Added index
    display_name = Column(String(256), nullable=True)
    access_token = Column(String(512), nullable=True)  # encrypted at app layer
    refresh_token = Column(String(512), nullable=True)  # encrypted at app layer
    created_at = Column(DateTime, default=datetime.utcnow)

    voice_profiles = relationship("VoiceProfile", back_populates="user")
    episodes = relationship("Episode", back_populates="user")


class Playlist(Base):
    """Cached playlist metadata."""

    __tablename__ = "playlists"

    id = Column(String(32), primary_key=True, default=_uuid)
    spotify_playlist_id = Column(String(128), unique=True, index=True)  # Added index
    name = Column(String(512))
    owner_id = Column(String(32), ForeignKey("users.id"), nullable=True, index=True)  # Added index
    track_count = Column(String(16), default="0")
    snapshot = Column(Text, nullable=True)  # JSON blob of tracks
    created_at = Column(DateTime, default=datetime.utcnow)


class Episode(Base):
    """A generated radio episode."""

    __tablename__ = "episodes"

    id = Column(String(32), primary_key=True, default=_uuid)
    user_id = Column(String(32), ForeignKey("users.id"), nullable=True, index=True)  # Added index
    title = Column(String(512))
    playlist_spotify_id = Column(String(128), index=True)  # Added index
    segments_json = Column(Text)  # JSON list of segments
    status = Column(String(32), default="pending")  # pending | generating | ready
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="episodes")


class VoiceProfile(Base):
    """Cloned / designed voice profile."""

    __tablename__ = "voice_profiles"

    id = Column(String(32), primary_key=True, default=_uuid)
    user_id = Column(String(32), ForeignKey("users.id"), nullable=True, index=True)  # Added index
    name = Column(String(256))
    voice_id = Column(String(256))  # provider voice identifier
    kind = Column(String(32))  # clone | design
    meta = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="voice_profiles")
