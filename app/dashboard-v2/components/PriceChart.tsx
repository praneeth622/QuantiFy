"use client";

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDashboard, Tick } from '../context/DashboardContext';
import { Loader2 } from 'lucide-react';

export default function PriceChart() {
  const { ticks, isLoading, timeframe, rollingWindow } = useDashboard();

  const chartData = useMemo(() => {
    if (!ticks || ticks.length === 0) return [];

    // Reverse to show chronological order
    const sortedTicks = [...ticks].reverse();

    // Always aggregate based on timeframe (whether using OHLCV or raw ticks)
    const timeframeMs: Record<string, number> = {
      '1s': 1000,
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };

    const aggregatedTicks: Tick[] = [];
    const interval = timeframeMs[timeframe] || 1000;
    
    // Group ticks into buckets by timeframe
    const buckets = new Map<number, Tick[]>();

    sortedTicks.forEach(tick => {
      const timestamp = new Date(tick.timestamp).getTime();
      const bucketKey = Math.floor(timestamp / interval) * interval;
      
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(tick);
    });

    // Create aggregated ticks (OHLC-style: use last price, average bid/ask)
    Array.from(buckets.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([bucketKey, ticksInBucket]) => {
        if (ticksInBucket.length > 0) {
          const lastTick = ticksInBucket[ticksInBucket.length - 1];
          const avgBid = ticksInBucket
            .filter(t => t.bid !== undefined)
            .reduce((sum, t) => sum + (t.bid || 0), 0) / ticksInBucket.length || undefined;
          const avgAsk = ticksInBucket
            .filter(t => t.ask !== undefined)
            .reduce((sum, t) => sum + (t.ask || 0), 0) / ticksInBucket.length || undefined;

          aggregatedTicks.push({
            ...lastTick,
            timestamp: new Date(bucketKey).toISOString(),
            bid: avgBid,
            ask: avgAsk,
          });
        }
      });

    // Apply rolling window filter
    const windowedData = aggregatedTicks.slice(-rollingWindow);

    return windowedData
      .filter((tick) => tick && typeof tick.price === 'number' && tick.timestamp)
      .map((tick) => ({
        time: new Date(tick.timestamp).toLocaleTimeString(),
        price: tick.price,
        bid: tick.bid,
        ask: tick.ask,
      }));
  }, [ticks, rollingWindow, timeframe]);

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="time" 
          stroke="#9CA3AF"
          tick={{ fill: '#9CA3AF' }}
        />
        <YAxis 
          stroke="#9CA3AF"
          tick={{ fill: '#9CA3AF' }}
          domain={['auto', 'auto']}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1F2937', 
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#F9FAFB'
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="price" 
          stroke="#3B82F6" 
          strokeWidth={2}
          dot={false}
          name="Price"
        />
        {chartData[0]?.bid && (
          <Line 
            type="monotone" 
            dataKey="bid" 
            stroke="#10B981" 
            strokeWidth={1}
            dot={false}
            strokeDasharray="5 5"
            name="Bid"
          />
        )}
        {chartData[0]?.ask && (
          <Line 
            type="monotone" 
            dataKey="ask" 
            stroke="#EF4444" 
            strokeWidth={1}
            dot={false}
            strokeDasharray="5 5"
            name="Ask"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
