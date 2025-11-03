"""
Binance WebSocket Client for Real-time Trade Data
Handles streaming trade data from Binance WebSocket API with reconnection logic
"""

import asyncio
import json
import logging
from typing import Optional, Callable, Dict, List, Any
from datetime import datetime
from enum import Enum

import websockets
from websockets.exceptions import (
    ConnectionClosed,
    WebSocketException,
    InvalidStatusCode
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ConnectionState(Enum):
    """WebSocket connection states"""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    CLOSED = "closed"


class TradeMessage:
    """Parsed trade message from Binance WebSocket"""
    
    def __init__(self, raw_data: Dict[str, Any]):
        """
        Parse raw Binance trade message
        
        Example Binance trade message:
        {
            "e": "trade",
            "E": 1672515782136,
            "s": "BTCUSDT",
            "t": 12345,
            "p": "50000.00",
            "q": "0.001",
            "b": 88,           # optional - buyer order ID
            "a": 50,           # optional - seller order ID
            "T": 1672515782136,
            "m": true,         # optional - is buyer maker
            "M": true          # optional - ignore
        }
        """
        # Required fields
        self.timestamp = datetime.fromtimestamp(raw_data['E'] / 1000)
        self.symbol = raw_data['s']
        self.price = float(raw_data['p'])
        self.quantity = float(raw_data['q'])
        self.trade_id = raw_data['t']
        self.trade_time = datetime.fromtimestamp(raw_data['T'] / 1000)
        
        # Optional fields with defaults
        self.buyer_order_id = raw_data.get('b', 0)
        self.seller_order_id = raw_data.get('a', 0)
        self.is_buyer_maker = raw_data.get('m', False)
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'timestamp': self.timestamp.isoformat(),
            'symbol': self.symbol,
            'price': self.price,
            'quantity': self.quantity,
            'trade_id': self.trade_id,
            'trade_time': self.trade_time.isoformat(),
            'is_buyer_maker': self.is_buyer_maker
        }
    
    def __repr__(self) -> str:
        return (f"TradeMessage(symbol={self.symbol}, price={self.price}, "
                f"quantity={self.quantity}, timestamp={self.timestamp})")


class BinanceWebSocketClient:
    """
    Binance WebSocket client for real-time trade streams
    
    Features:
    - Async/await for non-blocking operation
    - Automatic reconnection with exponential backoff
    - Multiple symbol subscriptions
    - Message parsing and validation
    - Callback support for trade events
    - Comprehensive error handling and logging
    """
    
    # Binance WebSocket endpoints (Updated to use Futures API)
    BASE_WS_URL = "wss://fstream.binance.com/ws"
    COMBINED_STREAM_URL = "wss://fstream.binance.com/stream"
    
    def __init__(
        self,
        symbols: Optional[List[str]] = None,
        on_trade_callback: Optional[Callable[[TradeMessage], None]] = None,
        reconnect_delay: float = 5.0,
        max_reconnect_delay: float = 60.0,
        ping_interval: int = 20,
        ping_timeout: int = 10
    ):
        """
        Initialize Binance WebSocket client
        
        Args:
            symbols: List of symbols to subscribe (e.g., ['BTCUSDT', 'ETHUSDT'])
            on_trade_callback: Callback function called on each trade message
            reconnect_delay: Initial delay between reconnection attempts (seconds)
            max_reconnect_delay: Maximum delay between reconnection attempts (seconds)
            ping_interval: Interval for sending ping messages (seconds)
            ping_timeout: Timeout for ping/pong response (seconds)
        """
        self.symbols = [s.lower() for s in (symbols or ['btcusdt', 'ethusdt'])]
        self.on_trade_callback = on_trade_callback
        
        # Connection settings
        self.reconnect_delay = reconnect_delay
        self.max_reconnect_delay = max_reconnect_delay
        self.ping_interval = ping_interval
        self.ping_timeout = ping_timeout
        
        # State management
        self.state = ConnectionState.DISCONNECTED
        self.websocket: Optional[websockets.WebSocketClientProtocol] = None
        self.reconnect_attempts = 0
        self.is_running = False
        
        # Tasks
        self._receive_task: Optional[asyncio.Task] = None
        self._ping_task: Optional[asyncio.Task] = None
        
        # Statistics
        self.messages_received = 0
        self.messages_processed = 0
        self.errors_count = 0
        self.last_message_time: Optional[datetime] = None
        
        logger.info(f"BinanceWebSocketClient initialized for symbols: {self.symbols}")
    
    def _get_stream_url(self) -> str:
        """
        Generate WebSocket URL for combined streams
        
        Returns:
            WebSocket URL with stream names
        """
        # For single symbol, use simple URL
        if len(self.symbols) == 1:
            return f"{self.BASE_WS_URL}/{self.symbols[0]}@trade"
        
        # For multiple symbols, use combined stream
        streams = '/'.join([f"{symbol}@trade" for symbol in self.symbols])
        return f"{self.COMBINED_STREAM_URL}?streams={streams}"
    
    async def connect(self) -> bool:
        """
        Establish WebSocket connection to Binance
        
        Returns:
            True if connection successful, False otherwise
        """
        if self.state == ConnectionState.CONNECTED:
            logger.warning("Already connected to Binance WebSocket")
            return True
        
        self.state = ConnectionState.CONNECTING
        url = self._get_stream_url()
        
        try:
            logger.info(f"Connecting to Binance WebSocket: {url}")
            
            self.websocket = await websockets.connect(
                url,
                ping_interval=self.ping_interval,
                ping_timeout=self.ping_timeout,
                close_timeout=10
            )
            
            self.state = ConnectionState.CONNECTED
            self.reconnect_attempts = 0
            
            logger.info(f"✅ Connected to Binance WebSocket for symbols: {self.symbols}")
            return True
            
        except InvalidStatusCode as e:
            logger.error(f"Invalid HTTP status code during connection: {e}")
            self.state = ConnectionState.DISCONNECTED
            return False
            
        except Exception as e:
            logger.error(f"Failed to connect to Binance WebSocket: {e}")
            self.state = ConnectionState.DISCONNECTED
            return False
    
    async def disconnect(self) -> None:
        """Gracefully close WebSocket connection"""
        if self.websocket and not getattr(self.websocket, 'closed', True):
            logger.info("Closing WebSocket connection...")
            await self.websocket.close()
            self.state = ConnectionState.CLOSED
            logger.info("WebSocket connection closed")
    
    async def _reconnect(self) -> None:
        """
        Reconnect to Binance WebSocket with exponential backoff
        """
        self.state = ConnectionState.RECONNECTING
        self.reconnect_attempts += 1
        
        # Calculate delay with exponential backoff
        delay = min(
            self.reconnect_delay * (2 ** (self.reconnect_attempts - 1)),
            self.max_reconnect_delay
        )
        
        logger.warning(
            f"Reconnecting in {delay:.1f} seconds "
            f"(attempt {self.reconnect_attempts})..."
        )
        
        await asyncio.sleep(delay)
        
        # Attempt reconnection
        success = await self.connect()
        
        if success:
            logger.info(f"✅ Reconnection successful after {self.reconnect_attempts} attempts")
            self.reconnect_attempts = 0
        else:
            logger.error(f"❌ Reconnection attempt {self.reconnect_attempts} failed")
    
    def _parse_message(self, raw_message: str) -> Optional[TradeMessage]:
        """
        Parse raw WebSocket message
        
        Args:
            raw_message: Raw JSON string from WebSocket
            
        Returns:
            TradeMessage object or None if parsing fails
        """
        try:
            data = json.loads(raw_message)
            
            # Handle combined stream format
            if 'stream' in data and 'data' in data:
                data = data['data']
            
            # Validate message type
            if data.get('e') != 'trade':
                logger.debug(f"Ignoring non-trade message: {data.get('e')}")
                return None
            
            # Parse trade message
            trade = TradeMessage(data)
            return trade
            
        except KeyError as e:
            logger.error(f"Missing required field in trade message: {e}")
            logger.debug(f"Raw message: {raw_message}")
            return None
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON message: {e}")
            return None
            
        except Exception as e:
            logger.error(f"Unexpected error parsing message: {e}")
            return None
    
    async def _handle_message(self, message: str) -> None:
        """
        Handle incoming WebSocket message
        
        Args:
            message: Raw message string from WebSocket
        """
        try:
            self.messages_received += 1
            self.last_message_time = datetime.now()
            
            # Parse message
            trade = self._parse_message(message)
            
            if trade is None:
                return
            
            self.messages_processed += 1
            
            # Log trade (throttled - every 100 messages)
            if self.messages_processed % 100 == 0:
                logger.info(
                    f"📊 Processed {self.messages_processed} trades "
                    f"(Latest: {trade.symbol} @ ${trade.price:.2f})"
                )
            
            # Call user-defined callback
            if self.on_trade_callback:
                try:
                    if asyncio.iscoroutinefunction(self.on_trade_callback):
                        await self.on_trade_callback(trade)
                    else:
                        self.on_trade_callback(trade)
                except Exception as e:
                    logger.error(f"Error in trade callback: {e}")
                    
        except Exception as e:
            self.errors_count += 1
            logger.error(f"Error handling message: {e}")
    
    async def _receive_messages(self) -> None:
        """
        Main loop for receiving and processing WebSocket messages
        """
        while self.is_running:
            try:
                if self.state != ConnectionState.CONNECTED or not self.websocket:
                    await self._reconnect()
                    continue
                
                # Receive message with timeout
                try:
                    message = await asyncio.wait_for(
                        self.websocket.recv(),
                        timeout=30.0
                    )
                    await self._handle_message(message)
                    
                except asyncio.TimeoutError:
                    logger.warning("No message received for 30 seconds, checking connection...")
                    # Send ping to check connection
                    try:
                        pong = await self.websocket.ping()
                        await asyncio.wait_for(pong, timeout=5.0)
                        logger.info("Connection still alive (ping successful)")
                    except Exception:
                        logger.error("Ping failed, connection lost")
                        await self._reconnect()
                
            except ConnectionClosed as e:
                logger.warning(f"WebSocket connection closed: {e}")
                self.state = ConnectionState.DISCONNECTED
                if self.is_running:
                    await self._reconnect()
                else:
                    break
                    
            except WebSocketException as e:
                logger.error(f"WebSocket error: {e}")
                self.state = ConnectionState.DISCONNECTED
                if self.is_running:
                    await self._reconnect()
                else:
                    break
                    
            except Exception as e:
                logger.error(f"Unexpected error in receive loop: {e}")
                self.errors_count += 1
                await asyncio.sleep(1)
    
    async def start(self) -> None:
        """
        Start the WebSocket client and begin receiving messages
        """
        if self.is_running:
            logger.warning("WebSocket client already running")
            return
        
        self.is_running = True
        logger.info("🚀 Starting Binance WebSocket client...")
        
        # Connect to WebSocket
        success = await self.connect()
        
        if not success:
            logger.error("Failed to establish initial connection")
            self.is_running = False
            return
        
        # Start message receiving task
        self._receive_task = asyncio.create_task(self._receive_messages())
        
        logger.info("✅ Binance WebSocket client started successfully")
    
    async def stop(self) -> None:
        """
        Stop the WebSocket client and cleanup resources
        """
        if not self.is_running:
            logger.warning("WebSocket client not running")
            return
        
        logger.info("🛑 Stopping Binance WebSocket client...")
        self.is_running = False
        
        # Cancel receive task
        if self._receive_task and not self._receive_task.done():
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
        
        # Disconnect WebSocket
        await self.disconnect()
        
        # Log statistics
        logger.info(
            f"📊 Session statistics: "
            f"Received: {self.messages_received}, "
            f"Processed: {self.messages_processed}, "
            f"Errors: {self.errors_count}"
        )
        
        logger.info("✅ Binance WebSocket client stopped")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get client statistics
        
        Returns:
            Dictionary with client statistics
        """
        return {
            'state': self.state.value,
            'symbols': self.symbols,
            'messages_received': self.messages_received,
            'messages_processed': self.messages_processed,
            'errors_count': self.errors_count,
            'last_message_time': self.last_message_time.isoformat() if self.last_message_time else None,
            'reconnect_attempts': self.reconnect_attempts,
            'is_running': self.is_running
        }


# Example usage and testing
async def example_callback(trade: TradeMessage):
    """Example callback function for trade messages"""
    print(f"📈 {trade.symbol}: ${trade.price:.2f} x {trade.quantity:.6f} BTC")


async def main():
    """Example usage of BinanceWebSocketClient"""
    
    # Create client with callback
    client = BinanceWebSocketClient(
        symbols=['BTCUSDT', 'ETHUSDT'],
        on_trade_callback=example_callback,
        reconnect_delay=5.0,
        max_reconnect_delay=60.0
    )
    
    try:
        # Start client
        await client.start()
        
        # Run for 60 seconds
        logger.info("Running for 60 seconds...")
        await asyncio.sleep(60)
        
        # Print statistics
        stats = client.get_stats()
        logger.info(f"Client stats: {json.dumps(stats, indent=2)}")
        
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
        
    finally:
        # Stop client
        await client.stop()


if __name__ == "__main__":
    # Run example
    asyncio.run(main())
