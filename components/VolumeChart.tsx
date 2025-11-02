/**
 * VolumeChart Component
 * Real-time volume chart using recharts with bar visualization
 */
'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Loader2, BarChart3 } from 'lucide-react';

interface TickData {
  symbol: string;
  price: number;
  quantity?: number;
  timestamp: string;
  [key: string]: any;
}

interface VolumeChartProps {
  symbol: string;
  timeframe: string;
  data: TickData[];
  className?: string;
}

interface ChartDataPoint {
  timestamp: string;
  time: string;
  volume: number;
  value: number;
  rawTimestamp: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: ChartDataPoint;
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-2">{data.time}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-xs text-muted-foreground">Volume:</span>
          <span className="text-sm font-mono font-semibold">
            {data.volume.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-muted-foreground">Value:</span>
          <span className="text-sm font-mono">${data.value.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export function VolumeChart({ symbol, timeframe, data, className = '' }: VolumeChartProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [symbol, timeframe]);

  const chartData = useMemo(() => {
    try {
      if (!data || data.length === 0) return [];

      const filteredData = data
        .filter((tick) => {
          return (
            tick &&
            tick.symbol === symbol &&
            typeof tick.price === 'number' &&
            tick.quantity !== undefined &&
            tick.timestamp
          );
        })
        .slice(0, 100)
        .reverse();

      if (filteredData.length === 0) {
        setError(`No volume data for ${symbol}`);
        return [];
      }

      setError(null);

      return filteredData.map((tick) => {
        const timestamp = new Date(tick.timestamp);
        const volume = tick.quantity ?? 0;
        const value = tick.price * volume;

        return {
          timestamp: tick.timestamp,
          time: timestamp.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          volume,
          value,
          rawTimestamp: timestamp.getTime(),
        };
      });
    } catch (err) {
      setError('Error processing volume data');
      console.error('[VolumeChart] Error:', err);
      return [];
    }
  }, [data, symbol]);

  const totalVolume = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.volume, 0);
  }, [chartData]);

  const totalValue = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.value, 0);
  }, [chartData]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full min-h-[300px] ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading volume data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full min-h-[300px] ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-destructive text-xl">⚠</span>
          </div>
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full min-h-[300px] ${className}`}>
        <div className="text-center text-muted-foreground">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <p className="text-sm">No volume data for {symbol}</p>
          <p className="text-xs mt-1">Waiting for real-time data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{symbol}</h3>
          <span className="text-xs text-muted-foreground">Volume ({timeframe})</span>
        </div>
        <div className="text-sm font-semibold text-accent">
          {totalVolume.toFixed(2)}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3 px-2 text-xs text-muted-foreground">
        <span>{chartData.length} bars</span>
        <span>•</span>
        <span>Total Value: ${totalValue.toFixed(2)}</span>
      </div>

      <ResponsiveContainer width="100%" height="100%" minHeight={250}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="time"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value.toFixed(2)}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            iconType="rect"
          />
          <Bar
            dataKey="volume"
            fill="hsl(var(--accent))"
            name="Volume"
            radius={[4, 4, 0, 0]}
            animationDuration={300}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-2 px-2 text-xs text-muted-foreground text-center">
        <span>Auto-updating • Last {chartData.length} trades</span>
      </div>
    </div>
  );
}
