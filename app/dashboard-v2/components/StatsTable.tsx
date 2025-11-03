"use client";

import React, { useEffect, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

interface TimeSeriesStat {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trade_count: number;
  avg_price: number;
  price_range: number;
  price_change_pct: number;
}

export default function StatsTable() {
  const { selectedSymbol, timeframe } = useDashboard();
  const [stats, setStats] = useState<TimeSeriesStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [selectedSymbol, timeframe]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/stats/timeseries?symbol=${selectedSymbol}&timeframe=${timeframe}&limit=20`
      );
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || []);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground font-sans">Loading stats...</div>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground font-sans">No data available</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left font-sans font-semibold text-foreground">Time</th>
            <th className="px-4 py-3 text-right font-sans font-semibold text-foreground">Open</th>
            <th className="px-4 py-3 text-right font-sans font-semibold text-foreground">High</th>
            <th className="px-4 py-3 text-right font-sans font-semibold text-foreground">Low</th>
            <th className="px-4 py-3 text-right font-sans font-semibold text-foreground">Close</th>
            <th className="px-4 py-3 text-right font-sans font-semibold text-foreground">Volume</th>
            <th className="px-4 py-3 text-right font-sans font-semibold text-foreground">Trades</th>
            <th className="px-4 py-3 text-right font-sans font-semibold text-foreground">Avg Price</th>
            <th className="px-4 py-3 text-right font-sans font-semibold text-foreground">Range</th>
            <th className="px-4 py-3 text-right font-sans font-semibold text-foreground">Change %</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat, index) => (
            <tr 
              key={index} 
              className="border-b border-border/50 hover:bg-accent/5 transition-colors"
            >
              <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                {formatTime(stat.timestamp)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-foreground">
                {formatNumber(stat.open)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-chart-4">
                {formatNumber(stat.high)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-destructive">
                {formatNumber(stat.low)}
              </td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                {formatNumber(stat.close)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                {formatNumber(stat.volume, 4)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                {stat.trade_count}
              </td>
              <td className="px-4 py-3 text-right font-mono text-accent">
                {formatNumber(stat.avg_price)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-secondary">
                {formatNumber(stat.price_range)}
              </td>
              <td className={`px-4 py-3 text-right font-mono font-semibold flex items-center justify-end gap-1 ${
                stat.price_change_pct > 0 ? 'text-chart-4' : 
                stat.price_change_pct < 0 ? 'text-destructive' : 
                'text-muted-foreground'
              }`}>
                {stat.price_change_pct > 0 && <ArrowUpIcon className="w-3 h-3" />}
                {stat.price_change_pct < 0 && <ArrowDownIcon className="w-3 h-3" />}
                {formatNumber(Math.abs(stat.price_change_pct))}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
