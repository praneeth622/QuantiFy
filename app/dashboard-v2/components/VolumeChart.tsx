"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import { Loader2 } from 'lucide-react';

export default function VolumeChart() {
  const { ticks, isLoading, rollingWindow } = useDashboard();

  const chartData = useMemo(() => {
    if (!ticks || ticks.length === 0) return [];

    // Reverse to show chronological order
    const sortedTicks = [...ticks].reverse();

    // Apply rolling window filter
    const windowedData = sortedTicks.slice(-rollingWindow);

    return windowedData.map((tick) => ({
      time: new Date(tick.timestamp).toLocaleTimeString(),
      volume: tick.volume || 0,
    }));
  }, [ticks, rollingWindow]);

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="time" 
          stroke="#9CA3AF"
          tick={{ fill: '#9CA3AF' }}
        />
        <YAxis 
          stroke="#9CA3AF"
          tick={{ fill: '#9CA3AF' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1F2937', 
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#F9FAFB'
          }}
        />
        <Bar dataKey="volume" fill="#8B5CF6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
