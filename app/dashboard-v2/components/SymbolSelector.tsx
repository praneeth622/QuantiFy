"use client";

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useDashboard } from '../context/DashboardContext';

export default function SymbolSelector() {
  const { selectedSymbol, setSelectedSymbol, symbols } = useDashboard();

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm text-gray-400">Trading Symbol</Label>
      <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
        <SelectTrigger className="w-[200px] bg-gray-900 border-gray-700">
          <SelectValue placeholder="Select symbol" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-700">
          {symbols.map((symbol) => (
            <SelectItem key={symbol.symbol} value={symbol.symbol}>
              {symbol.symbol}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
