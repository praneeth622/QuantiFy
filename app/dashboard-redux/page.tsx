/**
 * Production-Grade Dashboard with Redux State Management
 * Industry Best Practices:
 * 1. Single source of truth (Redux store)
 * 2. Normalized data structure
 * 3. Memoized selectors for performance
 * 4. Optimistic updates
 * 5. Sliding window for memory efficiency
 * 6. WebSocket integration with Redux
 */

'use client';

import React, { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { useWebSocketRedux } from '../hooks/useWebSocketRedux';
import {
  selectSelectedSymbol,
  selectTimeframe,
  selectTicksForSymbol,
  selectLatestTick,
  selectStats,
  selectIsConnected,
  setSelectedSymbol,
  setTimeframe,
  fetchSymbols,
  fetchTicks,
} from '../store/slices/marketDataSlice';
import { selectTheme, selectChartSettings, toggleTheme } from '../store/slices/uiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, BarChart3, Activity, RefreshCw, Zap, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function DashboardReduxPage() {
  const dispatch = useAppDispatch();
  
  // Redux state - single source of truth
  const selectedSymbol = useAppSelector(selectSelectedSymbol);
  const timeframe = useAppSelector(selectTimeframe);
  const ticks = useAppSelector(state => selectTicksForSymbol(state, selectedSymbol || 'BTCUSDT'));
  const latestTick = useAppSelector(selectLatestTick);
  const stats = useAppSelector(selectStats);
  const isConnected = useAppSelector(selectIsConnected);
  const theme = useAppSelector(selectTheme);
  const chartSettings = useAppSelector(selectChartSettings);
  const symbols = useAppSelector(state => state.marketData.symbols);
  
  // WebSocket connection - automatically syncs with Redux
  const { connected: wsConnected } = useWebSocketRedux({
    url: 'ws://localhost:8000/ws',
    autoConnect: true,
    symbols: selectedSymbol ? [selectedSymbol] : [],
  });
  
  // Initialize data on mount
  useEffect(() => {
    // Fetch available symbols
    dispatch(fetchSymbols());
    
    // Fetch initial historical data for context
    if (selectedSymbol) {
      dispatch(fetchTicks({
        symbol: selectedSymbol,
        limit: 100, // Small initial load
      }));
    }
  }, [dispatch, selectedSymbol]);
  
  // Memoized chart data - Industry practice: Transform data only when needed
  const priceChartData = useMemo(() => {
    return ticks.slice(-50).map(tick => ({
      time: new Date(tick.timestamp).toLocaleTimeString(),
      price: tick.price,
      timestamp: tick.timestamp,
    }));
  }, [ticks]);
  
  const volumeChartData = useMemo(() => {
    return ticks.slice(-30).map(tick => ({
      time: new Date(tick.timestamp).toLocaleTimeString(),
      volume: tick.quantity,
      timestamp: tick.timestamp,
    }));
  }, [ticks]);
  
  // Handlers - Dispatch Redux actions instead of local setState
  const handleSymbolChange = (symbol: string) => {
    dispatch(setSelectedSymbol(symbol));
  };
  
  const handleTimeframeChange = (tf: string) => {
    dispatch(setTimeframe(tf as any));
  };
  
  const handleRefresh = () => {
    if (selectedSymbol) {
      dispatch(fetchTicks({
        symbol: selectedSymbol,
        limit: 100,
      }));
    }
  };
  
  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Production-grade state management with Redux
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <Badge variant={wsConnected ? 'default' : 'destructive'} className="gap-2">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {wsConnected ? 'Live Data' : 'Disconnected'}
          </Badge>
          
          {/* Theme Toggle */}
          <Button onClick={() => dispatch(toggleTheme())} variant="outline" size="sm">
            {theme === 'dark' ? '🌙' : '☀️'}
          </Button>
          
          {/* Refresh */}
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Symbol Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Symbol</label>
              <Select value={selectedSymbol || ''} onValueChange={handleSymbolChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select symbol" />
                </SelectTrigger>
                <SelectContent>
                  {symbols.length > 0 ? (
                    symbols.map((sym: any) => (
                      <SelectItem key={sym.symbol} value={sym.symbol}>
                        {sym.symbol}
                      </SelectItem>
                    ))
                  ) : (
                    ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT'].map((sym: string) => (
                      <SelectItem key={sym} value={sym}>
                        {sym}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Timeframe Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Timeframe</label>
              <Select value={timeframe} onValueChange={handleTimeframeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Minute</SelectItem>
                  <SelectItem value="5m">5 Minutes</SelectItem>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="4h">4 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Stats */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Statistics</label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Ticks: <strong>{stats.totalTicks}</strong></div>
                <div>Rate: <strong>{stats.dataRate.toFixed(1)}/s</strong></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Latest Price Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Latest Price</p>
              <p className="text-3xl font-bold">
                ${latestTick?.price.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-muted-foreground">
                {latestTick && new Date(latestTick.timestamp).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Symbol</p>
              <p className="text-2xl font-bold">{selectedSymbol}</p>
              <p className="text-xs text-muted-foreground">
                Vol: {latestTick?.quantity.toFixed(4) || '0.00'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              Price Chart
              <Badge variant="outline" className="ml-auto">
                {priceChartData.length} points
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {priceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={priceChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No price data yet</p>
                  <p className="text-xs">Waiting for real-time updates...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" />
              Volume Chart
              <Badge variant="outline" className="ml-auto">
                {volumeChartData.length} bars
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {volumeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={volumeChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                    }}
                  />
                  <Bar 
                    dataKey="volume" 
                    fill="#8b5cf6"
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No volume data yet</p>
                  <p className="text-xs">Waiting for real-time updates...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Ticks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            Recent Ticks
            <Badge variant="secondary" className="ml-auto">
              {ticks.length} total (last 10 shown)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2">Time</th>
                  <th className="text-left py-2">Symbol</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {ticks.slice(-10).reverse().map(tick => (
                  <tr key={tick.id} className="border-b hover:bg-muted/50">
                    <td className="py-2">{new Date(tick.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2 font-mono">{tick.symbol}</td>
                    <td className="text-right py-2 font-mono">${tick.price.toFixed(2)}</td>
                    <td className="text-right py-2 font-mono">{tick.quantity.toFixed(4)}</td>
                  </tr>
                ))}
                {ticks.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      No ticks available yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Footer Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Redux Store: Active</span>
              <span>•</span>
              <span>Sliding Window: 500 ticks</span>
              <span>•</span>
              <span>Memory: Optimized</span>
            </div>
            <div className="flex items-center gap-2">
              {wsConnected ? (
                <>
                  <Zap className="w-3 h-3 text-green-500" />
                  <span>Real-time Updates</span>
                </>
              ) : (
                <>
                  <Database className="w-3 h-3 text-orange-500" />
                  <span>Historical Data</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}