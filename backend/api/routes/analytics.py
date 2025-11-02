"""
Analytics API Routes
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel

from database.connection import get_db
from database.models import AnalyticsResults
from analytics.engine import analytics_engine

router = APIRouter(prefix="/analytics")


class AnalyticsRequest(BaseModel):
    symbol1: str
    symbol2: str
    window_minutes: int = 60
    lookback_periods: int = 100


class AnalyticsResponse(BaseModel):
    symbol_pair: str
    metric_name: str
    metric_value: float
    window_size: int
    timestamp: datetime


class CorrelationResponse(BaseModel):
    symbol1: str
    symbol2: str
    correlation: float
    timestamp: datetime


class HedgeRatioResponse(BaseModel):
    symbol1: str
    symbol2: str
    hedge_ratio: float
    timestamp: datetime


class ZScoreResponse(BaseModel):
    symbol1: str
    symbol2: str
    z_score: float
    hedge_ratio: float
    timestamp: datetime


@router.post("/correlation", response_model=CorrelationResponse)
async def calculate_correlation(request: AnalyticsRequest):
    """Calculate correlation between two symbols"""
    try:
        correlation = await analytics_engine.calculate_correlation(
            request.symbol1.upper(),
            request.symbol2.upper(),
            request.window_minutes,
            request.lookback_periods
        )
        
        if correlation is None:
            raise HTTPException(status_code=400, detail="Insufficient data for correlation calculation")
        
        return CorrelationResponse(
            symbol1=request.symbol1.upper(),
            symbol2=request.symbol2.upper(),
            correlation=correlation,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hedge-ratio", response_model=HedgeRatioResponse)
async def calculate_hedge_ratio(request: AnalyticsRequest):
    """Calculate hedge ratio between two symbols"""
    try:
        hedge_ratio = await analytics_engine.calculate_hedge_ratio(
            request.symbol1.upper(),
            request.symbol2.upper(),
            request.window_minutes,
            request.lookback_periods
        )
        
        if hedge_ratio is None:
            raise HTTPException(status_code=400, detail="Insufficient data for hedge ratio calculation")
        
        return HedgeRatioResponse(
            symbol1=request.symbol1.upper(),
            symbol2=request.symbol2.upper(),
            hedge_ratio=hedge_ratio,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/z-score", response_model=ZScoreResponse)
async def calculate_z_score(request: AnalyticsRequest):
    """Calculate Z-score of spread between two symbols"""
    try:
        # First get hedge ratio
        hedge_ratio = await analytics_engine.calculate_hedge_ratio(
            request.symbol1.upper(),
            request.symbol2.upper(),
            request.window_minutes,
            request.lookback_periods
        )
        
        if hedge_ratio is None:
            raise HTTPException(status_code=400, detail="Cannot calculate hedge ratio")
        
        # Then calculate Z-score
        z_score = await analytics_engine.calculate_spread_zscore(
            request.symbol1.upper(),
            request.symbol2.upper(),
            hedge_ratio,
            request.window_minutes,
            request.lookback_periods
        )
        
        if z_score is None:
            raise HTTPException(status_code=400, detail="Insufficient data for Z-score calculation")
        
        return ZScoreResponse(
            symbol1=request.symbol1.upper(),
            symbol2=request.symbol2.upper(),
            z_score=z_score,
            hedge_ratio=hedge_ratio,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cointegration")
async def test_cointegration(request: AnalyticsRequest):
    """Test cointegration between two symbols"""
    try:
        result = await analytics_engine.test_cointegration(
            request.symbol1.upper(),
            request.symbol2.upper(),
            request.window_minutes,
            request.lookback_periods
        )
        
        if result is None:
            raise HTTPException(status_code=400, detail="Insufficient data for cointegration test")
        
        return {
            "symbol1": request.symbol1.upper(),
            "symbol2": request.symbol2.upper(),
            "adf_statistic": result["adf_statistic"],
            "p_value": result["p_value"],
            "critical_values": result["critical_values"],
            "is_cointegrated": result["is_cointegrated"],
            "timestamp": datetime.utcnow()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/volatility/{symbol}")
async def calculate_volatility(
    symbol: str,
    window_minutes: int = Query(default=60),
    lookback_periods: int = Query(default=100)
):
    """Calculate volatility for a symbol"""
    try:
        volatility = await analytics_engine.calculate_volatility(
            symbol.upper(),
            window_minutes,
            lookback_periods
        )
        
        if volatility is None:
            raise HTTPException(status_code=400, detail="Insufficient data for volatility calculation")
        
        return {
            "symbol": symbol.upper(),
            "volatility": volatility,
            "window_minutes": window_minutes,
            "timestamp": datetime.utcnow()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{symbol_pair}", response_model=List[AnalyticsResponse])
async def get_analytics_history(
    symbol_pair: str,
    metric_name: str = Query(...),
    limit: int = Query(default=100, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get historical analytics results"""
    try:
        query = select(AnalyticsResults).where(
            AnalyticsResults.symbol_pair == symbol_pair.upper(),
            AnalyticsResults.metric_name == metric_name
        ).order_by(desc(AnalyticsResults.timestamp)).limit(limit)
        
        result = await db.execute(query)
        analytics = result.scalars().all()
        
        return [
            AnalyticsResponse(
                symbol_pair=analytic.symbol_pair,
                metric_name=analytic.metric_name,
                metric_value=analytic.metric_value,
                window_size=analytic.window_size,
                timestamp=analytic.timestamp
            )
            for analytic in analytics
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/summary")
async def get_metrics_summary(db: AsyncSession = Depends(get_db)):
    """Get summary of available metrics"""
    try:
        # Get distinct metric names and symbol pairs
        metrics_query = select(
            AnalyticsResults.metric_name,
            AnalyticsResults.symbol_pair
        ).distinct()
        
        result = await db.execute(metrics_query)
        metrics = result.fetchall()
        
        # Group by metric name
        summary = {}
        for metric_name, symbol_pair in metrics:
            if metric_name not in summary:
                summary[metric_name] = []
            summary[metric_name].append(symbol_pair)
        
        return {
            "available_metrics": summary,
            "total_metrics": len(summary)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))