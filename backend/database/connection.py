"""
Database Connection and Session Management
"""

import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from config import settings
from database.models import Base


class DatabaseManager:
    """Manages database connections and sessions"""
    
    def __init__(self):
        self.engine = None
        self.async_session = None
    
    async def initialize(self):
        """Initialize database connection"""
        # Create async engine
        self.engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.DEBUG,
            future=True,
            poolclass=NullPool if settings.DATABASE_URL.startswith("sqlite") else None
        )
        
        # Create async session factory
        self.async_session = async_sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False
        )
        
        # Create tables
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    
    async def close(self):
        """Close database connections"""
        if self.engine:
            await self.engine.dispose()
    
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get database session"""
        if not self.async_session:
            raise RuntimeError("Database not initialized")
        
        async with self.async_session() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()


# Global database manager instance
database_manager = DatabaseManager()


# Dependency for FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency to get database session"""
    async for session in database_manager.get_session():
        yield session