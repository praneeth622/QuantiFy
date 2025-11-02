/**
 * QuantiFy Trading Dashboard
 * Main dashboard with real-time data visualization and REST API integration
 */
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAggregatedTicks } from '../hooks/useAggregatedTicks';
import { useSymbols, useTicks, useInvalidateMarketData } from '../hooks/useMarketData';
import { useAlerts } from '../hooks/useAlerts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, TrendingUp, Activity, BarChart3, AlertCircle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { PriceChart } from '@/components/PriceChart';
import { VolumeChart } from '@/components/VolumeChart';
import { SpreadAnalysisChart } from '@/components/SpreadAnalysisChart';
import { CorrelationChart } from '@/components/CorrelationChart';
import { ControlPanel, useControlPanel, type ControlPanelConfig } from '@/components/ControlPanel';
import { toast } from 'sonner';
import type { Tick } from '@/app/services/types';

export default function DashboardPage() {
  // ========================================================================
  // HOOKS & STATE
  // ========================================================================
  
  // WebSocket for real-time updates
  const { ticks: wsTicks, analytics, alerts: wsAlerts, isConnected } = useWebSocket({
    autoReconnect: true,
    showNotifications: false,
    debug: true,
  });

  // Control Panel State
  const { config, setConfig } = useControlPanel({
    symbols: ['BTCUSDT'],
    timeframe: '1s',
    rollingWindow: 50,
    analytics: {
      spread: true,
      correlation: true,
      volatility: true,
      volume: true,
    },
  });

  const selectedSymbol = config.symbols[0] || 'BTCUSDT';
  const selectedTimeframe = config.timeframe;

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ========================================================================
  // API QUERIES - FETCH DATA FROM BACKEND
  // ========================================================================
  
  // Fetch symbols from API (replaces hard-coded list)
  const { 
    data: symbolsData, 
    isLoading: symbolsLoading,
    error: symbolsError 
  } = useSymbols();
  
  // Fetch historical ticks for selected symbol
  const { 
    data: historicalTicks,
    isLoading: ticksLoading,
    error: ticksError 
  } = useTicks(
    { symbol: selectedSymbol, limit: 100 },
    { enabled: !!selectedSymbol }
  );
  
  // Fetch alerts from API (replaces 'N/A' display)
  const { 
    data: apiAlerts,
    isLoading: alertsLoading,
    error: alertsError 
  } = useAlerts();

  // Get invalidation functions for refresh
  const invalidate = useInvalidateMarketData();

  // ========================================================================
  // DATA PROCESSING
  // ========================================================================
  
  // Get available symbols from API
  const availableSymbols = useMemo(() => {
    if (symbolsData && symbolsData.length > 0) {
      return symbolsData.map(s => s.symbol).sort();
    }
    // Fallback to WebSocket symbols
    const wsSymbols = new Set(wsTicks.map((t) => t.symbol).filter(Boolean));
    if (wsSymbols.size > 0) {
      return Array.from(wsSymbols).sort();
    }
    // Last resort: default symbols
    return ['BTCUSDT', 'ETHUSDT', 'TESTBTC', 'ADAUSDT', 'SOLUSDT'];
  }, [symbolsData, wsTicks]);

  // Merge historical + WebSocket ticks (hybrid data flow)
  const allTicks = useMemo(() => {
    const merged: Tick[] = [];
    const tickMap = new Map<string, Tick>();

    // Add historical ticks first
    if (historicalTicks) {
      historicalTicks.forEach(tick => {
        const key = `${tick.timestamp}-${tick.price}`;
        tickMap.set(key, tick);
      });
    }

    // Add WebSocket ticks (converting format)
    wsTicks
      .filter(t => t.symbol === selectedSymbol)
      .forEach(wsTick => {
        const tick: Tick = {
          id: Date.now() + Math.random(), // Temporary ID
          symbol: wsTick.symbol,
          price: wsTick.price,
          quantity: wsTick.quantity,
          timestamp: wsTick.timestamp,
          created_at: wsTick.timestamp,
        };
        const key = `${tick.timestamp}-${tick.price}`;
        tickMap.set(key, tick);
      });

    // Convert to array and sort by timestamp
    return Array.from(tickMap.values())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-config.rollingWindow * 2); // Keep 2x rolling window for aggregation
  }, [historicalTicks, wsTicks, selectedSymbol, config.rollingWindow]);

  // ========================================================================
  // AUTO-SWITCH TO FIRST AVAILABLE SYMBOL
  // ========================================================================
  
  useEffect(() => {
    if (availableSymbols.length > 0 && !availableSymbols.includes(selectedSymbol)) {
      console.log(`Switching to first available symbol: ${availableSymbols[0]}`);
      setConfig({
        ...config,
        symbols: [availableSymbols[0]],
      });
    }
  }, [availableSymbols, selectedSymbol]);

  // ========================================================================
  // AGGREGATED DATA FOR CHARTS
  // ========================================================================
  
  const { chartData, stats, isLoading: isAggregating } = useAggregatedTicks({
    ticks: allTicks,
    symbol: selectedSymbol,
    timeframe: selectedTimeframe,
  });

  // ========================================================================
  // RECENT DATA FOR TABLES
  // ========================================================================
  
  // Recent ticks - limit by rolling window
  const recentTicks = useMemo(() => {
    return allTicks
      .slice(-config.rollingWindow)
      .reverse()
      .slice(0, 10); // Show last 10 ticks
  }, [allTicks, config.rollingWindow]);

  // Recent alerts - from API, not WebSocket only
  const recentAlerts = useMemo(() => {
    if (apiAlerts && apiAlerts.length > 0) {
      return apiAlerts
        .filter(a => a.is_active)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
    }
    // Fallback to WebSocket alerts
    return wsAlerts.slice(0, 5);
  }, [apiAlerts, wsAlerts]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================
  
  const handleConfigChange = useCallback((newConfig: ControlPanelConfig) => {
    setConfig(newConfig);
  }, [setConfig]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    toast.info('Refreshing dashboard data...');
    
    try {
      // Use React Query invalidation for proper refresh
      await invalidate.refetchAll();
      toast.success('Dashboard refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh dashboard');
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [invalidate]);

  const handleExport = () => {
    if (allTicks.length === 0) {
      toast.error('No data to export');
      return;
    }

    const from = selectedSymbol;
    const to = selectedTimeframe;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    const csvContent = [
      ['Timestamp', 'Symbol', 'Price', 'Quantity'].join(','),
      ...allTicks.map((tick) =>
        [tick.timestamp, tick.symbol, tick.price, tick.quantity].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantify-export-${from}-${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Data exported successfully!');
  };

  // Debug logging
  useEffect(() => {
    console.log('Dashboard Update:', {
      connected: isConnected,
      historicalTickCount: historicalTicks?.length || 0,
      wsTickCount: wsTicks.length,
      mergedTickCount: allTicks.length,
      symbols: availableSymbols,
      selectedSymbol,
      selectedTimeframe,
      chartDataPoints: chartData.length,
      analyticsAvailable: !!analytics,
      alertCount: recentAlerts.length,
      rollingWindow: config.rollingWindow,
    });
  }, [allTicks.length, selectedSymbol, selectedTimeframe, chartData.length, analytics, recentAlerts.length, config.rollingWindow, isConnected]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Bar */}
      <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/80">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-accent via-accent/80 to-accent bg-clip-text text-transparent">
              QuantiFy
            </h1>
            <div className="hidden md:flex items-center gap-2">
              <Badge variant={isConnected ? 'default' : 'destructive'} className="gap-1">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </div>

          {/* Center: Compact Control Panel */}
          <div className="hidden lg:block">
            <ControlPanel
              config={config}
              onChange={handleConfigChange}
              onRefresh={handleRefresh}
              availableSymbols={availableSymbols}
              isRefreshing={isRefreshing}
              compact
            />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Hide Control Panel' : 'Show Control Panel'}
            >
              {sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Connection Status */}
        <div className="md:hidden px-4 pb-2">
          <Badge variant={isConnected ? 'default' : 'destructive'} className="gap-1">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        
        {/* Debug Info - Remove after fixing */}
        <div className="px-4 py-2 bg-muted/50 text-xs space-y-1">
          <div className="flex gap-4 flex-wrap">
            <span>🔌 Connected: {isConnected ? '✅' : '❌'}</span>
            <span>📊 Ticks: {allTicks.length}</span>
            <span>🎯 Symbol: {selectedSymbol}</span>
            <span>🔍 Recent: {recentTicks.length}</span>
            <span>📈 Analytics: {analytics ? '✅' : '❌'}</span>
            <span>🔔 Alerts: {recentAlerts.length}</span>
          </div>
          {allTicks.length > 0 && (
            <div className="text-muted-foreground">
              Latest: {allTicks[allTicks.length - 1]?.symbol} @ ${allTicks[allTicks.length - 1]?.price?.toFixed(2)} 
              {allTicks[allTicks.length - 1]?.timestamp && ` (${new Date(allTicks[allTicks.length - 1].timestamp).toLocaleTimeString()})`}
            </div>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar - Control Panel */}
        {sidebarOpen && (
          <aside className="w-80 bg-card border-r border-border p-4 space-y-4 hidden lg:block overflow-y-auto max-h-[calc(100vh-4rem)]">
            <ControlPanel
              config={config}
              onChange={handleConfigChange}
              onRefresh={handleRefresh}
              onExport={handleExport}
              availableSymbols={availableSymbols}
              isRefreshing={isRefreshing}
            />

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Ticks</span>
                  <span className="font-mono">{allTicks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Symbols</span>
                  <span className="font-mono">{availableSymbols.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Analytics</span>
                  <span className="font-mono">{analytics ? '1' : '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alerts</span>
                  <span className="font-mono">{recentAlerts.length}</span>
                </div>
              </CardContent>
            </Card>

            {analytics && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Latest Analytics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pair</span>
                    <span className="font-mono text-xs">{analytics.symbol_pair}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Z-Score</span>
                    <span className="font-mono">
                      {typeof analytics.z_score === 'number' ? analytics.z_score.toFixed(3) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Correlation</span>
                    <span className="font-mono">
                      {typeof analytics.correlation === 'number' ? analytics.correlation.toFixed(3) : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 space-y-4">
          {/* Price Header */}
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Current Price</div>
                  <div className="text-2xl font-bold">
                    ${typeof stats.currentPrice === 'number' ? stats.currentPrice.toFixed(2) : '0.00'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">24h Change</div>
                  <div
                    className={`text-xl font-semibold ${
                      stats.change24h > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {stats.change24h > 0 ? '+' : ''}
                    {stats.change24h.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">24h High</div>
                  <div className="text-xl font-semibold text-green-600">
                    ${stats.high24h.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">24h Low</div>
                  <div className="text-xl font-semibold text-red-600">
                    ${stats.low24h.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Volume</div>
                  <div className="text-xl font-semibold">
                    {stats.volume24h.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2x2 Chart Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Price Chart */}
            <Card>
              <CardContent className="pt-6">
                <PriceChart
                  symbol={selectedSymbol}
                  timeframe={selectedTimeframe}
                  data={chartData}
                  className="h-[350px]"
                />
              </CardContent>
            </Card>

            {/* Chart 2: Volume Chart */}
            {config.analytics.volume && (
              <Card>
                <CardContent className="pt-6">
                  <VolumeChart
                    symbol={selectedSymbol}
                    timeframe={selectedTimeframe}
                    data={chartData}
                    className="h-[350px]"
                  />
                </CardContent>
              </Card>
            )}

            {/* Chart 3: Spread Analysis */}
            {config.analytics.spread && (
              <Card>
                <CardContent className="pt-6">
                  <SpreadAnalysisChart
                    analytics={analytics}
                    className="h-[350px]"
                  />
                </CardContent>
              </Card>
            )}

            {/* Chart 4: Correlation Matrix */}
            {config.analytics.correlation && (
              <Card>
                <CardContent className="pt-6">
                  <CorrelationChart
                    analytics={analytics}
                    className="h-[350px]"
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Bottom Stats Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Ticks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Time</th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Symbol</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">Price</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">Quantity</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTicks.length > 0 ? (
                      recentTicks.map((tick, idx) => {
                        if (!tick || !tick.symbol || typeof tick.price !== 'number') {
                          return null;
                        }

                        const value = tick.price * (tick.quantity ?? 0);

                        return (
                          <tr key={`${tick.id}-${idx}`} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-2 px-2 text-muted-foreground font-mono text-xs">
                              {tick.timestamp
                                ? new Date(tick.timestamp).toLocaleTimeString()
                                : 'N/A'}
                            </td>
                            <td className="py-2 px-2 font-medium">{tick.symbol}</td>
                            <td className="py-2 px-2 text-right font-mono">
                              ${tick.price.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                              {(tick.quantity ?? 0).toFixed(4)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-green-600">
                              ${value.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          {ticksLoading ? 'Loading ticks...' : isConnected
                            ? 'Waiting for tick data...'
                            : 'Connect to receive data'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Section */}
          {recentAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-accent" />
                  Recent Alerts ({recentAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentAlerts.map((alert) => {
                    if (!alert || !alert.symbol) return null;

                    // Handle both API alerts and WebSocket alerts
                    const isAPIAlert = 'id' in alert;
                    const alertType = isAPIAlert 
                      ? (alert.condition_type || alert.condition || 'Alert')
                      : (alert.alert_type || 'Alert');
                    const displayMessage = isAPIAlert
                      ? (alert.message || `${alert.symbol} - ${alert.condition} ${alert.threshold}`)
                      : (alert.message || `${alert.symbol} alert`);
                    const severityColor = (isAPIAlert ? alert.severity : alert.severity) === 'high' 
                      ? 'red' 
                      : (isAPIAlert ? alert.severity : alert.severity) === 'medium' 
                      ? 'yellow' 
                      : 'blue';
                    const triggerCount = isAPIAlert ? (alert.trigger_count || 0) : 0;
                    const alertKey = isAPIAlert ? alert.id : `${alert.alert_id}-${alert.timestamp}`;
                    const alertTime = isAPIAlert 
                      ? (alert.last_triggered || alert.created_at)
                      : (alert.triggered_at || alert.timestamp);

                    return (
                      <div
                        key={alertKey}
                        className={`flex items-center justify-between p-3 bg-${severityColor}-500/10 border border-${severityColor}-500/30 rounded-lg`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`text-sm font-medium text-${severityColor}-600`}>
                              {alertType}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {alert.symbol}
                            </Badge>
                            {triggerCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {triggerCount}x
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {displayMessage}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {alertTime
                            ? new Date(alertTime).toLocaleTimeString()
                            : 'N/A'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading/Empty States */}
          {alertsLoading && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading alerts...
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
