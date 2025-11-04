/**
 * Redux Store Configuration with Sliding Window State Management
 * Optimized for real-time trading data with efficient memory usage
 */

import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slices
import marketDataSlice from './slices/marketDataSlice';
import uiSlice from './slices/uiSlice';
import alertSlice from './slices/alertSlice';
import websocketSlice from './slices/websocketSlice';
import analyticsSlice from './slices/analyticsSlice';

// ============================================================================
// Persist Configuration
// ============================================================================

const persistConfig = {
  key: 'quantify-root',
  storage,
  whitelist: ['ui', 'marketData', 'analytics'], // Persist UI, market data metadata, and analytics config
  blacklist: ['websocket'], // Don't persist websocket connection state
};

const marketDataPersistConfig = {
  key: 'marketData',
  storage,
  whitelist: ['selectedSymbol', 'timeframe', 'windowSize'], // Only persist user preferences
  blacklist: ['ticks', 'ohlcv', 'latestData'], // Don't persist actual data - it should be fresh
};

const analyticsPersistConfig = {
  key: 'analytics',
  storage,
  whitelist: ['config'], // Only persist configuration
  blacklist: ['live', 'history', 'loading', 'errors'], // Don't persist live data or states
};

// ============================================================================
// Root Reducer
// ============================================================================

const rootReducer = combineReducers({
  marketData: persistReducer(marketDataPersistConfig, marketDataSlice),
  ui: uiSlice,
  alerts: alertSlice,
  websocket: websocketSlice,
  analytics: persistReducer(analyticsPersistConfig, analyticsSlice),
});

// Create the persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// ============================================================================
// Store Configuration
// ============================================================================

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/FLUSH',
          'persist/REHYDRATE', 
          'persist/PAUSE',
          'persist/PERSIST',
          'persist/PURGE',
          'persist/REGISTER',
        ],
        ignoredPaths: ['_persist'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

// ============================================================================
// Types
// ============================================================================

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

// ============================================================================
// Hooks
// ============================================================================

import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;