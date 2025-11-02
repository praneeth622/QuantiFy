"""
WebSocket Manager for Real-time Market Data
"""

import asyncio
import json
import logging
from typing import Dict, Set, Optional, Callable
from binance import AsyncClient, BinanceSocketManager
from datetime import datetime

from config import settings
from database.connection import database_manager
from database.models import RawTicks

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections for real-time market data"""
    
    def __init__(self):
        self.client: Optional[AsyncClient] = None
        self.socket_manager: Optional[BinanceSocketManager] = None
        self.active_streams: Dict[str, asyncio.Task] = {}
        self.subscribed_symbols: Set[str] = set()
        self.data_callbacks: Dict[str, Callable] = {}
        self.is_running = False
    
    async def start(self):
        """Start WebSocket manager"""
        try:
            # Initialize Binance client
            self.client = await AsyncClient.create(
                api_key=settings.BINANCE_API_KEY,
                api_secret=settings.BINANCE_SECRET_KEY,
                testnet=settings.BINANCE_TESTNET
            )
            
            self.socket_manager = BinanceSocketManager(self.client)
            self.is_running = True
            
            # Start with default symbols
            default_symbols = ["BTCUSDT", "ETHUSDT"]
            for symbol in default_symbols:
                await self.subscribe_ticker(symbol)
            
            logger.info("WebSocket manager started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start WebSocket manager: {e}")
            raise
    
    async def stop(self):
        """Stop WebSocket manager"""
        self.is_running = False
        
        # Stop all active streams
        for stream_name, task in self.active_streams.items():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        self.active_streams.clear()
        
        # Close socket manager gracefully
        # BinanceSocketManager doesn't have a close() method, streams are automatically stopped
        self.socket_manager = None
        
        # Close client
        if self.client:
            await self.client.close_connection()
        
        logger.info("WebSocket manager stopped")
    
    async def subscribe_ticker(self, symbol: str):
        """Subscribe to ticker stream for a symbol"""
        if symbol in self.subscribed_symbols:
            logger.warning(f"Already subscribed to {symbol}")
            return
        
        try:
            # Create ticker stream
            stream = self.socket_manager.trade_socket(symbol)
            
            # Start stream task
            task = asyncio.create_task(
                self._handle_ticker_stream(stream, symbol)
            )
            
            self.active_streams[f"ticker_{symbol}"] = task
            self.subscribed_symbols.add(symbol)
            
            logger.info(f"Subscribed to ticker stream for {symbol}")
            
        except Exception as e:
            logger.error(f"Failed to subscribe to {symbol}: {e}")
    
    async def unsubscribe_ticker(self, symbol: str):
        """Unsubscribe from ticker stream"""
        stream_name = f"ticker_{symbol}"
        
        if stream_name in self.active_streams:
            task = self.active_streams[stream_name]
            task.cancel()
            
            try:
                await task
            except asyncio.CancelledError:
                pass
            
            del self.active_streams[stream_name]
            self.subscribed_symbols.discard(symbol)
            
            logger.info(f"Unsubscribed from ticker stream for {symbol}")
    
    async def _handle_ticker_stream(self, stream, symbol: str):
        """Handle incoming ticker data"""
        try:
            async with stream as stream_socket:
                while self.is_running:
                    try:
                        msg = await stream_socket.recv()
                        await self._process_ticker_data(msg, symbol)
                    except Exception as e:
                        logger.error(f"Error processing ticker data for {symbol}: {e}")
                        
        except asyncio.CancelledError:
            logger.info(f"Ticker stream for {symbol} cancelled")
        except Exception as e:
            logger.error(f"Ticker stream error for {symbol}: {e}")
    
    async def _process_ticker_data(self, data: dict, symbol: str):
        """Process and store ticker data"""
        try:
            # Parse timestamp
            timestamp = datetime.fromtimestamp(data['T'] / 1000)
            
            # Create tick data object
            tick_data = RawTicks(
                symbol=symbol,
                price=float(data['p']),
                quantity=float(data['q']),
                timestamp=timestamp
            )
            
            # Store in database
            await self._store_tick_data(tick_data)
            
            # Call registered callbacks
            await self._call_data_callbacks(symbol, data)
            
        except Exception as e:
            logger.error(f"Error processing ticker data: {e}")
    
    async def _store_tick_data(self, tick_data: RawTicks):
        """Store tick data in database"""
        try:
            async for session in database_manager.get_session():
                session.add(tick_data)
                await session.commit()
                break
        except Exception as e:
            logger.error(f"Error storing tick data: {e}")
    
    async def _call_data_callbacks(self, symbol: str, data: dict):
        """Call registered data callbacks"""
        for callback_name, callback in self.data_callbacks.items():
            try:
                await callback(symbol, data)
            except Exception as e:
                logger.error(f"Error in callback {callback_name}: {e}")
    
    def register_callback(self, name: str, callback: Callable):
        """Register a data callback"""
        self.data_callbacks[name] = callback
        logger.info(f"Registered callback: {name}")
    
    def unregister_callback(self, name: str):
        """Unregister a data callback"""
        if name in self.data_callbacks:
            del self.data_callbacks[name]
            logger.info(f"Unregistered callback: {name}")
    
    def get_subscribed_symbols(self) -> Set[str]:
        """Get list of subscribed symbols"""
        return self.subscribed_symbols.copy()


# Global WebSocket manager instance
websocket_manager = WebSocketManager()