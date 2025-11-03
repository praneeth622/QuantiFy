"use client";

import React, { useEffect, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';

interface CorrelationData {
  symbol1: string;
  symbol2: string;
  correlation: number;
}

interface CorrelationResponse {
  correlations: CorrelationData[];
  metadata?: {
    actual_candles: number;
    data_quality: string;
    warning?: string;
  };
  timeframe: string;
  lookback: number;
}

export default function CorrelationHeatmap() {
  const { timeframe } = useDashboard();
  const [correlations, setCorrelations] = useState<CorrelationData[]>([]);
  const [metadata, setMetadata] = useState<CorrelationResponse['metadata']>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const symbols = ["BTCUSDT", "ETHUSDT", "ADAUSDT", "SOLUSDT", "DOTUSDT"];

  useEffect(() => {
    fetchCorrelations();
  }, [timeframe]);

  const fetchCorrelations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/correlation/matrix?timeframe=${timeframe}&lookback=100`
      );
      
      if (response.ok) {
        const data: CorrelationResponse = await response.json();
        setCorrelations(data.correlations || []);
        setMetadata(data.metadata);
      }
    } catch (error) {
      console.error('Error fetching correlations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCorrelation = (symbol1: string, symbol2: string): number => {
    const found = correlations.find(
      c => c.symbol1 === symbol1 && c.symbol2 === symbol2
    );
    return found ? found.correlation : 0;
  };

  const getColorForCorrelation = (correlation: number): string => {
    // Correlation ranges from -1 to 1
    // Strong positive (green), neutral (yellow), strong negative (red)
    if (correlation > 0.7) return 'bg-chart-5 text-foreground'; // Green
    if (correlation > 0.4) return 'bg-chart-4/70 text-foreground'; // Light green
    if (correlation > 0.1) return 'bg-accent/40 text-foreground'; // Cyan
    if (correlation > -0.1) return 'bg-muted text-foreground'; // Neutral
    if (correlation > -0.4) return 'bg-destructive/40 text-foreground'; // Light red
    return 'bg-destructive text-destructive-foreground'; // Red
  };

  const getQualityBadgeColor = (quality?: string) => {
    switch (quality) {
      case 'excellent': return 'bg-chart-5 text-foreground';
      case 'good': return 'bg-chart-4 text-foreground';
      case 'limited': return 'bg-chart-2 text-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const shortName = (symbol: string) => symbol.replace('USDT', '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground font-sans">Loading correlations...</div>
      </div>
    );
  }

  if (correlations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-muted-foreground font-sans text-lg">No correlation data available</div>
        <div className="text-sm text-muted-foreground">Collecting more data... Need at least 5 candles per symbol</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-gradient-to-b from-accent to-accent/50 rounded-full"></div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent font-sans">
            Cross-Symbol Correlation Matrix
          </h3>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {metadata && (
            <>
              <div className={`px-3 py-1.5 rounded-full text-xs font-semibold font-sans ${getQualityBadgeColor(metadata.data_quality)}`}>
                {metadata.data_quality?.toUpperCase()} ({metadata.actual_candles} candles)
              </div>
              {metadata.warning && (
                <div className="px-3 py-1.5 rounded-full text-xs font-semibold font-sans bg-chart-2/80 text-foreground">
                  ⚠️ {metadata.warning}
                </div>
              )}
            </>
          )}
          <div className="text-sm text-muted-foreground font-sans px-3 py-1.5 bg-muted/30 rounded-lg">
            {timeframe} | 100 lookback
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header Row */}
          <div className="flex">
            <div className="w-28 flex-shrink-0" />
            {symbols.map((symbol) => (
              <div 
                key={symbol} 
                className="w-28 flex-shrink-0 text-center py-3 font-sans font-bold text-sm text-accent"
              >
                {shortName(symbol)}
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {symbols.map((symbol1) => (
            <div key={symbol1} className="flex">
              {/* Row Label */}
              <div className="w-28 flex-shrink-0 flex items-center font-sans font-bold text-sm text-accent">
                {shortName(symbol1)}
              </div>

              {/* Correlation Cells */}
              {symbols.map((symbol2) => {
                const correlation = getCorrelation(symbol1, symbol2);
                const colorClass = getColorForCorrelation(correlation);
                
                return (
                  <div 
                    key={symbol2}
                    className={`w-28 flex-shrink-0 h-20 flex items-center justify-center border border-border/30 transition-all hover:scale-110 hover:z-10 hover:shadow-2xl hover:border-accent cursor-pointer ${colorClass} rounded-lg m-0.5`}
                    title={`${shortName(symbol1)} vs ${shortName(symbol2)}: ${correlation.toFixed(4)}`}
                  >
                    <div className="text-center">
                      <div className="font-mono font-bold text-lg">
                        {correlation.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-6 border-t border-border/50">
        <span className="text-sm font-semibold text-muted-foreground font-sans">Correlation Scale:</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-destructive rounded-lg shadow-sm" />
          <span className="text-sm text-muted-foreground font-sans">Negative (-1.0)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-muted rounded-lg shadow-sm" />
          <span className="text-sm text-muted-foreground font-sans">Neutral (0.0)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-chart-5 rounded-lg shadow-sm" />
          <span className="text-sm text-muted-foreground font-sans">Positive (+1.0)</span>
        </div>
      </div>
    </div>
  );
}
