/**
 * ControlPanel Component
 * Advanced control panel for dashboard configuration
 */
'use client';

import { useState, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Settings, 
  RefreshCw, 
  Download, 
  Calendar,
  TrendingUp,
  Activity,
  BarChart3,
  LineChart,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

export interface ControlPanelConfig {
  /** Selected symbols for analysis */
  symbols: string[];
  /** Timeframe for data aggregation */
  timeframe: '1s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  /** Rolling window size for analytics */
  rollingWindow: number;
  /** Analytics toggles */
  analytics: {
    spread: boolean;
    correlation: boolean;
    volatility: boolean;
    volume: boolean;
  };
  /** Export date range */
  dateRange: {
    from: Date;
    to: Date;
  };
}

interface ControlPanelProps {
  /** Current configuration */
  config: ControlPanelConfig;
  /** Callback when configuration changes */
  onChange: (config: ControlPanelConfig) => void;
  /** Available symbols to choose from */
  availableSymbols?: string[];
  /** Loading state for refresh button */
  isRefreshing?: boolean;
  /** Callback for refresh data */
  onRefresh?: () => void;
  /** Callback for export CSV */
  onExport?: (dateRange: { from: Date; to: Date }) => void;
  /** Show compact version */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const TIMEFRAMES = [
  { value: '1s', label: '1s' },
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' },
] as const;

const DEFAULT_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT'];

export function ControlPanel({
  config,
  onChange,
  availableSymbols = DEFAULT_SYMBOLS,
  isRefreshing = false,
  onRefresh,
  onExport,
  compact = false,
  className = '',
}: ControlPanelProps) {
  const [datePickerOpen, setDatePickerOpen] = useState<'from' | 'to' | null>(null);

  /**
   * Update symbol selection
   */
  const handleSymbolChange = useCallback((symbol: string) => {
    onChange({
      ...config,
      symbols: [symbol], // Single select for now, can be extended to multi-select
    });
  }, [config, onChange]);

  /**
   * Update multiple symbols (for multi-select)
   */
  const handleSymbolsChange = useCallback((symbols: string[]) => {
    onChange({
      ...config,
      symbols,
    });
  }, [config, onChange]);

  /**
   * Add/remove symbol
   */
  const toggleSymbol = useCallback((symbol: string) => {
    const newSymbols = config.symbols.includes(symbol)
      ? config.symbols.filter(s => s !== symbol)
      : [...config.symbols, symbol];
    
    // Ensure at least one symbol is selected
    if (newSymbols.length > 0) {
      onChange({
        ...config,
        symbols: newSymbols,
      });
    }
  }, [config, onChange]);

  /**
   * Update timeframe
   */
  const handleTimeframeChange = useCallback((timeframe: string) => {
    onChange({
      ...config,
      timeframe: timeframe as ControlPanelConfig['timeframe'],
    });
  }, [config, onChange]);

  /**
   * Update rolling window
   */
  const handleRollingWindowChange = useCallback((value: number[]) => {
    onChange({
      ...config,
      rollingWindow: value[0],
    });
  }, [config, onChange]);

  /**
   * Toggle analytics option
   */
  const handleAnalyticsToggle = useCallback((key: keyof ControlPanelConfig['analytics']) => {
    onChange({
      ...config,
      analytics: {
        ...config.analytics,
        [key]: !config.analytics[key],
      },
    });
  }, [config, onChange]);

  /**
   * Update date range
   */
  const handleDateChange = (type: 'from' | 'to', date: Date | undefined) => {
    if (!date) return;
    
    onChange({
      ...config,
      dateRange: {
        ...config.dateRange,
        [type]: date,
      },
    });
    setDatePickerOpen(null);
  };

  /**
   * Handle export
   */
  const handleExport = useCallback(() => {
    if (onExport) {
      onExport(config.dateRange);
    }
  }, [onExport, config.dateRange]);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        {/* Symbol Selector */}
        <Select 
          value={config.symbols[0] || 'BTCUSDT'} 
          onValueChange={handleSymbolChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select symbol" />
          </SelectTrigger>
          <SelectContent>
            {availableSymbols.map((symbol) => (
              <SelectItem key={symbol} value={symbol}>
                {symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Timeframe Buttons */}
        <div className="flex gap-1">
          {TIMEFRAMES.slice(0, 3).map((tf) => (
            <Button
              key={tf.value}
              variant={config.timeframe === tf.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTimeframeChange(tf.value)}
            >
              {tf.label}
            </Button>
          ))}
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Control Panel
        </CardTitle>
        <CardDescription>
          Configure data sources, timeframes, and analytics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Symbol Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trading Symbols
          </Label>
          
          {/* Primary Symbol Selector */}
          <Select 
            value={config.symbols[0] || 'BTCUSDT'} 
            onValueChange={handleSymbolChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select primary symbol" />
            </SelectTrigger>
            <SelectContent>
              {availableSymbols.map((symbol) => (
                <SelectItem key={symbol} value={symbol}>
                  {symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Multi-select symbols */}
          <div className="flex flex-wrap gap-2">
            {availableSymbols.map((symbol) => (
              <Badge
                key={symbol}
                variant={config.symbols.includes(symbol) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => toggleSymbol(symbol)}
              >
                {symbol}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Selected: {config.symbols.join(', ') || 'None'}
          </p>
        </div>

        {/* Timeframe Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Timeframe
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {TIMEFRAMES.map((tf) => (
              <Button
                key={tf.value}
                variant={config.timeframe === tf.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTimeframeChange(tf.value)}
                className="w-full"
              >
                {tf.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Rolling Window Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Rolling Window
            </Label>
            <Badge variant="outline">{config.rollingWindow} periods</Badge>
          </div>
          <Slider
            value={[config.rollingWindow]}
            onValueChange={handleRollingWindowChange}
            min={10}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>10</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        {/* Analytics Toggles */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Analytics
          </Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="spread-toggle" className="text-sm cursor-pointer">
                  Spread Analysis
                </Label>
                <p className="text-xs text-muted-foreground">
                  Calculate price spread and z-score
                </p>
              </div>
              <Switch
                id="spread-toggle"
                checked={config.analytics.spread}
                onCheckedChange={() => handleAnalyticsToggle('spread')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="correlation-toggle" className="text-sm cursor-pointer">
                  Correlation
                </Label>
                <p className="text-xs text-muted-foreground">
                  Calculate rolling correlation
                </p>
              </div>
              <Switch
                id="correlation-toggle"
                checked={config.analytics.correlation}
                onCheckedChange={() => handleAnalyticsToggle('correlation')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="volatility-toggle" className="text-sm cursor-pointer">
                  Volatility
                </Label>
                <p className="text-xs text-muted-foreground">
                  Track price volatility metrics
                </p>
              </div>
              <Switch
                id="volatility-toggle"
                checked={config.analytics.volatility}
                onCheckedChange={() => handleAnalyticsToggle('volatility')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="volume-toggle" className="text-sm cursor-pointer">
                  Volume Analysis
                </Label>
                <p className="text-xs text-muted-foreground">
                  Monitor volume trends
                </p>
              </div>
              <Switch
                id="volume-toggle"
                checked={config.analytics.volume}
                onCheckedChange={() => handleAnalyticsToggle('volume')}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4 border-t">
          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="default"
              size="default"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          )}

          {/* Export CSV with Date Range */}
          {onExport && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Popover 
                  open={datePickerOpen === 'from'} 
                  onOpenChange={(open) => setDatePickerOpen(open ? 'from' : null)}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(config.dateRange.from, 'MMM dd')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={config.dateRange.from}
                      onSelect={(date) => handleDateChange('from', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover 
                  open={datePickerOpen === 'to'} 
                  onOpenChange={(open) => setDatePickerOpen(open ? 'to' : null)}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(config.dateRange.to, 'MMM dd')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      mode="single"
                      selected={config.dateRange.to}
                      onSelect={(date) => handleDateChange('to', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button
                variant="outline"
                size="default"
                onClick={handleExport}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="pt-4 border-t space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Configuration Summary</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Symbols:</span>
              <span className="ml-1 font-mono">{config.symbols.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Timeframe:</span>
              <span className="ml-1 font-mono">{config.timeframe}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Window:</span>
              <span className="ml-1 font-mono">{config.rollingWindow}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Analytics:</span>
              <span className="ml-1 font-mono">
                {Object.values(config.analytics).filter(Boolean).length}/4
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Hook to manage control panel state
 */
export function useControlPanel(initialConfig?: Partial<ControlPanelConfig>) {
  const [config, setConfig] = useState<ControlPanelConfig>({
    symbols: initialConfig?.symbols || ['BTCUSDT'],
    timeframe: initialConfig?.timeframe || '1m',
    rollingWindow: initialConfig?.rollingWindow || 50,
    analytics: {
      spread: initialConfig?.analytics?.spread ?? true,
      correlation: initialConfig?.analytics?.correlation ?? true,
      volatility: initialConfig?.analytics?.volatility ?? false,
      volume: initialConfig?.analytics?.volume ?? true,
    },
    dateRange: {
      from: initialConfig?.dateRange?.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      to: initialConfig?.dateRange?.to || new Date(),
    },
  });

  return {
    config,
    setConfig,
    updateConfig: (updates: Partial<ControlPanelConfig>) => {
      setConfig(prev => ({ ...prev, ...updates }));
    },
  };
}
