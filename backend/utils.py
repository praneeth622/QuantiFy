"""
Utility functions for QuantiFy backend
"""

import asyncio
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import json
import logging

logger = logging.getLogger(__name__)


def convert_to_unix_timestamp(dt: datetime) -> int:
    """Convert datetime to unix timestamp (milliseconds)"""
    return int(dt.timestamp() * 1000)


def convert_from_unix_timestamp(timestamp: int) -> datetime:
    """Convert unix timestamp (milliseconds) to datetime"""
    return datetime.fromtimestamp(timestamp / 1000)


def format_currency(value: float, decimals: int = 8) -> str:
    """Format currency value with specified decimal places"""
    return f"{value:.{decimals}f}"


def calculate_percentage_change(old_value: float, new_value: float) -> float:
    """Calculate percentage change between two values"""
    if old_value == 0:
        return 0.0
    return ((new_value - old_value) / old_value) * 100


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safely divide two numbers, returning default if denominator is zero"""
    if denominator == 0:
        return default
    return numerator / denominator


def validate_symbol(symbol: str) -> bool:
    """Validate trading symbol format"""
    if not symbol or len(symbol) < 6 or len(symbol) > 20:
        return False
    return symbol.isalnum()


def parse_timeframe(timeframe: str) -> int:
    """Parse timeframe string to seconds"""
    timeframe_map = {
        "1m": 60,
        "5m": 300,
        "15m": 900,
        "30m": 1800,
        "1h": 3600,
        "4h": 14400,
        "1d": 86400
    }
    return timeframe_map.get(timeframe.lower(), 60)


def create_symbol_pair_key(symbol1: str, symbol2: str) -> str:
    """Create standardized symbol pair key"""
    symbols = sorted([symbol1.upper(), symbol2.upper()])
    return f"{symbols[0]}-{symbols[1]}"


async def retry_async(
    func,
    max_retries: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    *args,
    **kwargs
):
    """Retry async function with exponential backoff"""
    for attempt in range(max_retries):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            
            wait_time = delay * (backoff ** attempt)
            logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {wait_time}s...")
            await asyncio.sleep(wait_time)


def serialize_datetime(obj):
    """JSON serializer for datetime objects"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


class DataValidator:
    """Data validation utilities"""
    
    @staticmethod
    def validate_price_data(data: Dict[str, Any]) -> bool:
        """Validate price data structure"""
        required_fields = ['symbol', 'price', 'timestamp']
        return all(field in data for field in required_fields)
    
    @staticmethod
    def validate_analytics_request(data: Dict[str, Any]) -> bool:
        """Validate analytics request structure"""
        required_fields = ['symbol1', 'symbol2']
        return all(field in data for field in required_fields)
    
    @staticmethod
    def sanitize_symbol(symbol: str) -> str:
        """Sanitize and format symbol"""
        return symbol.upper().strip()


class RateLimiter:
    """Simple rate limiter"""
    
    def __init__(self, max_requests: int, time_window: int):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests: Dict[str, List[datetime]] = {}
    
    def is_allowed(self, identifier: str) -> bool:
        """Check if request is allowed"""
        now = datetime.utcnow()
        
        if identifier not in self.requests:
            self.requests[identifier] = []
        
        # Remove old requests
        cutoff_time = now - timedelta(seconds=self.time_window)
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if req_time > cutoff_time
        ]
        
        # Check if under limit
        if len(self.requests[identifier]) < self.max_requests:
            self.requests[identifier].append(now)
            return True
        
        return False


class MetricsCollector:
    """Simple metrics collection"""
    
    def __init__(self):
        self.counters: Dict[str, int] = {}
        self.timers: Dict[str, List[float]] = {}
    
    def increment(self, name: str, value: int = 1):
        """Increment counter"""
        self.counters[name] = self.counters.get(name, 0) + value
    
    def timing(self, name: str, value: float):
        """Record timing metric"""
        if name not in self.timers:
            self.timers[name] = []
        self.timers[name].append(value)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get all metrics"""
        stats = {"counters": self.counters}
        
        # Calculate timer statistics
        timer_stats = {}
        for name, values in self.timers.items():
            if values:
                timer_stats[name] = {
                    "count": len(values),
                    "avg": sum(values) / len(values),
                    "min": min(values),
                    "max": max(values)
                }
        
        stats["timers"] = timer_stats
        return stats


# Global instances
metrics = MetricsCollector()
rate_limiter = RateLimiter(max_requests=100, time_window=60)