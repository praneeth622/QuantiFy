"""
Database Models for QuantiFy Trading Platform
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class TickData(Base):
    """Raw tick data from exchanges"""
    __tablename__ = "tick_data"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    exchange = Column(String(20), nullable=False)
    price = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    bid_price = Column(Float)
    ask_price = Column(Float)
    bid_volume = Column(Float)
    ask_volume = Column(Float)
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (
        Index('idx_symbol_timestamp', 'symbol', 'timestamp'),
        Index('idx_exchange_timestamp', 'exchange', 'timestamp'),
    )


class CandleData(Base):
    """OHLCV candle data aggregated from ticks"""
    __tablename__ = "candle_data"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    exchange = Column(String(20), nullable=False)
    interval = Column(String(10), nullable=False)  # 1m, 5m, 15m, 1h, etc.
    open_price = Column(Float, nullable=False)
    high_price = Column(Float, nullable=False)
    low_price = Column(Float, nullable=False)
    close_price = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)
    trade_count = Column(Integer)
    timestamp = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (
        Index('idx_symbol_interval_timestamp', 'symbol', 'interval', 'timestamp'),
    )


class AnalyticsResult(Base):
    """Calculated analytics and metrics"""
    __tablename__ = "analytics_results"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol_pair = Column(String(50), nullable=False, index=True)  # e.g., "BTCUSDT-ETHUSDT"
    metric_name = Column(String(50), nullable=False)  # e.g., "correlation", "hedge_ratio", "z_score"
    metric_value = Column(Float, nullable=False)
    window_size = Column(Integer, nullable=False)  # in seconds
    timestamp = Column(DateTime, nullable=False, index=True)
    metadata = Column(Text)  # JSON string for additional data
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (
        Index('idx_pair_metric_timestamp', 'symbol_pair', 'metric_name', 'timestamp'),
    )


class Alert(Base):
    """Trading alerts and notifications"""
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(String(50), nullable=False)  # z_score, spread, volume, etc.
    symbol = Column(String(20), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False)  # low, medium, high, critical
    threshold_value = Column(Float)
    actual_value = Column(Float)
    is_active = Column(Boolean, default=True)
    triggered_at = Column(DateTime, nullable=False, index=True)
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (
        Index('idx_type_symbol_triggered', 'alert_type', 'symbol', 'triggered_at'),
    )


class Symbol(Base):
    """Trading symbols configuration"""
    __tablename__ = "symbols"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, unique=True, index=True)
    exchange = Column(String(20), nullable=False)
    base_asset = Column(String(10), nullable=False)
    quote_asset = Column(String(10), nullable=False)
    is_active = Column(Boolean, default=True)
    min_price = Column(Float)
    max_price = Column(Float)
    tick_size = Column(Float)
    min_quantity = Column(Float)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class UserAlert(Base):
    """User-defined alert configurations"""
    __tablename__ = "user_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)  # For future user system
    symbol = Column(String(20), nullable=False)
    alert_type = Column(String(50), nullable=False)
    condition = Column(String(20), nullable=False)  # greater_than, less_than, etc.
    threshold = Column(Float, nullable=False)
    is_enabled = Column(Boolean, default=True)
    last_triggered = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())