"""
ResamplerService - Efficient OHLCV Resampling Service
Converts raw tick data into OHLCV candlesticks using pandas resample
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import pandas as pd
from decimal import Decimal

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.models import RawTicks, ResampledData
from database.connection import database_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ResamplerService:
    """
    Service to resample raw tick data into OHLCV candlesticks
    
    Features:
    - Multiple timeframes: 1s, 1m, 5m, 15m, 1h, 4h, 1d
    - Efficient pandas DataFrame operations
    - Scheduled execution every 10 seconds
    - Incremental processing (only new data)
    - Handles multiple symbols concurrently
    """
    
    # Timeframe definitions (pandas resample rules)
    TIMEFRAMES = {
        '1s': '1S',    # 1 second
        '1m': '1T',    # 1 minute (T for minute to avoid conflict with month)
        '5m': '5T',    # 5 minutes
        '15m': '15T',  # 15 minutes
        '1h': '1H',    # 1 hour
        '4h': '4H',    # 4 hours
        '1d': '1D',    # 1 day
    }
    
    def __init__(
        self,
        symbols: List[str] = None,
        timeframes: List[str] = None,
        lookback_minutes: int = 60,
        run_interval: float = 10.0
    ):
        """
        Initialize ResamplerService
        
        Args:
            symbols: List of symbols to process (default: ['BTCUSDT', 'ETHUSDT'])
            timeframes: List of timeframes to generate (default: ['1s', '1m', '5m'])
            lookback_minutes: How far back to look for unprocessed data
            run_interval: Interval between resampling runs (seconds)
        """
        self.symbols = symbols or ['BTCUSDT', 'ETHUSDT']
        self.timeframes = timeframes or ['1s', '1m', '5m']
        self.lookback_minutes = lookback_minutes
        self.run_interval = run_interval
        
        # Validate timeframes
        for tf in self.timeframes:
            if tf not in self.TIMEFRAMES:
                raise ValueError(f"Invalid timeframe: {tf}. Valid: {list(self.TIMEFRAMES.keys())}")
        
        # State tracking
        self.is_running = False
        self.resample_task: Optional[asyncio.Task] = None
        self.last_processed_timestamp: Dict[str, Dict[str, datetime]] = {}
        
        # Statistics
        self.stats = {
            'total_runs': 0,
            'total_candles_created': 0,
            'total_ticks_processed': 0,
            'errors': 0,
            'last_run_time': None,
            'last_run_duration': 0.0
        }
        
        logger.info(f"ResamplerService initialized - Symbols: {self.symbols}, "
                   f"Timeframes: {self.timeframes}, Interval: {run_interval}s")
    
    async def start(self):
        """Start the resampling service"""
        if self.is_running:
            logger.warning("ResamplerService is already running")
            return
        
        logger.info("🚀 Starting ResamplerService...")
        
        # Initialize database connection
        await database_manager.initialize()
        logger.info("✅ Database connection initialized")
        
        self.is_running = True
        
        # Start periodic resampling task
        self.resample_task = asyncio.create_task(self._periodic_resample())
        logger.info(f"✅ ResamplerService started (interval: {self.run_interval}s)")
        logger.info(f"Processing symbols: {', '.join(self.symbols)}")
        logger.info(f"Generating timeframes: {', '.join(self.timeframes)}")
    
    async def stop(self):
        """Stop the resampling service"""
        if not self.is_running:
            return
        
        logger.info("🛑 Stopping ResamplerService...")
        self.is_running = False
        
        # Cancel periodic task
        if self.resample_task:
            self.resample_task.cancel()
            try:
                await self.resample_task
            except asyncio.CancelledError:
                pass
            logger.info("Periodic resample task cancelled")
        
        # Close database connection
        await database_manager.close()
        logger.info("✅ ResamplerService stopped")
    
    async def _periodic_resample(self):
        """Periodic task to run resampling"""
        logger.info(f"Starting periodic resampling (every {self.run_interval}s)")
        
        while self.is_running:
            try:
                start_time = datetime.now()
                
                # Run resampling for all symbols and timeframes
                await self.resample_all()
                
                # Update statistics
                duration = (datetime.now() - start_time).total_seconds()
                self.stats['last_run_time'] = start_time
                self.stats['last_run_duration'] = duration
                self.stats['total_runs'] += 1
                
                # Log summary every 10 runs
                if self.stats['total_runs'] % 10 == 0:
                    logger.info(f"📊 Stats: {self.stats['total_runs']} runs, "
                               f"{self.stats['total_candles_created']} candles created, "
                               f"avg duration: {duration:.2f}s")
                
                # Wait for next interval
                await asyncio.sleep(self.run_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in periodic resample: {e}", exc_info=True)
                self.stats['errors'] += 1
                await asyncio.sleep(self.run_interval)
    
    async def resample_all(self):
        """Resample all symbols and timeframes"""
        for symbol in self.symbols:
            for timeframe in self.timeframes:
                try:
                    await self.resample_symbol_timeframe(symbol, timeframe)
                except Exception as e:
                    logger.error(f"Error resampling {symbol} {timeframe}: {e}", exc_info=True)
                    self.stats['errors'] += 1
    
    async def resample_symbol_timeframe(self, symbol: str, timeframe: str):
        """
        Resample a specific symbol and timeframe
        
        Args:
            symbol: Trading symbol (e.g., 'BTCUSDT')
            timeframe: Timeframe to resample to (e.g., '1m')
        """
        # Determine time range to process
        end_time = datetime.now()
        start_time = end_time - timedelta(minutes=self.lookback_minutes)
        
        # Get last processed timestamp for this symbol/timeframe
        last_processed = self.last_processed_timestamp.get(symbol, {}).get(timeframe)
        if last_processed:
            start_time = last_processed
        
        # Fetch raw ticks from database
        ticks_df = await self._fetch_ticks(symbol, start_time, end_time)
        
        if ticks_df.empty:
            logger.debug(f"No new ticks for {symbol} {timeframe}")
            return
        
        logger.info(f"Processing {len(ticks_df)} ticks for {symbol} {timeframe}")
        self.stats['total_ticks_processed'] += len(ticks_df)
        
        # Resample to OHLCV
        ohlcv_df = self._resample_to_ohlcv(ticks_df, timeframe)
        
        if ohlcv_df.empty:
            logger.debug(f"No complete candles for {symbol} {timeframe}")
            return
        
        logger.info(f"Generated {len(ohlcv_df)} candles for {symbol} {timeframe}")
        
        # Save to database
        saved_count = await self._save_candles(symbol, timeframe, ohlcv_df)
        
        if saved_count > 0:
            # Update last processed timestamp
            if symbol not in self.last_processed_timestamp:
                self.last_processed_timestamp[symbol] = {}
            self.last_processed_timestamp[symbol][timeframe] = ohlcv_df.index[-1]
            
            self.stats['total_candles_created'] += saved_count
            logger.info(f"✅ Saved {saved_count} candles for {symbol} {timeframe}")
    
    async def _fetch_ticks(
        self,
        symbol: str,
        start_time: datetime,
        end_time: datetime
    ) -> pd.DataFrame:
        """
        Fetch raw ticks from database
        
        Returns:
            DataFrame with columns: timestamp, price, quantity
        """
        async for session in database_manager.get_session():
            try:
                # Query raw ticks
                query = select(RawTicks).where(
                    and_(
                        RawTicks.symbol == symbol,
                        RawTicks.timestamp >= start_time,
                        RawTicks.timestamp <= end_time
                    )
                ).order_by(RawTicks.timestamp)
                
                result = await session.execute(query)
                ticks = result.scalars().all()
                
                if not ticks:
                    return pd.DataFrame()
                
                # Convert to DataFrame
                df = pd.DataFrame([
                    {
                        'timestamp': tick.timestamp,
                        'price': float(tick.price),
                        'quantity': float(tick.quantity)
                    }
                    for tick in ticks
                ])
                
                # Set timestamp as index
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df.set_index('timestamp', inplace=True)
                df.sort_index(inplace=True)
                
                return df
                
            finally:
                await session.close()
    
    def _resample_to_ohlcv(self, ticks_df: pd.DataFrame, timeframe: str) -> pd.DataFrame:
        """
        Resample tick data to OHLCV candles using pandas
        
        Args:
            ticks_df: DataFrame with timestamp index, price and quantity columns
            timeframe: Target timeframe (e.g., '1m')
        
        Returns:
            DataFrame with OHLCV columns
        """
        if ticks_df.empty:
            return pd.DataFrame()
        
        # Get pandas resample rule
        resample_rule = self.TIMEFRAMES[timeframe]
        
        # Resample price to OHLC
        ohlc = ticks_df['price'].resample(resample_rule).agg({
            'open': 'first',
            'high': 'max',
            'low': 'min',
            'close': 'last'
        })
        
        # Resample volume (sum of quantities)
        volume = ticks_df['quantity'].resample(resample_rule).sum()
        
        # Count number of trades per candle
        trade_count = ticks_df['price'].resample(resample_rule).count()
        
        # Combine into single DataFrame
        ohlcv_df = pd.DataFrame({
            'open': ohlc['open'],
            'high': ohlc['high'],
            'low': ohlc['low'],
            'close': ohlc['close'],
            'volume': volume,
            'trade_count': trade_count
        })
        
        # Remove incomplete candles (NaN values)
        ohlcv_df = ohlcv_df.dropna()
        
        # Remove the current incomplete candle (last row)
        if len(ohlcv_df) > 0:
            ohlcv_df = ohlcv_df.iloc[:-1]
        
        return ohlcv_df
    
    async def _save_candles(
        self,
        symbol: str,
        timeframe: str,
        ohlcv_df: pd.DataFrame
    ) -> int:
        """
        Save OHLCV candles to database
        
        Returns:
            Number of candles saved
        """
        if ohlcv_df.empty:
            return 0
        
        saved_count = 0
        
        async for session in database_manager.get_session():
            try:
                for timestamp, row in ohlcv_df.iterrows():
                    try:
                        # Create ResampledData record
                        candle = ResampledData(
                            symbol=symbol,
                            timeframe=timeframe,
                            timestamp=timestamp,
                            open=Decimal(str(row['open'])),
                            high=Decimal(str(row['high'])),
                            low=Decimal(str(row['low'])),
                            close=Decimal(str(row['close'])),
                            volume=Decimal(str(row['volume'])),
                            trade_count=int(row['trade_count'])
                        )
                        
                        session.add(candle)
                        await session.flush()
                        saved_count += 1
                        
                    except IntegrityError:
                        # Duplicate candle (already exists)
                        await session.rollback()
                        logger.debug(f"Candle already exists: {symbol} {timeframe} {timestamp}")
                        continue
                
                # Commit all successful inserts
                await session.commit()
                return saved_count
                
            except Exception as e:
                await session.rollback()
                logger.error(f"Error saving candles: {e}", exc_info=True)
                raise
            finally:
                await session.close()
    
    def get_statistics(self) -> Dict:
        """Get current service statistics"""
        return {
            **self.stats,
            'is_running': self.is_running,
            'symbols': self.symbols,
            'timeframes': self.timeframes,
            'run_interval': self.run_interval,
            'lookback_minutes': self.lookback_minutes
        }


async def main():
    """Test/Demo the ResamplerService"""
    # Create service
    service = ResamplerService(
        symbols=['BTCUSDT', 'ETHUSDT'],
        timeframes=['1s', '1m', '5m'],
        lookback_minutes=10,
        run_interval=10.0
    )
    
    try:
        # Start service
        await service.start()
        
        # Run for 60 seconds (6 cycles)
        logger.info("Running ResamplerService for 60 seconds...")
        await asyncio.sleep(60)
        
        # Print statistics
        stats = service.get_statistics()
        logger.info("=" * 60)
        logger.info("RESAMPLING STATISTICS")
        logger.info("=" * 60)
        logger.info(f"Total runs: {stats['total_runs']}")
        logger.info(f"Total candles created: {stats['total_candles_created']}")
        logger.info(f"Total ticks processed: {stats['total_ticks_processed']}")
        logger.info(f"Errors: {stats['errors']}")
        logger.info(f"Last run: {stats['last_run_time']}")
        logger.info(f"Last run duration: {stats['last_run_duration']:.2f}s")
        logger.info("=" * 60)
        
    finally:
        await service.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\n⚠️  Interrupted by user")
