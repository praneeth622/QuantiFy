"use client";

import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export default function StatsPanel() {
  const { ticks, selectedSymbol } = useDashboard();

  const stats = useMemo(() => {
    if (!ticks || ticks.length === 0) {
      return {
        currentPrice: 0,
        priceChange: 0,
        priceChangePercent: 0,
        volume24h: 0,
        tickCount: 0,
      };
    }

    const latestTick = ticks[0];
    const oldestTick = ticks[ticks.length - 1];
    
    const currentPrice = latestTick.price;
    const priceChange = currentPrice - oldestTick.price;
    const priceChangePercent = (priceChange / oldestTick.price) * 100;
    const volume24h = ticks.reduce((sum, tick) => sum + (tick.volume || 0), 0);

    return {
      currentPrice,
      priceChange,
      priceChangePercent,
      volume24h,
      tickCount: ticks.length,
    };
  }, [ticks]);

  const isPositive = stats.priceChange >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-sm">Current Price</p>
            <p className="text-2xl font-bold text-white mt-1">
              ${stats.currentPrice.toFixed(2)}
            </p>
          </div>
          <DollarSign className="w-8 h-8 text-blue-200" />
        </div>
      </Card>

      <Card className={`bg-gradient-to-br ${isPositive ? 'from-green-600 to-green-700' : 'from-red-600 to-red-700'} border-0 p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`${isPositive ? 'text-green-200' : 'text-red-200'} text-sm`}>24h Change</p>
            <p className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
              {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {stats.priceChangePercent.toFixed(2)}%
            </p>
          </div>
          <Activity className={`w-8 h-8 ${isPositive ? 'text-green-200' : 'text-red-200'}`} />
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-200 text-sm">24h Volume</p>
            <p className="text-2xl font-bold text-white mt-1">
              {stats.volume24h.toFixed(2)}
            </p>
          </div>
          <Activity className="w-8 h-8 text-purple-200" />
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-0 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-200 text-sm">Tick Count</p>
            <p className="text-2xl font-bold text-white mt-1">
              {stats.tickCount}
            </p>
          </div>
          <Activity className="w-8 h-8 text-orange-200" />
        </div>
      </Card>
    </div>
  );
}
