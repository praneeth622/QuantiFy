/**
 * Correlation Chart Test Page
 * Test page for API-driven correlation visualization
 */
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

// Create API-driven correlation chart component inline
import { useState as useStateCorr, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import { getRollingCorrelation } from '@/app/services/api';
import type { CorrelationQueryParams } from '@/app/services/types';

interface CorrelationChartAPIProps {
  symbol1: string;
  symbol2: string;
  window?: number;
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface ChartDataPoint {
  timestamp: string;
  time: string;
  correlation: number;
  rawTimestamp: number;
}

function CorrelationChartAPI({
  symbol1,
  symbol2,
  window = 50,
  className = '',
  autoRefresh = false,
  refreshInterval = 30,
}: CorrelationChartAPIProps) {
  const [data, setData] = useStateCorr<any>(null);
  const [loading, setLoading] = useStateCorr(true);
  const [error, setError] = useStateCorr<string | null>(null);
  const [lastUpdate, setLastUpdate] = useStateCorr<Date | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: CorrelationQueryParams = {
        symbol1: symbol1.toUpperCase(),
        symbol2: symbol2.toUpperCase(),
        window_size: window,
      };

      const result = await getRollingCorrelation(params);
      setData(result);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Failed to fetch correlation data:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load correlation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [symbol1, symbol2, window]);

  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;
    const interval = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, symbol1, symbol2, window]);

  const chartData = useMemo(() => {
    if (!data || !data.timestamps || !data.correlations) return [];
    return data.timestamps.map((timestamp: string, index: number) => {
      const date = new Date(timestamp);
      return {
        timestamp: date.toLocaleString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        correlation: data.correlations[index],
        rawTimestamp: date.getTime(),
      };
    });
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return { current: 0, mean: 0, min: 0, max: 0, std: 0 };
    return {
      current: data.current_correlation || 0,
      mean: data.mean_correlation || 0,
      min: data.min_correlation || 0,
      max: data.max_correlation || 0,
      std: data.std_correlation || 0,
    };
  }, [data]);

  const getCorrelationColor = (corr: number): string => {
    if (corr >= 0.8) return '#16a34a';
    if (corr >= 0.5) return '#22c55e';
    if (corr >= 0.2) return '#86efac';
    if (corr >= -0.2) return '#94a3b8';
    if (corr >= -0.5) return '#fca5a5';
    if (corr >= -0.8) return '#ef4444';
    return '#dc2626';
  };

  if (loading && !data) {
    return (
      <div className={`flex flex-col items-center justify-center h-full min-h-[300px] ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Loading correlation data...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={`flex flex-col items-center justify-center h-full min-h-[300px] ${className}`}>
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm font-medium text-destructive mb-3">{error}</p>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full min-h-[300px] ${className}`}>
        <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-3">
          No correlation data available for {symbol1} and {symbol2}
        </p>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  const currentColor = getCorrelationColor(stats.current);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Correlation: {symbol1} / {symbol2}</h3>
          <Badge variant="outline" style={{ borderColor: currentColor, color: currentColor }}>
            {stats.current.toFixed(3)}
          </Badge>
        </div>
        <Button onClick={fetchData} variant="ghost" size="sm" disabled={loading} className="h-7 w-7 p-0">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-3 px-2 text-xs">
        <div className="text-center">
          <p className="text-muted-foreground">Points</p>
          <p className="font-semibold">{chartData.length}</p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">Mean</p>
          <p className="font-semibold">{stats.mean.toFixed(3)}</p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">Min</p>
          <p className="font-semibold text-red-500">{stats.min.toFixed(3)}</p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">Max</p>
          <p className="font-semibold text-green-500">{stats.max.toFixed(3)}</p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">Std Dev</p>
          <p className="font-semibold">{stats.std.toFixed(3)}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${symbol1}-${symbol2}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={currentColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={currentColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis domain={[-1, 1]} ticks={[-1, -0.5, 0, 0.5, 1]} stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => value.toFixed(1)} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: '11px' }} iconType="line" />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={1} />
            <ReferenceLine y={0.8} stroke="#16a34a" strokeDasharray="3 3" strokeOpacity={0.5} strokeWidth={1} />
            <ReferenceLine y={-0.8} stroke="#dc2626" strokeDasharray="3 3" strokeOpacity={0.5} strokeWidth={1} />
            <Area type="monotone" dataKey="correlation" name="Correlation" stroke={currentColor} strokeWidth={2} fill={`url(#grad-${symbol1}-${symbol2})`} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-3 px-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>Window: {window} periods</span>
          {lastUpdate && <span>Updated: {lastUpdate.toLocaleTimeString()}</span>}
        </div>
      </div>
    </div>
  );
}

export default function TestCorrelationPage() {
  const [symbol1, setSymbol1] = useState('BTCUSDT');
  const [symbol2, setSymbol2] = useState('ETHUSDT');
  const [window, setWindow] = useState(50);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Correlation Chart Test</h1>
          <p className="text-muted-foreground">API-driven rolling correlation visualization</p>
        </div>
        <Badge>Test Environment</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Select trading pairs and window size</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Symbol 1</label>
              <Select value={symbol1} onValueChange={setSymbol1}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {symbols.map((sym) => (
                    <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Symbol 2</label>
              <Select value={symbol2} onValueChange={setSymbol2}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {symbols.filter(s => s !== symbol1).map((sym) => (
                    <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Window Size</label>
              <Select value={window.toString()} onValueChange={(v) => setWindow(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={() => setRefreshKey(prev => prev + 1)}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? "default" : "outline"}
                className="flex-1"
              >
                {autoRefresh ? 'Auto' : 'Manual'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Correlation Chart</CardTitle>
          <CardDescription>
            BTC and ETH typically show correlation of 0.8-0.9
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px]">
            <CorrelationChartAPI
              key={refreshKey}
              symbol1={symbol1}
              symbol2={symbol2}
              window={window}
              autoRefresh={autoRefresh}
              refreshInterval={30}
              className="h-full"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expected Behavior</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">For BTC-ETH:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Correlation should be between 0.7 and 0.95 (high positive correlation)</li>
                <li>Line should stay mostly in green zone (above 0.6)</li>
                <li>Occasional dips during market divergence</li>
                <li>Mean correlation around 0.8-0.85</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Color Interpretation:</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#16a34a' }}></div>
                  <span>Strong + (0.8 to 1.0)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#94a3b8' }}></div>
                  <span>Neutral (-0.2 to 0.2)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#dc2626' }}></div>
                  <span>Strong - (-1.0 to -0.8)</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
