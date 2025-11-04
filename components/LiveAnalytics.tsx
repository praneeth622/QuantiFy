/**
 * LiveAnalytics Component
 * 
 * Production-grade component displaying real-time analytics metrics
 * with intelligent update intervals and visual indicators
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  BarChart3, 
  RefreshCw, 
  AlertCircle,
  Timer,
  Target
} from 'lucide-react';
import { useLiveAnalytics } from '../app/hooks/useLiveAnalytics';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface LiveAnalyticsProps {
  primarySymbol?: string;
  secondarySymbol?: string;
  className?: string;
  compact?: boolean;
}

export function LiveAnalytics({ 
  primarySymbol, 
  secondarySymbol, 
  className = '',
  compact = false 
}: LiveAnalyticsProps) {
  const {
    metrics,
    loading,
    errors,
    config,
    manualUpdate,
    isTickBasedActive,
    isCandleBasedActive,
    intervals,
  } = useLiveAnalytics({
    primarySymbol,
    secondarySymbol,
    enableTickBased: true,
    enableCandleBased: true,
    autoUpdate: true,
  });
  
  const symbolPair = `${config.primarySymbol} / ${config.secondarySymbol}`;
  
  // Format metric value
  const formatValue = (value: number | null, decimals: number = 4) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(decimals);
  };
  
  // Get metric color based on value
  const getZScoreColor = (zScore: number | null) => {
    if (zScore === null) return 'text-gray-500';
    if (Math.abs(zScore) > 2) return 'text-red-600 dark:text-red-400';
    if (Math.abs(zScore) > 1) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };
  
  // Get time ago string
  const getTimeAgo = (timestamp: number | undefined) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 1) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };
  
  if (compact) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Live Analytics
              </CardTitle>
              <CardDescription className="text-xs mt-1">{symbolPair}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isTickBasedActive && (
                <Badge variant="outline" className="text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  {intervals.tickBased}ms
                </Badge>
              )}
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={manualUpdate}
                disabled={loading.tickBased || loading.candleBased}
              >
                <RefreshCw className={`w-3 h-3 ${loading.tickBased || loading.candleBased ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Z-Score */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="w-3 h-3" />
                Z-Score
              </div>
              <div className={`text-xl font-bold font-mono ${getZScoreColor(metrics.zScore?.value || null)}`}>
                {formatValue(metrics.zScore?.value || null, 2)}
              </div>
              <div className="text-xs text-muted-foreground">
                {getTimeAgo(metrics.zScore?.timestamp)}
              </div>
            </div>
            
            {/* Volatility */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Volatility</div>
              <div className="text-xl font-bold font-mono">
                {formatValue(metrics.volatility?.value || null, 2)}
              </div>
              <div className="text-xs text-muted-foreground">
                {getTimeAgo(metrics.volatility?.timestamp)}
              </div>
            </div>
            
            {/* Correlation */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Correlation</div>
              <div className="text-xl font-bold font-mono">
                {formatValue(metrics.correlation?.value || null, 3)}
              </div>
              <div className="text-xs text-muted-foreground">
                {getTimeAgo(metrics.correlation?.timestamp)}
              </div>
            </div>
            
            {/* Tick Rate */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Tick Rate</div>
              <div className="text-xl font-bold font-mono">
                {formatValue(metrics.tickRate?.value || null, 1)}
                <span className="text-sm text-muted-foreground ml-1">/s</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {getTimeAgo(metrics.tickRate?.timestamp)}
              </div>
            </div>
          </div>
          
          {/* Errors */}
          {(errors.tickBased || errors.candleBased) && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/20 rounded-md">
              <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-3 h-3 mt-0.5" />
                <div>
                  {errors.tickBased || errors.candleBased}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Live Analytics Dashboard
              </CardTitle>
              <CardDescription className="mt-2">
                Real-time quantitative metrics for <strong>{symbolPair}</strong>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isTickBasedActive && (
                <Badge variant="default" className="bg-green-600">
                  <Zap className="w-3 h-3 mr-1" />
                  Live ({intervals.tickBased}ms)
                </Badge>
              )}
              {isCandleBasedActive && (
                <Badge variant="outline">
                  <Timer className="w-3 h-3 mr-1" />
                  Candles ({(intervals.candleBased / 1000).toFixed(0)}s)
                </Badge>
              )}
              <Button 
                onClick={manualUpdate}
                disabled={loading.tickBased || loading.candleBased}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading.tickBased || loading.candleBased ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* Tick-Based Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            Tick-Based Metrics
            <Badge variant="outline" className="ml-2 text-xs">
              Updates: {intervals.tickBased}ms
            </Badge>
          </CardTitle>
          <CardDescription>
            Real-time metrics calculated from streaming tick data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Z-Score Card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Z-Score</span>
                {loading.tickBased && <RefreshCw className="w-3 h-3 animate-spin" />}
              </div>
              <div className={`text-4xl font-bold font-mono ${getZScoreColor(metrics.zScore?.value || null)}`}>
                {formatValue(metrics.zScore?.value || null, 3)}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Updated: {getTimeAgo(metrics.zScore?.timestamp)}</div>
                {metrics.zScore?.metadata?.hedgeRatio && (
                  <div>Hedge Ratio: {formatValue(metrics.zScore.metadata.hedgeRatio, 4)}</div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                {metrics.zScore && Math.abs(metrics.zScore.value) > 2 && (
                  <Badge variant="destructive">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Extreme
                  </Badge>
                )}
                {metrics.zScore && Math.abs(metrics.zScore.value) > 1 && Math.abs(metrics.zScore.value) <= 2 && (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                    Elevated
                  </Badge>
                )}
                {metrics.zScore && Math.abs(metrics.zScore.value) <= 1 && (
                  <Badge variant="outline" className="border-green-500 text-green-600">
                    Normal
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Volatility Card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Volatility (σ)</span>
                {loading.tickBased && <RefreshCw className="w-3 h-3 animate-spin" />}
              </div>
              <div className="text-4xl font-bold font-mono">
                {formatValue(metrics.volatility?.value || null, 2)}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Updated: {getTimeAgo(metrics.volatility?.timestamp)}</div>
                {metrics.volatility?.symbol && (
                  <div>Symbol: {metrics.volatility.symbol}</div>
                )}
              </div>
              {metrics.volatility && (
                <Badge variant="outline">
                  Window: {metrics.volatility.metadata?.window || 20} ticks
                </Badge>
              )}
            </div>
            
            {/* Tick Rate Card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Tick Rate</span>
                {loading.tickBased && <RefreshCw className="w-3 h-3 animate-spin" />}
              </div>
              <div className="text-4xl font-bold font-mono">
                {formatValue(metrics.tickRate?.value || null, 1)}
                <span className="text-lg text-muted-foreground ml-2">ticks/s</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Updated: {getTimeAgo(metrics.tickRate?.timestamp)}</div>
                <div>5-second rolling average</div>
              </div>
              {metrics.tickRate && metrics.tickRate.value > 10 && (
                <Badge variant="default" className="bg-green-600">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  High Activity
                </Badge>
              )}
            </div>
          </div>
          
          {errors.tickBased && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
              <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <div>
                  <strong>Error:</strong> {errors.tickBased}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Candle-Based Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            Candle-Based Metrics
            <Badge variant="outline" className="ml-2 text-xs">
              Updates: {(intervals.candleBased / 1000).toFixed(0)}s
            </Badge>
          </CardTitle>
          <CardDescription>
            Metrics calculated from OHLCV candles (timeframe-dependent)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Correlation Card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Correlation Coefficient</span>
                {loading.candleBased && <RefreshCw className="w-3 h-3 animate-spin" />}
              </div>
              <div className="text-4xl font-bold font-mono">
                {formatValue(metrics.correlation?.value || null, 4)}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Updated: {getTimeAgo(metrics.correlation?.timestamp)}</div>
                <div>Pair: {metrics.correlation?.symbolPair || symbolPair}</div>
              </div>
              {metrics.correlation && (
                <div className="flex items-center gap-2">
                  {Math.abs(metrics.correlation.value) > 0.7 && (
                    <Badge variant="default" className="bg-purple-600">
                      Strong Correlation
                    </Badge>
                  )}
                  {metrics.correlation.value < 0 && (
                    <Badge variant="outline">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      Inverse
                    </Badge>
                  )}
                  {metrics.correlation.value > 0 && (
                    <Badge variant="outline">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Direct
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            {/* Hedge Ratio Card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Hedge Ratio (β)</span>
                {loading.candleBased && <RefreshCw className="w-3 h-3 animate-spin" />}
              </div>
              <div className="text-4xl font-bold font-mono">
                {formatValue(metrics.hedgeRatio?.value || null, 4)}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Updated: {getTimeAgo(metrics.hedgeRatio?.timestamp)}</div>
                <div>Pair: {metrics.hedgeRatio?.symbolPair || symbolPair}</div>
              </div>
              {metrics.hedgeRatio && (
                <Badge variant="outline">
                  OLS Regression
                </Badge>
              )}
            </div>
          </div>
          
          {errors.candleBased && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
              <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <div>
                  <strong>Error:</strong> {errors.candleBased}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Configuration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Window Size:</span>{' '}
              <strong>{config.windowSize}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Lookback:</span>{' '}
              <strong>{config.lookbackPeriods}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Auto Update:</span>{' '}
              <strong>{config.autoUpdate ? 'Enabled' : 'Disabled'}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Max Metrics:</span>{' '}
              <strong>{config.maxMetrics}</strong>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
