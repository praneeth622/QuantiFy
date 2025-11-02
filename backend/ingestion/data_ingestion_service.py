"""
Data Ingestion Service for Real-time Tick Data
Handles batched insertion of trade data from Binance WebSocket to SQLite
"""

import asyncio
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from collections import deque

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import select

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.models import RawTicks
from database.connection import database_manager
from binance_websocket_client import BinanceWebSocketClient, TradeMessage

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TickBatch:
    """Container for batched tick data"""
    
    def __init__(self):
        self.ticks: List[RawTicks] = []
        self.first_tick_time: Optional[datetime] = None
        self.last_tick_time: Optional[datetime] = None
        
    def add(self, tick: RawTicks) -> None:
        """Add a tick to the batch"""
        self.ticks.append(tick)
        if self.first_tick_time is None:
            self.first_tick_time = tick.timestamp
        self.last_tick_time = tick.timestamp
    
    def clear(self) -> None:
        """Clear the batch"""
        self.ticks.clear()
        self.first_tick_time = None
        self.last_tick_time = None
    
    def size(self) -> int:
        """Get batch size"""
        return len(self.ticks)
    
    def is_empty(self) -> bool:
        """Check if batch is empty"""
        return len(self.ticks) == 0
    
    def __repr__(self) -> str:
        return f"TickBatch(size={self.size()}, symbols={set(t.symbol for t in self.ticks)})"


class DataIngestionService:
    """
    Service for ingesting real-time trade data from Binance WebSocket
    
    Features:
    - Batched inserts for performance
    - Time-based and size-based flushing
    - Duplicate detection and handling
    - Automatic retry on errors
    - Statistics tracking
    - Background operation with asyncio
    """
    
    def __init__(
        self,
        symbols: List[str],
        batch_size: int = 100,
        flush_interval: float = 5.0,
        max_retries: int = 3,
        enable_deduplication: bool = True
    ):
        """
        Initialize Data Ingestion Service
        
        Args:
            symbols: List of symbols to subscribe (e.g., ['BTCUSDT', 'ETHUSDT'])
            batch_size: Number of ticks before auto-flush (default 100)
            flush_interval: Seconds before auto-flush (default 5.0)
            max_retries: Maximum retry attempts on insert failure (default 3)
            enable_deduplication: Enable duplicate detection (default True)
        """
        self.symbols = symbols
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.max_retries = max_retries
        self.enable_deduplication = enable_deduplication
        
        # Batch management
        self.current_batch = TickBatch()
        self.batch_lock = asyncio.Lock()
        
        # WebSocket client
        self.ws_client: Optional[BinanceWebSocketClient] = None
        
        # Background tasks
        self.flush_task: Optional[asyncio.Task] = None
        self.is_running = False
        
        # Deduplication cache (last N timestamps per symbol)
        self.seen_trades: Dict[str, deque] = {
            symbol: deque(maxlen=1000) for symbol in symbols
        }
        
        # Statistics
        self.stats = {
            'total_received': 0,
            'total_inserted': 0,
            'total_duplicates': 0,
            'total_errors': 0,
            'batches_flushed': 0,
            'last_flush_time': None,
            'last_insert_time': None,
            'symbols_processed': {symbol: 0 for symbol in symbols}
        }
        
        logger.info(
            f"DataIngestionService initialized - "
            f"Symbols: {symbols}, Batch size: {batch_size}, "
            f"Flush interval: {flush_interval}s"
        )
    
    def _is_duplicate(self, trade: TradeMessage) -> bool:
        """
        Check if trade is a duplicate
        
        Args:
            trade: Trade message to check
            
        Returns:
            True if duplicate, False otherwise
        """
        if not self.enable_deduplication:
            return False
        
        # Check if we've seen this trade_id for this symbol
        trade_key = (trade.symbol, trade.trade_id, trade.timestamp)
        
        if trade_key in self.seen_trades.get(trade.symbol, []):
            return True
        
        # Add to seen trades
        self.seen_trades[trade.symbol].append(trade_key)
        return False
    
    async def _handle_trade(self, trade: TradeMessage) -> None:
        """
        Handle incoming trade message from WebSocket
        
        Args:
            trade: Parsed trade message
        """
        try:
            self.stats['total_received'] += 1
            self.stats['symbols_processed'][trade.symbol] += 1
            
            # Check for duplicates
            if self._is_duplicate(trade):
                self.stats['total_duplicates'] += 1
                logger.debug(f"Duplicate trade detected: {trade.symbol} @ {trade.timestamp}")
                return
            
            # Create RawTicks object
            tick = RawTicks(
                timestamp=trade.timestamp,
                symbol=trade.symbol,
                price=trade.price,
                quantity=trade.quantity
            )
            
            # Add to batch (thread-safe)
            async with self.batch_lock:
                self.current_batch.add(tick)
                
                # Auto-flush if batch size reached
                if self.current_batch.size() >= self.batch_size:
                    logger.debug(f"Batch size reached ({self.batch_size}), flushing...")
                    await self._flush_batch()
                    
        except Exception as e:
            logger.error(f"Error handling trade: {e}", exc_info=True)
            self.stats['total_errors'] += 1
    
    async def _flush_batch(self) -> bool:
        """
        Flush current batch to database
        
        Returns:
            True if flush successful, False otherwise
        """
        if self.current_batch.is_empty():
            return True
        
        batch_size = self.current_batch.size()
        logger.info(f"Flushing batch of {batch_size} ticks to database...")
        
        retry_count = 0
        while retry_count < self.max_retries:
            try:
                async for session in database_manager.get_session():
                    # Bulk insert with SQLAlchemy
                    session.add_all(self.current_batch.ticks)
                    await session.commit()
                    
                    self.stats['total_inserted'] += batch_size
                    self.stats['batches_flushed'] += 1
                    self.stats['last_flush_time'] = datetime.now()
                    self.stats['last_insert_time'] = datetime.now()
                    
                    logger.info(
                        f"✅ Flushed {batch_size} ticks successfully "
                        f"(Total inserted: {self.stats['total_inserted']})"
                    )
                    
                    # Clear batch
                    async with self.batch_lock:
                        self.current_batch.clear()
                    
                    return True
                    
            except IntegrityError as e:
                logger.warning(f"Integrity error on batch insert (likely duplicates): {e}")
                # Try inserting ticks individually to skip duplicates
                success = await self._flush_batch_individually()
                if success:
                    return True
                retry_count += 1
                
            except SQLAlchemyError as e:
                logger.error(f"Database error on batch insert (attempt {retry_count + 1}): {e}")
                retry_count += 1
                if retry_count < self.max_retries:
                    await asyncio.sleep(1 * retry_count)  # Exponential backoff
                    
            except Exception as e:
                logger.error(f"Unexpected error flushing batch: {e}", exc_info=True)
                retry_count += 1
                
        # Max retries exceeded
        logger.error(f"Failed to flush batch after {self.max_retries} attempts")
        self.stats['total_errors'] += batch_size
        
        # Clear failed batch to prevent memory buildup
        async with self.batch_lock:
            self.current_batch.clear()
        
        return False
    
    async def _flush_batch_individually(self) -> bool:
        """
        Flush batch ticks individually, skipping duplicates
        
        Returns:
            True if at least some ticks were inserted
        """
        logger.info("Attempting individual tick insertion to handle duplicates...")
        
        inserted_count = 0
        duplicate_count = 0
        error_count = 0
        
        for tick in self.current_batch.ticks:
            try:
                async for session in database_manager.get_session():
                    session.add(tick)
                    await session.commit()
                    inserted_count += 1
                    break
                    
            except IntegrityError:
                duplicate_count += 1
                logger.debug(f"Skipping duplicate: {tick.symbol} @ {tick.timestamp}")
                
            except Exception as e:
                error_count += 1
                logger.error(f"Error inserting tick: {e}")
        
        self.stats['total_inserted'] += inserted_count
        self.stats['total_duplicates'] += duplicate_count
        self.stats['total_errors'] += error_count
        
        logger.info(
            f"Individual insertion complete - "
            f"Inserted: {inserted_count}, "
            f"Duplicates: {duplicate_count}, "
            f"Errors: {error_count}"
        )
        
        # Clear batch
        async with self.batch_lock:
            self.current_batch.clear()
        
        return inserted_count > 0
    
    async def _periodic_flush(self) -> None:
        """
        Periodically flush batch based on time interval
        Background task that runs continuously
        """
        logger.info(f"Starting periodic flush task (interval: {self.flush_interval}s)")
        
        while self.is_running:
            try:
                await asyncio.sleep(self.flush_interval)
                
                async with self.batch_lock:
                    if not self.current_batch.is_empty():
                        logger.debug(
                            f"Periodic flush triggered "
                            f"(batch size: {self.current_batch.size()})"
                        )
                        await self._flush_batch()
                        
            except asyncio.CancelledError:
                logger.info("Periodic flush task cancelled")
                break
                
            except Exception as e:
                logger.error(f"Error in periodic flush: {e}", exc_info=True)
    
    async def start(self) -> None:
        """
        Start the data ingestion service
        Initializes WebSocket client and background tasks
        """
        if self.is_running:
            logger.warning("DataIngestionService already running")
            return
        
        logger.info("🚀 Starting DataIngestionService...")
        self.is_running = True
        
        try:
            # Initialize database connection
            logger.info("Initializing database connection...")
            await database_manager.initialize()
            logger.info("✅ Database connection initialized")
            
            # Initialize WebSocket client with callback
            self.ws_client = BinanceWebSocketClient(
                symbols=self.symbols,
                on_trade_callback=self._handle_trade
            )
            
            # Start WebSocket client
            await self.ws_client.start()
            
            # Start periodic flush task
            self.flush_task = asyncio.create_task(self._periodic_flush())
            
            logger.info("✅ DataIngestionService started successfully")
            logger.info(f"Subscribed to symbols: {self.symbols}")
            logger.info(f"Batch configuration: size={self.batch_size}, interval={self.flush_interval}s")
            
        except Exception as e:
            logger.error(f"Failed to start DataIngestionService: {e}", exc_info=True)
            self.is_running = False
            raise
    
    async def stop(self) -> None:
        """
        Stop the data ingestion service
        Flushes remaining data and cleans up resources
        """
        if not self.is_running:
            logger.warning("DataIngestionService not running")
            return
        
        logger.info("🛑 Stopping DataIngestionService...")
        self.is_running = False
        
        try:
            # Cancel periodic flush task
            if self.flush_task and not self.flush_task.done():
                self.flush_task.cancel()
                try:
                    await self.flush_task
                except asyncio.CancelledError:
                    pass
            
            # Flush remaining data
            logger.info("Flushing remaining data...")
            async with self.batch_lock:
                if not self.current_batch.is_empty():
                    await self._flush_batch()
            
            # Stop WebSocket client
            if self.ws_client:
                await self.ws_client.stop()
            
            # Close database connection
            logger.info("Closing database connection...")
            await database_manager.close()
            
            # Log final statistics
            self._log_statistics()
            
            logger.info("✅ DataIngestionService stopped successfully")
            
        except Exception as e:
            logger.error(f"Error stopping DataIngestionService: {e}", exc_info=True)
    
    def _log_statistics(self) -> None:
        """Log service statistics"""
        logger.info("=" * 60)
        logger.info("DATA INGESTION SERVICE STATISTICS")
        logger.info("=" * 60)
        logger.info(f"Total Received:     {self.stats['total_received']:,}")
        logger.info(f"Total Inserted:     {self.stats['total_inserted']:,}")
        logger.info(f"Total Duplicates:   {self.stats['total_duplicates']:,}")
        logger.info(f"Total Errors:       {self.stats['total_errors']:,}")
        logger.info(f"Batches Flushed:    {self.stats['batches_flushed']:,}")
        logger.info(f"Insert Rate:        {self._calculate_insert_rate():.2f} ticks/sec")
        logger.info("-" * 60)
        logger.info("Per-Symbol Statistics:")
        for symbol, count in self.stats['symbols_processed'].items():
            logger.info(f"  {symbol:12s} {count:,} ticks")
        logger.info("=" * 60)
    
    def _calculate_insert_rate(self) -> float:
        """Calculate insertion rate (ticks per second)"""
        if self.stats['last_flush_time'] is None:
            return 0.0
        
        # Calculate based on total runtime
        elapsed = (datetime.now() - self.stats['last_flush_time']).total_seconds()
        if elapsed > 0:
            return self.stats['total_inserted'] / elapsed
        return 0.0
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get service statistics
        
        Returns:
            Dictionary with statistics
        """
        return {
            **self.stats,
            'batch_size': self.batch_size,
            'flush_interval': self.flush_interval,
            'is_running': self.is_running,
            'current_batch_size': self.current_batch.size(),
            'insert_rate': self._calculate_insert_rate(),
            'efficiency': (
                self.stats['total_inserted'] / self.stats['total_received'] * 100
                if self.stats['total_received'] > 0 else 0
            )
        }
    
    async def force_flush(self) -> bool:
        """
        Manually trigger a batch flush
        
        Returns:
            True if flush successful
        """
        logger.info("Manual flush requested")
        async with self.batch_lock:
            return await self._flush_batch()


# Example usage and testing
async def main():
    """Example usage of DataIngestionService"""
    
    # Configuration
    symbols = ['BTCUSDT', 'ETHUSDT']
    batch_size = 50  # Smaller for demo
    flush_interval = 10.0  # 10 seconds
    
    # Create service
    service = DataIngestionService(
        symbols=symbols,
        batch_size=batch_size,
        flush_interval=flush_interval,
        enable_deduplication=True
    )
    
    try:
        # Start service
        await service.start()
        
        # Run for 60 seconds
        logger.info("Running for 60 seconds...")
        await asyncio.sleep(60)
        
        # Get statistics
        stats = service.get_stats()
        logger.info(f"\nService Statistics:")
        logger.info(f"  Total Received: {stats['total_received']:,}")
        logger.info(f"  Total Inserted: {stats['total_inserted']:,}")
        logger.info(f"  Duplicates: {stats['total_duplicates']:,}")
        logger.info(f"  Efficiency: {stats['efficiency']:.2f}%")
        logger.info(f"  Insert Rate: {stats['insert_rate']:.2f} ticks/sec")
        
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
        
    finally:
        # Stop service
        await service.stop()


if __name__ == "__main__":
    # Run example
    asyncio.run(main())
