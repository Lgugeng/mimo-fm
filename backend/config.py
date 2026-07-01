"""Application configuration via environment variables."""

from functools import cached_property

from pydantic import Field, ValidationError, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """App settings loaded from environment / .env file."""

    # Critical: all sensitive fields must be non-empty
    MIMO_API_KEY: str = Field(..., min_length=1, description="MiMo API key")
    MIMO_BASE_URL: str = "https://token-plan-cn.xiaomimimo.com/v1"
    SPOTIFY_CLIENT_ID: str = ""  # optional
    SPOTIFY_CLIENT_SECRET: str = ""
    SPOTIFY_REDIRECT_URI: str = "http://localhost:8000/api/spotify/callback"
    DATABASE_URL: str = "sqlite+aiosqlite:///./mimofm.db"
    SECRET_KEY: str = Field(..., min_length=1, description="Secret key for signing")
    ENCRYPTION_KEY: str = Field(..., min_length=1, description="Fernet encryption key")

    DEBUG: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @field_validator("MIMO_API_KEY", "SECRET_KEY", "ENCRYPTION_KEY")
    @classmethod
    def validate_required_not_empty(cls, v, field):
        """Ensure critical fields are not empty strings."""
        if not v or (isinstance(v, str) and not v.strip()):
            raise ValueError(f"{field.field_name} is required and cannot be empty")
        return v


settings = Settings()
