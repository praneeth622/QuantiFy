"""
Comprehensive API Routes for QuantiFy
Includes all endpoints: market data, analytics, alerts, and data export
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import pandas as pd
import io
import logging

from database.connection import get_db
from database.models import RawTicks, ResampledData, MarketMetadata, Alerts
from analytics.hedge_ratio import (
    calculate_hedge_ratio,
    calculate_spread,
    calculate_rolling_correlation,
    interpret_rolling_correlation
)

logger = logging.getLogger(__name__)

# Create main router
router = APIRouter()


# ============================================================================
# RESPONSE MODELS
# ============================================================================

class SymbolInfo(BaseModel):
    """Symbol information response"""
    symbol: str
    exchange: str = "binance"
    
    class Config:
        from_attributes = True


class TickResponse(BaseModel):
    """Tick data response model"""
    symbol: str
    price: float
    quantity: float
    timestamp: datetime

    class Config:
        from_attributes = True


class TicksResponse(BaseModel):
    """Multiple ticks response with metadata"""
    symbol: str
    count: int
    ticks: List[TickResponse]
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class OHLCVResponse(BaseModel):
    """OHLCV candlestick data response"""
    id: int
    symbol: str
    timeframe: str
    open: float
    high: float
    low: float
    close: float
    volume: float
    timestamp: datetime
    trade_count: int = 0
    
    class Config:
        from_attributes = True


class OHLCVListResponse(BaseModel):
    """Multiple OHLCV candles response"""
    symbol: str
    timeframe: str
    count: int
    candles: List[OHLCVResponse]
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class SpreadAnalysisResponse(BaseModel):
    """Spread analysis response"""
    symbol1: str
    symbol2: str
    window: int
    hedge_ratio: float
    hedge_ratio_r2: float
    spread_mean: float
    spread_std: float
    spread_min: float
    spread_max: float
    current_spread: Optional[float] = None
    z_score: Optional[float] = None
    data_points: int
    timestamp: datetime


class CorrelationResponse(BaseModel):
    """Rolling correlation response"""
    symbol1: str
    symbol2: str
    window: int
    current_correlation: float
    mean_correlation: float
    std_correlation: float
    min_correlation: float
    max_correlation: float
    interpretation: str
    data_points: int
    timestamp: datetime


class AlertCreate(BaseModel):
    """Alert creation request"""
    symbol: str
    condition: str = Field(..., description="Condition: above, below, crosses_above, crosses_below")
    threshold: float
    alert_type: str = Field(default="price", description="Alert type: price, volume, indicator")
    severity: str = Field(default="Medium", description="Severity: Low, Medium, High, Critical")
    message: Optional[str] = None
    strategy_name: Optional[str] = None
    user_id: Optional[str] = None


class AlertResponse(BaseModel):
    """Alert response"""
    id: int
    symbol: str
    condition: str
    threshold: float
    is_active: bool
    created_at: datetime
    alert_type: str
    severity: str
    message: Optional[str] = None
    last_triggered: Optional[datetime] = None
    trigger_count: int = 0
    user_id: Optional[str] = None
    strategy_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class AlertListResponse(BaseModel):
    """List of alerts response"""
    count: int
    alerts: List[AlertResponse]


class ExportResponse(BaseModel):
    """Data export metadata response"""
    symbol: str
    format: str
    rows: int
    start_time: datetime
    end_time: datetime
    file_size_bytes: int


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: datetime
    database: str
    active_symbols: int


class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    detail: Optional[str] = None
    timestamp: datetime


# ============================================================================
# MARKET DATA ENDPOINTS
# ============================================================================

@router.get("/api/symbols", response_model=List[SymbolInfo], tags=["Market Data"])
async def get_symbols(
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of all available trading symbols.
    
    Returns:
        List of symbols with exchange information
    """
    try:
        # Query distinct symbols from market metadata first
        result = await db.execute(
            select(MarketMetadata.symbol, MarketMetadata.exchange)
            .distinct()
        )
        symbols = result.all()
        
        if not symbols:
            # If no metadata, check raw ticks (without exchange field)
            result = await db.execute(
                select(RawTicks.symbol)
                .distinct()
                .limit(100)
            )
            raw_symbols = result.all()
            symbols = [(symbol[0], "binance") for symbol in raw_symbols]  # Default to binance
        
        return [
            SymbolInfo(symbol=symbol, exchange=exchange or "binance")
            for symbol, exchange in symbols
        ]
    except Exception as e:
        logger.error(f"Error fetching symbols: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch symbols: {str(e)}")


@router.get("/api/ticks", response_model=TicksResponse, tags=["Market Data"])
async def get_recent_ticks(
    symbol: str = Query(..., description="Trading symbol (e.g., BTCUSDT)"),
    limit: int = Query(1000, ge=1, le=50000, description="Number of ticks to return"),  # Increased default to 1000, max to 50000
    db: AsyncSession = Depends(get_db)
):
    """
    Get recent tick data for a symbol.
    
    Parameters:
        - symbol: Trading symbol (e.g., BTCUSDT)
        - limit: Number of recent ticks to return (default: 1000, max: 50000)
    
    Returns:
        Recent tick data with metadata
    """
    try:
        symbol = symbol.upper()
        
        # Query recent ticks
        result = await db.execute(
            select(RawTicks)
            .where(RawTicks.symbol == symbol)
            .order_by(desc(RawTicks.timestamp))
            .limit(limit)
        )
        ticks = result.scalars().all()
        
        if not ticks:
            raise HTTPException(
                status_code=404,
                detail=f"No tick data found for symbol {symbol}"
            )
        
        # Sort chronologically for response
        ticks = list(reversed(ticks))
        
        return TicksResponse(
            symbol=symbol,
            count=len(ticks),
            ticks=[TickResponse.model_validate(tick) for tick in ticks],
            start_time=ticks[0].timestamp if ticks else None,
            end_time=ticks[-1].timestamp if ticks else None
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching ticks for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch tick data: {str(e)}")


@router.get("/api/ohlcv", response_model=OHLCVListResponse, tags=["Market Data"])
async def get_ohlcv_data(
    symbol: str = Query(..., description="Trading symbol (e.g., BTCUSDT)"),
    timeframe: str = Query("1m", description="Timeframe (1s, 1m, 5m, 15m, 1h, 4h, 1d)"),  # Added 1s
    limit: int = Query(500, ge=1, le=10000, description="Number of candles to return"),  # Increased default to 500, max to 10000
    db: AsyncSession = Depends(get_db)
):
    """
    Get OHLCV (candlestick) resampled data for a symbol.
    
    Parameters:
        - symbol: Trading symbol (e.g., BTCUSDT)
        - timeframe: Timeframe interval (1s, 1m, 5m, 15m, 1h, 4h, 1d)
        - limit: Number of candles to return (default: 500, max: 10000)
    
    Returns:
        OHLCV candlestick data with metadata
    """
    try:
        symbol = symbol.upper()
        
        # Query resampled data
        result = await db.execute(
            select(ResampledData)
            .where(and_(
                ResampledData.symbol == symbol,
                ResampledData.timeframe == timeframe
            ))
            .order_by(desc(ResampledData.timestamp))
            .limit(limit)
        )
        candles = result.scalars().all()
        
        if not candles:
            raise HTTPException(
                status_code=404,
                detail=f"No OHLCV data found for {symbol} at {timeframe} timeframe"
            )
        
        # Sort chronologically for response
        candles = list(reversed(candles))
        
        return OHLCVListResponse(
            symbol=symbol,
            timeframe=timeframe,
            count=len(candles),
            candles=[OHLCVResponse.model_validate(candle) for candle in candles],
            start_time=candles[0].timestamp if candles else None,
            end_time=candles[-1].timestamp if candles else None
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching OHLCV for {symbol} at {timeframe}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch OHLCV data: {str(e)}")


# ============================================================================
# ANALYTICS ENDPOINTS
# ============================================================================

@router.get("/api/analytics/spread", response_model=SpreadAnalysisResponse, tags=["Analytics"])
async def analyze_spread(
    symbol1: str = Query(..., description="First trading symbol (e.g., BTCUSDT)"),
    symbol2: str = Query(..., description="Second trading symbol (e.g., ETHUSDT)"),
    window: int = Query(20, ge=10, le=500, description="Rolling window size"),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculate spread analysis between two trading symbols.
    
    Performs hedge ratio calculation and spread analysis for pairs trading.
    
    Parameters:
        - symbol1: First trading symbol
        - symbol2: Second trading symbol
        - window: Rolling window size for calculations
    
    Returns:
        Spread analysis with hedge ratio, z-score, and statistics
    """
    try:
        symbol1 = symbol1.upper()
        symbol2 = symbol2.upper()
        
        # Fetch price data for both symbols
        result1 = await db.execute(
            select(RawTicks.price, RawTicks.timestamp)
            .where(RawTicks.symbol == symbol1)
            .order_by(RawTicks.timestamp)
            .limit(1000)
        )
        data1 = result1.all()
        
        result2 = await db.execute(
            select(RawTicks.price, RawTicks.timestamp)
            .where(RawTicks.symbol == symbol2)
            .order_by(RawTicks.timestamp)
            .limit(1000)
        )
        data2 = result2.all()
        
        if not data1 or not data2:
            raise HTTPException(
                status_code=404,
                detail=f"Insufficient data for {symbol1} or {symbol2}"
            )
        
        # Convert to pandas Series
        prices1 = pd.Series([float(price) for price, _ in data1])
        prices2 = pd.Series([float(price) for price, _ in data2])
        
        # Ensure same length
        min_len = min(len(prices1), len(prices2))
        prices1 = prices1.iloc[-min_len:]
        prices2 = prices2.iloc[-min_len:]
        
        if min_len < window:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient data points ({min_len}). Need at least {window}."
            )
        
        # Calculate hedge ratio
        hr_result = calculate_hedge_ratio(prices1, prices2)
        
        if hr_result is None:
            raise HTTPException(
                status_code=400,
                detail="Failed to calculate hedge ratio. Check data quality."
            )
        
        beta, alpha, r_squared, residuals = hr_result
        
        # Calculate spread
        spread = calculate_spread(prices1, prices2, beta)
        
        # Calculate spread statistics
        spread_mean = float(spread.mean())
        spread_std = float(spread.std())
        spread_min = float(spread.min())
        spread_max = float(spread.max())
        
        # Current values
        current_spread = float(spread.iloc[-1]) if len(spread) > 0 else None
        z_score = None
        if current_spread is not None and spread_std > 0:
            z_score = (current_spread - spread_mean) / spread_std
        
        return SpreadAnalysisResponse(
            symbol1=symbol1,
            symbol2=symbol2,
            window=window,
            hedge_ratio=float(beta),
            hedge_ratio_r2=float(r_squared),
            spread_mean=spread_mean,
            spread_std=spread_std,
            spread_min=spread_min,
            spread_max=spread_max,
            current_spread=current_spread,
            z_score=float(z_score) if z_score is not None else None,
            data_points=len(spread),
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating spread for {symbol1}/{symbol2}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Spread calculation failed: {str(e)}")


@router.get("/api/analytics/correlation", response_model=CorrelationResponse, tags=["Analytics"])
async def analyze_correlation(
    symbol1: str = Query(..., description="First trading symbol (e.g., BTCUSDT)"),
    symbol2: str = Query(..., description="Second trading symbol (e.g., ETHUSDT)"),
    window: int = Query(50, ge=10, le=500, description="Rolling window size"),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculate rolling correlation between two trading symbols.
    
    Parameters:
        - symbol1: First trading symbol
        - symbol2: Second trading symbol
        - window: Rolling window size for correlation calculation
    
    Returns:
        Rolling correlation statistics and interpretation
    """
    try:
        symbol1 = symbol1.upper()
        symbol2 = symbol2.upper()
        
        # Fetch price data for both symbols
        result1 = await db.execute(
            select(RawTicks.price, RawTicks.timestamp)
            .where(RawTicks.symbol == symbol1)
            .order_by(RawTicks.timestamp)
            .limit(1000)
        )
        data1 = result1.all()
        
        result2 = await db.execute(
            select(RawTicks.price, RawTicks.timestamp)
            .where(RawTicks.symbol == symbol2)
            .order_by(RawTicks.timestamp)
            .limit(1000)
        )
        data2 = result2.all()
        
        if not data1 or not data2:
            raise HTTPException(
                status_code=404,
                detail=f"Insufficient data for {symbol1} or {symbol2}"
            )
        
        # Convert to pandas Series
        prices1 = pd.Series([float(price) for price, _ in data1])
        prices2 = pd.Series([float(price) for price, _ in data2])
        
        # Ensure same length
        min_len = min(len(prices1), len(prices2))
        prices1 = prices1.iloc[-min_len:]
        prices2 = prices2.iloc[-min_len:]
        
        if min_len < window:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient data points ({min_len}). Need at least {window}."
            )
        
        # Calculate rolling correlation
        rolling_corr = calculate_rolling_correlation(prices1, prices2, window=window)
        
        # Get valid correlations (drop NaN)
        valid_corr = rolling_corr.dropna()
        
        if len(valid_corr) == 0:
            raise HTTPException(
                status_code=400,
                detail="No valid correlation values calculated"
            )
        
        # Calculate statistics
        current_corr = float(valid_corr.iloc[-1])
        mean_corr = float(valid_corr.mean())
        std_corr = float(valid_corr.std())
        min_corr = float(valid_corr.min())
        max_corr = float(valid_corr.max())
        
        # Get interpretation
        interpretation = interpret_rolling_correlation(current_corr)
        
        return CorrelationResponse(
            symbol1=symbol1,
            symbol2=symbol2,
            window=window,
            current_correlation=current_corr,
            mean_correlation=mean_corr,
            std_correlation=std_corr,
            min_correlation=min_corr,
            max_correlation=max_corr,
            interpretation=interpretation,
            data_points=len(valid_corr),
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating correlation for {symbol1}/{symbol2}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Correlation calculation failed: {str(e)}")


# ============================================================================
# ALERTS ENDPOINTS
# ============================================================================

@router.post("/api/alerts", response_model=AlertResponse, tags=["Alerts"])
async def create_alert(
    alert: AlertCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new price/volume alert.
    
    Parameters:
        - alert: Alert configuration (symbol, condition, threshold, etc.)
    
    Returns:
        Created alert details
    """
    try:
        # Create new alert
        new_alert = Alerts(
            symbol=alert.symbol.upper(),
            condition=alert.condition,
            threshold=alert.threshold,
            alert_type=alert.alert_type,
            severity=alert.severity,
            message=alert.message or f"{alert.symbol} {alert.condition} {alert.threshold}",
            is_active=True,
            created_at=datetime.utcnow(),
            trigger_count=0,
            user_id=alert.user_id,
            strategy_name=alert.strategy_name
        )
        
        db.add(new_alert)
        await db.commit()
        await db.refresh(new_alert)
        
        logger.info(f"Created alert: {alert.symbol} {alert.condition} {alert.threshold}")
        
        return AlertResponse.model_validate(new_alert)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating alert: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create alert: {str(e)}")


@router.get("/api/alerts", response_model=AlertListResponse, tags=["Alerts"])
async def list_alerts(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    limit: int = Query(100, ge=1, le=1000, description="Max alerts to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    List all alerts with optional filters.
    
    Parameters:
        - symbol: Filter by specific symbol (optional)
        - is_active: Filter by active status (optional)
        - severity: Filter by severity level (optional)
        - limit: Maximum number of alerts to return
    
    Returns:
        List of alerts matching the filters
    """
    try:
        # Build query with filters
        query = select(Alerts)
        
        if symbol:
            query = query.where(Alerts.symbol == symbol.upper())
        
        if is_active is not None:
            query = query.where(Alerts.is_active == is_active)
        
        if severity:
            query = query.where(Alerts.severity == severity)
        
        query = query.order_by(desc(Alerts.last_triggered)).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        alerts = result.scalars().all()
        
        return AlertListResponse(
            count=len(alerts),
            alerts=[AlertResponse.model_validate(alert) for alert in alerts]
        )
    except Exception as e:
        logger.error(f"Error fetching alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch alerts: {str(e)}")


@router.delete("/api/alerts/{alert_id}", tags=["Alerts"])
async def delete_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete an alert by ID.
    
    Parameters:
        - alert_id: Alert ID to delete
    
    Returns:
        Success message
    """
    try:
        # Find alert
        result = await db.execute(
            select(Alerts).where(Alerts.id == alert_id)
        )
        alert = result.scalar_one_or_none()
        
        if not alert:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
        
        # Delete alert
        await db.delete(alert)
        await db.commit()
        
        logger.info(f"Deleted alert {alert_id}")
        
        return {"message": f"Alert {alert_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting alert {alert_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete alert: {str(e)}")


# ============================================================================
# DATA EXPORT ENDPOINTS
# ============================================================================

@router.get("/api/export/csv", tags=["Data Export"])
async def export_csv(
    symbol: str = Query(..., description="Trading symbol to export"),
    start_time: Optional[datetime] = Query(None, description="Start time (ISO format)"),
    end_time: Optional[datetime] = Query(None, description="End time (ISO format)"),
    data_type: str = Query("ticks", description="Data type: ticks or ohlcv"),
    interval: Optional[str] = Query(None, description="Interval for OHLCV data"),
    db: AsyncSession = Depends(get_db)
):
    """
    Export market data to CSV format.
    
    Parameters:
        - symbol: Trading symbol to export
        - start_time: Start timestamp (optional, defaults to 24h ago)
        - end_time: End timestamp (optional, defaults to now)
        - data_type: Type of data to export (ticks or ohlcv)
        - interval: Required if data_type is ohlcv (e.g., 1m, 5m, 1h)
    
    Returns:
        CSV file download
    """
    try:
        symbol = symbol.upper()
        
        # Default time range: last 24 hours
        if end_time is None:
            end_time = datetime.utcnow()
        if start_time is None:
            start_time = end_time - timedelta(days=1)
        
        # Export tick data
        if data_type == "ticks":
            result = await db.execute(
                select(RawTicks)
                .where(and_(
                    RawTicks.symbol == symbol,
                    RawTicks.timestamp >= start_time,
                    RawTicks.timestamp <= end_time
                ))
                .order_by(RawTicks.timestamp)
            )
            data = result.scalars().all()
            
            if not data:
                raise HTTPException(
                    status_code=404,
                    detail=f"No tick data found for {symbol} in specified time range"
                )
            
            # Convert to DataFrame
            df = pd.DataFrame([{
                'timestamp': tick.timestamp,
                'symbol': tick.symbol,
                'price': tick.price,
                'quantity': tick.quantity
            } for tick in data])
        
        # Export OHLCV data
        elif data_type == "ohlcv":
            if not interval:
                raise HTTPException(
                    status_code=400,
                    detail="interval parameter required for OHLCV export"
                )
            
            result = await db.execute(
                select(ResampledData)
                .where(and_(
                    ResampledData.symbol == symbol,
                    ResampledData.timeframe == interval,
                    ResampledData.timestamp >= start_time,
                    ResampledData.timestamp <= end_time
                ))
                .order_by(ResampledData.timestamp)
            )
            data = result.scalars().all()
            
            if not data:
                raise HTTPException(
                    status_code=404,
                    detail=f"No OHLCV data found for {symbol} at {interval} in specified time range"
                )
            
            # Convert to DataFrame
            df = pd.DataFrame([{
                'timestamp': candle.timestamp,
                'symbol': candle.symbol,
                'timeframe': candle.timeframe,
                'open': candle.open,
                'high': candle.high,
                'low': candle.low,
                'close': candle.close,
                'volume': candle.volume,
                'trade_count': candle.trade_count
            } for candle in data])
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid data_type: {data_type}. Must be 'ticks' or 'ohlcv'"
            )
        
        # Convert DataFrame to CSV
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_content = csv_buffer.getvalue()
        
        # Create filename
        filename = f"{symbol}_{data_type}_{start_time.strftime('%Y%m%d')}_{end_time.strftime('%Y%m%d')}.csv"
        
        logger.info(f"Exported {len(df)} rows for {symbol} to CSV")
        
        # Return CSV file
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting data for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Data export failed: {str(e)}")


# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@router.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def health_check(
    db: AsyncSession = Depends(get_db)
):
    """
    Health check endpoint.
    
    Returns:
        System health status and basic statistics
    """
    try:
        # Check database connectivity
        result = await db.execute(select(MarketMetadata).limit(1))
        db_status = "connected"
        
        # Count active symbols
        result = await db.execute(
            select(MarketMetadata.symbol).distinct()
        )
        active_symbols = len(result.all())
        
        return HealthResponse(
            status="healthy",
            timestamp=datetime.utcnow(),
            database=db_status,
            active_symbols=active_symbols
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return HealthResponse(
            status="unhealthy",
            timestamp=datetime.utcnow(),
            database="disconnected",
            active_symbols=0
        )


# ============================================================================
# WEBSOCKET SUBSCRIPTION ENDPOINTS
# ============================================================================

@router.post("/api/subscribe/{symbol}", tags=["Market Data"])
async def subscribe_to_symbol(symbol: str):
    """
    Subscribe to real-time data for a specific symbol.
    
    Parameters:
        - symbol: Trading symbol (e.g., BTCUSDT, ETHUSDT, ADAUSDT, SOLUSDT, DOTUSDT)
    
    Returns:
        Subscription confirmation
    """
    try:
        from ingestion.direct_websocket_manager import websocket_manager
        
        symbol = symbol.upper()
        await websocket_manager.subscribe_ticker(symbol)
        
        return {
            "status": "success",
            "message": f"Subscribed to {symbol}",
            "symbol": symbol,
            "subscribed_symbols": list(websocket_manager.get_subscribed_symbols())
        }
    except Exception as e:
        logger.error(f"Error subscribing to {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to subscribe: {str(e)}")


@router.post("/api/subscribe-all", tags=["Market Data"])
async def subscribe_to_all_symbols():
    """
    Subscribe to real-time data for all available symbols.
    
    Returns:
        Subscription confirmation with list of subscribed symbols
    """
    try:
        from ingestion.websocket_manager import websocket_manager
        
        # List of symbols to subscribe to
        symbols = ["BTCUSDT", "ETHUSDT", "ADAUSDT", "SOLUSDT", "DOTUSDT"]
        
        subscribed = []
        failed = []
        
        for symbol in symbols:
            try:
                await websocket_manager.subscribe_ticker(symbol)
                subscribed.append(symbol)
                logger.info(f"✅ Subscribed to {symbol}")
            except Exception as e:
                failed.append({"symbol": symbol, "error": str(e)})
                logger.error(f"❌ Failed to subscribe to {symbol}: {e}")
        
        return {
            "status": "success",
            "message": f"Subscribed to {len(subscribed)}/{len(symbols)} symbols",
            "subscribed": subscribed,
            "failed": failed,
            "total_subscribed": list(websocket_manager.get_subscribed_symbols())
        }
    except Exception as e:
        logger.error(f"Error subscribing to all symbols: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to subscribe: {str(e)}")


@router.get("/api/subscriptions", tags=["Market Data"])
async def get_active_subscriptions():
    """
    Get list of currently subscribed symbols.
    
    Returns:
        List of active symbol subscriptions
    """
    try:
        from ingestion.direct_websocket_manager import websocket_manager
        
        subscribed_symbols = list(websocket_manager.get_subscribed_symbols())
        
        return {
            "status": "success",
            "subscribed_symbols": subscribed_symbols,
            "count": len(subscribed_symbols)
        }
    except Exception as e:
        logger.error(f"Error getting subscriptions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get subscriptions: {str(e)}")


# ============================================================================
# CSV EXPORT ENDPOINT
# ============================================================================

@router.get("/api/export/{symbol}/{timeframe}", tags=["Data Export"])
async def export_csv(
    symbol: str,
    timeframe: str,
    limit: int = Query(1000, ge=1, le=10000),
    db: AsyncSession = Depends(get_db)
):
    """
    Export OHLCV data as CSV file.
    
    Args:
        symbol: Trading symbol (e.g., BTCUSDT)
        timeframe: Timeframe (1m, 5m, 15m, 1h, 4h, 1d)
        limit: Number of candles to export (max 10000)
    
    Returns:
        CSV file with OHLCV data
    """
    try:
        # Query OHLCV data
        stmt = (
            select(ResampledData)
            .where(
                and_(
                    ResampledData.symbol == symbol,
                    ResampledData.timeframe == timeframe
                )
            )
            .order_by(desc(ResampledData.timestamp))
            .limit(limit)
        )
        
        result = await db.execute(stmt)
        candles = result.scalars().all()
        
        if not candles:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for {symbol} {timeframe}"
            )
        
        # Convert to DataFrame
        data = []
        for candle in reversed(candles):  # Reverse to get chronological order
            data.append({
                "timestamp": candle.timestamp.isoformat(),
                "symbol": candle.symbol,
                "timeframe": candle.timeframe,
                "open": candle.open,
                "high": candle.high,
                "low": candle.low,
                "close": candle.close,
                "volume": candle.volume,
                "trade_count": candle.trade_count
            })
        
        df = pd.DataFrame(data)
        
        # Create CSV in memory
        output = io.StringIO()
        df.to_csv(output, index=False)
        csv_content = output.getvalue()
        
        # Create filename
        filename = f"{symbol}_{timeframe}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


# ============================================================================
# STATS TABLE ENDPOINT
# ============================================================================

@router.get("/api/stats/timeseries", tags=["Analytics"])
async def get_timeseries_stats(
    symbol: str = Query(..., description="Trading symbol"),
    timeframe: str = Query("5m", description="Timeframe for aggregation"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Get time-series statistics table with aggregated metrics.
    
    Returns a table with:
    - Timestamp
    - Volume
    - Trade Count
    - Average Price
    - Price Range (High - Low)
    - Price Change %
    
    Args:
        symbol: Trading symbol
        timeframe: Timeframe for data (1m, 5m, 15m, 1h, 4h, 1d)
        limit: Number of rows to return
    """
    try:
        # Query OHLCV data
        stmt = (
            select(ResampledData)
            .where(
                and_(
                    ResampledData.symbol == symbol,
                    ResampledData.timeframe == timeframe
                )
            )
            .order_by(desc(ResampledData.timestamp))
            .limit(limit)
        )
        
        result = await db.execute(stmt)
        candles = result.scalars().all()
        
        if not candles:
            return {
                "symbol": symbol,
                "timeframe": timeframe,
                "count": 0,
                "stats": []
            }
        
        # Calculate stats for each candle
        stats = []
        prev_close = None
        
        for candle in reversed(candles):  # Chronological order
            avg_price = (candle.high + candle.low + candle.close + candle.open) / 4
            price_range = candle.high - candle.low
            
            # Calculate price change %
            if prev_close is not None:
                price_change_pct = ((candle.close - prev_close) / prev_close) * 100
            else:
                price_change_pct = 0.0
            
            stats.append({
                "timestamp": candle.timestamp.isoformat(),
                "open": round(candle.open, 2),
                "high": round(candle.high, 2),
                "low": round(candle.low, 2),
                "close": round(candle.close, 2),
                "volume": round(candle.volume, 4),
                "trade_count": candle.trade_count,
                "avg_price": round(avg_price, 2),
                "price_range": round(price_range, 2),
                "price_change_pct": round(price_change_pct, 2)
            })
            
            prev_close = candle.close
        
        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "count": len(stats),
            "stats": list(reversed(stats))  # Most recent first
        }
        
    except Exception as e:
        logger.error(f"Error getting timeseries stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


# ============================================================================
# CROSS-CORRELATION HEATMAP ENDPOINT
# ============================================================================

@router.get("/api/correlation/matrix", tags=["Analytics"])
async def get_correlation_matrix(
    timeframe: str = Query("5m", description="Timeframe for correlation"),
    lookback: int = Query(100, ge=5, le=500, description="Number of candles for correlation"),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculate cross-correlation matrix between all trading symbols.
    
    Returns correlation coefficients between:
    - BTCUSDT
    - ETHUSDT  
    - ADAUSDT
    - SOLUSDT
    - DOTUSDT
    
    Args:
        timeframe: Timeframe for data (1m, 5m, 15m, 1h, 4h, 1d)
        lookback: Number of candles to use for correlation calculation (min 5)
    """
    try:
        symbols = ["BTCUSDT", "ETHUSDT", "ADAUSDT", "SOLUSDT", "DOTUSDT"]
        
        # Fetch price data for all symbols
        price_data = {}
        
        for symbol in symbols:
            stmt = (
                select(ResampledData)
                .where(
                    and_(
                        ResampledData.symbol == symbol,
                        ResampledData.timeframe == timeframe
                    )
                )
                .order_by(desc(ResampledData.timestamp))
                .limit(lookback)
            )
            
            result = await db.execute(stmt)
            candles = result.scalars().all()
            
            if len(candles) < 5:  # Minimum data requirement (lowered from 20)
                logger.warning(f"Insufficient data for {symbol}: {len(candles)} candles")
                continue
            
            # Extract closing prices in chronological order
            prices = [c.close for c in reversed(candles)]
            price_data[symbol] = prices
        
        if len(price_data) < 2:
            raise HTTPException(
                status_code=404,
                detail="Insufficient data for correlation calculation. Need at least 2 symbols with 5+ candles each."
            )
        
        # Create DataFrame for correlation
        df = pd.DataFrame(price_data)
        
        # Calculate actual data points used
        actual_candles = min(len(prices) for prices in price_data.values())
        data_quality = "excellent" if actual_candles >= 50 else "good" if actual_candles >= 20 else "limited"
        
        # Calculate correlation matrix
        corr_matrix = df.corr()
        
        # Convert to nested dictionary format for frontend
        correlation_data = []
        for symbol1 in corr_matrix.index:
            for symbol2 in corr_matrix.columns:
                correlation_data.append({
                    "symbol1": symbol1,
                    "symbol2": symbol2,
                    "correlation": round(corr_matrix.loc[symbol1, symbol2], 4)
                })
        
        return {
            "timeframe": timeframe,
            "lookback": lookback,
            "symbols": list(price_data.keys()),
            "correlations": correlation_data,
            "matrix": corr_matrix.to_dict(),
            "metadata": {
                "actual_candles": actual_candles,
                "data_quality": data_quality,
                "warning": "Limited data - correlation may be less reliable" if actual_candles < 20 else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating correlation matrix: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Correlation calculation failed: {str(e)}")
