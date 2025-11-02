"""
Market Data API Routes
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from database.connection import get_db
from database.models import RawTicks, ResampledData, MarketMetadata
from ingestion.websocket_manager import websocket_manager

router = APIRouter(prefix="/market-data")


class SymbolInfo(BaseModel):
    symbol: str
    exchange: str


class TickDataResponse(BaseModel):
    symbol: str
    exchange: str = "binance"
    price: float
    volume: float
    timestamp: datetime


class CandleDataResponse(BaseModel):
    symbol: str
    exchange: str = "binance"
    interval: str
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    volume: float
    timestamp: datetime


class SubscriptionRequest(BaseModel):
    symbol: str


@router.get("/symbols", response_model=List[SymbolInfo])
async def get_symbols(db: AsyncSession = Depends(get_db)):
    """Get all available symbols"""
    try:
        query = select(MarketMetadata.symbol, MarketMetadata.exchange).distinct()
        result = await db.execute(query)
        symbols = result.all()
        
        return [
            SymbolInfo(symbol=symbol, exchange=exchange)
            for symbol, exchange in symbols
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ticks/{symbol}", response_model=List[TickDataResponse])
async def get_tick_data(
    symbol: str,
    limit: int = Query(default=100, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get raw tick data for a symbol"""
    try:
        query = select(RawTicks).where(
            RawTicks.symbol == symbol.upper()
        ).order_by(desc(RawTicks.timestamp)).limit(limit)
        
        result = await db.execute(query)
        ticks = result.scalars().all()
        
        return [
            TickDataResponse(
                symbol=tick.symbol,
                exchange="binance",
                price=float(tick.price),
                quantity=float(tick.quantity),
                timestamp=tick.timestamp
            )
            for tick in ticks
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/candles/{symbol}", response_model=List[CandleDataResponse])
async def get_candle_data(
    symbol: str,
    interval: str = Query(default="1m"),
    limit: int = Query(default=100, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get candlestick data for a symbol"""
    try:
        query = select(ResampledData).where(
            ResampledData.symbol == symbol.upper(),
            ResampledData.timeframe == interval
        ).order_by(desc(ResampledData.timestamp)).limit(limit)
        
        result = await db.execute(query)
        candles = result.scalars().all()
        
        return [
            CandleDataResponse(
                symbol=candle.symbol,
                exchange="binance",
                interval=candle.timeframe,
                open_price=float(candle.open),
                high_price=float(candle.high),
                low_price=float(candle.low),
                close_price=float(candle.close),
                volume=float(candle.volume),
                timestamp=candle.timestamp
            )
            for candle in candles
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subscriptions")
async def get_subscriptions():
    """Get currently subscribed symbols"""
    return {
        "subscribed_symbols": list(websocket_manager.get_subscribed_symbols()),
        "total_count": len(websocket_manager.get_subscribed_symbols())
    }


@router.post("/subscribe")
async def subscribe_symbol(request: SubscriptionRequest):
    """Subscribe to real-time data for a symbol"""
    try:
        await websocket_manager.subscribe_ticker(request.symbol.upper())
        return {
            "message": f"Subscribed to {request.symbol.upper()}",
            "symbol": request.symbol.upper()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/unsubscribe")
async def unsubscribe_symbol(request: SubscriptionRequest):
    """Unsubscribe from real-time data for a symbol"""
    try:
        await websocket_manager.unsubscribe_ticker(request.symbol.upper())
        return {
            "message": f"Unsubscribed from {request.symbol.upper()}",
            "symbol": request.symbol.upper()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/latest/{symbol}")
async def get_latest_price(
    symbol: str,
    db: AsyncSession = Depends(get_db)
):
    """Get latest price for a symbol"""
    try:
        query = select(RawTicks).where(
            RawTicks.symbol == symbol.upper()
        ).order_by(desc(RawTicks.timestamp)).limit(1)
        
        result = await db.execute(query)
        tick = result.scalar_one_or_none()
        
        if not tick:
            raise HTTPException(status_code=404, detail="No data found for symbol")
        
        return {
            "symbol": tick.symbol,
            "price": float(tick.price),
            "volume": float(tick.quantity),
            "timestamp": tick.timestamp
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))