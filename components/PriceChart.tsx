/**
 * PriceChart Component
 * Real-time price chart using recharts with OHLC data
 */
'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

interface TickData {
  symbol: string;
  price: number;
  quantity?: number;
  timestamp: string;
  [key: string]: any;
}

interface PriceChartProps {
  symbol: string;
  timeframe: string;
  data: TickData[];
  className?: string;
}

interface ChartDataPoint {
  timestamp: string;
  time: string;
  price: number;
  volume: number;
  rawTimestamp: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: ChartDataPoint;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const price = payload[0].value;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-2">{data.time}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-xs text-muted-foreground">Price:</span>
          <span className="text-sm font-mono font-semibold">
            ${typeof price === 'number' ? price.toFixed(2) : '0.00'}
          </span>
        </div>
        {data.volume > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-xs text-muted-foreground">Volume:</span>
            <span className="text-sm font-mono">{data.volume.toFixed(4)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export function PriceChart({ symbol, timeframe, data, className = '' }: PriceChartProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [symbol, timeframe]);

  // Process and format chart data
  const chartData = useMemo(() => {
    try {
      if (!data || data.length === 0) {
        console.log('[PriceChart] No data received');
        return [];
      }

      console.log('[PriceChart] Received data:', {
        totalPoints: data.length,
        firstPoint: data[0],
        symbol,
      });

      // Filter data by symbol and take last 100 points
      const filteredData = data
        .filter((tick) => {
          return (
            tick &&
            tick.symbol === symbol &&
            typeof tick.price === 'number' &&
            tick.timestamp
          );
        })
        .slice(0, 100)
        .reverse(); // Reverse to show chronological order

      console.log('[PriceChart] Filtered data:', {
        filteredCount: filteredData.length,
        symbol,
      });

      if (filteredData.length === 0) {
        setError(`No data available for ${symbol}`);
        return [];
      }

      setError(null);

      // Format data for recharts
      return filteredData.map((tick) => {
        const timestamp = new Date(tick.timestamp);
        return {
          timestamp: tick.timestamp,
          time: timestamp.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          price: tick.price,
          volume: tick.quantity ?? 0,
          rawTimestamp: timestamp.getTime(),
        };
      });
    } catch (err) {
      setError('Error processing chart data');
      console.error('[PriceChart] Error:', err);
      return [];
    }
  }, [data, symbol]);

  // Calculate price trend
  const priceTrend = useMemo(() => {
    if (chartData.length < 2) return 0;
    const firstPrice = chartData[0].price;
    const lastPrice = chartData[chartData.length - 1].price;
    return lastPrice - firstPrice;
  }, [chartData]);

  // Calculate min/max for Y-axis domain
  const priceRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 100 };

    const prices = chartData.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1; // 10% padding

    return {
      min: Math.floor(min - padding),
      max: Math.ceil(max + padding),
    };
  }, [chartData]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full min-h-[300px] ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading chart data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center h-full min-h-[300px] ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-destructive text-xl">⚠</span>
          </div>
          <p className="text-sm text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Check WebSocket connection or try different symbol
          </p>
        </div>
      </div>
    );
  }

  // No data state
  if (chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full min-h-[300px] ${className}`}>
        <div className="text-center text-muted-foreground">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-sm">No data available for {symbol}</p>
          <p className="text-xs mt-1">Waiting for real-time data...</p>
        </div>
      </div>
    );
  }

  const lineColor = priceTrend >= 0 ? '#16a34a' : '#dc2626'; // green-600 : red-600

  return (
    <div className={`w-full h-full ${className}`}>
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{symbol}</h3>
          <span className="text-xs text-muted-foreground">({timeframe})</span>
        </div>
        <div className="flex items-center gap-2">
          {priceTrend >= 0 ? (
            <TrendingUp className="w-4 h-4 text-green-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-600" />
          )}
          <span
            className={`text-sm font-semibold ${
              priceTrend >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {priceTrend >= 0 ? '+' : ''}
            {priceTrend.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Chart Stats */}
      <div className="flex items-center gap-4 mb-3 px-2 text-xs text-muted-foreground">
        <span>{chartData.length} points</span>
        {chartData.length > 0 && (
          <>
            <span>•</span>
            <span>
              Latest: ${chartData[chartData.length - 1]?.price.toFixed(2) ?? '0.00'}
            </span>
          </>
        )}
      </div>

      {/* Recharts Line Chart */}
      <ResponsiveContainer width="100%" height="100%" minHeight={250}>
        <LineChart
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
            domain={[priceRange.min, priceRange.max]}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              fill: lineColor,
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
            name="Price (USD)"
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Footer Info */}
      <div className="mt-2 px-2 text-xs text-muted-foreground text-center">
        <span>Auto-updating • Last {chartData.length} data points</span>
      </div>
    </div>
  );
}
