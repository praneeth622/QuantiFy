"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

// Create API client
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30000,
});

export type Timeframe = '1s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface Symbol {
  symbol: string;
  exchange: string;
}

export interface Tick {
  symbol: string;
  price: number;
  volume: number;
  timestamp: string;
  bid?: number;
  ask?: number;
}

export interface Alert {
  id: number;
  symbol: string;
  condition: string;
  threshold: number;
  is_active: boolean;
  created_at: string;
  alert_type: string;
  severity: string;
  message: string;
  last_triggered: string | null;
  trigger_count: number;
  user_id: string;
  strategy_name: string | null;
}

interface DashboardContextType {
  // State
  selectedSymbol: string;
  timeframe: Timeframe;
  rollingWindow: number;
  isLoading: boolean;
  
  // Data
  symbols: Symbol[];
  ticks: Tick[];
  alerts: Alert[];
  
  // Actions
  setSelectedSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  setRollingWindow: (window: number) => void;
  refreshData: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [rollingWindow, setRollingWindow] = useState<number>(20);
  
  const queryClient = useQueryClient();

  // Fetch symbols
  const { data: symbolsData, isLoading: symbolsLoading } = useQuery({
    queryKey: ['symbols'],
    queryFn: async () => {
      const response = await api.get<Symbol[]>('/api/symbols');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch ticks for selected symbol
  const { data: ticksData, isLoading: ticksLoading } = useQuery({
    queryKey: ['ticks', selectedSymbol],
    queryFn: async () => {
      const response = await api.get<Tick[]>('/api/ticks', {
        params: { symbol: selectedSymbol, limit: 100 }
      });
      return response.data;
    },
    enabled: !!selectedSymbol,
    refetchInterval: 2000, // Refetch every 2 seconds
    staleTime: 1000,
  });

  // Fetch alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const response = await api.get<{ count: number; alerts: Alert[] }>('/api/alerts');
      return response.data.alerts;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 2000,
  });

  // Set initial symbol when symbols are loaded
  useEffect(() => {
    if (symbolsData && symbolsData.length > 0 && !selectedSymbol) {
      setSelectedSymbol(symbolsData[0].symbol);
    }
  }, [symbolsData, selectedSymbol]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['symbols'] }),
        queryClient.invalidateQueries({ queryKey: ['ticks'] }),
        queryClient.invalidateQueries({ queryKey: ['alerts'] }),
      ]);
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
      console.error('Refresh error:', error);
    }
  }, [queryClient]);

  const isLoading = symbolsLoading || ticksLoading || alertsLoading;

  const value: DashboardContextType = {
    selectedSymbol,
    timeframe,
    rollingWindow,
    isLoading,
    symbols: symbolsData || [],
    ticks: ticksData || [],
    alerts: alertsData || [],
    setSelectedSymbol,
    setTimeframe,
    setRollingWindow,
    refreshData,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
