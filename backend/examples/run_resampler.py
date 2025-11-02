#!/usr/bin/env python3
"""
Example: Running ResamplerService with Data Ingestion

This script demonstrates how to run the data ingestion service and
resampler together to collect real-time tick data and convert it to candles.

Usage:
    python examples/run_resampler.py --duration 300  # Run for 5 minutes
"""
import asyncio
import argparse
import logging
import sys
from datetime import datetime

sys.path.insert(0, '/workspaces/QuantiFy/backend')

from ingestion import BinanceWebSocketClient, DataIngestionService
from resampling import ResamplerService


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def run_services(duration_seconds: int = 300, 
                      symbols: list = None,
                      timeframes: list = None):
    """
    Run data ingestion and resampling services together.
    
    Args:
        duration_seconds: How long to run (seconds)
        symbols: List of trading pairs (default: ["BTCUSDT", "ETHUSDT"])
        timeframes: List of timeframes (default: ["1s", "1m", "5m"])
    """
    if symbols is None:
        symbols = ["BTCUSDT", "ETHUSDT"]
    if timeframes is None:
        timeframes = ["1s", "1m", "5m"]
    
    logger.info("=" * 70)
    logger.info("STARTING QUANTIFY DATA PIPELINE")
    logger.info("=" * 70)
    logger.info(f"Duration: {duration_seconds} seconds")
    logger.info(f"Symbols: {', '.join(symbols)}")
    logger.info(f"Timeframes: {', '.join(timeframes)}")
    logger.info("")
    
    # Initialize services
    logger.info("Initializing services...")
    
    # Data Ingestion (Binance WebSocket → raw_ticks)
    websocket_client = BinanceWebSocketClient(symbols=symbols)
    ingestion_service = DataIngestionService(
        websocket_client=websocket_client,
        batch_size=50,
        flush_interval=5.0
    )
    
    # Resampler (raw_ticks → resampled_data OHLCV)
    resampler_service = ResamplerService(
        symbols=symbols,
        timeframes=timeframes,
        interval_seconds=10
    )
    
    try:
        # Start both services
        logger.info("Starting data ingestion service...")
        await ingestion_service.start()
        
        logger.info("Starting resampler service...")
        await resampler_service.start()
        
        logger.info("")
        logger.info("✅ Both services running!")
        logger.info(f"   Data ingestion: Collecting ticks from Binance")
        logger.info(f"   Resampler: Generating OHLCV candles every 10s")
        logger.info("")
        
        # Monitor progress
        start_time = datetime.now()
        while (datetime.now() - start_time).total_seconds() < duration_seconds:
            await asyncio.sleep(30)  # Status update every 30 seconds
            
            ingestion_stats = ingestion_service.get_statistics()
            resampler_stats = resampler_service.get_statistics()
            
            elapsed = (datetime.now() - start_time).total_seconds()
            remaining = duration_seconds - elapsed
            
            logger.info(f"--- Status Update (Elapsed: {elapsed:.0f}s, Remaining: {remaining:.0f}s) ---")
            logger.info(f"Ingestion: {ingestion_stats['total_ticks_received']} ticks received, "
                       f"{ingestion_stats['total_ticks_saved']} saved")
            logger.info(f"Resampler: {resampler_stats['total_runs']} runs, "
                       f"{resampler_stats['total_candles_created']} candles created")
            logger.info("")
        
        logger.info("")
        logger.info("=" * 70)
        logger.info("FINAL STATISTICS")
        logger.info("=" * 70)
        
        # Final statistics
        ingestion_stats = ingestion_service.get_statistics()
        resampler_stats = resampler_service.get_statistics()
        
        logger.info("")
        logger.info("DATA INGESTION:")
        logger.info(f"  Total ticks received: {ingestion_stats['total_ticks_received']}")
        logger.info(f"  Total ticks saved: {ingestion_stats['total_ticks_saved']}")
        logger.info(f"  Total batches flushed: {ingestion_stats['total_batches_flushed']}")
        logger.info(f"  Errors: {ingestion_stats['errors']}")
        
        logger.info("")
        logger.info("RESAMPLER:")
        logger.info(f"  Total runs: {resampler_stats['total_runs']}")
        logger.info(f"  Total candles created: {resampler_stats['total_candles_created']}")
        logger.info(f"  Total ticks processed: {resampler_stats['total_ticks_processed']}")
        logger.info(f"  Errors: {resampler_stats['errors']}")
        logger.info(f"  Last run duration: {resampler_stats['last_run_duration']:.3f}s")
        
        logger.info("")
        logger.info("=" * 70)
        
    except KeyboardInterrupt:
        logger.info("")
        logger.info("⚠️  Interrupted by user")
    
    except Exception as e:
        logger.error(f"❌ Error during execution: {e}", exc_info=True)
    
    finally:
        # Cleanup
        logger.info("")
        logger.info("Stopping services...")
        
        await ingestion_service.stop()
        logger.info("✅ Data ingestion stopped")
        
        await resampler_service.stop()
        logger.info("✅ Resampler stopped")
        
        logger.info("")
        logger.info("✅ Shutdown complete")


def main():
    parser = argparse.ArgumentParser(
        description="Run data ingestion and resampling services"
    )
    parser.add_argument(
        '--duration',
        type=int,
        default=300,
        help='Duration to run in seconds (default: 300 = 5 minutes)'
    )
    parser.add_argument(
        '--symbols',
        nargs='+',
        default=['BTCUSDT', 'ETHUSDT'],
        help='Trading pairs to monitor (default: BTCUSDT ETHUSDT)'
    )
    parser.add_argument(
        '--timeframes',
        nargs='+',
        default=['1s', '1m', '5m'],
        help='Timeframes to generate (default: 1s 1m 5m)'
    )
    
    args = parser.parse_args()
    
    # Run async services
    asyncio.run(run_services(
        duration_seconds=args.duration,
        symbols=args.symbols,
        timeframes=args.timeframes
    ))


if __name__ == "__main__":
    main()
