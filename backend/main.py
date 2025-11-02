"""
QuantiFy - Real-time Trading Analytics Platform
FastAPI backend application entry point
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from api.routes import analytics, market_data, alerts, health
from api.api_routes import router as consolidated_router  # Import consolidated routes
from database.connection import database_manager
from ingestion.websocket_manager import websocket_manager
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manage application lifespan - startup and shutdown events
    """
    # Startup
    logger.info("Starting QuantiFy backend...")
    
    # Initialize database
    await database_manager.initialize()
    logger.info("Database initialized")
    
    # Start WebSocket connections for market data
    await websocket_manager.start()
    logger.info("WebSocket manager started")
    
    yield
    
    # Shutdown
    logger.info("Shutting down QuantiFy backend...")
    
    # Stop WebSocket connections
    await websocket_manager.stop()
    logger.info("WebSocket manager stopped")
    
    # Close database connections
    await database_manager.close()
    logger.info("Database connections closed")


# Create FastAPI application
app = FastAPI(
    title="QuantiFy API",
    description="Real-time Trading Analytics Platform for Quantitative Traders",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
    lifespan=lifespan
)

# Add middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS + ["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include consolidated routes
app.include_router(consolidated_router, tags=["API"])

# Include original routers for backward compatibility
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(market_data.router, prefix="/api/v1", tags=["Market Data"])
app.include_router(analytics.router, prefix="/api/v1", tags=["Analytics"])
app.include_router(alerts.router, prefix="/api/v1", tags=["Alerts"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "QuantiFy Trading Analytics API",
        "version": "1.0.0",
        "status": "operational"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": "2025-11-02T00:00:00Z",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_level=settings.LOG_LEVEL.lower()
    )