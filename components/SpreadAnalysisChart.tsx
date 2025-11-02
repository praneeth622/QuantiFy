/**
 * SpreadAnalysisChart Component
 * Real-time spread and z-score visualization using recharts
 */
'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Loader2, Activity } from 'lucide-react';

interface AnalyticsData {
  symbol_pair: string;
  spread?: number;
  z_score?: number;
  correlation?: number;
  timestamp?: string;
  [key: string]: any;
}

interface SpreadAnalysisChartProps {
  analytics: AnalyticsData | null;
  className?: string;
}

interface ChartDataPoint {
  time: string;
  spread: number;
  zScore: number;
  timestamp: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    name: string;
    color?: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex justify-between gap-4">
            <span className="text-xs" style={{ color: entry.color }}>
              {entry.name}:
            </span>
            <span className="text-sm font-mono font-semibold">
              {typeof entry.value === 'number' ? entry.value.toFixed(3) : 'N/A'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function SpreadAnalysisChart({ analytics, className = '' }: SpreadAnalysisChartProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Add new analytics data to historical data
  useEffect(() => {
    if (analytics && typeof analytics.spread === 'number' && typeof analytics.z_score === 'number') {
      const timestamp = analytics.timestamp ? new Date(analytics.timestamp) : new Date();
      
      const newDataPoint: ChartDataPoint = {
        time: timestamp.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        spread: analytics.spread,
        zScore: analytics.z_score,
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

  const avgZScore = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, d) => sum + d.zScore, 0) / chartData.length;
  }, [chartData]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full min-h-[300px] ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading spread analysis...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`flex items-center justify-center h-full min-h-[300px] ${className}`}>
        <div className="text-center text-muted-foreground">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <p className="text-sm">No analytics data available</p>
          <p className="text-xs mt-1">Waiting for spread analytics...</p>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full min-h-[300px] ${className}`}>
        <div className="text-center text-muted-foreground">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <p className="text-sm">Building historical data...</p>
          <p className="text-xs mt-1">Current Z-Score: {analytics.z_score?.toFixed(3) ?? 'N/A'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Spread Analysis</h3>
          <span className="text-xs text-muted-foreground">{analytics.symbol_pair}</span>
        </div>
        <div className="text-sm font-semibold text-accent">
          Z: {analytics.z_score?.toFixed(3) ?? 'N/A'}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3 px-2 text-xs text-muted-foreground">
        <span>{chartData.length} points</span>
        <span>•</span>
        <span>Avg Z-Score: {avgZScore.toFixed(3)}</span>
        <span>•</span>
        <span>Spread: {analytics.spread?.toFixed(4) ?? 'N/A'}</span>
      </div>

      <ResponsiveContainer width="100%" height="100%" minHeight={250}>
        <ComposedChart
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
            yAxisId="left"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
          />
          <ReferenceLine yAxisId="left" y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          <ReferenceLine yAxisId="left" y={2} stroke="#16a34a" strokeDasharray="3 3" opacity={0.5} />
          <ReferenceLine yAxisId="left" y={-2} stroke="#dc2626" strokeDasharray="3 3" opacity={0.5} />
          <Bar
            yAxisId="right"
            dataKey="spread"
            fill="hsl(var(--accent))"
            name="Spread"
            opacity={0.6}
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="zScore"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            name="Z-Score"
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-2 px-2 text-xs text-muted-foreground text-center">
        <span>Auto-updating • Z-Score thresholds: ±2.0</span>
      </div>
    </div>
  );
}
