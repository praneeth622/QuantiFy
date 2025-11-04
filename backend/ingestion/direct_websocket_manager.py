"""
WebSocket Manager for Real-time Market Data using Direct Binance WebSocket
Compatible with HTML WebSocket client approach
"""

import asyncio
import json
import logging
from typing import Dict, Set, Optional, Callable, List
from datetime import datetime

from binance_websocket_client import BinanceWebSocketClient, TradeMessage
from database.connection import database_manager
from database.models import RawTicks

logger = logging.getLogger(__name__)


class DirectWebSocketManager:
    """Manages WebSocket connections using direct Binance WebSocket client"""
    
    def __init__(self):
        self.ws_client: Optional[BinanceWebSocketClient] = None
        self.subscribed_symbols: Set[str] = set()
        self.data_callbacks: Dict[str, Callable] = {}
        self.is_running = False
    
    async def start(self):
        """Start WebSocket manager with direct Binance WebSocket"""
        try:
            # Default symbols to subscribe to
            default_symbols = ["BTCUSDT", "ETHUSDT", "ADAUSDT", "SOLUSDT", "DOTUSDT"]
            
            # Initialize WebSocket client with callback
            self.ws_client = BinanceWebSocketClient(
                symbols=default_symbols,
                on_trade_callback=self._handle_trade_message
            )
            
            self.is_running = True
            self.subscribed_symbols.update(default_symbols)
            
            # Start WebSocket client
            await self.ws_client.start()
            
            logger.info(f"WebSocket manager started successfully with {len(default_symbols)} symbols")
            
        except Exception as e:
            logger.error(f"Failed to start WebSocket manager: {e}")
            raise
    
    async def stop(self):
        """Stop WebSocket manager"""
        self.is_running = False
        
        if self.ws_client:
            await self.ws_client.stop()
            self.ws_client = None
        
        self.subscribed_symbols.clear()
        logger.info("WebSocket manager stopped")
    
    async def _handle_trade_message(self, trade: TradeMessage):
        """Handle incoming trade message from WebSocket"""
        try:
            # Create tick data object
            tick_data = RawTicks(
                symbol=trade.symbol,
                price=trade.price,
                quantity=trade.quantity,
                timestamp=trade.timestamp
            )
            
            # Store in database
            await self._store_tick_data(tick_data)
            
            # Call registered callbacks (for compatibility)
            data = {
                's': trade.symbol,
                'p': str(trade.price),
                'q': str(trade.quantity),
                'T': int(trade.trade_time.timestamp() * 1000),
                'E': int(trade.timestamp.timestamp() * 1000),
                'e': 'trade'
            }
            await self._call_data_callbacks(trade.symbol, data)
            
        except Exception as e:
            logger.error(f"Error handling trade message: {e}")
    
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
                if asyncio.iscoroutinefunction(callback):
                    await callback(symbol, data)
                else:
                    callback(symbol, data)
            except Exception as e:
                logger.error(f"Error in callback {callback_name}: {e}")
    
    # Compatibility methods for existing code
    async def subscribe_ticker(self, symbol: str):
        """Subscribe to ticker stream for a symbol"""
        if symbol in self.subscribed_symbols:
            logger.warning(f"Already subscribed to {symbol}")
            return
        
        # For now, just add to our set - the WebSocket client handles all symbols
        self.subscribed_symbols.add(symbol)
        logger.info(f"Subscribed to ticker stream for {symbol}")
    
    async def unsubscribe_ticker(self, symbol: str):
        """Unsubscribe from ticker stream"""
        self.subscribed_symbols.discard(symbol)
        logger.info(f"Unsubscribed from ticker stream for {symbol}")
    
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


# Global WebSocket manager instance (for compatibility)
websocket_manager = DirectWebSocketManager()