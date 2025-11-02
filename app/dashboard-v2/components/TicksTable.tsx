"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDashboard } from '../context/DashboardContext';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

export default function TicksTable() {
  const { ticks, isLoading, selectedSymbol } = useDashboard();

  if (isLoading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (ticks.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-500">
        No ticks available for {selectedSymbol}
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[500px]">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-700">
            <TableHead className="text-gray-400">Time</TableHead>
            <TableHead className="text-gray-400">Symbol</TableHead>
            <TableHead className="text-gray-400">Price</TableHead>
            <TableHead className="text-gray-400">Volume</TableHead>
            <TableHead className="text-gray-400">Bid</TableHead>
            <TableHead className="text-gray-400">Ask</TableHead>
            <TableHead className="text-gray-400">Trend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ticks.slice(0, 50).map((tick, index) => {
            const prevPrice = index < ticks.length - 1 ? ticks[index + 1].price : tick.price;
            const isUp = tick.price > prevPrice;
            const isDown = tick.price < prevPrice;

            return (
              <TableRow key={`${tick.symbol}-${tick.timestamp}-${index}`} className="border-gray-700">
                <TableCell className="text-gray-300">
                  {new Date(tick.timestamp).toLocaleTimeString()}
                </TableCell>
                <TableCell className="font-medium text-white">{tick.symbol}</TableCell>
                <TableCell className={`font-mono ${isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-gray-300'}`}>
                  ${tick.price.toFixed(2)}
                </TableCell>
                <TableCell className="text-gray-300">{tick.volume?.toFixed(4) || 'N/A'}</TableCell>
                <TableCell className="text-green-400">{tick.bid?.toFixed(2) || 'N/A'}</TableCell>
                <TableCell className="text-red-400">{tick.ask?.toFixed(2) || 'N/A'}</TableCell>
                <TableCell>
                  {isUp && <TrendingUp className="w-4 h-4 text-green-400" />}
                  {isDown && <TrendingDown className="w-4 h-4 text-red-400" />}
                  {!isUp && !isDown && <span className="text-gray-500">-</span>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
