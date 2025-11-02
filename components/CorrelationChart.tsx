/**
 * CorrelationChart Component
 * Real-time correlation visualization using recharts
 */
'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Loader2, TrendingUp } from 'lucide-react';

interface AnalyticsData {
  symbol_pair: string;
  spread?: number;
  z_score?: number;
  correlation?: number;
  timestamp?: string;
  [key: string]: any;
}

interface CorrelationChartProps {
  analytics: AnalyticsData | null;
  className?: string;
}

interface ChartDataPoint {
  time: string;
  correlation: number;
  timestamp: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const correlation = payload[0].value;
  const strength =
    Math.abs(correlation) > 0.7
      ? 'Strong'
      : Math.abs(correlation) > 0.4
      ? 'Moderate'
      : 'Weak';

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-xs text-muted-foreground">Correlation:</span>
          <span className="text-sm font-mono font-semibold">
            {typeof correlation === 'number' ? correlation.toFixed(3) : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-muted-foreground">Strength:</span>
          <span className="text-sm font-semibold">{strength}</span>
        </div>
      </div>
    </div>
  );
};

export function CorrelationChart({ analytics, className = '' }: CorrelationChartProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Add new correlation data to historical data
  useEffect(() => {
    if (analytics && typeof analytics.correlation === 'number') {
      const timestamp = analytics.timestamp ? new Date(analytics.timestamp) : new Date();

      const newDataPoint: ChartDataPoint = {
        time: timestamp.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        correlation: analytics.correlation,
        timestamp: timestamp.getTime(),
      };

      setHistoricalData((prev) => {
        const updated = [...prev, newDataPoint];
        return updated.slice(-50); // Keep last 50 data points
      });
    }
  }, [analytics]);

  const chartData = useMemo(() => {
    return historicalData;
  }, [historicalData]);

  const avgCorrelation = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, d) => sum + d.correlation, 0) / chartData.length;
  }, [chartData]);

  const correlationStrength = useMemo(() => {
    const corr = analytics?.correlation ?? 0;
    if (Math.abs(corr) > 0.7) return { text: 'Strong', color: 'text-green-600' };
    if (Math.abs(corr) > 0.4) return { text: 'Moderate', color: 'text-yellow-600' };
    return { text: 'Weak', color: 'text-red-600' };
  }, [analytics?.correlation]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full min-h-[300px] ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading correlation data...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`flex items-center justify-center h-full min-h-[300px] ${className}`}>
        <div className="text-center text-muted-foreground">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-sm">No correlation data available</p>
          <p className="text-xs mt-1">Waiting for analytics...</p>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full min-h-[300px] ${className}`}>
        <div className="text-center text-muted-foreground">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-sm">Building correlation history...</p>
          <p className="text-xs mt-1">
            Current: {analytics.correlation?.toFixed(3) ?? 'N/A'}
          </p>
        </div>
      </div>
    );
  }

  // Determine area color based on correlation strength
  const getAreaColor = () => {
    const corr = Math.abs(analytics?.correlation ?? 0);
    if (corr > 0.7) return '#16a34a'; // green-600
    if (corr > 0.4) return '#ca8a04'; // yellow-600
    return '#dc2626'; // red-600
  };

  return (
    <div className={`w-full h-full ${className}`}>
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Correlation</h3>
          <span className="text-xs text-muted-foreground">{analytics.symbol_pair}</span>
        </div>
        <div className={`text-sm font-semibold ${correlationStrength.color}`}>
          {correlationStrength.text}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3 px-2 text-xs text-muted-foreground">
        <span>{chartData.length} points</span>
        <span>•</span>
        <span>Current: {analytics.correlation?.toFixed(3) ?? 'N/A'}</span>
        <span>•</span>
        <span>Avg: {avgCorrelation.toFixed(3)}</span>
      </div>

      <ResponsiveContainer width="100%" height="100%" minHeight={250}>
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="correlationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={getAreaColor()} stopOpacity={0.3} />
              <stop offset="95%" stopColor={getAreaColor()} stopOpacity={0} />
            </linearGradient>
          </defs>
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
            domain={[-1, 1]}
            ticks={[-1, -0.5, 0, 0.5, 1]}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
          />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          <ReferenceLine y={0.7} stroke="#16a34a" strokeDasharray="3 3" opacity={0.5} />
          <ReferenceLine y={-0.7} stroke="#16a34a" strokeDasharray="3 3" opacity={0.5} />
          <Area
            type="monotone"
            dataKey="correlation"
            stroke={getAreaColor()}
            strokeWidth={2}
            fill="url(#correlationGradient)"
            name="Correlation"
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-2 px-2 text-xs text-muted-foreground text-center">
        <span>Auto-updating • Range: -1 (inverse) to +1 (perfect)</span>
      </div>
    </div>
  );
}
