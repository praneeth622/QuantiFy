/**
 * useLiveAnalytics Hook
 * 
 * Production-grade hook for managing live analytics with intelligent update intervals:
 * - Tick-based analytics (z-score, volatility): Updates every 500ms
 * - Candle-based analytics (correlation, hedge ratio): Updates per timeframe
 * - Client-side calculations (tick rate, volatility): Real-time from local data
 * 
 * Best Practices:
 * - Automatic cleanup on unmount
 * - Configurable update intervals
 * - Error handling and retry logic
 * - Performance monitoring
 * - Memory-efficient with cleanup
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchTickBasedAnalytics,
  fetchCandleBasedAnalytics,
  calculateLocalTickMetrics,
  updateConfig,
  selectAnalyticsConfig,
  selectAnalyticsLoading,
  selectAnalyticsErrors,
  selectLiveAnalytics,
  selectShouldUpdateTickBased,
  selectShouldUpdateCandleBased,
} from '../store/slices/analyticsSlice';
import { selectSelectedSymbol, selectTimeframe, selectTicksForSymbol } from '../store/slices/marketDataSlice';

interface UseLiveAnalyticsOptions {
  primarySymbol?: string;
  secondarySymbol?: string;
  enableTickBased?: boolean;
  enableCandleBased?: boolean;
  autoUpdate?: boolean;
  customTickInterval?: number; // Override default 500ms
}

/**
 * Get update interval based on timeframe
 */
const getIntervalForTimeframe = (timeframe: string): number => {
  const intervals: Record<string, number> = {
    '1s': 1000,      // 1 second
    '1m': 60000,     // 1 minute
    '5m': 300000,    // 5 minutes
    '15m': 900000,   // 15 minutes
    '1h': 3600000,   // 1 hour
    '4h': 14400000,  // 4 hours
    '1d': 86400000,  // 1 day
  };
  return intervals[timeframe] || 60000; // Default 1 minute
};

export function useLiveAnalytics(options: UseLiveAnalyticsOptions = {}) {
  const dispatch = useAppDispatch();
  
  // Redux state
  const config = useAppSelector(selectAnalyticsConfig);
  const loading = useAppSelector(selectAnalyticsLoading);
  const errors = useAppSelector(selectAnalyticsErrors);
  const liveMetrics = useAppSelector(selectLiveAnalytics);
  const shouldUpdateTickBased = useAppSelector(selectShouldUpdateTickBased);
  const shouldUpdateCandleBased = useAppSelector(selectShouldUpdateCandleBased);
  
  // Market data state
  const selectedSymbol = useAppSelector(selectSelectedSymbol);
  const timeframe = useAppSelector(selectTimeframe);
  const ticks = useAppSelector(state => selectTicksForSymbol(state, selectedSymbol || 'BTCUSDT'));
  
  // Refs for intervals
  const tickBasedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const candleBasedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const localMetricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Configuration
  const primarySymbol = options.primarySymbol || config.primarySymbol;
  const secondarySymbol = options.secondarySymbol || config.secondarySymbol;
  const enableTickBased = options.enableTickBased ?? config.enableTickBased;
  const enableCandleBased = options.enableCandleBased ?? config.enableCandleBased;
  const autoUpdate = options.autoUpdate ?? config.autoUpdate;
  const tickInterval = options.customTickInterval || config.tickBasedInterval;
  
  // Update config when options change
  useEffect(() => {
    if (options.primarySymbol || options.secondarySymbol || 
        options.enableTickBased !== undefined || 
        options.enableCandleBased !== undefined ||
        options.autoUpdate !== undefined) {
      dispatch(updateConfig({
        primarySymbol: options.primarySymbol,
        secondarySymbol: options.secondarySymbol,
        enableTickBased: options.enableTickBased,
        enableCandleBased: options.enableCandleBased,
        autoUpdate: options.autoUpdate,
      }));
    }
  }, [dispatch, options.primarySymbol, options.secondarySymbol, options.enableTickBased, options.enableCandleBased, options.autoUpdate]);
  
  // Update candle-based interval when timeframe changes
  useEffect(() => {
    const candleInterval = getIntervalForTimeframe(timeframe);
    dispatch(updateConfig({ candleBasedInterval: candleInterval }));
  }, [dispatch, timeframe]);
  
  /**
   * Fetch tick-based analytics (z-score) - Server-side calculation
   */
  const fetchTickAnalytics = useCallback(async () => {
    if (!enableTickBased || !primarySymbol || !secondarySymbol) return;
    
    try {
      await dispatch(fetchTickBasedAnalytics({
        primarySymbol,
        secondarySymbol,
        windowSize: config.windowSize,
      })).unwrap();
    } catch (error) {
      console.error('Error fetching tick-based analytics:', error);
    }
  }, [dispatch, enableTickBased, primarySymbol, secondarySymbol, config.windowSize]);
  
  /**
   * Fetch candle-based analytics (correlation, hedge ratio) - Server-side calculation
   */
  const fetchCandleAnalytics = useCallback(async () => {
    if (!enableCandleBased || !primarySymbol || !secondarySymbol) return;
    
    // Convert timeframe to window minutes
    const windowMinutes = getIntervalForTimeframe(timeframe) / 60000;
    
    try {
      await dispatch(fetchCandleBasedAnalytics({
        primarySymbol,
        secondarySymbol,
        windowMinutes,
        lookbackPeriods: config.lookbackPeriods,
      })).unwrap();
    } catch (error) {
      console.error('Error fetching candle-based analytics:', error);
    }
  }, [dispatch, enableCandleBased, primarySymbol, secondarySymbol, timeframe, config.lookbackPeriods]);
  
  /**
   * Calculate local tick metrics (client-side) - Very fast
   */
  const calculateLocalMetrics = useCallback(() => {
    if (!ticks || ticks.length === 0) return;
    
    dispatch(calculateLocalTickMetrics({
      ticks,
      primarySymbol: primarySymbol || selectedSymbol || 'BTCUSDT',
      secondarySymbol,
    }));
  }, [dispatch, ticks, primarySymbol, secondarySymbol, selectedSymbol]);
  
  /**
   * Setup tick-based analytics interval (500ms)
   */
  useEffect(() => {
    if (!autoUpdate || !enableTickBased) {
      if (tickBasedIntervalRef.current) {
        clearInterval(tickBasedIntervalRef.current);
        tickBasedIntervalRef.current = null;
      }
      return;
    }
    
    console.log(`📊 Starting tick-based analytics updates (${tickInterval}ms)`);
    
    // Initial fetch
    fetchTickAnalytics();
    
    // Setup interval
    tickBasedIntervalRef.current = setInterval(() => {
      fetchTickAnalytics();
    }, tickInterval);
    
    return () => {
      if (tickBasedIntervalRef.current) {
        clearInterval(tickBasedIntervalRef.current);
        console.log('📊 Stopped tick-based analytics updates');
      }
    };
  }, [autoUpdate, enableTickBased, tickInterval, fetchTickAnalytics]);
  
  /**
   * Setup candle-based analytics interval (timeframe-dependent)
   */
  useEffect(() => {
    if (!autoUpdate || !enableCandleBased) {
      if (candleBasedIntervalRef.current) {
        clearInterval(candleBasedIntervalRef.current);
        candleBasedIntervalRef.current = null;
      }
      return;
    }
    
    const candleInterval = config.candleBasedInterval;
    console.log(`📊 Starting candle-based analytics updates (${candleInterval}ms for ${timeframe})`);
    
    // Initial fetch
    fetchCandleAnalytics();
    
    // Setup interval
    candleBasedIntervalRef.current = setInterval(() => {
      fetchCandleAnalytics();
    }, candleInterval);
    
    return () => {
      if (candleBasedIntervalRef.current) {
        clearInterval(candleBasedIntervalRef.current);
        console.log('📊 Stopped candle-based analytics updates');
      }
    };
  }, [autoUpdate, enableCandleBased, config.candleBasedInterval, timeframe, fetchCandleAnalytics]);
  
  /**
   * Setup local metrics calculation (every 500ms) - Client-side
   */
  useEffect(() => {
    if (!autoUpdate || ticks.length === 0) {
      if (localMetricsIntervalRef.current) {
        clearInterval(localMetricsIntervalRef.current);
        localMetricsIntervalRef.current = null;
      }
      return;
    }
    
    console.log('📊 Starting local metrics calculations (500ms)');
    
    // Initial calculation
    calculateLocalMetrics();
    
    // Setup interval
    localMetricsIntervalRef.current = setInterval(() => {
      calculateLocalMetrics();
    }, 500); // Always 500ms for local calculations
    
    return () => {
      if (localMetricsIntervalRef.current) {
        clearInterval(localMetricsIntervalRef.current);
        console.log('📊 Stopped local metrics calculations');
      }
    };
  }, [autoUpdate, ticks.length, calculateLocalMetrics]);
  
  /**
   * Manual update triggers
   */
  const manualUpdate = useCallback(() => {
    if (enableTickBased) fetchTickAnalytics();
    if (enableCandleBased) fetchCandleAnalytics();
    calculateLocalMetrics();
  }, [enableTickBased, enableCandleBased, fetchTickAnalytics, fetchCandleAnalytics, calculateLocalMetrics]);
  
  const updateTickBased = useCallback(() => {
    fetchTickAnalytics();
  }, [fetchTickAnalytics]);
  
  const updateCandleBased = useCallback(() => {
    fetchCandleAnalytics();
  }, [fetchCandleAnalytics]);
  
  return {
    // Live metrics
    metrics: liveMetrics,
    
    // Loading states
    loading,
    
    // Error states
    errors,
    
    // Configuration
    config,
    
    // Manual triggers
    manualUpdate,
    updateTickBased,
    updateCandleBased,
    
    // Status flags
    isTickBasedActive: autoUpdate && enableTickBased,
    isCandleBasedActive: autoUpdate && enableCandleBased,
    
    // Intervals for debugging
    intervals: {
      tickBased: tickInterval,
      candleBased: config.candleBasedInterval,
      local: 500,
    },
  };
}
