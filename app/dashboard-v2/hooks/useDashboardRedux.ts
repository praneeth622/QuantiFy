/**
 * Dashboard Redux Hook
 * Industry-grade state management for trading dashboard
 */

'use client';

import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/store';
import {
  setSelectedSymbol,
  setTimeframe,
  fetchSymbols,
  fetchTicks,
  selectSymbols,
  selectSelectedSymbol,
  selectTimeframe,
  selectTicksForSymbol,
  selectOHLCVForSymbol,
  selectIsConnected,
  selectStats,
} from '@/app/store/slices/marketDataSlice';
import { useWebSocketRedux } from '@/app/hooks/useWebSocketRedux';

export function useDashboardRedux() {
  const dispatch = useAppDispatch();
  
  // Redux selectors
  const symbols = useAppSelector(selectSymbols);
  const selectedSymbol = useAppSelector(selectSelectedSymbol);
  const timeframe = useAppSelector(selectTimeframe);
  const isConnected = useAppSelector(selectIsConnected);
  const stats = useAppSelector(selectStats);
  
  // Get ticks for selected symbol
  const ticks = useAppSelector(state => 
    selectTicksForSymbol(state, selectedSymbol || 'BTCUSDT')
  );
  
  // Get OHLCV for selected symbol
  const ohlcv = useAppSelector(state => 
    selectOHLCVForSymbol(state, selectedSymbol || 'BTCUSDT')
  );
  
  // WebSocket connection with Redux integration
  const { connected: wsConnected } = useWebSocketRedux({
    url: 'ws://localhost:8000/ws',
    autoConnect: false, // Manual connection control
    symbols: selectedSymbol ? [selectedSymbol] : [],
  });
  
  // Load symbols on mount
  useEffect(() => {
    dispatch(fetchSymbols());
  }, [dispatch]);
  
  // Load ticks when symbol changes
  useEffect(() => {
    if (selectedSymbol) {
      dispatch(fetchTicks({
        symbol: selectedSymbol,
        limit: 500,
      }));
    }
  }, [dispatch, selectedSymbol]);
  
  // Set default symbol when symbols load
  useEffect(() => {
    if (symbols.length > 0 && !selectedSymbol) {
      dispatch(setSelectedSymbol(symbols[0].symbol));
    }
  }, [symbols, selectedSymbol, dispatch]);
  
  // Actions
  const changeSymbol = useCallback((symbol: string) => {
    dispatch(setSelectedSymbol(symbol));
  }, [dispatch]);
  
  const changeTimeframe = useCallback((tf: string) => {
    dispatch(setTimeframe(tf));
  }, [dispatch]);
  
  const refreshData = useCallback(() => {
    if (selectedSymbol) {
      dispatch(fetchTicks({
        symbol: selectedSymbol,
        limit: 500,
      }));
    }
    dispatch(fetchSymbols());
  }, [dispatch, selectedSymbol]);
  
  return {
    // State
    symbols,
    selectedSymbol,
    timeframe,
    ticks,
    ohlcv,
    isConnected: isConnected || wsConnected,
    stats,
    
    // Actions
    changeSymbol,
    changeTimeframe,
    refreshData,
  };
}
