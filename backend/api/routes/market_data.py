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
from database.models import TickData, CandleData, Symbol
from ingestion.websocket_manager import websocket_manager

router = APIRouter()


class TickDataResponse(BaseModel):
    symbol: str
    exchange: str
    price: float
    volume: float
    timestamp: datetime


class CandleDataResponse(BaseModel):
    symbol: str
    exchange: str
    interval: str
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    volume: float
    timestamp: datetime


class SubscriptionRequest(BaseModel):
    symbol: str


@router.get("/symbols", response_model=List[str])
async def get_active_symbols(db: AsyncSession = Depends(get_db)):
    """Get list of active symbols"""
    try:
        query = select(Symbol.symbol).where(Symbol.is_active == True)
        result = await db.execute(query)
        symbols = [row[0] for row in result.fetchall()]
        return symbols
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ticks/{symbol}", response_model=List[TickDataResponse])
async def get_tick_data(
    symbol: str,
    limit: int = Query(default=100, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get recent tick data for a symbol"""
    try:
        query = select(TickData).where(
            TickData.symbol == symbol.upper()
        ).order_by(desc(TickData.timestamp)).limit(limit)
        
        result = await db.execute(query)
        ticks = result.scalars().all()
        
        return [
            TickDataResponse(
                symbol=tick.symbol,
                exchange=tick.exchange,
                price=tick.price,
                volume=tick.volume,
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
        query = select(CandleData).where(
            CandleData.symbol == symbol.upper(),
            CandleData.interval == interval
        ).order_by(desc(CandleData.timestamp)).limit(limit)
        
        result = await db.execute(query)
        candles = result.scalars().all()
        
        return [
            CandleDataResponse(
                symbol=candle.symbol,
                exchange=candle.exchange,
                interval=candle.interval,
                open_price=candle.open_price,
                high_price=candle.high_price,
                low_price=candle.low_price,
                close_price=candle.close_price,
                volume=candle.volume,
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
        query = select(TickData).where(
            TickData.symbol == symbol.upper()
        ).order_by(desc(TickData.timestamp)).limit(1)
        
        result = await db.execute(query)
        tick = result.scalar_one_or_none()
        
        if not tick:
            raise HTTPException(status_code=404, detail="No data found for symbol")
        
        return {
            "symbol": tick.symbol,
            "price": tick.price,
            "volume": tick.volume,
            "timestamp": tick.timestamp
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))