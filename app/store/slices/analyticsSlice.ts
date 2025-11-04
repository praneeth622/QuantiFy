/**
 * Analytics Slice - Production-Grade Live Analytics State Management
 * 
 * Features:
 * 1. Tick-based analytics (z-score, volatility) - Updates every 500ms
 * 2. Candle-based analytics (correlation, hedge ratio) - Updates based on timeframe
 * 3. Sliding window for memory efficiency
 * 4. Separate update intervals per metric type
 * 5. Historical data caching
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import * as api from '../../services/api';

// ============================================================================
// Types
// ============================================================================

export type MetricType = 
  | 'tick-based'    // Real-time updates (500ms): z-score, volatility, tick rate
  | 'candle-based'  // Timeframe-based updates: correlation, hedge ratio, spread
  | 'historical';   // One-time or on-demand: cointegration, ADF test

export interface AnalyticsMetric {
  id: string;
  name: string;
  type: MetricType;
  value: number;
  timestamp: number;
  symbol?: string;
  symbolPair?: string;
  metadata?: Record<string, any>;
}

export interface LiveAnalytics {
  // Tick-based metrics (updated every 500ms)
  zScore: AnalyticsMetric | null;
  volatility: AnalyticsMetric | null;
  tickRate: AnalyticsMetric | null;
  spread: AnalyticsMetric | null;
  
  // Candle-based metrics (updated per timeframe)
  correlation: AnalyticsMetric | null;
  hedgeRatio: AnalyticsMetric | null;
  beta: AnalyticsMetric | null;
  
  // Historical/On-demand metrics
  cointegration: AnalyticsMetric | null;
  adfTest: AnalyticsMetric | null;
}

export interface AnalyticsConfig {
  // Update intervals (milliseconds)
  tickBasedInterval: number;     // Default: 500ms
  candleBasedInterval: number;   // Dynamic based on timeframe
  
  // Sliding window configuration
  maxMetrics: number;             // Max metrics to keep in history
  
  // Symbol pair for correlation/spread analysis
  primarySymbol: string;
  secondarySymbol: string;
  
  // Calculation parameters
  windowSize: number;             // Number of data points for calculations
  lookbackPeriods: number;        // Historical lookback
  
  // Feature toggles
  autoUpdate: boolean;
  enableTickBased: boolean;
  enableCandleBased: boolean;
}

export interface MetricHistory {
  metricName: string;
  data: AnalyticsMetric[];
  maxSize: number;
}

export interface AnalyticsState {
  // Live metrics
  live: LiveAnalytics;
  
  // Configuration
  config: AnalyticsConfig;
  
  // Historical data (sliding windows)
  history: {
    zScore: MetricHistory;
    volatility: MetricHistory;
    correlation: MetricHistory;
    spread: MetricHistory;
  };
  
  // Update tracking
  lastUpdates: {
    tickBased: number;
    candleBased: number;
  };
  
  // Loading states
  loading: {
    tickBased: boolean;
    candleBased: boolean;
    historical: boolean;
  };
  
  // Error states
  errors: {
    tickBased: string | null;
    candleBased: string | null;
    historical: string | null;
  };
  
  // Performance metrics
  performance: {
    tickBasedLatency: number;  // ms
    candleBasedLatency: number; // ms
    totalCalculations: number;
  };
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: AnalyticsState = {
  live: {
    zScore: null,
    volatility: null,
    tickRate: null,
    spread: null,
    correlation: null,
    hedgeRatio: null,
    beta: null,
    cointegration: null,
    adfTest: null,
  },
  
  config: {
    tickBasedInterval: 500,      // 500ms for real-time
    candleBasedInterval: 60000,  // 1 minute default (dynamic)
    maxMetrics: 200,
    primarySymbol: 'BTCUSDT',
    secondarySymbol: 'ETHUSDT',
    windowSize: 100,
    lookbackPeriods: 100,
    autoUpdate: true,
    enableTickBased: true,
    enableCandleBased: true,
  },
  
  history: {
    zScore: {
      metricName: 'z-score',
      data: [],
      maxSize: 200,
    },
    volatility: {
      metricName: 'volatility',
      data: [],
      maxSize: 200,
    },
    correlation: {
      metricName: 'correlation',
      data: [],
      maxSize: 100,
    },
    spread: {
      metricName: 'spread',
      data: [],
      maxSize: 200,
    },
  },
  
  lastUpdates: {
    tickBased: 0,
    candleBased: 0,
  },
  
  loading: {
    tickBased: false,
    candleBased: false,
    historical: false,
  },
  
  errors: {
    tickBased: null,
    candleBased: null,
    historical: null,
  },
  
  performance: {
    tickBasedLatency: 0,
    candleBasedLatency: 0,
    totalCalculations: 0,
  },
};

// ============================================================================
// Async Thunks
// ============================================================================

/**
 * Fetch tick-based analytics (z-score, volatility)
 * Called every 500ms for real-time updates
 */
export const fetchTickBasedAnalytics = createAsyncThunk(
  'analytics/fetchTickBased',
  async (params: { 
    primarySymbol: string; 
    secondarySymbol: string;
    windowSize: number;
  }, { rejectWithValue }) => {
    try {
      const startTime = Date.now();
      
      // Fetch z-score
      const zScoreResponse = await api.calculateZScore(
        params.primarySymbol,
        params.secondarySymbol,
        { window_minutes: 5, lookback_periods: params.windowSize }
      );
      
      const latency = Date.now() - startTime;
      
      return {
        zScore: zScoreResponse.data.z_score,
        hedgeRatio: zScoreResponse.data.hedge_ratio,
        timestamp: Date.now(),
        latency,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch tick-based analytics');
    }
  }
);

/**
 * Fetch candle-based analytics (correlation, hedge ratio)
 * Called based on timeframe interval (e.g., every 5 minutes for 5m candles)
 */
export const fetchCandleBasedAnalytics = createAsyncThunk(
  'analytics/fetchCandleBased',
  async (params: {
    primarySymbol: string;
    secondarySymbol: string;
    windowMinutes: number;
    lookbackPeriods: number;
  }, { rejectWithValue }) => {
    try {
      const startTime = Date.now();
      
      // Fetch correlation
      const correlationResponse = await api.calculateCorrelation(
        params.primarySymbol,
        params.secondarySymbol,
        { 
          window_minutes: params.windowMinutes, 
          lookback_periods: params.lookbackPeriods 
        }
      );
      
      // Fetch hedge ratio
      const hedgeRatioResponse = await api.calculateHedgeRatio(
        params.primarySymbol,
        params.secondarySymbol,
        { 
          window_minutes: params.windowMinutes, 
          lookback_periods: params.lookbackPeriods 
        }
      );
      
      const latency = Date.now() - startTime;
      
      return {
        correlation: correlationResponse.data.correlation,
        hedgeRatio: hedgeRatioResponse.data.hedge_ratio,
        timestamp: Date.now(),
        latency,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch candle-based analytics');
    }
  }
);

/**
 * Fetch historical analytics (cointegration, ADF test)
 * Called on-demand
 */
export const fetchHistoricalAnalytics = createAsyncThunk(
  'analytics/fetchHistorical',
  async (params: {
    primarySymbol: string;
    secondarySymbol: string;
    windowMinutes: number;
    lookbackPeriods: number;
  }, { rejectWithValue }) => {
    try {
      // Fetch cointegration test
      const cointegrationResponse = await api.calculateCointegration(
        params.primarySymbol,
        params.secondarySymbol,
        { 
          window_minutes: params.windowMinutes, 
          lookback_periods: params.lookbackPeriods 
        }
      );
      
      return {
        cointegration: cointegrationResponse.data,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch historical analytics');
    }
  }
);

// ============================================================================
// Slice
// ============================================================================

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    // Update configuration
    updateConfig: (state, action: PayloadAction<Partial<AnalyticsConfig>>) => {
      state.config = { ...state.config, ...action.payload };
      
      // Update candle-based interval based on timeframe if provided
      if (action.payload.candleBasedInterval) {
        state.config.candleBasedInterval = action.payload.candleBasedInterval;
      }
    },
    
    // Set symbol pair
    setSymbolPair: (state, action: PayloadAction<{ primary: string; secondary: string }>) => {
      state.config.primarySymbol = action.payload.primary;
      state.config.secondarySymbol = action.payload.secondary;
    },
    
    // Add metric to history (with sliding window)
    addMetricToHistory: (state, action: PayloadAction<{
      metricType: 'zScore' | 'volatility' | 'correlation' | 'spread';
      metric: AnalyticsMetric;
    }>) => {
      const { metricType, metric } = action.payload;
      const history = state.history[metricType];
      
      history.data.push(metric);
      
      // Sliding window: keep only maxSize most recent
      if (history.data.length > history.maxSize) {
        history.data = history.data.slice(-history.maxSize);
      }
    },
    
    // Calculate tick-based metrics from local tick data (client-side)
    calculateLocalTickMetrics: (state, action: PayloadAction<{
      ticks: any[];
      primarySymbol: string;
      secondarySymbol: string;
    }>) => {
      const { ticks, primarySymbol, secondarySymbol } = action.payload;
      const now = Date.now();
      
      // Calculate tick rate
      const recentTicks = ticks.filter(t => now - new Date(t.timestamp).getTime() < 5000);
      const tickRate = recentTicks.length / 5; // ticks per second
      
      state.live.tickRate = {
        id: `tick-rate-${now}`,
        name: 'Tick Rate',
        type: 'tick-based',
        value: tickRate,
        timestamp: now,
        metadata: { unit: 'ticks/sec' },
      };
      
      // Calculate volatility (standard deviation of recent prices)
      if (ticks.length > 10) {
        const prices = ticks.slice(-20).map(t => t.price);
        const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
        const volatility = Math.sqrt(variance);
        
        state.live.volatility = {
          id: `volatility-${now}`,
          name: 'Volatility',
          type: 'tick-based',
          value: volatility,
          timestamp: now,
          symbol: primarySymbol,
          metadata: { window: 20 },
        };
        
        // Add to history
        state.history.volatility.data.push(state.live.volatility);
        if (state.history.volatility.data.length > state.history.volatility.maxSize) {
          state.history.volatility.data = state.history.volatility.data.slice(-state.history.volatility.maxSize);
        }
      }
      
      state.lastUpdates.tickBased = now;
      state.performance.totalCalculations++;
    },
    
    // Clear errors
    clearError: (state, action: PayloadAction<'tickBased' | 'candleBased' | 'historical'>) => {
      state.errors[action.payload] = null;
    },
    
    // Reset analytics state
    resetAnalytics: () => initialState,
  },
  
  extraReducers: (builder) => {
    // Tick-based analytics
    builder
      .addCase(fetchTickBasedAnalytics.pending, (state) => {
        state.loading.tickBased = true;
        state.errors.tickBased = null;
      })
      .addCase(fetchTickBasedAnalytics.fulfilled, (state, action) => {
        state.loading.tickBased = false;
        const now = Date.now();
        
        // Update z-score
        state.live.zScore = {
          id: `zscore-${now}`,
          name: 'Z-Score',
          type: 'tick-based',
          value: action.payload.zScore,
          timestamp: now,
          symbolPair: `${state.config.primarySymbol}-${state.config.secondarySymbol}`,
          metadata: { hedgeRatio: action.payload.hedgeRatio },
        };
        
        // Add to history
        state.history.zScore.data.push(state.live.zScore);
        if (state.history.zScore.data.length > state.history.zScore.maxSize) {
          state.history.zScore.data = state.history.zScore.data.slice(-state.history.zScore.maxSize);
        }
        
        state.lastUpdates.tickBased = now;
        state.performance.tickBasedLatency = action.payload.latency;
        state.performance.totalCalculations++;
      })
      .addCase(fetchTickBasedAnalytics.rejected, (state, action) => {
        state.loading.tickBased = false;
        state.errors.tickBased = action.payload as string;
      });
    
    // Candle-based analytics
    builder
      .addCase(fetchCandleBasedAnalytics.pending, (state) => {
        state.loading.candleBased = true;
        state.errors.candleBased = null;
      })
      .addCase(fetchCandleBasedAnalytics.fulfilled, (state, action) => {
        state.loading.candleBased = false;
        const now = Date.now();
        
        // Update correlation
        state.live.correlation = {
          id: `correlation-${now}`,
          name: 'Correlation',
          type: 'candle-based',
          value: action.payload.correlation,
          timestamp: now,
          symbolPair: `${state.config.primarySymbol}-${state.config.secondarySymbol}`,
        };
        
        // Update hedge ratio
        state.live.hedgeRatio = {
          id: `hedgeratio-${now}`,
          name: 'Hedge Ratio',
          type: 'candle-based',
          value: action.payload.hedgeRatio,
          timestamp: now,
          symbolPair: `${state.config.primarySymbol}-${state.config.secondarySymbol}`,
        };
        
        // Add to history
        state.history.correlation.data.push(state.live.correlation);
        if (state.history.correlation.data.length > state.history.correlation.maxSize) {
          state.history.correlation.data = state.history.correlation.data.slice(-state.history.correlation.maxSize);
        }
        
        state.lastUpdates.candleBased = now;
        state.performance.candleBasedLatency = action.payload.latency;
        state.performance.totalCalculations++;
      })
      .addCase(fetchCandleBasedAnalytics.rejected, (state, action) => {
        state.loading.candleBased = false;
        state.errors.candleBased = action.payload as string;
      });
    
    // Historical analytics
    builder
      .addCase(fetchHistoricalAnalytics.pending, (state) => {
        state.loading.historical = true;
        state.errors.historical = null;
      })
      .addCase(fetchHistoricalAnalytics.fulfilled, (state, action) => {
        state.loading.historical = false;
        const now = Date.now();
        
        // Update cointegration
        state.live.cointegration = {
          id: `cointegration-${now}`,
          name: 'Cointegration',
          type: 'historical',
          value: action.payload.cointegration.p_value,
          timestamp: now,
          symbolPair: `${state.config.primarySymbol}-${state.config.secondarySymbol}`,
          metadata: action.payload.cointegration,
        };
        
        state.performance.totalCalculations++;
      })
      .addCase(fetchHistoricalAnalytics.rejected, (state, action) => {
        state.loading.historical = false;
        state.errors.historical = action.payload as string;
      });
  },
});

// ============================================================================
// Actions
// ============================================================================

export const {
  updateConfig,
  setSymbolPair,
  addMetricToHistory,
  calculateLocalTickMetrics,
  clearError,
  resetAnalytics,
} = analyticsSlice.actions;

// ============================================================================
// Selectors
// ============================================================================

export const selectAnalyticsState = (state: RootState) => state.analytics;
export const selectLiveAnalytics = (state: RootState) => state.analytics.live;
export const selectAnalyticsConfig = (state: RootState) => state.analytics.config;
export const selectAnalyticsHistory = (state: RootState) => state.analytics.history;
export const selectAnalyticsPerformance = (state: RootState) => state.analytics.performance;
export const selectAnalyticsLoading = (state: RootState) => state.analytics.loading;
export const selectAnalyticsErrors = (state: RootState) => state.analytics.errors;

// Specific metric selectors
export const selectZScore = (state: RootState) => state.analytics.live.zScore;
export const selectVolatility = (state: RootState) => state.analytics.live.volatility;
export const selectCorrelation = (state: RootState) => state.analytics.live.correlation;
export const selectHedgeRatio = (state: RootState) => state.analytics.live.hedgeRatio;
export const selectTickRate = (state: RootState) => state.analytics.live.tickRate;

// History selectors
export const selectZScoreHistory = (state: RootState) => state.analytics.history.zScore.data;
export const selectVolatilityHistory = (state: RootState) => state.analytics.history.volatility.data;
export const selectCorrelationHistory = (state: RootState) => state.analytics.history.correlation.data;

// Computed selectors
export const selectShouldUpdateTickBased = (state: RootState) => {
  const { lastUpdates, config } = state.analytics;
  const timeSinceLastUpdate = Date.now() - lastUpdates.tickBased;
  return config.autoUpdate && config.enableTickBased && timeSinceLastUpdate >= config.tickBasedInterval;
};

export const selectShouldUpdateCandleBased = (state: RootState) => {
  const { lastUpdates, config } = state.analytics;
  const timeSinceLastUpdate = Date.now() - lastUpdates.candleBased;
  return config.autoUpdate && config.enableCandleBased && timeSinceLastUpdate >= config.candleBasedInterval;
};

export default analyticsSlice.reducer;
