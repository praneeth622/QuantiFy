"""
SQLite Database Schema for QuantiFy Trading Platform
Optimized for cryptocurrency tick data and analytics storage
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, Index, Numeric, desc
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class RawTicks(Base):
    """Raw cryptocurrency tick data from exchanges"""
    __tablename__ = "raw_ticks"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    price = Column(Numeric(20, 8), nullable=False)  # High precision for crypto prices
    quantity = Column(Numeric(20, 8), nullable=False)  # Trade quantity/volume
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    __table_args__ = (
        # Composite indexes for fast time-series queries
        Index('idx_symbol_timestamp_desc', 'symbol', desc('timestamp')),
        Index('idx_timestamp_symbol', 'timestamp', 'symbol'),
        Index('idx_created_at', 'created_at'),
    )

class ResampledData(Base):
    """Resampled OHLCV data aggregated from raw ticks"""
    __tablename__ = "resampled_data"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    timeframe = Column(String(10), nullable=False, index=True)  # 1s, 1m, 5m, 15m, 1h, etc.
    open = Column(Numeric(20, 8), nullable=False)
    high = Column(Numeric(20, 8), nullable=False)
    low = Column(Numeric(20, 8), nullable=False)
    close = Column(Numeric(20, 8), nullable=False)
    volume = Column(Numeric(20, 8), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)  # Start time of the candle
    trade_count = Column(Integer, default=0)  # Number of trades in this candle
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    __table_args__ = (
        # Composite indexes for efficient time-series queries
        Index('idx_symbol_timeframe_timestamp', 'symbol', 'timeframe', desc('timestamp')),
        Index('idx_timeframe_timestamp', 'timeframe', desc('timestamp')),
        Index('idx_timestamp_desc', desc('timestamp')),
        # Unique constraint to prevent duplicate candles
        Index('idx_unique_candle', 'symbol', 'timeframe', 'timestamp', unique=True),
    )

class AnalyticsResults(Base):
    """Calculated analytics metrics for trading pairs"""
    __tablename__ = "analytics_results"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol_pair = Column(String(50), nullable=False, index=True)  # e.g., "BTCUSDT-ETHUSDT"
    hedge_ratio = Column(Numeric(10, 6))  # OLS regression coefficient
    spread = Column(Numeric(20, 8))  # Price spread (symbol1 - hedge_ratio * symbol2)
    z_score = Column(Numeric(10, 4))  # Z-score of the spread
    correlation = Column(Numeric(6, 4))  # Pearson correlation coefficient
    timestamp = Column(DateTime, nullable=False, index=True)
    window_size = Column(Integer, nullable=False)  # Lookback window in seconds
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Additional analytics fields
    volatility_1 = Column(Numeric(10, 6))  # Volatility of first symbol
    volatility_2 = Column(Numeric(10, 6))  # Volatility of second symbol
    cointegration_pvalue = Column(Numeric(6, 4))  # ADF test p-value
    half_life = Column(Numeric(10, 2))  # Mean reversion half-life in hours
    
    __table_args__ = (
        # Composite indexes for analytics queries
        Index('idx_pair_timestamp_desc', 'symbol_pair', desc('timestamp')),
        Index('idx_timestamp_pair', 'timestamp', 'symbol_pair'),
        Index('idx_window_timestamp', 'window_size', desc('timestamp')),
        # Index for z-score alerts
        Index('idx_zscore_timestamp', 'z_score', desc('timestamp')),
    )

class Alerts(Base):
    """Alert configurations and triggered alerts"""
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    condition = Column(String(50), nullable=False)  # e.g., "z_score_gt", "price_gt", "spread_lt"
    threshold = Column(Numeric(20, 8), nullable=False)  # Alert threshold value
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    
    # Alert metadata
    alert_type = Column(String(20), nullable=False, index=True)  # price, z_score, spread, volatility
    severity = Column(String(10), default='medium')  # low, medium, high, critical
    message = Column(Text)  # Custom alert message
    
    # Trigger tracking
    last_triggered = Column(DateTime)
    trigger_count = Column(Integer, default=0)
    
    # User/strategy association
    user_id = Column(String(50), default='system', index=True)
    strategy_name = Column(String(100))
    
    __table_args__ = (
        # Composite indexes for alert monitoring
        Index('idx_symbol_active_type', 'symbol', 'is_active', 'alert_type'),
        Index('idx_active_created', 'is_active', desc('created_at')),
        Index('idx_user_symbol', 'user_id', 'symbol'),
        Index('idx_triggered_desc', desc('last_triggered')),
    )


class AlertHistory(Base):
    """Historical record of triggered alerts"""
    __tablename__ = "alert_history"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, nullable=False, index=True)  # Reference to alerts table
    symbol = Column(String(20), nullable=False, index=True)
    condition = Column(String(50), nullable=False)
    threshold_value = Column(Numeric(20, 8), nullable=False)
    actual_value = Column(Numeric(20, 8), nullable=False)
    triggered_at = Column(DateTime, nullable=False, index=True)
    
    # Alert context
    market_conditions = Column(Text)  # JSON with market context
    resolution_time = Column(DateTime)  # When alert condition was resolved
    
    __table_args__ = (
        Index('idx_alert_triggered', 'alert_id', desc('triggered_at')),
        Index('idx_symbol_triggered', 'symbol', desc('triggered_at')),
    )



# Additional utility models for enhanced functionality

class MarketMetadata(Base):
    """Market metadata and symbol information"""
    __tablename__ = "market_metadata"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, unique=True, index=True)
    base_asset = Column(String(10), nullable=False)
    quote_asset = Column(String(10), nullable=False)
    exchange = Column(String(20), nullable=False, default='binance')
    
    # Trading specifications
    tick_size = Column(Numeric(20, 8))  # Minimum price increment
    lot_size = Column(Numeric(20, 8))   # Minimum quantity increment
    min_quantity = Column(Numeric(20, 8))
    max_quantity = Column(Numeric(20, 8))
    
    # Status and configuration
    is_active = Column(Boolean, default=True, index=True)
    trading_status = Column(String(20), default='TRADING')  # TRADING, HALT, BREAK
    
    # Metadata
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_base_quote', 'base_asset', 'quote_asset'),
        Index('idx_active_exchange', 'is_active', 'exchange'),
    )


class SystemMetrics(Base):
    """System performance and health metrics"""
    __tablename__ = "system_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String(50), nullable=False, index=True)
    metric_value = Column(Numeric(20, 8), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    
    # Metric metadata
    metric_type = Column(String(20), nullable=False)  # latency, throughput, error_rate, etc.
    component = Column(String(30), nullable=False)    # websocket, analytics, database, etc.
    labels = Column(Text)  # JSON string for additional labels
    
    __table_args__ = (
        Index('idx_name_timestamp', 'metric_name', desc('timestamp')),
        Index('idx_type_component', 'metric_type', 'component'),
    )