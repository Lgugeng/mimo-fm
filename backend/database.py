"""SQLAlchemy async database setup."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=10,           # Base connection pool size
    max_overflow=20,        # Max connections beyond pool_size
    pool_pre_ping=True,     # Health check before using connection
    pool_recycle=3600,      # Recycle connections after 1 hour
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


async def get_db() -> AsyncSession:  # type: ignore[misc]
    """FastAPI dependency that yields an async DB session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Create all tables (called on startup)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
