"""
Database Connection and Session Management
Optimized for SQLite with performance enhancements
"""

import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool
from sqlalchemy import event
from sqlalchemy.engine import Engine

from config import settings
from database.models import Base


# SQLite optimization pragma statements
def _set_sqlite_pragma(dbapi_connection, connection_record):
    """Set SQLite optimization pragmas"""
    if 'sqlite' in str(dbapi_connection):
        cursor = dbapi_connection.cursor()
        # Performance optimizations
        cursor.execute("PRAGMA journal_mode=WAL")           # Write-Ahead Logging
        cursor.execute("PRAGMA synchronous=NORMAL")         # Faster writes
        cursor.execute("PRAGMA cache_size=10000")           # 10MB cache
        cursor.execute("PRAGMA temp_store=MEMORY")          # Store temp tables in memory
        cursor.execute("PRAGMA mmap_size=134217728")        # 128MB memory map
        cursor.execute("PRAGMA page_size=4096")             # Optimal page size
        cursor.execute("PRAGMA auto_vacuum=INCREMENTAL")    # Automatic cleanup
        cursor.execute("PRAGMA foreign_keys=ON")           # Enable foreign keys
        cursor.close()


class DatabaseManager:
    """Manages database connections and sessions with SQLite optimizations"""
    
    def __init__(self):
        self.engine = None
        self.async_session = None
    
    async def initialize(self):
        """Initialize database connection with SQLite optimizations"""
        # Configure SQLite connection
        if settings.DATABASE_URL.startswith("sqlite"):
            # SQLite-specific configuration
            self.engine = create_async_engine(
                settings.DATABASE_URL,
                echo=settings.DEBUG,
                future=True,
                poolclass=StaticPool,
                connect_args={
                    "check_same_thread": False,
                    "timeout": 30,
                },
                pool_pre_ping=True,
                pool_recycle=3600,  # Recycle connections every hour
            )
            
            # Apply SQLite pragmas
            event.listen(Engine, "connect", _set_sqlite_pragma)
            
        else:
            # PostgreSQL or other database configuration
            self.engine = create_async_engine(
                settings.DATABASE_URL,
                echo=settings.DEBUG,
                future=True,
                pool_size=20,
                max_overflow=30,
                pool_pre_ping=True,
                pool_recycle=3600,
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
    
    async def execute_raw_sql(self, sql: str, params: dict = None):
        """Execute raw SQL for complex queries"""
        async with self.async_session() as session:
            result = await session.execute(sql, params or {})
            await session.commit()
            return result
    
    async def get_table_info(self, table_name: str):
        """Get table information and statistics"""
        if settings.DATABASE_URL.startswith("sqlite"):
            sql = f"PRAGMA table_info({table_name})"
        else:
            sql = f"""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = '{table_name}'
            """
        
        async with self.async_session() as session:
            result = await session.execute(sql)
            return result.fetchall()
    
    async def optimize_database(self):
        """Run database optimization commands"""
        if settings.DATABASE_URL.startswith("sqlite"):
            from sqlalchemy import text
            async with self.async_session() as session:
                # Analyze tables for query optimization
                await session.execute(text("ANALYZE"))
                # Incremental vacuum
                await session.execute(text("PRAGMA incremental_vacuum"))
                await session.commit()


# Global database manager instance
database_manager = DatabaseManager()


# Dependency for FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency to get database session"""
    async for session in database_manager.get_session():
        yield session