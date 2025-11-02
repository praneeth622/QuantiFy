/**
 * React Query hooks for Analytics API
 * Provides caching and automatic refetching for analytics data
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getSpreadAnalytics, getCorrelation, getRollingCorrelation } from '../services/api';
import type { SpreadAnalytics, CorrelationData, AnalyticsQueryParams, CorrelationQueryParams } from '../services/types';

// ============================================================================
// Query Keys
// ============================================================================

export const analyticsKeys = {
  all: ['analytics'] as const,
  spread: () => [...analyticsKeys.all, 'spread'] as const,
  spreadForPair: (symbolPair: string, params?: AnalyticsQueryParams) => 
    [...analyticsKeys.spread(), symbolPair, params] as const,
  correlation: () => [...analyticsKeys.all, 'correlation'] as const,
  correlationForPair: (symbol1: string, symbol2: string, params?: CorrelationQueryParams) => 
    [...analyticsKeys.correlation(), symbol1, symbol2, params] as const,
  rollingCorrelation: (symbol1: string, symbol2: string, params?: CorrelationQueryParams) => 
    [...analyticsKeys.correlation(), 'rolling', symbol1, symbol2, params] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch spread analytics (z-score, hedge ratio, etc.)
 * Medium cache for analytics calculations
 */
export function useSpreadAnalytics(
  params: AnalyticsQueryParams,
  options?: Omit<UseQueryOptions<SpreadAnalytics[], Error>, 'queryKey' | 'queryFn'>
) {
  const symbolPair = params.symbol_pair;
  
  return useQuery<SpreadAnalytics[], Error>({
    queryKey: analyticsKeys.spreadForPair(symbolPair, params),
    queryFn: () => getSpreadAnalytics(params),
    staleTime: 15 * 1000, // 15 seconds
    gcTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    enabled: !!symbolPair,
    retry: 2,
    ...options,
  });
}

/**
 * Fetch correlation between two symbols
 * Medium cache for correlation calculations
 */
export function useCorrelation(
  params: CorrelationQueryParams,
  options?: Omit<UseQueryOptions<CorrelationData, Error>, 'queryKey' | 'queryFn'>
) {
  const { symbol1, symbol2 } = params;
  
  return useQuery<CorrelationData, Error>({
    queryKey: analyticsKeys.correlationForPair(symbol1, symbol2, params),
    queryFn: () => getCorrelation(params),
    staleTime: 15 * 1000, // 15 seconds
    gcTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    enabled: !!(symbol1 && symbol2),
    retry: 2,
    ...options,
  });
}

/**
 * Fetch rolling correlation data
 * For time-series correlation visualization
 */
export function useRollingCorrelation(
  params: CorrelationQueryParams,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) {
  const { symbol1, symbol2 } = params;
  
  return useQuery<any, Error>({
    queryKey: analyticsKeys.rollingCorrelation(symbol1, symbol2, params),
    queryFn: () => getRollingCorrelation(params),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: !!(symbol1 && symbol2),
    retry: 2,
    ...options,
  });
}
