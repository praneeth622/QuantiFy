/**
 * React Query hooks for Market Data API
 * Provides caching, automatic refetching, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { getSymbols, getTicks, getOHLCV, getLatestTick } from '../services/api';
import type { Symbol, Tick, OHLCV, TickQueryParams, OHLCVQueryParams } from '../services/types';

// ============================================================================
// Query Keys - For consistent cache management
// ============================================================================

export const marketDataKeys = {
  all: ['marketData'] as const,
  symbols: () => [...marketDataKeys.all, 'symbols'] as const,
  ticks: () => [...marketDataKeys.all, 'ticks'] as const,
  ticksForSymbol: (symbol: string, params?: TickQueryParams) => 
    [...marketDataKeys.ticks(), symbol, params] as const,
  latestTick: (symbol: string) => 
    [...marketDataKeys.ticks(), symbol, 'latest'] as const,
  ohlcv: () => [...marketDataKeys.all, 'ohlcv'] as const,
  ohlcvForSymbol: (symbol: string, timeframe: string, params?: OHLCVQueryParams) => 
    [...marketDataKeys.ohlcv(), symbol, timeframe, params] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch all available trading symbols
 * Cached for 5 minutes as symbols rarely change
 */
export function useSymbols(options?: Omit<UseQueryOptions<Symbol[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<Symbol[], Error>({
    queryKey: marketDataKeys.symbols(),
    queryFn: getSymbols,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Fetch tick data for a specific symbol
 * Short cache time for frequently updating data
 */
export function useTicks(
  params?: TickQueryParams,
  options?: Omit<UseQueryOptions<Tick[], Error>, 'queryKey' | 'queryFn'>
) {
  const symbol = params?.symbol || 'all';
  
  return useQuery<Tick[], Error>({
    queryKey: marketDataKeys.ticksForSymbol(symbol, params),
    queryFn: () => getTicks(params),
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    enabled: !!params?.symbol, // Only fetch if symbol is provided
    ...options,
  });
}

/**
 * Fetch latest tick for a symbol
 * Very short cache for real-time data
 */
export function useLatestTick(
  symbol: string,
  options?: Omit<UseQueryOptions<Tick, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Tick, Error>({
    queryKey: marketDataKeys.latestTick(symbol),
    queryFn: () => getLatestTick(symbol),
    staleTime: 5 * 1000, // 5 seconds
    gcTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 1000, // Auto-refetch every 5 seconds
    enabled: !!symbol,
    ...options,
  });
}

/**
 * Fetch OHLCV (candlestick) data
 * Medium cache time for aggregated data
 */
export function useOHLCV(
  params: OHLCVQueryParams,
  options?: Omit<UseQueryOptions<OHLCV[], Error>, 'queryKey' | 'queryFn'>
) {
  const { symbol, timeframe, interval } = params;
  const tf = timeframe || interval || '1m';
  
  return useQuery<OHLCV[], Error>({
    queryKey: marketDataKeys.ohlcvForSymbol(symbol, tf, params),
    queryFn: () => getOHLCV(params),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Auto-refetch every minute
    enabled: !!symbol && !!tf,
    ...options,
  });
}

/**
 * Hook to invalidate all market data cache
 * Useful for manual refresh functionality
 */
export function useInvalidateMarketData() {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: marketDataKeys.all }),
    invalidateSymbols: () => queryClient.invalidateQueries({ queryKey: marketDataKeys.symbols() }),
    invalidateTicks: (symbol?: string) => {
      if (symbol) {
        queryClient.invalidateQueries({ queryKey: marketDataKeys.ticksForSymbol(symbol) });
      } else {
        queryClient.invalidateQueries({ queryKey: marketDataKeys.ticks() });
      }
    },
    invalidateOHLCV: (symbol?: string) => {
      if (symbol) {
        queryClient.invalidateQueries({ 
          predicate: (query) => 
            query.queryKey[0] === 'marketData' && 
            query.queryKey[1] === 'ohlcv' && 
            query.queryKey[2] === symbol 
        });
      } else {
        queryClient.invalidateQueries({ queryKey: marketDataKeys.ohlcv() });
      }
    },
    refetchAll: () => queryClient.refetchQueries({ queryKey: marketDataKeys.all }),
  };
}

/**
 * Prefetch symbols for better UX
 */
export function usePrefetchSymbols() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: marketDataKeys.symbols(),
      queryFn: getSymbols,
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Prefetch ticks for a symbol
 */
export function usePrefetchTicks() {
  const queryClient = useQueryClient();
  
  return (params: TickQueryParams) => {
    const symbol = params.symbol || 'all';
    queryClient.prefetchQuery({
      queryKey: marketDataKeys.ticksForSymbol(symbol, params),
      queryFn: () => getTicks(params),
      staleTime: 10 * 1000,
    });
  };
}
