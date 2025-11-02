"""
QuantiFy - Real-time Trading Analytics Platform
FastAPI backend application entry point with orchestrated services
"""

import asyncio
import logging
import signal
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
from datetime import datetime

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from api.routes import analytics, market_data, alerts, health
from api.api_routes import router as consolidated_router  # Import consolidated routes
from api.websocket import router as websocket_router  # Import WebSocket routes
from database.connection import database_manager
from ingestion.websocket_manager import websocket_manager
from resampling.resampler_service import ResamplerService
from analytics.engine import AnalyticsEngine
from alerts.manager import AlertManager
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("/tmp/quantify.log")
    ]
)
logger = logging.getLogger(__name__)

# Global service instances
resampler_service: Optional[ResamplerService] = None
analytics_engine: Optional[AnalyticsEngine] = None
alert_manager: Optional[AlertManager] = None

# Background task references
resampler_task: Optional[asyncio.Task] = None
analytics_task: Optional[asyncio.Task] = None
alert_manager_task: Optional[asyncio.Task] = None

# Shutdown flag
shutdown_event = asyncio.Event()


async def run_resampler_periodic():
    """
    Background task to run resampler every 10 seconds
    """
    global resampler_service
    logger.info("🔄 Starting periodic resampler task (every 10 seconds)")
    
    while not shutdown_event.is_set():
        try:
            start_time = datetime.now()
            
            # Run resampling for all active symbols
            await resampler_service.resample_all()
            
            elapsed = (datetime.now() - start_time).total_seconds()
            logger.info(f"✅ Resampler completed in {elapsed:.2f}s")
            
            # Wait 10 seconds before next run
            try:
                await asyncio.wait_for(shutdown_event.wait(), timeout=10.0)
                break  # Shutdown signal received
            except asyncio.TimeoutError:
                continue  # Timeout is expected, continue loop
                
        except asyncio.CancelledError:
            logger.info("Resampler task cancelled")
            break
        except Exception as e:
            logger.error(f"❌ Error in resampler task: {e}", exc_info=True)
            # Wait before retrying on error
            try:
                await asyncio.wait_for(shutdown_event.wait(), timeout=5.0)
                break
            except asyncio.TimeoutError:
                continue


async def run_analytics_periodic():
    """
    Background task to run analytics computations every 30 seconds
    """
    global analytics_engine
    logger.info("📊 Starting periodic analytics task (every 30 seconds)")
    
    # Define symbol pairs for analysis
    symbol_pairs = [
        ("BTCUSDT", "ETHUSDT"),
        ("ETHUSDT", "ADAUSDT"),
        # Add more pairs as needed
    ]
    
    while not shutdown_event.is_set():
        try:
            start_time = datetime.now()
            
            # Calculate analytics for each pair
            for symbol1, symbol2 in symbol_pairs:
                try:
                    # Calculate correlation
                    correlation = await analytics_engine.calculate_correlation(
                        symbol1, symbol2, window_minutes=60
                    )
                    
                    # Calculate hedge ratio
                    hedge_ratio = await analytics_engine.calculate_hedge_ratio(
                        symbol1, symbol2, window_minutes=60
                    )
                    
                    logger.info(
                        f"📈 Analytics: {symbol1}/{symbol2} - "
                        f"Correlation: {correlation:.4f if correlation else 'N/A'}, "
                        f"Hedge Ratio: {hedge_ratio:.4f if hedge_ratio else 'N/A'}"
                    )
                except Exception as e:
                    logger.error(f"Error calculating analytics for {symbol1}/{symbol2}: {e}")
            
            elapsed = (datetime.now() - start_time).total_seconds()
            logger.info(f"✅ Analytics computation completed in {elapsed:.2f}s")
            
            # Wait 30 seconds before next run
            try:
                await asyncio.wait_for(shutdown_event.wait(), timeout=30.0)
                break  # Shutdown signal received
            except asyncio.TimeoutError:
                continue  # Timeout is expected, continue loop
                
        except asyncio.CancelledError:
            logger.info("Analytics task cancelled")
            break
        except Exception as e:
            logger.error(f"❌ Error in analytics task: {e}", exc_info=True)
            # Wait before retrying on error
            try:
                await asyncio.wait_for(shutdown_event.wait(), timeout=10.0)
                break
            except asyncio.TimeoutError:
                continue


def handle_shutdown_signal(signum, frame):
    """
    Handle SIGINT (Ctrl+C) for graceful shutdown
    """
    logger.info(f"\n🛑 Received shutdown signal ({signal.Signals(signum).name})")
    shutdown_event.set()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manage application lifespan - startup and shutdown events
    """
    global resampler_service, analytics_engine, resampler_task, analytics_task
    
    logger.info("=" * 80)
    logger.info("🚀 STARTING QUANTIFY BACKEND")
    logger.info("=" * 80)
    
    try:
        # ================================================================
        # STARTUP PHASE
        # ================================================================
        
        # 1. Initialize database
        logger.info("📦 [1/7] Initializing database...")
        await database_manager.initialize()
        logger.info("✅ Database initialized successfully")
        
        # 2. Start WebSocket manager for real-time market data
        logger.info("🌐 [2/7] Starting WebSocket manager...")
        await websocket_manager.start()
        logger.info("✅ WebSocket manager started - Connected to Binance")
        
        # 3. Initialize resampler service
        logger.info("🔄 [3/7] Initializing resampler service...")
        resampler_service = ResamplerService()
        logger.info("✅ Resampler service initialized")
        
        # 4. Initialize analytics engine
        logger.info("📊 [4/7] Initializing analytics engine...")
        analytics_engine = AnalyticsEngine()
        logger.info("✅ Analytics engine initialized")
        
        # 5. Initialize alert manager
        logger.info("🔔 [5/7] Initializing alert manager...")
        alert_manager = AlertManager(check_interval=5, cooldown_seconds=60)
        await alert_manager.start()
        logger.info("✅ Alert manager started (interval: 5s, cooldown: 60s)")
        
        # 6. Start background task for resampling (every 10 seconds)
        logger.info("⚙️  [6/7] Starting resampler background task...")
        resampler_task = asyncio.create_task(run_resampler_periodic())
        logger.info("✅ Resampler task started (interval: 10s)")
        
        # 7. Start background task for analytics (every 30 seconds)
        logger.info("⚙️  [7/7] Starting analytics background task...")
        analytics_task = asyncio.create_task(run_analytics_periodic())
        logger.info("✅ Analytics task started (interval: 30s)")
        
        logger.info("=" * 80)
        logger.info("✨ ALL SERVICES STARTED SUCCESSFULLY")
        logger.info("=" * 80)
        logger.info(f"📍 Server running on: http://{settings.HOST}:{settings.PORT}")
        logger.info(f"📚 API Docs: http://{settings.HOST}:{settings.PORT}/docs")
        logger.info(f"🔍 Health Check: http://{settings.HOST}:{settings.PORT}/api/health")
        logger.info("=" * 80)
        
        yield  # Application is running
        
    except Exception as e:
        logger.error(f"❌ Error during startup: {e}", exc_info=True)
        raise
    
    finally:
        # ================================================================
        # SHUTDOWN PHASE
        # ================================================================
        
        logger.info("=" * 80)
        logger.info("🛑 SHUTTING DOWN QUANTIFY BACKEND")
        logger.info("=" * 80)
        
        # Signal shutdown to background tasks
        shutdown_event.set()
        
        # 1. Cancel background tasks and stop alert manager
        logger.info("⏹️  [1/5] Stopping background tasks and services...")
        tasks_to_cancel = []
        
        # Stop alert manager first
        if alert_manager:
            try:
                await alert_manager.stop()
                logger.info("✅ Alert manager stopped")
            except Exception as e:
                logger.error(f"Error stopping alert manager: {e}")
        
        if resampler_task and not resampler_task.done():
            tasks_to_cancel.append(resampler_task)
            resampler_task.cancel()
        
        if analytics_task and not analytics_task.done():
            tasks_to_cancel.append(analytics_task)
            analytics_task.cancel()
        
        # Wait for tasks to complete with timeout
        if tasks_to_cancel:
            try:
                await asyncio.wait_for(
                    asyncio.gather(*tasks_to_cancel, return_exceptions=True),
                    timeout=5.0
                )
                logger.info("✅ Background tasks stopped")
            except asyncio.TimeoutError:
                logger.warning("⚠️  Background tasks did not stop within timeout")
        
        # 2. Stop WebSocket connections
        logger.info("🌐 [2/5] Stopping WebSocket manager...")
        try:
            await websocket_manager.stop()
            logger.info("✅ WebSocket manager stopped")
        except Exception as e:
            logger.error(f"Error stopping WebSocket manager: {e}")
        
        # 3. Close database connections
        logger.info("📦 [3/5] Closing database connections...")
        try:
            await database_manager.close()
            logger.info("✅ Database connections closed")
        except Exception as e:
            logger.error(f"Error closing database: {e}")
        
        # 4. Final cleanup
        logger.info("🧹 [4/5] Final cleanup...")
        resampler_service = None
        analytics_engine = None
        alert_manager = None
        logger.info("✅ Cleanup completed")
        
        logger.info("=" * 80)
        logger.info("👋 QUANTIFY BACKEND SHUTDOWN COMPLETE")
        logger.info("=" * 80)


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

# Include WebSocket routes
app.include_router(websocket_router, tags=["WebSocket"])

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
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "websocket": "running",
            "resampler": "running",
            "analytics": "running",
            "database": "connected"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "services": {
            "websocket": websocket_manager is not None,
            "resampler": resampler_service is not None,
            "analytics": analytics_engine is not None,
            "database": database_manager is not None
        }
    }


@app.get("/api/status")
async def detailed_status():
    """Detailed system status"""
    return {
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "uptime": "check logs",
        "services": {
            "websocket": {
                "status": "running" if websocket_manager else "stopped",
                "description": "Real-time market data from Binance"
            },
            "resampler": {
                "status": "running" if resampler_service else "stopped",
                "description": "OHLCV resampling (every 10s)",
                "interval": "10 seconds"
            },
            "analytics": {
                "status": "running" if analytics_engine else "stopped",
                "description": "Quantitative analytics computation (every 30s)",
                "interval": "30 seconds"
            },
            "database": {
                "status": "connected" if database_manager else "disconnected",
                "description": "SQLite database connection"
            }
        },
        "endpoints": {
            "docs": "/docs",
            "health": "/api/health",
            "symbols": "/api/symbols",
            "ticks": "/api/ticks",
            "ohlcv": "/api/ohlcv"
        }
    }


def main():
    """
    Main entry point with signal handlers
    """
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, handle_shutdown_signal)
    signal.signal(signal.SIGTERM, handle_shutdown_signal)
    
    logger.info("🎯 Starting QuantiFy with signal handlers registered")
    logger.info("💡 Press Ctrl+C for graceful shutdown")
    
    try:
        uvicorn.run(
            "main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=False,  # Disable reload for proper signal handling
            log_level=settings.LOG_LEVEL.lower(),
            access_log=True
        )
    except KeyboardInterrupt:
        logger.info("🛑 Keyboard interrupt received")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()