"""
Database Query Helpers for Fast Analytics
Optimized queries for time-series data and analytics
"""

import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy import text, select, and_, or_, desc, asc, func
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal

from database.connection import database_manager
from database.models import RawTicks, ResampledData, AnalyticsResults, MarketMetadata


class DatabaseQueryHelper:
    """Fast database queries for analytics and trading data"""
    
    async def get_latest_prices(self, symbols: List[str]) -> Dict[str, Decimal]:
        """Get latest prices for multiple symbols efficiently"""
        async for session in database_manager.get_session():
            # Use subquery to get latest timestamp per symbol
            latest_query = text("""
                SELECT t1.symbol, t1.price
                FROM raw_ticks t1
                INNER JOIN (
                    SELECT symbol, MAX(timestamp) as max_timestamp
                    FROM raw_ticks 
                    WHERE symbol IN :symbols
                    GROUP BY symbol
                ) t2 ON t1.symbol = t2.symbol AND t1.timestamp = t2.max_timestamp
            """)
            
            result = await session.execute(latest_query, {"symbols": tuple(symbols)})
            return {row[0]: row[1] for row in result.fetchall()}
    
    async def get_price_series(
        self,
        symbol: str,
        start_time: datetime,
        end_time: datetime,
        limit: int = 1000
    ) -> List[Tuple[datetime, Decimal]]:
        """Get price time series for a symbol"""
        async for session in database_manager.get_session():
            query = select(RawTicks.timestamp, RawTicks.price).where(
                and_(
                    RawTicks.symbol == symbol,
                    RawTicks.timestamp >= start_time,
                    RawTicks.timestamp <= end_time
                )
            ).order_by(RawTicks.timestamp).limit(limit)
            
            result = await session.execute(query)
            return [(row[0], row[1]) for row in result.fetchall()]
    
    async def get_ohlcv_data(
        self,
        symbol: str,
        timeframe: str,
        start_time: datetime,
        end_time: datetime,
        limit: int = 500
    ) -> List[Dict[str, Any]]:
        """Get OHLCV candle data"""
        async for session in database_manager.get_session():
            query = select(ResampledData).where(
                and_(
                    ResampledData.symbol == symbol,
                    ResampledData.timeframe == timeframe,
                    ResampledData.timestamp >= start_time,
                    ResampledData.timestamp <= end_time
                )
            ).order_by(ResampledData.timestamp).limit(limit)
            
            result = await session.execute(query)
            candles = result.scalars().all()
            
            return [
                {
                    "timestamp": candle.timestamp,
                    "open": float(candle.open),
                    "high": float(candle.high),
                    "low": float(candle.low),
                    "close": float(candle.close),
                    "volume": float(candle.volume),
                    "trade_count": candle.trade_count
                }
                for candle in candles
            ]
    
    async def resample_ticks_to_candles(
        self,
        symbol: str,
        timeframe: str,
        start_time: datetime,
        end_time: datetime
    ) -> List[Dict[str, Any]]:
        """Resample raw ticks into OHLCV candles on-the-fly"""
        timeframe_seconds = self._timeframe_to_seconds(timeframe)
        
        async for session in database_manager.get_session():
            # SQLite-compatible query for OHLCV aggregation
            query = text("""
                SELECT 
                    symbol,
                    datetime(
                        (strftime('%s', timestamp) / :interval) * :interval, 
                        'unixepoch'
                    ) as candle_time,
                    (SELECT price FROM raw_ticks t2 
                     WHERE t2.symbol = t1.symbol 
                     AND datetime((strftime('%s', t2.timestamp) / :interval) * :interval, 'unixepoch') = 
                         datetime((strftime('%s', t1.timestamp) / :interval) * :interval, 'unixepoch')
                     ORDER BY t2.timestamp ASC LIMIT 1) as open_price,
                    MAX(price) as high_price,
                    MIN(price) as low_price,
                    (SELECT price FROM raw_ticks t3 
                     WHERE t3.symbol = t1.symbol 
                     AND datetime((strftime('%s', t3.timestamp) / :interval) * :interval, 'unixepoch') = 
                         datetime((strftime('%s', t1.timestamp) / :interval) * :interval, 'unixepoch')
                     ORDER BY t3.timestamp DESC LIMIT 1) as close_price,
                    SUM(quantity) as volume,
                    COUNT(*) as trade_count
                FROM raw_ticks t1
                WHERE symbol = :symbol 
                AND timestamp >= :start_time 
                AND timestamp <= :end_time
                GROUP BY symbol, candle_time
                ORDER BY candle_time
            """)
            
            result = await session.execute(query, {
                "symbol": symbol,
                "start_time": start_time,
                "end_time": end_time,
                "interval": timeframe_seconds
            })
            
            return [
                {
                    "timestamp": datetime.fromisoformat(row[1]),
                    "open": float(row[2]),
                    "high": float(row[3]),
                    "low": float(row[4]),
                    "close": float(row[5]),
                    "volume": float(row[6]),
                    "trade_count": row[7]
                }
                for row in result.fetchall()
            ]
    
    async def get_correlation_data(
        self,
        symbol1: str,
        symbol2: str,
        lookback_hours: int = 24
    ) -> Dict[str, List[float]]:
        """Get aligned price data for correlation calculation"""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=lookback_hours)
        
        async for session in database_manager.get_session():
            # Get aligned data using time buckets
            query = text("""
                SELECT 
                    datetime((strftime('%s', timestamp) / 300) * 300, 'unixepoch') as time_bucket,
                    symbol,
                    AVG(price) as avg_price
                FROM raw_ticks
                WHERE symbol IN (:symbol1, :symbol2)
                AND timestamp >= :start_time
                AND timestamp <= :end_time
                GROUP BY time_bucket, symbol
                ORDER BY time_bucket
            """)
            
            result = await session.execute(query, {
                "symbol1": symbol1,
                "symbol2": symbol2,
                "start_time": start_time,
                "end_time": end_time
            })
            
            # Organize data by symbol
            data = {"timestamp": [], symbol1: [], symbol2: []}
            current_bucket = None
            bucket_data = {}
            
            for row in result.fetchall():
                time_bucket, symbol, avg_price = row
                
                if current_bucket != time_bucket:
                    # Process previous bucket
                    if current_bucket and symbol1 in bucket_data and symbol2 in bucket_data:
                        data["timestamp"].append(datetime.fromisoformat(current_bucket))
                        data[symbol1].append(float(bucket_data[symbol1]))
                        data[symbol2].append(float(bucket_data[symbol2]))
                    
                    current_bucket = time_bucket
                    bucket_data = {}
                
                bucket_data[symbol] = avg_price
            
            # Process last bucket
            if current_bucket and symbol1 in bucket_data and symbol2 in bucket_data:
                data["timestamp"].append(datetime.fromisoformat(current_bucket))
                data[symbol1].append(float(bucket_data[symbol1]))
                data[symbol2].append(float(bucket_data[symbol2]))
            
            return data
    
    async def get_latest_analytics(
        self,
        symbol_pair: str,
        metrics: List[str] = None
    ) -> Dict[str, Any]:
        """Get latest analytics results for a symbol pair"""
        if metrics is None:
            metrics = ["hedge_ratio", "spread", "z_score", "correlation"]
        
        async for session in database_manager.get_session():
            query = select(AnalyticsResults).where(
                AnalyticsResults.symbol_pair == symbol_pair
            ).order_by(desc(AnalyticsResults.timestamp)).limit(1)
            
            result = await session.execute(query)
            latest = result.scalar_one_or_none()
            
            if not latest:
                return {}
            
            return {
                "timestamp": latest.timestamp,
                "hedge_ratio": float(latest.hedge_ratio) if latest.hedge_ratio else None,
                "spread": float(latest.spread) if latest.spread else None,
                "z_score": float(latest.z_score) if latest.z_score else None,
                "correlation": float(latest.correlation) if latest.correlation else None,
                "volatility_1": float(latest.volatility_1) if latest.volatility_1 else None,
                "volatility_2": float(latest.volatility_2) if latest.volatility_2 else None,
                "window_size": latest.window_size
            }
    
    async def get_z_score_history(
        self,
        symbol_pair: str,
        hours_back: int = 24,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get Z-score history for alert monitoring"""
        start_time = datetime.utcnow() - timedelta(hours=hours_back)
        
        async for session in database_manager.get_session():
            query = select(
                AnalyticsResults.timestamp,
                AnalyticsResults.z_score,
                AnalyticsResults.spread,
                AnalyticsResults.hedge_ratio
            ).where(
                and_(
                    AnalyticsResults.symbol_pair == symbol_pair,
                    AnalyticsResults.timestamp >= start_time,
                    AnalyticsResults.z_score.isnot(None)
                )
            ).order_by(desc(AnalyticsResults.timestamp)).limit(limit)
            
            result = await session.execute(query)
            
            return [
                {
                    "timestamp": row[0],
                    "z_score": float(row[1]),
                    "spread": float(row[2]) if row[2] else None,
                    "hedge_ratio": float(row[3]) if row[3] else None
                }
                for row in result.fetchall()
            ]
    
    async def get_volume_profile(
        self,
        symbol: str,
        start_time: datetime,
        end_time: datetime,
        price_buckets: int = 20
    ) -> List[Dict[str, Any]]:
        """Get volume profile data for price levels"""
        async for session in database_manager.get_session():
            # Get price range
            price_range_query = select(
                func.min(RawTicks.price),
                func.max(RawTicks.price)
            ).where(
                and_(
                    RawTicks.symbol == symbol,
                    RawTicks.timestamp >= start_time,
                    RawTicks.timestamp <= end_time
                )
            )
            
            result = await session.execute(price_range_query)
            min_price, max_price = result.fetchone()
            
            if not min_price or not max_price:
                return []
            
            # Calculate bucket size
            bucket_size = (float(max_price) - float(min_price)) / price_buckets
            
            # Volume profile query
            volume_query = text("""
                SELECT 
                    CAST((price - :min_price) / :bucket_size AS INTEGER) as price_bucket,
                    :min_price + (CAST((price - :min_price) / :bucket_size AS INTEGER) * :bucket_size) as bucket_price,
                    SUM(quantity) as total_volume,
                    COUNT(*) as trade_count
                FROM raw_ticks
                WHERE symbol = :symbol
                AND timestamp >= :start_time
                AND timestamp <= :end_time
                GROUP BY price_bucket
                ORDER BY bucket_price
            """)
            
            result = await session.execute(volume_query, {
                "symbol": symbol,
                "start_time": start_time,
                "end_time": end_time,
                "min_price": float(min_price),
                "bucket_size": bucket_size
            })
            
            return [
                {
                    "price_level": float(row[1]),
                    "volume": float(row[2]),
                    "trade_count": row[3]
                }
                for row in result.fetchall()
            ]
    
    async def get_market_summary(self) -> Dict[str, Any]:
        """Get market summary statistics"""
        async for session in database_manager.get_session():
            # Get active symbols
            symbols_query = select(MarketMetadata.symbol).where(
                MarketMetadata.is_active == True
            )
            result = await session.execute(symbols_query)
            active_symbols = [row[0] for row in result.fetchall()]
            
            # Get latest prices and 24h stats
            summary = {
                "active_symbols": len(active_symbols),
                "symbols": {}
            }
            
            for symbol in active_symbols:
                # Latest price
                latest_price_query = select(RawTicks.price, RawTicks.timestamp).where(
                    RawTicks.symbol == symbol
                ).order_by(desc(RawTicks.timestamp)).limit(1)
                
                price_result = await session.execute(latest_price_query)
                latest_data = price_result.fetchone()
                
                if latest_data:
                    # 24h statistics
                    day_ago = datetime.utcnow() - timedelta(hours=24)
                    stats_query = select(
                        func.min(RawTicks.price),
                        func.max(RawTicks.price),
                        func.sum(RawTicks.quantity)
                    ).where(
                        and_(
                            RawTicks.symbol == symbol,
                            RawTicks.timestamp >= day_ago
                        )
                    )
                    
                    stats_result = await session.execute(stats_query)
                    min_price, max_price, volume_24h = stats_result.fetchone()
                    
                    summary["symbols"][symbol] = {
                        "latest_price": float(latest_data[0]),
                        "latest_timestamp": latest_data[1],
                        "24h_low": float(min_price) if min_price else None,
                        "24h_high": float(max_price) if max_price else None,
                        "24h_volume": float(volume_24h) if volume_24h else 0
                    }
            
            return summary
    
    def _timeframe_to_seconds(self, timeframe: str) -> int:
        """Convert timeframe string to seconds"""
        timeframe_map = {
            "1s": 1,
            "5s": 5,
            "10s": 10,
            "30s": 30,
            "1m": 60,
            "5m": 300,
            "15m": 900,
            "30m": 1800,
            "1h": 3600,
            "4h": 14400,
            "1d": 86400
        }
        return timeframe_map.get(timeframe.lower(), 60)


# Global query helper instance
query_helper = DatabaseQueryHelper()