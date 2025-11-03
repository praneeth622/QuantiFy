/**
 * useAggregatedTicks Hook
 * Aggregates tick data based on timeframe to prevent fluctuations
 */
'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

interface TickData {
  symbol: string;
  price: number;
  quantity: number;
  timestamp: string;
}

interface AggregatedCandle {
  timestamp: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol: string;
}

interface UseAggregatedTicksOptions {
  ticks: TickData[];
  symbol: string;
  timeframe: string;
}

// Timeframe to milliseconds mapping
const TIMEFRAME_MS: Record<string, number> = {
  '1s': 1000,
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

/**
 * Aggregates tick data into OHLCV candles based on timeframe
 */
function aggregateTicksToCandles(
  ticks: TickData[],
  symbol: string,
  timeframe: string
): AggregatedCandle[] {
  const intervalMs = TIMEFRAME_MS[timeframe] || 60000; // Default to 1m
  
  // Filter ticks for the selected symbol
  const symbolTicks = ticks.filter(t => t.symbol === symbol);
  
  if (symbolTicks.length === 0) return [];

  // Group ticks by time interval
  const candleMap = new Map<number, TickData[]>();
  
  symbolTicks.forEach(tick => {
    const timestamp = new Date(tick.timestamp).getTime();
    const bucketTime = Math.floor(timestamp / intervalMs) * intervalMs;
    
    if (!candleMap.has(bucketTime)) {
      candleMap.set(bucketTime, []);
    }
    candleMap.get(bucketTime)!.push(tick);
  });

  // Convert to OHLCV candles
  const candles: AggregatedCandle[] = [];
  
  Array.from(candleMap.entries())
    .sort((a, b) => a[0] - b[0]) // Sort by timestamp
    .forEach(([bucketTime, bucketTicks]) => {
      const prices = bucketTicks.map(t => t.price);
      const volumes = bucketTicks.map(t => t.quantity);
      
      const candle: AggregatedCandle = {
        timestamp: new Date(bucketTime).toISOString(),
        time: new Date(bucketTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: timeframe === '1s' ? '2-digit' : undefined,
        }),
        open: bucketTicks[0].price,
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: bucketTicks[bucketTicks.length - 1].price,
        volume: volumes.reduce((sum, v) => sum + v, 0),
        symbol,
      };
      
      candles.push(candle);
    });

  // Return last 100 candles
  return candles.slice(-100);
}

/**
 * Hook to get aggregated tick data with caching
 */
export function useAggregatedTicks({ ticks, symbol, timeframe }: UseAggregatedTicksOptions) {
  // Create a hash of the most recent tick data to detect actual changes
  // This ensures React Query re-aggregates when new WebSocket data arrives
  const latestTickHash = useMemo(() => {
    if (ticks.length === 0) return 'empty';
    // Use the last tick's timestamp + price as a fingerprint
    const lastTick = ticks[ticks.length - 1];
    return `${lastTick?.timestamp}-${lastTick?.price}-${ticks.length}`;
  }, [ticks]);

  // Use React Query to cache aggregated data
  const { data: aggregatedData, isLoading } = useQuery({
    queryKey: ['aggregatedTicks', symbol, timeframe, latestTickHash],
    queryFn: () => {
      const candles = aggregateTicksToCandles(ticks, symbol, timeframe);
      console.log(`[useAggregatedTicks] Aggregated ${ticks.length} ticks into ${candles.length} candles for timeframe: ${timeframe}`);
      return candles;
    },
    enabled: ticks.length > 0 && !!symbol,
    staleTime: 1000, // Consider data stale after 1 second (reduced for real-time updates)
    gcTime: 30000, // Keep in cache for 30 seconds
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!aggregatedData || aggregatedData.length === 0) {
      return {
        currentPrice: 0,
        change24h: 0,
        high24h: 0,
        low24h: 0,
        volume24h: 0,
        candleCount: 0,
      };
    }

    const prices = aggregatedData.map(c => c.close);
    const volumes = aggregatedData.map(c => c.volume);

    return {
      currentPrice: aggregatedData[aggregatedData.length - 1]?.close || 0,
      change24h: aggregatedData.length > 1
        ? ((aggregatedData[aggregatedData.length - 1].close - aggregatedData[0].open) / aggregatedData[0].open) * 100
        : 0,
      high24h: Math.max(...aggregatedData.map(c => c.high)),
      low24h: Math.min(...aggregatedData.map(c => c.low)),
      volume24h: volumes.reduce((sum, v) => sum + v, 0),
      candleCount: aggregatedData.length,
    };
  }, [aggregatedData]);

  // Convert to chart format
  const chartData = useMemo(() => {
    if (!aggregatedData) return [];
    
    const data = aggregatedData.map(candle => ({
      symbol,
      timestamp: candle.timestamp,
      time: candle.time,
      price: candle.close,
      quantity: candle.volume, // Add quantity for VolumeChart compatibility
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      rawTimestamp: new Date(candle.timestamp).getTime(),
    }));
    
    console.log(`[useAggregatedTicks] Chart data points: ${data.length}, Current price: $${data[data.length - 1]?.price.toFixed(2)}`);
    return data;
  }, [aggregatedData, symbol]);

  return {
    candles: aggregatedData || [],
    chartData,
    stats,
    isLoading,
  };
}
