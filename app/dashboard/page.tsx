/**
 * QuantiFy Trading Dashboard
 * Main dashboard with real-time data visualization
 */
'use client';

import { useState, useMemo } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
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
import { Settings, TrendingUp, Activity, BarChart3, AlertCircle } from 'lucide-react';
import { PriceChart } from '@/components/PriceChart';
import { VolumeChart } from '@/components/VolumeChart';
import { SpreadAnalysisChart } from '@/components/SpreadAnalysisChart';
import { CorrelationChart } from '@/components/CorrelationChart';

export default function DashboardPage() {
  const { ticks, analytics, alerts, isConnected } = useWebSocket({
    autoReconnect: true,
    showNotifications: false, // Disable toasts for cleaner dashboard
    debug: false,
  });

  // State
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1m');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Get unique symbols from ticks
  const availableSymbols = useMemo(() => {
    const symbols = new Set(ticks.map((t) => t.symbol).filter(Boolean));
    return Array.from(symbols).sort();
  }, [ticks]);

  // Filter ticks by selected symbol
  const symbolTicks = useMemo(() => {
    return ticks.filter((t) => t.symbol === selectedSymbol).slice(0, 50);
  }, [ticks, selectedSymbol]);

  // Calculate stats
  const stats = useMemo(() => {
    if (symbolTicks.length === 0) {
      return {
        currentPrice: 0,
        change24h: 0,
        high24h: 0,
        low24h: 0,
        volume24h: 0,
        tickCount: 0,
      };
    }

    const prices = symbolTicks.map((t) => t.price).filter((p) => typeof p === 'number');
    const volumes = symbolTicks.map((t) => t.quantity).filter((v) => typeof v === 'number');

    return {
      currentPrice: prices[0] || 0,
      change24h: prices.length > 1 ? ((prices[0] - prices[prices.length - 1]) / prices[prices.length - 1]) * 100 : 0,
      high24h: Math.max(...prices),
      low24h: Math.min(...prices),
      volume24h: volumes.reduce((a, b) => a + b, 0),
      tickCount: symbolTicks.length,
    };
  }, [symbolTicks]);

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

          {/* Center: Symbol & Timeframe Selectors */}
          <div className="flex items-center gap-3">
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select symbol" />
              </SelectTrigger>
              <SelectContent>
                {availableSymbols.length > 0 ? (
                  availableSymbols.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
                )}
              </SelectContent>
            </Select>

            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1m</SelectItem>
                <SelectItem value="5m">5m</SelectItem>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="4h">4h</SelectItem>
                <SelectItem value="1d">1d</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Settings className="w-5 h-5" />
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
      </header>

      <div className="flex">
        {/* Left Sidebar */}
        {sidebarOpen && (
          <aside className="w-64 bg-card border-r border-border p-4 space-y-4 hidden lg:block">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Control Panel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Auto Refresh</label>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    Enabled
                  </Button>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Data Range</label>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    Last 100 ticks
                  </Button>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Alerts</label>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {alerts.length} Active
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Ticks</span>
                  <span className="font-mono">{ticks.length}</span>
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
                  <span className="font-mono">{alerts.length}</span>
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
                  data={ticks}
                  className="h-[350px]"
                />
              </CardContent>
            </Card>

            {/* Chart 2: Volume Chart */}
            <Card>
              <CardContent className="pt-6">
                <VolumeChart
                  symbol={selectedSymbol}
                  timeframe={selectedTimeframe}
                  data={ticks}
                  className="h-[350px]"
                />
              </CardContent>
            </Card>

            {/* Chart 3: Spread Analysis */}
            <Card>
              <CardContent className="pt-6">
                <SpreadAnalysisChart
                  analytics={analytics}
                  className="h-[350px]"
                />
              </CardContent>
            </Card>

            {/* Chart 4: Correlation Matrix */}
            <Card>
              <CardContent className="pt-6">
                <CorrelationChart
                  analytics={analytics}
                  className="h-[350px]"
                />
              </CardContent>
            </Card>
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
                    {symbolTicks.length > 0 ? (
                      symbolTicks.slice(0, 10).map((tick, idx) => {
                        if (!tick || !tick.symbol || typeof tick.price !== 'number') {
                          return null;
                        }

                        const value = tick.price * (tick.quantity ?? 0);

                        return (
                          <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
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
                          {isConnected
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
          {alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-accent" />
                  Recent Alerts ({alerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alerts.slice(0, 5).map((alert, idx) => {
                    if (!alert || !alert.alert_type) return null;

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-yellow-600">
                            {alert.alert_type}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {alert.message || 'No message'}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {alert.timestamp
                            ? new Date(alert.timestamp).toLocaleTimeString()
                            : 'N/A'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
