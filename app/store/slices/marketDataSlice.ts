/**
 * Market Data Slice with Sliding Window Implementation
 * Efficient memory management for real-time trading data
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as api from '../../services/api';
import type { Symbol, Tick, OHLCV } from '../../services/types';

// ============================================================================
// Types
// ============================================================================

export interface SlidingWindow<T> {
  data: T[];
  maxSize: number;
  lastUpdate: number;
}

export interface MarketDataState {
  // Symbols
  symbols: Symbol[];
  symbolsLoading: boolean;
  symbolsError: string | null;
  
  // Selected settings
  selectedSymbol: string;
  timeframe: '1s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  windowSize: number;
  
  // Sliding window data
  ticks: SlidingWindow<Tick>;
  ohlcv: SlidingWindow<OHLCV>;
  
  // Latest data for quick access
  latestTick: Tick | null;
  latestOHLCV: OHLCV | null;
  
  // Loading states
  ticksLoading: boolean;
  ohlcvLoading: boolean;
  
  // Error states
  ticksError: string | null;
  ohlcvError: string | null;
  
  // Statistics
  stats: {
    totalTicks: number;
    totalOHLCV: number;
    dataRate: number; // ticks per second
    lastUpdateTime: number;
  };
  
  // Real-time connection status
  isConnected: boolean;
  connectionError: string | null;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: MarketDataState = {
  symbols: [],
  symbolsLoading: false,
  symbolsError: null,
  
  selectedSymbol: 'BTCUSDT',
  timeframe: '1m',
  windowSize: 100, // Default sliding window size
  
  ticks: {
    data: [],
    maxSize: 500, // Keep last 500 ticks
    lastUpdate: 0,
  },
  
  ohlcv: {
    data: [],
    maxSize: 200, // Keep last 200 candles
    lastUpdate: 0,
  },
  
  latestTick: null,
  latestOHLCV: null,
  
  ticksLoading: false,
  ohlcvLoading: false,
  
  ticksError: null,
  ohlcvError: null,
  
  stats: {
    totalTicks: 0,
    totalOHLCV: 0,
    dataRate: 0,
    lastUpdateTime: 0,
  },
  
  isConnected: false,
  connectionError: null,
};

// ============================================================================
// Async Thunks
// ============================================================================

export const fetchSymbols = createAsyncThunk(
  'marketData/fetchSymbols',
  async (_, { rejectWithValue }) => {
    try {
      const symbols = await api.getSymbols();
      return symbols;
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || 'Failed to fetch symbols';
      return rejectWithValue(message);
    }
  }
);

export const fetchTicks = createAsyncThunk(
  'marketData/fetchTicks',
  async (params: { symbol?: string; limit?: number }, { rejectWithValue }) => {
    try {
      const ticks = await api.getTicks({
        symbol: params.symbol,
        limit: params.limit || 100,
      });
      return ticks;
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || 'Failed to fetch ticks';
      return rejectWithValue(message);
    }
  }
);

export const fetchOHLCV = createAsyncThunk(
  'marketData/fetchOHLCV',
  async (params: { symbol?: string; timeframe?: string; limit?: number }, { rejectWithValue }) => {
    try {
      const ohlcv = await api.getOHLCV({
        symbol: params.symbol || 'BTCUSDT',
        timeframe: params.timeframe || '1m',
        limit: params.limit || 100,
      });
      return ohlcv;
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || 'Failed to fetch OHLCV';
      return rejectWithValue(message);
    }
  }
);

// ============================================================================
// Slice Definition
// ============================================================================

const marketDataSlice = createSlice({
  name: 'marketData',
  initialState,
  reducers: {
    // Settings actions
    setSelectedSymbol: (state, action: PayloadAction<string>) => {
      state.selectedSymbol = action.payload;
      // Clear data when symbol changes
      state.ticks.data = [];
      state.ohlcv.data = [];
      state.latestTick = null;
      state.latestOHLCV = null;
    },
    
    setTimeframe: (state, action: PayloadAction<string>) => {
      state.timeframe = action.payload as any;
      // Clear OHLCV data when timeframe changes
      state.ohlcv.data = [];
      state.latestOHLCV = null;
    },
    
    setWindowSize: (state, action: PayloadAction<number>) => {
      state.windowSize = action.payload;
      // Trim data to new window size
      if (state.ticks.data.length > action.payload) {
        state.ticks.data = state.ticks.data.slice(-action.payload);
      }
    },
    
    // Real-time data actions with sliding window
    addTick: (state, action: PayloadAction<Tick>) => {
      const tick = action.payload;
      const now = Date.now();
      
      // Add to sliding window
      state.ticks.data.push(tick);
      state.ticks.lastUpdate = now;
      
      // Maintain sliding window size
      if (state.ticks.data.length > state.ticks.maxSize) {
        state.ticks.data = state.ticks.data.slice(-state.ticks.maxSize);
      }
      
      // Update latest tick
      state.latestTick = tick;
      
      // Update statistics
      state.stats.totalTicks += 1;
      state.stats.lastUpdateTime = now;
      
      // Calculate data rate (ticks per second)
      if (state.stats.lastUpdateTime > 0) {
        const timeDiff = (now - state.stats.lastUpdateTime) / 1000;
        if (timeDiff > 0) {
          state.stats.dataRate = 1 / timeDiff;
        }
      }
    },
    
    addOHLCV: (state, action: PayloadAction<OHLCV>) => {
      const candle = action.payload;
      const now = Date.now();
      
      // Check if we need to update existing candle or add new one
      const existingIndex = state.ohlcv.data.findIndex(
        c => c.timestamp === candle.timestamp && c.symbol === candle.symbol
      );
      
      if (existingIndex >= 0) {
        // Update existing candle
        state.ohlcv.data[existingIndex] = candle;
      } else {
        // Add new candle
        state.ohlcv.data.push(candle);
        
        // Maintain sliding window size
        if (state.ohlcv.data.length > state.ohlcv.maxSize) {
          state.ohlcv.data = state.ohlcv.data.slice(-state.ohlcv.maxSize);
        }
      }
      
      state.ohlcv.lastUpdate = now;
      state.latestOHLCV = candle;
      state.stats.totalOHLCV += 1;
    },
    
    // Bulk data updates
    updateTicks: (state, action: PayloadAction<Tick[]>) => {
      const ticks = action.payload;
      const now = Date.now();
      
      // Sort by timestamp to maintain order
      const sortedTicks = [...ticks].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Merge with existing data, avoiding duplicates
      const existingTimestamps = new Set(state.ticks.data.map(t => t.timestamp));
      const newTicks = sortedTicks.filter(t => !existingTimestamps.has(t.timestamp));
      
      state.ticks.data = [...state.ticks.data, ...newTicks];
      state.ticks.lastUpdate = now;
      
      // Maintain sliding window size
      if (state.ticks.data.length > state.ticks.maxSize) {
        state.ticks.data = state.ticks.data.slice(-state.ticks.maxSize);
      }
      
      // Update latest tick
      if (sortedTicks.length > 0) {
        state.latestTick = sortedTicks[sortedTicks.length - 1];
      }
      
      state.stats.totalTicks += newTicks.length;
    },
    
    updateOHLCV: (state, action: PayloadAction<OHLCV[]>) => {
      const candles = action.payload;
      const now = Date.now();
      
      // Sort by timestamp
      const sortedCandles = [...candles].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Merge with existing data
      const existingMap = new Map(state.ohlcv.data.map(c => [`${c.symbol}-${c.timestamp}`, c]));
      
      sortedCandles.forEach(candle => {
        const key = `${candle.symbol}-${candle.timestamp}`;
        existingMap.set(key, candle);
      });
      
      state.ohlcv.data = Array.from(existingMap.values()).sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Maintain sliding window size
      if (state.ohlcv.data.length > state.ohlcv.maxSize) {
        state.ohlcv.data = state.ohlcv.data.slice(-state.ohlcv.maxSize);
      }
      
      state.ohlcv.lastUpdate = now;
      
      // Update latest OHLCV
      if (sortedCandles.length > 0) {
        state.latestOHLCV = sortedCandles[sortedCandles.length - 1];
      }
      
      state.stats.totalOHLCV += candles.length;
    },
    
    // Connection status actions
    setConnectionStatus: (state, action: PayloadAction<{ connected: boolean; error?: string }>) => {
      state.isConnected = action.payload.connected;
      state.connectionError = action.payload.error || null;
    },
    
    // Clear data actions
    clearTicks: (state) => {
      state.ticks.data = [];
      state.latestTick = null;
      state.stats.totalTicks = 0;
    },
    
    clearOHLCV: (state) => {
      state.ohlcv.data = [];
      state.latestOHLCV = null;
      state.stats.totalOHLCV = 0;
    },
    
    clearAll: (state) => {
      state.ticks.data = [];
      state.ohlcv.data = [];
      state.latestTick = null;
      state.latestOHLCV = null;
      state.stats = {
        totalTicks: 0,
        totalOHLCV: 0,
        dataRate: 0,
        lastUpdateTime: 0,
      };
    },
    
    // Test data action
    addTestTick: (state, action: PayloadAction<{ symbol: string; price: number; quantity: number }>) => {
      const { symbol, price, quantity } = action.payload;
      const now = new Date();
      
      const testTick: Tick = {
        id: Date.now(),
        timestamp: now.toISOString(),
        symbol,
        price,
        quantity,
        created_at: now.toISOString(),
      };
      
      // Add using the existing addTick logic
      state.ticks.data.push(testTick);
      state.ticks.lastUpdate = Date.now();
      
      // Maintain sliding window size
      if (state.ticks.data.length > state.ticks.maxSize) {
        state.ticks.data = state.ticks.data.slice(-state.ticks.maxSize);
      }
      
      // Update latest tick
      state.latestTick = testTick;
      
      // Update statistics
      state.stats.totalTicks += 1;
      state.stats.lastUpdateTime = Date.now();
    },
  },
  
  extraReducers: (builder) => {
    // Fetch symbols
    builder
      .addCase(fetchSymbols.pending, (state) => {
        state.symbolsLoading = true;
        state.symbolsError = null;
      })
      .addCase(fetchSymbols.fulfilled, (state, action) => {
        state.symbolsLoading = false;
        state.symbols = action.payload;
        state.symbolsError = null;
      })
      .addCase(fetchSymbols.rejected, (state, action) => {
        state.symbolsLoading = false;
        state.symbolsError = action.payload as string;
        toast.error(`Failed to fetch symbols: ${action.payload}`);
      });
    
    // Fetch ticks
    builder
      .addCase(fetchTicks.pending, (state) => {
        state.ticksLoading = true;
        state.ticksError = null;
      })
      .addCase(fetchTicks.fulfilled, (state, action) => {
        state.ticksLoading = false;
        marketDataSlice.caseReducers.updateTicks(state, {
          payload: action.payload,
          type: 'marketData/updateTicks',
        });
        state.ticksError = null;
      })
      .addCase(fetchTicks.rejected, (state, action) => {
        state.ticksLoading = false;
        state.ticksError = action.payload as string;
        toast.error(`Failed to fetch ticks: ${action.payload}`);
      });
    
    // Fetch OHLCV
    builder
      .addCase(fetchOHLCV.pending, (state) => {
        state.ohlcvLoading = true;
        state.ohlcvError = null;
      })
      .addCase(fetchOHLCV.fulfilled, (state, action) => {
        state.ohlcvLoading = false;
        marketDataSlice.caseReducers.updateOHLCV(state, {
          payload: action.payload,
          type: 'marketData/updateOHLCV',
        });
        state.ohlcvError = null;
      })
      .addCase(fetchOHLCV.rejected, (state, action) => {
        state.ohlcvLoading = false;
        state.ohlcvError = action.payload as string;
        toast.error(`Failed to fetch OHLCV: ${action.payload}`);
      });
  },
});

// ============================================================================
// Actions and Selectors
// ============================================================================

export const {
  setSelectedSymbol,
  setTimeframe,
  setWindowSize,
  addTick,
  addOHLCV,
  updateTicks,
  updateOHLCV,
  setConnectionStatus,
  clearTicks,
  clearOHLCV,
  clearAll,
  addTestTick,
} = marketDataSlice.actions;

// Selectors
export const selectSymbols = (state: { marketData: MarketDataState }) => state.marketData.symbols;
export const selectSelectedSymbol = (state: { marketData: MarketDataState }) => state.marketData.selectedSymbol;
export const selectTimeframe = (state: { marketData: MarketDataState }) => state.marketData.timeframe;
export const selectTicks = (state: { marketData: MarketDataState }) => state.marketData.ticks.data;
export const selectOHLCV = (state: { marketData: MarketDataState }) => state.marketData.ohlcv.data;
export const selectLatestTick = (state: { marketData: MarketDataState }) => state.marketData.latestTick;
export const selectLatestOHLCV = (state: { marketData: MarketDataState }) => state.marketData.latestOHLCV;
export const selectStats = (state: { marketData: MarketDataState }) => state.marketData.stats;
export const selectIsConnected = (state: { marketData: MarketDataState }) => state.marketData.isConnected;

// Derived selectors for chart data
export const selectChartTicks = (state: { marketData: MarketDataState }) => {
  const ticks = state.marketData.ticks.data;
  const windowSize = state.marketData.windowSize;
  return ticks.slice(-windowSize);
};

export const selectChartOHLCV = (state: { marketData: MarketDataState }) => {
  const ohlcv = state.marketData.ohlcv.data;
  const windowSize = state.marketData.windowSize;
  return ohlcv.slice(-windowSize);
};

// Symbol-specific selectors
export const selectTicksForSymbol = (state: { marketData: MarketDataState }, symbol: string) => {
  return state.marketData.ticks.data.filter(tick => tick.symbol === symbol);
};

export const selectOHLCVForSymbol = (state: { marketData: MarketDataState }, symbol: string) => {
  return state.marketData.ohlcv.data.filter(candle => candle.symbol === symbol);
};

export default marketDataSlice.reducer;