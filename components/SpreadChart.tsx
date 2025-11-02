/**
 * SpreadChart Component
 * Fetches and displays spread and z-score data from API
 * Uses ComposedChart with dual Y-axes and conditional coloring
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { getSpreadAnalytics } from '@/app/services/api';
import type { SpreadAnalytics, AnalyticsQueryParams } from '@/app/services/types';
import { Button } from '@/components/ui/button';

interface SpreadChartProps {
  symbol1: string;
  symbol2: string;
  window: number;
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}

interface ChartDataPoint {
  timestamp: string;
  time: string;
  spread: number;
  zScore: number;
  mean: number;
  stdDev: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    name: string;
    color: string;
    payload: ChartDataPoint;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const zScore = data.zScore;
  const absZ = Math.abs(zScore);

  // Determine z-score status
  let zStatus = 'Normal';
  let zColor = 'text-green-600';
  if (absZ > 2) {
    zStatus = 'Extreme';
    zColor = 'text-red-600';
  } else if (absZ > 1) {
    zStatus = 'Warning';
    zColor = 'text-yellow-600';
  }

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg min-w-[200px]">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <div className="space-y-2">
        <div className="flex justify-between gap-4">
          <span className="text-xs text-muted-foreground">Spread:</span>
          <span className="text-sm font-mono font-semibold">
            {data.spread.toFixed(6)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-muted-foreground">Z-Score:</span>
          <span className={`text-sm font-mono font-semibold ${zColor}`}>
            {zScore.toFixed(3)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-muted-foreground">Status:</span>
          <span className={`text-sm font-semibold ${zColor}`}>
            {zStatus}
          </span>
        </div>
        <div className="pt-2 mt-2 border-t border-border">
          <div className="flex justify-between gap-4">
            <span className="text-xs text-muted-foreground">Mean:</span>
            <span className="text-xs font-mono">{data.mean.toFixed(6)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-xs text-muted-foreground">Std Dev:</span>
            <span className="text-xs font-mono">{data.stdDev.toFixed(6)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export function SpreadChart({
  symbol1,
  symbol2,
  window,
  className = '',
  autoRefresh = false,
  refreshInterval = 30,
}: SpreadChartProps) {
  const [data, setData] = useState<SpreadAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch spread data
  const fetchData = async () => {
    try {
      setError(null);
      
      // Calculate time range based on window
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - window * 60 * 1000);
      
      const params: AnalyticsQueryParams = {
        symbol_pair: `${symbol1}-${symbol2}`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        limit: 100,
      };
      
      const result = await getSpreadAnalytics(params);
      
      if (!result || result.length === 0) {
        throw new Error('No data received from API');
      }

      setData(result);
      setLastUpdate(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch spread data';
      setError(errorMessage);
      console.error('[SpreadChart] Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [symbol1, symbol2, window]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, symbol1, symbol2, window]);

  // Process chart data
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!data || data.length === 0) {
      return [];
    }

    return data.map((point: SpreadAnalytics) => {
      const timestamp = new Date(point.timestamp);
      return {
        timestamp: point.timestamp,
        time: timestamp.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        spread: point.spread,
        zScore: point.z_score,
        mean: point.spread_mean,
        stdDev: point.spread_std,
      };
    });
  }, [data]);

  // Calculate z-score segments for conditional coloring
  const zScoreSegments = useMemo(() => {
    const segments = {
      normal: [] as ChartDataPoint[],
      warning: [] as ChartDataPoint[],
      extreme: [] as ChartDataPoint[],
    };

    chartData.forEach((point) => {
      const absZ = Math.abs(point.zScore);
      if (absZ <= 1) {
        segments.normal.push(point);
      } else if (absZ <= 2) {
        segments.warning.push(point);
      } else {
        segments.extreme.push(point);
      }
    });

    return segments;
  }, [chartData]);

  // Stats
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    const latest = data[data.length - 1];

    return {
      mean: latest.spread_mean,
      stdDev: latest.spread_std,
      currentSpread: latest.spread,
      currentZScore: latest.z_score,
      correlation: latest.correlation,
      hedgeRatio: latest.hedge_ratio,
    };
  }, [data]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full min-h-[350px] ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading spread analysis...</p>
          <p className="text-xs text-muted-foreground mt-1">
            {symbol1} vs {symbol2}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center h-full min-h-[350px] ${className}`}>
        <div className="text-center max-w-md">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <p className="text-sm text-destructive font-semibold mb-2">Failed to Load Data</p>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchData} size="sm" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // No data state
  if (!data || chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full min-h-[350px] ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No spread data available</p>
          <p className="text-xs text-muted-foreground mt-1">
            {symbol1} vs {symbol2} (window: {window}min)
          </p>
          <Button onClick={fetchData} size="sm" variant="ghost" className="mt-3">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  // Determine z-score line color
  const getZScoreColor = () => {
    if (!stats) return '#16a34a';
    const absZ = Math.abs(stats.currentZScore);
    if (absZ > 2) return '#dc2626'; // red-600
    if (absZ > 1) return '#ca8a04'; // yellow-600
    return '#16a34a'; // green-600
  };

  return (
    <div className={`w-full h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Spread Analysis</h3>
          <span className="text-xs text-muted-foreground">
            {symbol1} / {symbol2}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <div
              className={`text-sm font-semibold ${
                Math.abs(stats.currentZScore) > 2
                  ? 'text-red-600'
                  : Math.abs(stats.currentZScore) > 1
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}
            >
              Z: {stats.currentZScore.toFixed(3)}
            </div>
          )}
          <Button
            onClick={fetchData}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            title="Refresh data"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="flex items-center gap-4 mb-3 px-2 text-xs text-muted-foreground flex-wrap">
          <span>{chartData.length} points</span>
          <span>•</span>
          <span>Window: {window}min</span>
          <span>•</span>
          <span>Spread: {stats.currentSpread.toFixed(6)}</span>
          <span>•</span>
          <span>Correlation: {stats.correlation.toFixed(3)}</span>
          {lastUpdate && (
            <>
              <span>•</span>
              <span title={lastUpdate.toLocaleString()}>
                Updated: {lastUpdate.toLocaleTimeString()}
              </span>
            </>
          )}
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height="100%" minHeight={280}>
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <defs>
            <linearGradient id="spreadGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />

          {/* X Axis */}
          <XAxis
            dataKey="time"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
          />

          {/* Left Y-Axis (Spread) */}
          <YAxis
            yAxisId="left"
            stroke="hsl(var(--accent))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={70}
            tickFormatter={(value) => value.toFixed(4)}
            label={{
              value: 'Spread',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
            }}
          />

          {/* Right Y-Axis (Z-Score) */}
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke={getZScoreColor()}
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={60}
            domain={[-3, 3]}
            ticks={[-3, -2, -1, 0, 1, 2, 3]}
            label={{
              value: 'Z-Score',
              angle: 90,
              position: 'insideRight',
              style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
            iconType="line"
          />

          {/* Reference Lines for Z-Score */}
          <ReferenceLine
            yAxisId="right"
            y={0}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="3 3"
            strokeWidth={1}
            label={{
              value: 'Mean',
              position: 'right',
              fontSize: 10,
              fill: 'hsl(var(--muted-foreground))',
            }}
          />
          <ReferenceLine
            yAxisId="right"
            y={2}
            stroke="#dc2626"
            strokeDasharray="5 5"
            strokeWidth={1.5}
            label={{
              value: '+2σ',
              position: 'right',
              fontSize: 10,
              fill: '#dc2626',
            }}
          />
          <ReferenceLine
            yAxisId="right"
            y={-2}
            stroke="#dc2626"
            strokeDasharray="5 5"
            strokeWidth={1.5}
            label={{
              value: '-2σ',
              position: 'right',
              fontSize: 10,
              fill: '#dc2626',
            }}
          />
          <ReferenceLine
            yAxisId="right"
            y={1}
            stroke="#ca8a04"
            strokeDasharray="3 3"
            strokeWidth={1}
            opacity={0.5}
          />
          <ReferenceLine
            yAxisId="right"
            y={-1}
            stroke="#ca8a04"
            strokeDasharray="3 3"
            strokeWidth={1}
            opacity={0.5}
          />

          {/* Spread Line (Left Axis) */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="spread"
            stroke="hsl(var(--accent))"
            strokeWidth={2}
            dot={false}
            name="Spread"
            activeDot={{ r: 4, fill: 'hsl(var(--accent))' }}
          />

          {/* Z-Score Line (Right Axis) - Conditional Color */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="zScore"
            stroke={getZScoreColor()}
            strokeWidth={2.5}
            dot={false}
            name="Z-Score"
            activeDot={{
              r: 5,
              fill: getZScoreColor(),
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Footer */}
      <div className="mt-2 px-2 text-xs text-muted-foreground text-center">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-green-600"></span>
            Normal (|z|&lt;1)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-yellow-600"></span>
            Warning (1&lt;|z|&lt;2)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-red-600"></span>
            Extreme (|z|&gt;2)
          </span>
        </div>
      </div>
    </div>
  );
}
