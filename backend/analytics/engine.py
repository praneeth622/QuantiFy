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
from sqlalchemy import select, and_

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
                # Try to get resampled data first (60 minutes for analytics window)
                query = select(ResampledData).where(
                    and_(
                        ResampledData.symbol == symbol,
                        ResampledData.timeframe == f"{window_minutes}m",
                        ResampledData.timestamp >= start_time,
                        ResampledData.timestamp <= end_time
                    )
                ).order_by(ResampledData.timestamp)
                
                result = await session.execute(query)
                candles = result.scalars().all()
                
                if candles and len(candles) >= 20:
                    logger.debug(f"Got {len(candles)} resampled candles for {symbol}")
                    return [candle.close for candle in candles]
                
                # Fallback to tick data
                tick_query = select(RawTicks).where(
                    and_(
                        RawTicks.symbol == symbol,
                        RawTicks.timestamp >= start_time,
                        RawTicks.timestamp <= end_time
                    )
                ).order_by(RawTicks.timestamp)
                
                tick_result = await session.execute(tick_query)
                ticks = tick_result.scalars().all()
                
                if ticks and len(ticks) > 0:
                    logger.debug(f"Got {len(ticks)} ticks for {symbol}, sampling...")
                    # Sample tick data to approximate candles
                    prices = [tick.price for tick in ticks]
                    # Simple sampling - take every nth tick
                    sample_size = min(lookback_periods, len(prices))
                    step = max(1, len(prices) // sample_size)
                    return prices[::step]
                
                logger.warning(f"No data found for {symbol} between {start_time} and {end_time}")
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
        """Store analytics result in database (DEPRECATED - use compute_pair_analytics)"""
        logger.warning(f"_store_analytics_result is deprecated, use compute_pair_analytics instead")
    
    async def compute_pair_analytics(
        self,
        symbol1: str,
        symbol2: str,
        window_minutes: int = 60,
        lookback_periods: int = 100
    ) -> Optional[Dict]:
        """
        Compute complete analytics for a symbol pair and store in database
        Returns: Dictionary with all analytics metrics or None if computation fails
        """
        try:
            logger.info(f"Computing analytics for {symbol1}/{symbol2}")
            
            # Get price data for both symbols
            prices1 = await self._get_price_series(symbol1, window_minutes, lookback_periods)
            prices2 = await self._get_price_series(symbol2, window_minutes, lookback_periods)
            
            if len(prices1) < 20 or len(prices2) < 20:
                logger.warning(f"Insufficient data: {symbol1}={len(prices1)}, {symbol2}={len(prices2)}")
                return None
            
            # Align data by taking minimum length and converting to floats
            min_length = min(len(prices1), len(prices2))
            prices1_aligned = [float(p) for p in prices1[:min_length]]
            prices2_aligned = [float(p) for p in prices2[:min_length]]
            
            # Create DataFrame
            df = pd.DataFrame({
                'price1': prices1_aligned,
                'price2': prices2_aligned
            }).dropna()
            
            if len(df) < 20:
                logger.warning(f"Insufficient aligned data: {len(df)} rows")
                return None
            
            # 1. Calculate correlation
            correlation = df['price1'].corr(df['price2'])
            
            # 2. Calculate hedge ratio using OLS
            model = OLS(df['price1'], df['price2']).fit()
            hedge_ratio = float(model.params[0])
            
            # 3. Calculate spread
            spread_series = df['price1'] - hedge_ratio * df['price2']
            current_spread = float(spread_series.iloc[-1])
            spread_mean = float(spread_series.mean())
            spread_std = float(spread_series.std())
            
            # 4. Calculate Z-score
            if spread_std > 0:
                z_score = (current_spread - spread_mean) / spread_std
            else:
                z_score = 0.0
            
            # 5. Calculate volatilities
            returns1 = df['price1'].pct_change().dropna()
            returns2 = df['price2'].pct_change().dropna()
            volatility_1 = float(returns1.std()) if len(returns1) > 0 else None
            volatility_2 = float(returns2.std()) if len(returns2) > 0 else None
            
            # 6. Store in database
            async for session in database_manager.get_session():
                result = AnalyticsResults(
                    symbol_pair=f"{symbol1}-{symbol2}",
                    hedge_ratio=hedge_ratio,
                    spread=current_spread,
                    spread_mean=spread_mean,
                    spread_std=spread_std,
                    z_score=z_score,
                    correlation=correlation,
                    timestamp=datetime.utcnow(),
                    window_size=window_minutes * 60,
                    volatility_1=volatility_1,
                    volatility_2=volatility_2,
                    cointegration_pvalue=None,  # Can be added later
                    half_life=None  # Can be added later
                )
                
                session.add(result)
                await session.commit()
                
                logger.info(
                    f"✅ Stored analytics: {symbol1}/{symbol2} - "
                    f"Corr={correlation:.4f}, Hedge={hedge_ratio:.4f}, "
                    f"Spread={current_spread:.4f}, Z={z_score:.2f}"
                )
                
                return {
                    'symbol_pair': f"{symbol1}-{symbol2}",
                    'correlation': correlation,
                    'hedge_ratio': hedge_ratio,
                    'spread': current_spread,
                    'spread_mean': spread_mean,
                    'spread_std': spread_std,
                    'z_score': z_score,
                    'volatility_1': volatility_1,
                    'volatility_2': volatility_2
                }
                
        except Exception as e:
            logger.error(f"Error computing pair analytics for {symbol1}/{symbol2}: {e}", exc_info=True)
            return None


# Global analytics engine instance
analytics_engine = AnalyticsEngine()