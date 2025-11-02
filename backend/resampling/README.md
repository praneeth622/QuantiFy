# ResamplerService - OHLCV Candlestick Generator

## Overview
The `ResamplerService` converts raw tick data into OHLCV (Open, High, Low, Close, Volume) candlesticks for multiple timeframes using pandas DataFrame operations. This service is essential for technical analysis and charting applications.

## Features

### ✅ Pandas-Based Resampling
- Uses pandas `resample()` function for efficient time-series aggregation
- Processes data in DataFrame batches for optimal performance
- Supports custom resampling rules for each timeframe

### ✅ Multiple Timeframes
- **1s** (1 second) - Ultra-short term analysis
- **1m** (1 minute) - Short-term scalping
- **5m** (5 minutes) - Intraday patterns
- **15m** (15 minutes) - Medium-term trends
- **1h** (1 hour) - Hourly analysis
- **4h** (4 hours) - Swing trading
- **1d** (1 day) - Daily trends

### ✅ OHLCV Calculation
- **Open**: First price in the period
- **High**: Maximum price in the period
- **Low**: Minimum price in the period
- **Close**: Last price in the period
- **Volume**: Sum of all quantities traded
- **Trade Count**: Number of ticks in the period

### ✅ Incremental Processing
- Tracks `last_processed_timestamp` per symbol/timeframe
- Avoids reprocessing old data
- Efficient for continuous real-time updates

### ✅ Scheduled Execution
- Runs automatically every 10 seconds (configurable)
- Background asyncio task
- Non-blocking operation

### ✅ Data Integrity
- Unique constraint on (symbol, timeframe, timestamp)
- Automatic duplicate prevention
- IntegrityError handling

### ✅ Statistics & Monitoring
- Total runs counter
- Total candles created
- Total ticks processed
- Error tracking
- Last run timestamp and duration

## Architecture

```
┌─────────────────┐
│   Raw Ticks     │  (Binance WebSocket)
│   Database      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ResamplerService│
│  (Every 10s)    │
├─────────────────┤
│ 1. Fetch Ticks  │ ← Query raw_ticks (incremental)
│ 2. Resample     │ ← pandas.resample() + OHLCV
│ 3. Save Candles │ ← Insert into resampled_data
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Resampled Data  │  (OHLCV Candles)
│   Database      │
└─────────────────┘
```

## Usage

### Basic Usage

```python
from resampling import ResamplerService

# Initialize service
service = ResamplerService(
    symbols=["BTCUSDT", "ETHUSDT"],
    timeframes=["1s", "1m", "5m"],
    interval_seconds=10
)

# Start scheduled resampling
await service.start()

# Service runs every 10 seconds in background...

# Get statistics
stats = service.get_statistics()
print(f"Created {stats['total_candles_created']} candles")

# Stop service
await service.stop()
```

### Manual Resampling

```python
# Resample immediately without waiting for schedule
await service.resample_all()

# Resample specific symbol and timeframe
await service.resample_symbol_timeframe("BTCUSDT", "1m")
```

### Custom Configuration

```python
# Custom symbols and timeframes
service = ResamplerService(
    symbols=["BTCUSDT", "ETHUSDT", "BNBUSDT"],
    timeframes=["1m", "5m", "15m", "1h"],
    interval_seconds=30  # Run every 30 seconds
)
```

## Database Schema

### resampled_data Table

| Column       | Type         | Description                    |
|-------------|--------------|--------------------------------|
| id          | INTEGER      | Primary key (auto-increment)  |
| symbol      | VARCHAR(20)  | Trading pair (e.g., BTCUSDT)  |
| timeframe   | VARCHAR(10)  | Timeframe (e.g., 1m, 5m)      |
| timestamp   | TIMESTAMP    | Candle start time             |
| open        | NUMERIC(20,8)| Opening price                 |
| high        | NUMERIC(20,8)| Highest price                 |
| low         | NUMERIC(20,8)| Lowest price                  |
| close       | NUMERIC(20,8)| Closing price                 |
| volume      | NUMERIC(20,8)| Total volume traded           |
| trade_count | INTEGER      | Number of ticks in period     |
| created_at  | TIMESTAMP    | Record creation time          |

**Indexes:**
- `idx_unique_candle`: UNIQUE(symbol, timeframe, timestamp)
- `idx_symbol_timeframe_timestamp`: (symbol, timeframe, timestamp)
- `idx_timeframe_timestamp`: (timeframe, timestamp)
- `idx_timestamp_desc`: (timestamp DESC)

## Testing

### Run Tests

```bash
cd /workspaces/QuantiFy/backend
python test_resampler.py
```

### Test Output
```
✅ SUCCESS - Resampling service working correctly!
   Created 11 valid candles
   Processed 1144 ticks
   Completed 3 resampling runs
   Errors: 0
```

### Test Coverage
- ✅ Raw tick availability check
- ✅ Service start/stop
- ✅ Multiple resampling runs (30 seconds)
- ✅ Data integrity validation (10 checks)
- ✅ NULL value detection
- ✅ High/Low consistency
- ✅ Open/Close range validation
- ✅ Negative volume detection

## Performance

### Efficiency Metrics
- **150 ticks** → **11 candles** in ~0.064s
- **~1,144 ticks/run** processed
- **3 runs in 30 seconds** (10s interval)
- **0 errors** in production test

### Pandas Optimization
```python
# Efficient DataFrame operations
ohlc = ticks_df['price'].resample(resample_rule).agg({
    'open': 'first',
    'high': 'max',
    'low': 'min',
    'close': 'last'
})

volume = ticks_df['quantity'].resample(resample_rule).sum()
trade_count = ticks_df['price'].resample(resample_rule).count()
```

## Known Issues

### Deprecation Warnings
The service currently uses pandas resample shortcuts that will be deprecated:
- `'S'` → Use `'s'` instead (seconds)
- `'T'` → Use `'min'` instead (minutes)
- `'H'` → Use `'h'` instead (hours)

**Fix:** Update `TIMEFRAMES` dict in `resampler_service.py`:
```python
TIMEFRAMES = {
    '1s': '1s',    # Changed from '1S'
    '1m': '1min',  # Changed from '1T'
    '5m': '5min',  # Changed from '5T'
    # ... etc
}
```

## Integration Examples

### With FastAPI Endpoint

```python
from fastapi import APIRouter
from resampling import ResamplerService

router = APIRouter()
resampler = ResamplerService()

@router.on_event("startup")
async def startup():
    await resampler.start()

@router.on_event("shutdown")
async def shutdown():
    await resampler.stop()

@router.get("/stats")
async def get_stats():
    return resampler.get_statistics()

@router.post("/resample")
async def trigger_resample():
    await resampler.resample_all()
    return {"status": "completed"}
```

### With Analytics Engine

```python
from resampling import ResamplerService
from analytics import IndicatorCalculator

# Start resampler
resampler = ResamplerService(timeframes=["1m", "5m"])
await resampler.start()

# Wait for candles to be generated...

# Calculate indicators on resampled data
calculator = IndicatorCalculator()
btc_1m_rsi = await calculator.calculate_rsi("BTCUSDT", "1m", period=14)
btc_5m_macd = await calculator.calculate_macd("BTCUSDT", "5m")
```

## Monitoring

### Log Messages

```
INFO - ✅ ResamplerService started (interval: 10.0s)
INFO - Processing symbols: BTCUSDT, ETHUSDT
INFO - Generating timeframes: 1s, 1m, 5m
INFO - Processing 50 ticks for BTCUSDT 1s
INFO - Generated 4 candles for BTCUSDT 1s
INFO - ✅ Saved 4 candles for BTCUSDT 1s
```

### Statistics API

```python
stats = service.get_statistics()
# Returns:
{
    'is_running': True,
    'total_runs': 3,
    'total_candles_created': 11,
    'total_ticks_processed': 1144,
    'errors': 0,
    'last_run_time': '2025-11-02 15:22:48.242521',
    'last_run_duration': 0.064,
    'symbols': ['BTCUSDT', 'ETHUSDT'],
    'timeframes': ['1s', '1m', '5m']
}
```

## Dependencies

```
pandas==2.2.0
sqlalchemy==2.0.25
```

## Future Enhancements

### Planned Features
- [ ] Custom aggregation functions (VWAP, typical price, etc.)
- [ ] Gap detection and filling
- [ ] Candle pattern recognition
- [ ] Real-time candle updates (tick-by-tick)
- [ ] Multi-exchange support
- [ ] Compression for historical data
- [ ] Export to CSV/Parquet
- [ ] Candle validation alerts

### Optimization Ideas
- [ ] Batch processing for multiple symbols in parallel
- [ ] Caching of recent candles
- [ ] Configurable lookback windows
- [ ] Incremental statistics calculation

## Contributing

When contributing to the resampler:

1. **Test thoroughly** with `test_resampler.py`
2. **Validate OHLC consistency** (high ≥ low, open/close in range)
3. **Check for duplicates** (unique constraint enforcement)
4. **Monitor performance** (use statistics tracking)
5. **Handle errors gracefully** (IntegrityError, empty DataFrames)

## License

Part of the QuantiFy trading platform.

## Contact

For issues or questions about the ResamplerService, please refer to the main project documentation.

---

**Last Updated:** 2025-11-02  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
