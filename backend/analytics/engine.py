"""
Analytics Engine for Quantitative Trading
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from statsmodels.regression.linear_model import OLS
from statsmodels.tsa.stattools import adfuller
from sklearn.preprocessing import StandardScaler
import logging

from database.connection import database_manager
from database.models import RawTicks, ResampledData, AnalyticsResults

logger = logging.getLogger(__name__)


class AnalyticsEngine:
    """Core analytics engine for quantitative calculations"""
    
    def __init__(self):
        self.scaler = StandardScaler()
    
    async def calculate_correlation(
        self, 
        symbol1: str, 
        symbol2: str, 
        window_minutes: int = 60,
        lookback_periods: int = 100
    ) -> Optional[float]:
        """Calculate rolling correlation between two symbols"""
        try:
            # Get price data for both symbols
            prices1 = await self._get_price_series(symbol1, window_minutes, lookback_periods)
            prices2 = await self._get_price_series(symbol2, window_minutes, lookback_periods)
            
            if len(prices1) < 2 or len(prices2) < 2:
                return None
            
            # Align data and calculate correlation
            df = pd.DataFrame({
                'price1': prices1,
                'price2': prices2
            }).dropna()
            
            if len(df) < 10:  # Need minimum data points
                return None
            
            correlation = df['price1'].corr(df['price2'])
            
            # Store result
            await self._store_analytics_result(
                symbol_pair=f"{symbol1}-{symbol2}",
                metric_name="correlation",
                metric_value=correlation,
                window_size=window_minutes * 60
            )
            
            return correlation
            
        except Exception as e:
            logger.error(f"Error calculating correlation: {e}")
            return None
    
    async def calculate_hedge_ratio(
        self, 
        symbol1: str, 
        symbol2: str, 
        window_minutes: int = 60,
        lookback_periods: int = 100
    ) -> Optional[float]:
        """Calculate hedge ratio using OLS regression"""
        try:
            # Get price data
            prices1 = await self._get_price_series(symbol1, window_minutes, lookback_periods)
            prices2 = await self._get_price_series(symbol2, window_minutes, lookback_periods)
            
            if len(prices1) < 10 or len(prices2) < 10:
                return None
            
            # Align data
            df = pd.DataFrame({
                'y': prices1,  # dependent variable
                'x': prices2   # independent variable
            }).dropna()
            
            if len(df) < 10:
                return None
            
            # Run OLS regression
            model = OLS(df['y'], df['x']).fit()
            hedge_ratio = model.params[0]
            
            # Store result
            await self._store_analytics_result(
                symbol_pair=f"{symbol1}-{symbol2}",
                metric_name="hedge_ratio",
                metric_value=hedge_ratio,
                window_size=window_minutes * 60
            )
            
            return hedge_ratio
            
        except Exception as e:
            logger.error(f"Error calculating hedge ratio: {e}")
            return None
    
    async def calculate_spread_zscore(
        self, 
        symbol1: str, 
        symbol2: str, 
        hedge_ratio: Optional[float] = None,
        window_minutes: int = 60,
        lookback_periods: int = 100
    ) -> Optional[float]:
        """Calculate Z-score of the spread between two symbols"""
        try:
            # Get hedge ratio if not provided
            if hedge_ratio is None:
                hedge_ratio = await self.calculate_hedge_ratio(
                    symbol1, symbol2, window_minutes, lookback_periods
                )
                if hedge_ratio is None:
                    return None
            
            # Get price data
            prices1 = await self._get_price_series(symbol1, window_minutes, lookback_periods)
            prices2 = await self._get_price_series(symbol2, window_minutes, lookback_periods)
            
            if len(prices1) < 20 or len(prices2) < 20:
                return None
            
            # Calculate spread
            df = pd.DataFrame({
                'price1': prices1,
                'price2': prices2
            }).dropna()
            
            spread = df['price1'] - hedge_ratio * df['price2']
            
            # Calculate Z-score
            mean_spread = spread.mean()
            std_spread = spread.std()
            
            if std_spread == 0:
                return None
            
            current_spread = spread.iloc[-1]
            z_score = (current_spread - mean_spread) / std_spread
            
            # Store result
            await self._store_analytics_result(
                symbol_pair=f"{symbol1}-{symbol2}",
                metric_name="z_score",
                metric_value=z_score,
                window_size=window_minutes * 60
            )
            
            return z_score
            
        except Exception as e:
            logger.error(f"Error calculating Z-score: {e}")
            return None
    
    async def test_cointegration(
        self, 
        symbol1: str, 
        symbol2: str,
        window_minutes: int = 60,
        lookback_periods: int = 100
    ) -> Optional[Dict]:
        """Test for cointegration using Augmented Dickey-Fuller test"""
        try:
            # Get price data
            prices1 = await self._get_price_series(symbol1, window_minutes, lookback_periods)
            prices2 = await self._get_price_series(symbol2, window_minutes, lookback_periods)
            
            if len(prices1) < 50 or len(prices2) < 50:
                return None
            
            # Align data
            df = pd.DataFrame({
                'price1': prices1,
                'price2': prices2
            }).dropna()
            
            # Calculate hedge ratio
            hedge_ratio = await self.calculate_hedge_ratio(symbol1, symbol2, window_minutes, lookback_periods)
            if hedge_ratio is None:
                return None
            
            # Calculate spread
            spread = df['price1'] - hedge_ratio * df['price2']
            
            # Run ADF test on spread
            adf_result = adfuller(spread, maxlag=1)
            
            result = {
                'adf_statistic': adf_result[0],
                'p_value': adf_result[1],
                'critical_values': adf_result[4],
                'is_cointegrated': adf_result[1] < 0.05  # 5% significance level
            }
            
            # Store result
            await self._store_analytics_result(
                symbol_pair=f"{symbol1}-{symbol2}",
                metric_name="adf_pvalue",
                metric_value=adf_result[1],
                window_size=window_minutes * 60
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error testing cointegration: {e}")
            return None
    
    async def calculate_volatility(
        self, 
        symbol: str, 
        window_minutes: int = 60,
        lookback_periods: int = 100
    ) -> Optional[float]:
        """Calculate rolling volatility"""
        try:
            prices = await self._get_price_series(symbol, window_minutes, lookback_periods)
            
            if len(prices) < 10:
                return None
            
            # Calculate returns
            returns = pd.Series(prices).pct_change().dropna()
            
            # Calculate volatility (annualized)
            volatility = returns.std() * np.sqrt(365 * 24 * 60 / window_minutes)
            
            # Store result
            await self._store_analytics_result(
                symbol_pair=symbol,
                metric_name="volatility",
                metric_value=volatility,
                window_size=window_minutes * 60
            )
            
            return volatility
            
        except Exception as e:
            logger.error(f"Error calculating volatility: {e}")
            return None
    
    async def _get_price_series(
        self, 
        symbol: str, 
        window_minutes: int, 
        lookback_periods: int
    ) -> List[float]:
        """Get price series for a symbol"""
        try:
            # Calculate time range
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(minutes=window_minutes * lookback_periods)
            
            # Query database
            async for session in database_manager.get_session():
                # Try to get candle data first
                query = session.query(CandleData).filter(
                    CandleData.symbol == symbol,
                    CandleData.timestamp >= start_time,
                    CandleData.timestamp <= end_time,
                    CandleData.interval == f"{window_minutes}m"
                ).order_by(CandleData.timestamp)
                
                result = await query.all()
                
                if result:
                    return [candle.close_price for candle in result]
                
                # Fallback to tick data
                tick_query = session.query(TickData).filter(
                    TickData.symbol == symbol,
                    TickData.timestamp >= start_time,
                    TickData.timestamp <= end_time
                ).order_by(TickData.timestamp)
                
                tick_result = await tick_query.all()
                
                if tick_result:
                    # Sample tick data to approximate candles
                    prices = [tick.price for tick in tick_result]
                    # Simple sampling - take every nth tick
                    sample_size = min(lookback_periods, len(prices))
                    step = max(1, len(prices) // sample_size)
                    return prices[::step]
                
                return []
                
        except Exception as e:
            logger.error(f"Error getting price series: {e}")
            return []
    
    async def _store_analytics_result(
        self, 
        symbol_pair: str, 
        metric_name: str, 
        metric_value: float, 
        window_size: int
    ):
        """Store analytics result in database"""
        try:
            async for session in database_manager.get_session():
                result = AnalyticsResult(
                    symbol_pair=symbol_pair,
                    metric_name=metric_name,
                    metric_value=metric_value,
                    window_size=window_size,
                    timestamp=datetime.utcnow()
                )
                
                session.add(result)
                await session.commit()
                break
                
        except Exception as e:
            logger.error(f"Error storing analytics result: {e}")


# Global analytics engine instance
analytics_engine = AnalyticsEngine()