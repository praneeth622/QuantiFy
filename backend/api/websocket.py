"""
WebSocket endpoint for real-time data streaming to frontend clients
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Set
from decimal import Decimal

from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from sqlalchemy import select

from database.connection import database_manager
from database.models import RawTicks, AnalyticsResults, AlertHistory

logger = logging.getLogger(__name__)

# Router for WebSocket endpoints
router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections and broadcasts"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.tick_task = None
        self.analytics_task = None
        
    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"✅ WebSocket client connected. Total: {len(self.active_connections)}")
        
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        self.active_connections.discard(websocket)
        logger.info(f"❌ WebSocket client disconnected. Total: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to a specific client"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message to client: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        disconnected = set()
        
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.add(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            self.disconnect(conn)
    
    async def broadcast_tick_data(self):
        """Broadcast latest tick data every 500ms"""
        while True:
            try:
                if not self.active_connections:
                    await asyncio.sleep(0.5)
                    continue
                
                # Get latest ticks for all symbols
                # NOTE: Removed 60-second time filter temporarily to show historical data
                # Add back when live data ingestion is working: .where(RawTicks.timestamp >= cutoff_time)
                async for session in database_manager.get_session():
                    result = await session.execute(
                        select(RawTicks)
                        .order_by(RawTicks.timestamp.desc())
                        .limit(10)
                    )
                    ticks = result.scalars().all()
                    
                    if ticks:
                        tick_data = []
                        for tick in ticks:
                            tick_data.append({
                                "symbol": tick.symbol,
                                "price": float(tick.price),
                                "quantity": float(tick.quantity),
                                "timestamp": tick.timestamp.isoformat(),
                            })
                        
                        message = {
                            "type": "tick",
                            "data": tick_data,
                            "timestamp": datetime.now().isoformat(),
                        }
                        
                        await self.broadcast(message)
                    
                    break
                
                await asyncio.sleep(0.5)  # 500ms
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in tick broadcast: {e}")
                await asyncio.sleep(0.5)
    
    async def broadcast_analytics_data(self):
        """Broadcast latest analytics data every 5 seconds"""
        while True:
            try:
                if not self.active_connections:
                    await asyncio.sleep(5)
                    continue
                
                # Get latest analytics results
                # NOTE: Removed 5-minute time filter temporarily to show historical data
                # Add back when live analytics are being generated: .where(AnalyticsResults.timestamp >= cutoff_time)
                async for session in database_manager.get_session():
                    result = await session.execute(
                        select(AnalyticsResults)
                        .order_by(AnalyticsResults.timestamp.desc())
                        .limit(5)
                    )
                    analytics = result.scalars().all()
                    
                    if analytics:
                        analytics_data = []
                        for anal in analytics:
                            analytics_data.append({
                                "symbol_pair": anal.symbol_pair,
                                "interval": anal.interval,
                                "spread": float(anal.spread) if anal.spread else None,
                                "spread_mean": float(anal.spread_mean) if anal.spread_mean else None,
                                "spread_std": float(anal.spread_std) if anal.spread_std else None,
                                "z_score": float(anal.z_score) if anal.z_score else None,
                                "half_life": float(anal.half_life) if anal.half_life else None,
                                "hedge_ratio": float(anal.hedge_ratio) if anal.hedge_ratio else None,
                                "correlation": float(anal.correlation) if anal.correlation else None,
                                "timestamp": anal.timestamp.isoformat(),
                            })
                        
                        message = {
                            "type": "analytics",
                            "data": analytics_data,
                            "timestamp": datetime.now().isoformat(),
                        }
                        
                        await self.broadcast(message)
                    
                    break
                
                await asyncio.sleep(5)  # 5 seconds
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in analytics broadcast: {e}")
                await asyncio.sleep(5)
    
    async def broadcast_alert(self, alert_data: dict):
        """Broadcast alert immediately to all clients"""
        message = {
            "type": "alert",
            "data": alert_data,
            "timestamp": datetime.now().isoformat(),
        }
        
        await self.broadcast(message)
        logger.info(f"📡 Alert broadcasted to {len(self.active_connections)} clients")
    
    async def start_broadcasting(self):
        """Start background broadcasting tasks"""
        if not self.tick_task or self.tick_task.done():
            self.tick_task = asyncio.create_task(self.broadcast_tick_data())
            logger.info("🔄 Started tick broadcasting (every 500ms)")
        
        if not self.analytics_task or self.analytics_task.done():
            self.analytics_task = asyncio.create_task(self.broadcast_analytics_data())
            logger.info("📊 Started analytics broadcasting (every 5s)")
    
    async def stop_broadcasting(self):
        """Stop background broadcasting tasks"""
        if self.tick_task:
            self.tick_task.cancel()
            try:
                await self.tick_task
            except asyncio.CancelledError:
                pass
        
        if self.analytics_task:
            self.analytics_task.cancel()
            try:
                await self.analytics_task
            except asyncio.CancelledError:
                pass
        
        logger.info("⏹️  Stopped broadcasting tasks")


# Global connection manager instance
manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time data streaming
    
    Sends:
    - Tick data every 500ms: {type: 'tick', data: [...], timestamp: ...}
    - Analytics data every 5s: {type: 'analytics', data: [...], timestamp: ...}
    - Alert notifications immediately: {type: 'alert', data: {...}, timestamp: ...}
    """
    await manager.connect(websocket)
    
    # Start broadcasting if this is the first client
    if len(manager.active_connections) == 1:
        await manager.start_broadcasting()
    
    try:
        # Send welcome message
        await websocket.send_json({
            "type": "connection",
            "data": {
                "status": "connected",
                "message": "Connected to QuantiFy WebSocket",
                "clients": len(manager.active_connections),
            },
            "timestamp": datetime.now().isoformat(),
        })
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Receive messages from client (if any)
                data = await websocket.receive_text()
                
                # Parse client message
                try:
                    client_msg = json.loads(data)
                    
                    # Handle different message types
                    if client_msg.get("type") == "ping":
                        await websocket.send_json({
                            "type": "pong",
                            "timestamp": datetime.now().isoformat(),
                        })
                    
                    elif client_msg.get("type") == "subscribe":
                        # Client can subscribe to specific symbols
                        symbols = client_msg.get("symbols", [])
                        await websocket.send_json({
                            "type": "subscribed",
                            "data": {"symbols": symbols},
                            "timestamp": datetime.now().isoformat(),
                        })
                    
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON from client: {data}")
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in WebSocket loop: {e}")
                break
    
    finally:
        manager.disconnect(websocket)
        
        # Stop broadcasting if no more clients
        if len(manager.active_connections) == 0:
            await manager.stop_broadcasting()


# Function to broadcast alerts (called by AlertManager)
async def broadcast_alert_to_websocket(alert_data: dict):
    """
    Function to be called by AlertManager when an alert is triggered
    """
    await manager.broadcast_alert(alert_data)
