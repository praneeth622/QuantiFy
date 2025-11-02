"""
Database initialization and migration utilities
"""

import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy import text
from typing import List, Dict, Any

from database.connection import database_manager
from database.models import (
    RawTicks, ResampledData, AnalyticsResults, 
    Alerts, AlertHistory, MarketMetadata, SystemMetrics
)

logger = logging.getLogger(__name__)


class DatabaseInitializer:
    """Initialize database with sample data and optimizations"""
    
    async def initialize_database(self):
        """Complete database initialization"""
        logger.info("Starting database initialization...")
        
        try:
            # Initialize connection
            await database_manager.initialize()
            
            # Create indexes
            await self._create_additional_indexes()
            
            # Insert sample market metadata
            await self._insert_sample_metadata()
            
            # Optimize database
            await database_manager.optimize_database()
            
            logger.info("Database initialization completed successfully")
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            raise
    
    async def _create_additional_indexes(self):
        """Create additional performance indexes"""
        indexes = [
            # Raw ticks indexes for analytics queries
            "CREATE INDEX IF NOT EXISTS idx_raw_ticks_price_range ON raw_ticks(symbol, timestamp, price)",
            "CREATE INDEX IF NOT EXISTS idx_raw_ticks_volume ON raw_ticks(symbol, quantity DESC)",
            
            # Resampled data indexes for chart queries
            "CREATE INDEX IF NOT EXISTS idx_resampled_ohlc ON resampled_data(symbol, timeframe, timestamp, close)",
            "CREATE INDEX IF NOT EXISTS idx_resampled_volume ON resampled_data(symbol, timeframe, volume DESC)",
            
            # Analytics results for real-time monitoring
            "CREATE INDEX IF NOT EXISTS idx_analytics_latest ON analytics_results(symbol_pair, timestamp DESC, z_score)",
            "CREATE INDEX IF NOT EXISTS idx_analytics_alerts ON analytics_results(z_score, timestamp) WHERE ABS(z_score) > 2",
            
            # Alert system performance
            "CREATE INDEX IF NOT EXISTS idx_alerts_monitoring ON alerts(is_active, alert_type, symbol, threshold)",
            "CREATE INDEX IF NOT EXISTS idx_alert_history_analysis ON alert_history(symbol, triggered_at DESC, actual_value)",
        ]
        
        async for session in database_manager.get_session():
            for index_sql in indexes:
                try:
                    await session.execute(text(index_sql))
                    logger.info(f"Created index: {index_sql.split('idx_')[1].split(' ')[0] if 'idx_' in index_sql else 'custom'}")
                except Exception as e:
                    logger.warning(f"Index creation failed (may already exist): {e}")
            
            await session.commit()
            break
    
    async def _insert_sample_metadata(self):
        """Insert sample market metadata for popular crypto pairs"""
        sample_symbols = [
            {
                "symbol": "BTCUSDT",
                "base_asset": "BTC",
                "quote_asset": "USDT",
                "tick_size": 0.01,
                "lot_size": 0.00001,
                "min_quantity": 0.00001,
                "max_quantity": 9000.0
            },
            {
                "symbol": "ETHUSDT", 
                "base_asset": "ETH",
                "quote_asset": "USDT",
                "tick_size": 0.01,
                "lot_size": 0.0001,
                "min_quantity": 0.0001,
                "max_quantity": 9000.0
            },
            {
                "symbol": "ADAUSDT",
                "base_asset": "ADA",
                "quote_asset": "USDT", 
                "tick_size": 0.0001,
                "lot_size": 0.1,
                "min_quantity": 0.1,
                "max_quantity": 90000000.0
            },
            {
                "symbol": "SOLUSDT",
                "base_asset": "SOL",
                "quote_asset": "USDT",
                "tick_size": 0.001,
                "lot_size": 0.001,
                "min_quantity": 0.001,
                "max_quantity": 90000.0
            },
            {
                "symbol": "DOTUSDT",
                "base_asset": "DOT", 
                "quote_asset": "USDT",
                "tick_size": 0.001,
                "lot_size": 0.01,
                "min_quantity": 0.01,
                "max_quantity": 90000.0
            }
        ]
        
        async for session in database_manager.get_session():
            for symbol_data in sample_symbols:
                # Check if symbol already exists
                existing = await session.execute(
                    text("SELECT id FROM market_metadata WHERE symbol = :symbol"),
                    {"symbol": symbol_data["symbol"]}
                )
                
                if not existing.fetchone():
                    metadata = MarketMetadata(**symbol_data)
                    session.add(metadata)
                    logger.info(f"Added metadata for {symbol_data['symbol']}")
            
            await session.commit()
            break
    
    async def create_sample_alerts(self):
        """Create sample alert configurations"""
        sample_alerts = [
            {
                "symbol": "BTCUSDT",
                "condition": "price_gt",
                "threshold": 100000.0,
                "alert_type": "price",
                "severity": "high",
                "message": "BTC price exceeded $100,000"
            },
            {
                "symbol": "BTCUSDT-ETHUSDT", 
                "condition": "z_score_gt",
                "threshold": 2.0,
                "alert_type": "z_score",
                "severity": "medium",
                "message": "BTC/ETH spread Z-score exceeded 2.0"
            },
            {
                "symbol": "ETHUSDT",
                "condition": "volatility_gt",
                "threshold": 0.05,
                "alert_type": "volatility", 
                "severity": "medium",
                "message": "ETH volatility exceeded 5%"
            }
        ]
        
        async for session in database_manager.get_session():
            for alert_data in sample_alerts:
                alert = Alerts(**alert_data)
                session.add(alert)
                logger.info(f"Created sample alert for {alert_data['symbol']}")
            
            await session.commit()
            break
    
    async def generate_sample_data(self, days_back: int = 7):
        """Generate sample tick data for testing"""
        import random
        from decimal import Decimal
        
        symbols = ["BTCUSDT", "ETHUSDT", "ADAUSDT", "SOLUSDT", "DOTUSDT"]
        base_prices = {
            "BTCUSDT": 95000.0,
            "ETHUSDT": 3200.0,
            "ADAUSDT": 0.85,
            "SOLUSDT": 180.0,
            "DOTUSDT": 7.5
        }
        
        async for session in database_manager.get_session():
            start_time = datetime.utcnow() - timedelta(days=days_back)
            
            for symbol in symbols:
                base_price = base_prices[symbol]
                current_price = base_price
                
                # Generate hourly data points
                for hour in range(days_back * 24):
                    timestamp = start_time + timedelta(hours=hour)
                    
                    # Random walk price
                    price_change = random.gauss(0, base_price * 0.001)  # 0.1% volatility
                    current_price = max(current_price + price_change, base_price * 0.5)
                    
                    # Generate multiple ticks per hour
                    for minute in range(0, 60, 5):  # Every 5 minutes
                        tick_time = timestamp + timedelta(minutes=minute)
                        tick_price = current_price * (1 + random.gauss(0, 0.0001))
                        quantity = random.uniform(0.1, 10.0)
                        
                        tick = RawTicks(
                            timestamp=tick_time,
                            symbol=symbol,
                            price=Decimal(str(round(tick_price, 8))),
                            quantity=Decimal(str(round(quantity, 8)))
                        )
                        session.add(tick)
                
                logger.info(f"Generated sample data for {symbol}")
            
            await session.commit()
            break
    
    async def cleanup_old_data(self, days_to_keep: int = 30):
        """Clean up old data to maintain database performance"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        cleanup_queries = [
            f"DELETE FROM raw_ticks WHERE timestamp < '{cutoff_date}'",
            f"DELETE FROM alert_history WHERE triggered_at < '{cutoff_date}'",
            f"DELETE FROM system_metrics WHERE timestamp < '{cutoff_date}'"
        ]
        
        async for session in database_manager.get_session():
            for query in cleanup_queries:
                result = await session.execute(text(query))
                logger.info(f"Cleaned up {result.rowcount} old records from {query.split()[2]}")
            
            await session.commit()
            break
    
    async def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics and table sizes"""
        stats = {}
        
        tables = [
            "raw_ticks", "resampled_data", "analytics_results",
            "alerts", "alert_history", "market_metadata", "system_metrics"
        ]
        
        async for session in database_manager.get_session():
            for table in tables:
                try:
                    # Get row count
                    count_result = await session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    row_count = count_result.scalar()
                    
                    # Get latest timestamp if applicable
                    if table in ["raw_ticks", "resampled_data", "analytics_results", "alert_history"]:
                        latest_result = await session.execute(
                            text(f"SELECT MAX(timestamp) FROM {table}")
                        )
                        latest_timestamp = latest_result.scalar()
                    else:
                        latest_timestamp = None
                    
                    stats[table] = {
                        "row_count": row_count,
                        "latest_timestamp": latest_timestamp
                    }
                    
                except Exception as e:
                    stats[table] = {"error": str(e)}
            
            break
        
        return stats


# Global initializer instance
db_initializer = DatabaseInitializer()


# CLI functions for database management
async def init_database():
    """Initialize database (CLI function)"""
    await db_initializer.initialize_database()


async def create_sample_data():
    """Create sample data (CLI function)"""
    await db_initializer.generate_sample_data()


async def show_database_stats():
    """Show database statistics (CLI function)"""
    stats = await db_initializer.get_database_stats()
    print("\nDatabase Statistics:")
    print("=" * 50)
    for table, data in stats.items():
        if "error" in data:
            print(f"{table}: ERROR - {data['error']}")
        else:
            print(f"{table}: {data['row_count']} rows")
            if data.get('latest_timestamp'):
                print(f"  Latest: {data['latest_timestamp']}")
    print("=" * 50)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "init":
            asyncio.run(init_database())
        elif command == "sample":
            asyncio.run(create_sample_data())
        elif command == "stats":
            asyncio.run(show_database_stats())
        else:
            print("Usage: python database_init.py [init|sample|stats]")
    else:
        print("Usage: python database_init.py [init|sample|stats]")