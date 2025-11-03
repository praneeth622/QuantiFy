"use client";

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useDashboard } from '../context/DashboardContext';

export default function SymbolSelector() {
  const { selectedSymbol, setSelectedSymbol, symbols } = useDashboard();

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm text-muted-foreground font-sans">Trading Symbol</Label>
      <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
        <SelectTrigger className="w-[200px] bg-card border-border font-sans">
          <SelectValue placeholder="Select symbol" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {symbols.map((symbol) => (
            <SelectItem key={symbol.symbol} value={symbol.symbol} className="font-sans">
              {symbol.symbol}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
