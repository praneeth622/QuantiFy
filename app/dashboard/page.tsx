/**
 * QuantiFy Trading Dashboard
 * Premium dashboard with advanced filters and real-time visualization
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
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, TrendingUp, Activity, BarChart3, AlertCircle, RefreshCw, Download, Filter, Search, X, Maximize2, Clock, Network, Zap, Database } from 'lucide-react';
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

  // Control Panel State - Start with all 5 symbols
  const { config, setConfig } = useControlPanel({
    symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT'],
    timeframe: '1s', // Changed to 1s for real-time granularity
    rollingWindow: 200, // Increased for more data
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced Filters
  const [priceFilter, setPriceFilter] = useState<{ min: number; max: number }>({ min: 0, max: 200000 });
  const [volumeFilter, setVolumeFilter] = useState<{ min: number; max: number }>({ min: 0, max: 10000 });
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [autoRefresh, setAutoRefresh] = useState(false); // Disabled by default to reduce API calls
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds
  const [chartLayout, setChartLayout] = useState<'grid' | 'rows'>('grid');

  // ========================================================================
  // API QUERIES - FETCH DATA FROM BACKEND
  // ========================================================================
  
  // Fetch symbols from API
  const { 
    data: symbolsData, 
    isLoading: symbolsLoading,
    error: symbolsError 
  } = useSymbols();
  
  // Fetch historical ticks for initial load only (reduced to 200 for performance)
  const { 
    data: historicalTicks,
    isLoading: ticksLoading,
    error: ticksError 
  } = useTicks(
    { symbol: selectedSymbol, limit: 200 }, // FIXED: Reduced from 2000 to 200 to prevent old data dominance
    { 
      enabled: !!selectedSymbol, // FIXED: Always enable API fetch for historical context
      staleTime: 60000, // Cache for 1 minute
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
    }
  );
  
  // Count WebSocket ticks for selected symbol
  const wsTickCountForSymbol = useMemo(() => 
    wsTicks.filter(t => t.symbol === selectedSymbol).length,
    [wsTicks, selectedSymbol]
  );
  
  console.log(`Historical: ${historicalTicks?.length || 0}, WebSocket: ${wsTickCountForSymbol}`);
  
  // Fetch alerts from API
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
  
  // Available symbols from multiple sources (prioritize API data)
  const availableSymbols = useMemo(() => {
    // Priority 1: API symbols
    if (symbolsData && symbolsData.length > 0) {
      return symbolsData.map(s => s.symbol).sort();
    }
    // Priority 2: WebSocket symbols
    const wsSymbols = new Set(wsTicks.map((t) => t.symbol).filter(Boolean));
    if (wsSymbols.size > 0) {
      return Array.from(wsSymbols).sort();
    }
    // Last resort: default 5 symbols from backend
    return ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT'];
  }, [symbolsData, wsTicks]);

  // Merge historical + WebSocket ticks with optimizations (FIXED for real-time updates)
  const allTicks = useMemo(() => {
    const tickMap = new Map<string, Tick>();
    
    // Count WebSocket ticks for selected symbol
    const wsTicksForSymbol = wsTicks.filter(t => t.symbol === selectedSymbol);
    // Use WebSocket data if we have at least 10 ticks for this symbol
    const useWebSocketOnly = wsTicksForSymbol.length >= 10;

    if (useWebSocketOnly) {
      // LIVE MODE: Use only WebSocket data (last 200 ticks)
      wsTicksForSymbol.forEach(wsTick => {
        const tick: Tick = {
          id: Date.now() + Math.random(),
          symbol: wsTick.symbol,
          price: wsTick.price,
          quantity: wsTick.quantity,
          timestamp: wsTick.timestamp,
          created_at: wsTick.timestamp,
        };
        const key = `${tick.symbol}-${tick.timestamp}-${tick.price}`;
        tickMap.set(key, tick);
      });
    } else {
      // INITIAL MODE: Merge historical + WebSocket
      // Add historical ticks first
      if (historicalTicks && Array.isArray(historicalTicks)) {
        historicalTicks.forEach(tick => {
          const key = `${tick.symbol}-${tick.timestamp}-${tick.price}`;
          tickMap.set(key, tick);
        });
      }

      // Add WebSocket ticks (will overwrite duplicates)
      wsTicksForSymbol.forEach(wsTick => {
        const tick: Tick = {
          id: Date.now() + Math.random(),
          symbol: wsTick.symbol,
          price: wsTick.price,
          quantity: wsTick.quantity,
          timestamp: wsTick.timestamp,
          created_at: wsTick.timestamp,
        };
        const key = `${tick.symbol}-${tick.timestamp}-${tick.price}`;
        tickMap.set(key, tick);
      });
    }

    // Convert to array, sort by timestamp, and keep only 200 most recent
    const sorted = Array.from(tickMap.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 200);
    
    return sorted;
  }, [historicalTicks, wsTicks, selectedSymbol]);

  // ========================================================================
  // DATA SOURCE INDICATOR (Show if using historical or live data)
  // ========================================================================
  
  const dataSourceInfo = useMemo(() => {
    const wsTickCountForSymbol = wsTicks.filter(t => t.symbol === selectedSymbol).length;
    const isLiveMode = wsTickCountForSymbol >= 10; // Changed from 50 to 10
    const tickCount = allTicks.length;
    
    // Log mode changes for debugging
    console.log(`📊 Dashboard Mode: ${isLiveMode ? 'LIVE' : 'HISTORICAL'} | Total: ${tickCount} | WS for ${selectedSymbol}: ${wsTickCountForSymbol}/10`);
    
    return {
      mode: isLiveMode ? 'Live' : 'Historical',
      isLive: isLiveMode,
      totalTicks: tickCount,
      wsTickCount: wsTickCountForSymbol,
      description: isLiveMode 
        ? `Using real-time WebSocket data (${wsTickCountForSymbol} ticks for ${selectedSymbol})` 
        : `Loading... (${wsTickCountForSymbol}/10 WebSocket ticks received for ${selectedSymbol})`
    };
  }, [wsTicks, allTicks, selectedSymbol]);

  // ========================================================================
  // AUTO-SWITCH TO FIRST AVAILABLE SYMBOL (Only if current is invalid)
  // ========================================================================
  
  useEffect(() => {
    if (availableSymbols.length > 0 && !availableSymbols.includes(selectedSymbol)) {
      console.log(`⚠️ Current symbol ${selectedSymbol} not available. Switching to ${availableSymbols[0]}`);
      setConfig({
        ...config,
        symbols: [availableSymbols[0]],
      });
    }
  }, [availableSymbols]); // Removed selectedSymbol from deps to avoid loops

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

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      invalidate.refetchAll();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, invalidate]);

  // Filtered ticks based on filters
  const filteredTicks = useMemo(() => {
    return allTicks.filter(tick => {
      if (!tick) return false;
      
      // Price filter
      if (tick.price < priceFilter.min || tick.price > priceFilter.max) return false;
      
      // Volume filter  
      const volume = tick.quantity ?? 0;
      if (volume < volumeFilter.min || volume > volumeFilter.max) return false;
      
      // Search filter
      if (searchQuery && !tick.symbol.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      return true;
    });
  }, [allTicks, priceFilter, volumeFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 text-foreground">
      {/* Premium Header with Glassmorphism */}
      <header className="backdrop-blur-xl bg-card/80 border-b border-border/50 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-[2000px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Brand */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-accent via-accent/80 to-accent bg-clip-text text-transparent">
                    QuantiFy
                  </h1>
                  <p className="text-xs text-muted-foreground">Real-Time Trading Analytics</p>
                </div>
              </div>
              
              <div className="hidden lg:flex items-center gap-2">
                <Badge 
                  variant={isConnected ? 'default' : 'destructive'} 
                  className="gap-2 px-3 py-1.5 shadow-sm"
                >
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  {isConnected ? 'Live' : 'Disconnected'}
                </Badge>
                
                {/* Data Source Indicator - FIXED: Show if using live or historical data */}
                <Badge 
                  variant={dataSourceInfo.isLive ? 'default' : 'secondary'} 
                  className="gap-1.5 px-3 py-1.5"
                  title={dataSourceInfo.description}
                >
                  {dataSourceInfo.isLive ? (
                    <>
                      <Zap className="w-3 h-3" />
                      Live Data
                    </>
                  ) : (
                    <>
                      <Database className="w-3 h-3" />
                      Historical
                    </>
                  )}
                </Badge>
                
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                  <BarChart3 className="w-3 h-3" />
                  {allTicks.length} Ticks
                </Badge>
                
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                  <TrendingUp className="w-3 h-3" />
                  {selectedSymbol}
                </Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="hidden md:flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 min-w-[200px]">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search symbols..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 bg-transparent h-auto p-0 focus-visible:ring-0 text-sm"
                />
                {searchQuery && (
                  <X 
                    className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" 
                    onClick={() => setSearchQuery('')}
                  />
                )}
              </div>

              {/* Filter Toggle */}
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden md:inline">Filters</span>
              </Button>

              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">Refresh</span>
              </Button>

              {/* Export */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">Export</span>
              </Button>
            </div>
          </div>

          {/* Mobile Status */}
          <div className="lg:hidden flex items-center gap-2 mt-3">
            <Badge 
              variant={isConnected ? 'default' : 'destructive'} 
              className="gap-2"
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              {isConnected ? 'Live' : 'Disconnected'}
            </Badge>
            <Badge variant="outline">{allTicks.length} Ticks</Badge>
            <Badge variant="outline">{selectedSymbol}</Badge>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="border-t border-border/50 bg-muted/20 animate-in slide-in-from-top-2 duration-300">
            <div className="max-w-[2000px] mx-auto px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Symbol Filter */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">SYMBOL</Label>
                  <Select
                    value={selectedSymbol}
                    onValueChange={(value) => setConfig({ ...config, symbols: [value] })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSymbols.map((sym) => (
                        <SelectItem key={sym} value={sym}>
                          {sym}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Timeframe Filter */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">TIMEFRAME</Label>
                  <Select
                    value={selectedTimeframe}
                    onValueChange={(value) => setConfig({ ...config, timeframe: value as any })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1s">1 Second</SelectItem>
                      <SelectItem value="1m">1 Minute</SelectItem>
                      <SelectItem value="5m">5 Minutes</SelectItem>
                      <SelectItem value="15m">15 Minutes</SelectItem>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="4h">4 Hours</SelectItem>
                      <SelectItem value="1d">1 Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Rolling Window */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                    <span>WINDOW SIZE</span>
                    <span className="font-mono">{config.rollingWindow}</span>
                  </Label>
                  <Slider
                    value={[config.rollingWindow]}
                    onValueChange={([value]) => setConfig({ ...config, rollingWindow: value })}
                    min={10}
                    max={500}
                    step={10}
                    className="py-2"
                  />
                </div>

                {/* Auto Refresh */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">AUTO REFRESH</Label>
                  <div className="flex items-center gap-3 h-9">
                    <Switch
                      checked={autoRefresh}
                      onCheckedChange={setAutoRefresh}
                    />
                    <span className="text-sm">{autoRefresh ? 'On' : 'Off'}</span>
                    {autoRefresh && (
                      <Select
                        value={refreshInterval.toString()}
                        onValueChange={(value) => setRefreshInterval(parseInt(value))}
                      >
                        <SelectTrigger className="h-8 w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2000">2s</SelectItem>
                          <SelectItem value="5000">5s</SelectItem>
                          <SelectItem value="10000">10s</SelectItem>
                          <SelectItem value="30000">30s</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">PRICE RANGE</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={priceFilter.min}
                      onChange={(e) => setPriceFilter({ ...priceFilter, min: parseFloat(e.target.value) || 0 })}
                      className="h-9"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={priceFilter.max}
                      onChange={(e) => setPriceFilter({ ...priceFilter, max: parseFloat(e.target.value) || 100000 })}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Volume Range */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">VOLUME RANGE</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={volumeFilter.min}
                      onChange={(e) => setVolumeFilter({ ...volumeFilter, min: parseFloat(e.target.value) || 0 })}
                      className="h-9"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={volumeFilter.max}
                      onChange={(e) => setVolumeFilter({ ...volumeFilter, max: parseFloat(e.target.value) || 1000 })}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Chart Layout */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">CHART LAYOUT</Label>
                  <Select
                    value={chartLayout}
                    onValueChange={(value: 'grid' | 'rows') => setChartLayout(value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="rows">Rows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                <div className="space-y-2 flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPriceFilter({ min: 0, max: 100000 });
                      setVolumeFilter({ min: 0, max: 1000 });
                      setSearchQuery('');
                      toast.success('Filters cleared');
                    }}
                    className="w-full"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-[2000px] mx-auto px-6 py-6 space-y-6">
        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-xl hover:shadow-2xl hover:shadow-accent/10 transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">CURRENT PRICE</p>
                  <p className="text-2xl font-bold tabular-nums">
                    ${typeof stats.currentPrice === 'number' ? stats.currentPrice.toFixed(2) : '0.00'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-xl hover:shadow-2xl hover:shadow-accent/10 transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">24H CHANGE</p>
                  <p className={`text-2xl font-bold tabular-nums ${
                    stats.change24h > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stats.change24h > 0 ? '+' : ''}{stats.change24h.toFixed(2)}%
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  stats.change24h > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}>
                  <Activity className={`w-6 h-6 ${stats.change24h > 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-xl hover:shadow-2xl hover:shadow-accent/10 transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">24H HIGH</p>
                  <p className="text-2xl font-bold tabular-nums text-green-600">
                    ${stats.high24h.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-xl hover:shadow-2xl hover:shadow-accent/10 transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">24H LOW</p>
                  <p className="text-2xl font-bold tabular-nums text-red-600">
                    ${stats.low24h.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-xl hover:shadow-2xl hover:shadow-accent/10 transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">24H VOLUME</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {stats.volume24h.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className={`grid gap-6 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100 ${
          chartLayout === 'grid' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
        }`}>
          {/* Price Chart */}
          <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-xl overflow-hidden group hover:shadow-2xl hover:shadow-accent/10 transition-all duration-300">
            <CardHeader className="border-b border-border/50 bg-gradient-to-r from-transparent to-accent/5">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  Price Chart
                </span>
                <Badge variant="outline" className="text-xs">
                  {chartData.length} points
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
                  <TrendingUp className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-sm font-medium">No price data available</p>
                  <p className="text-xs mt-1">Waiting for market data...</p>
                </div>
              ) : (
                <div className="h-72">
                  <PriceChart
                    data={chartData}
                    symbol={selectedSymbol}
                    timeframe={selectedTimeframe}
                    className="h-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Volume Chart */}
          <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-xl overflow-hidden group hover:shadow-2xl hover:shadow-accent/10 transition-all duration-300">
            <CardHeader className="border-b border-border/50 bg-gradient-to-r from-transparent to-accent/5">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-accent" />
                  Volume Chart
                </span>
                <Badge variant="outline" className="text-xs">
                  {chartData.length} points
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
                  <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-sm font-medium">No volume data available</p>
                  <p className="text-xs mt-1">Waiting for market data...</p>
                </div>
              ) : (
                <div className="h-72">
                  <VolumeChart
                    data={chartData}
                    symbol={selectedSymbol}
                    timeframe={selectedTimeframe}
                    className="h-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Spread Chart */}
          <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-xl overflow-hidden group hover:shadow-2xl hover:shadow-accent/10 transition-all duration-300">
            <CardHeader className="border-b border-border/50 bg-gradient-to-r from-transparent to-accent/5">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-accent" />
                  Spread Analysis
                </span>
                {analytics && (
                  <Badge variant="outline" className="text-xs">
                    Z-Score: {typeof analytics.z_score === 'number' ? analytics.z_score.toFixed(2) : 'N/A'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {analytics ? (
                <div className="h-72">
                  <SpreadAnalysisChart
                    analytics={analytics}
                    className="h-full"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
                  <Activity className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-sm font-medium">No analytics data available</p>
                  <p className="text-xs mt-1">Select multiple symbols to generate spread analytics</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Correlation Chart */}
          <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-xl overflow-hidden group hover:shadow-2xl hover:shadow-accent/10 transition-all duration-300">
            <CardHeader className="border-b border-border/50 bg-gradient-to-r from-transparent to-accent/5">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-accent" />
                  Correlation Matrix
                </span>
                <Badge variant="outline" className="text-xs">
                  {availableSymbols.length} symbols
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-72">
                <CorrelationChart
                  analytics={analytics}
                  className="h-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          {/* Recent Ticks Table */}
          <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-xl">
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" />
                  Recent Ticks
                </CardTitle>
                <Badge variant="secondary">{filteredTicks.length} total</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-3 px-2 font-semibold text-xs">TIME</th>
                      <th className="text-left py-3 px-2 font-semibold text-xs">SYMBOL</th>
                      <th className="text-right py-3 px-2 font-semibold text-xs">PRICE</th>
                      <th className="text-right py-3 px-2 font-semibold text-xs">QUANTITY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTicks.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-muted-foreground">
                          <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">No ticks available</p>
                        </td>
                      </tr>
                    ) : (
                      recentTicks.slice(0, 10).map((tick, idx) => (
                        <tr 
                          key={idx} 
                          className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 px-2 font-mono text-xs text-muted-foreground">
                            {tick.timestamp
                              ? new Date(tick.timestamp).toLocaleTimeString()
                              : 'N/A'}
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant="outline" className="text-xs">
                              {tick.symbol}
                            </Badge>
                          </td>
                          <td className="text-right py-3 px-2 font-mono font-semibold">
                            ${tick.price.toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-2 font-mono text-muted-foreground">
                            {tick.quantity?.toFixed(4) ?? 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-xl">
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-accent" />
                  Recent Alerts
                </CardTitle>
                <Badge variant="secondary">{recentAlerts.length} active</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {recentAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No alerts available</p>
                  </div>
                ) : (
                  recentAlerts.map((alert, idx) => {
                    // Handle both API Alert and WebSocket alert types
                    const alertType = 'condition_type' in alert ? alert.condition_type : 
                                     'alert_type' in alert ? alert.alert_type : 'Alert';
                    const alertTime = 'last_triggered' in alert ? alert.last_triggered :
                                     'triggered_at' in alert ? alert.triggered_at :
                                     'created_at' in alert ? alert.created_at : null;
                    const severity = alert.severity || 'low';
                    
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-4 bg-muted/20 hover:bg-muted/40 rounded-lg border border-border/30 transition-all duration-200 group"
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 animate-pulse ${
                            severity === 'critical'
                              ? 'bg-red-500 shadow-lg shadow-red-500/50'
                              : severity === 'high'
                              ? 'bg-orange-500 shadow-lg shadow-orange-500/50'
                              : severity === 'medium'
                              ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50'
                              : 'bg-blue-500 shadow-lg shadow-blue-500/50'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-sm">{alertType}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {alertTime && typeof alertTime === 'string'
                                ? new Date(alertTime).toLocaleTimeString()
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {alert.symbol}
                            </Badge>
                            <Badge 
                              variant={
                                severity === 'critical' ? 'destructive' : 
                                severity === 'high' ? 'default' : 
                                'secondary'
                              }
                              className="text-xs"
                            >
                              {severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {alert.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
