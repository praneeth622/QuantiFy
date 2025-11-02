"use client";

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useDashboard, Timeframe } from '../context/DashboardContext';

const timeframes: { value: Timeframe; label: string }[] = [
  { value: '1s', label: '1 Second' },
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' },
];

export default function TimeframeSelector() {
  const { timeframe, setTimeframe, rollingWindow, setRollingWindow } = useDashboard();

  return (
    <div className="flex gap-4">
      <div className="flex flex-col gap-2">
        <Label className="text-sm text-gray-400">Timeframe</Label>
        <Select value={timeframe} onValueChange={(value) => setTimeframe(value as Timeframe)}>
          <SelectTrigger className="w-[150px] bg-gray-900 border-gray-700">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-700">
            {timeframes.map((tf) => (
              <SelectItem key={tf.value} value={tf.value}>
                {tf.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-sm text-gray-400">Rolling Window</Label>
        <Input
          type="number"
          value={rollingWindow}
          onChange={(e) => setRollingWindow(Number(e.target.value))}
          min={5}
          max={200}
          className="w-[120px] bg-gray-900 border-gray-700"
        />
      </div>
    </div>
  );
}
