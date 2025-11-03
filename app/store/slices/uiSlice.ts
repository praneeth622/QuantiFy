/**
 * UI Slice for Managing Interface State
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ============================================================================
// Types
// ============================================================================

export interface UIState {
  // Theme and appearance
  theme: 'light' | 'dark';
  
  // Layout settings
  sidebarCollapsed: boolean;
  chartHeight: number;
  showGrid: boolean;
  
  // Chart settings
  chartType: 'candlestick' | 'line' | 'area';
  showVolume: boolean;
  showIndicators: boolean;
  
  // Data refresh settings
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  
  // Loading states
  globalLoading: boolean;
  
  // Error handling
  errors: string[];
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }>;
  
  // Performance monitoring
  performance: {
    renderTime: number;
    apiResponseTime: number;
    dataPoints: number;
  };
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: UIState = {
  theme: 'dark',
  
  sidebarCollapsed: false,
  chartHeight: 400,
  showGrid: true,
  
  chartType: 'candlestick',
  showVolume: true,
  showIndicators: false,
  
  autoRefresh: true,
  refreshInterval: 5, // 5 seconds
  
  globalLoading: false,
  
  errors: [],
  notifications: [],
  
  performance: {
    renderTime: 0,
    apiResponseTime: 0,
    dataPoints: 0,
  },
};

// ============================================================================
// Slice Definition
// ============================================================================

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme actions
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
    
    // Layout actions
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    
    setChartHeight: (state, action: PayloadAction<number>) => {
      state.chartHeight = Math.max(200, Math.min(800, action.payload));
    },
    
    toggleGrid: (state) => {
      state.showGrid = !state.showGrid;
    },
    
    // Chart settings
    setChartType: (state, action: PayloadAction<'candlestick' | 'line' | 'area'>) => {
      state.chartType = action.payload;
    },
    
    toggleVolume: (state) => {
      state.showVolume = !state.showVolume;
    },
    
    toggleIndicators: (state) => {
      state.showIndicators = !state.showIndicators;
    },
    
    // Refresh settings
    setAutoRefresh: (state, action: PayloadAction<boolean>) => {
      state.autoRefresh = action.payload;
    },
    
    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = Math.max(1, Math.min(60, action.payload));
    },
    
    // Loading state
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload;
    },
    
    // Error handling
    addError: (state, action: PayloadAction<string>) => {
      state.errors.push(action.payload);
      // Keep only last 10 errors
      if (state.errors.length > 10) {
        state.errors = state.errors.slice(-10);
      }
    },
    
    removeError: (state, action: PayloadAction<number>) => {
      state.errors.splice(action.payload, 1);
    },
    
    clearErrors: (state) => {
      state.errors = [];
    },
    
    // Notifications
    addNotification: (state, action: PayloadAction<{
      type: 'success' | 'error' | 'warning' | 'info';
      message: string;
    }>) => {
      const notification = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        ...action.payload,
      };
      
      state.notifications.push(notification);
      
      // Keep only last 20 notifications
      if (state.notifications.length > 20) {
        state.notifications = state.notifications.slice(-20);
      }
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    // Performance monitoring
    updatePerformance: (state, action: PayloadAction<Partial<UIState['performance']>>) => {
      state.performance = { ...state.performance, ...action.payload };
    },
  },
});

// ============================================================================
// Actions and Selectors
// ============================================================================

export const {
  setTheme,
  toggleTheme,
  setSidebarCollapsed,
  toggleSidebar,
  setChartHeight,
  toggleGrid,
  setChartType,
  toggleVolume,
  toggleIndicators,
  setAutoRefresh,
  setRefreshInterval,
  setGlobalLoading,
  addError,
  removeError,
  clearErrors,
  addNotification,
  removeNotification,
  clearNotifications,
  updatePerformance,
} = uiSlice.actions;

// Selectors
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectSidebarCollapsed = (state: { ui: UIState }) => state.ui.sidebarCollapsed;
export const selectChartSettings = (state: { ui: UIState }) => ({
  type: state.ui.chartType,
  height: state.ui.chartHeight,
  showVolume: state.ui.showVolume,
  showIndicators: state.ui.showIndicators,
  showGrid: state.ui.showGrid,
});
export const selectRefreshSettings = (state: { ui: UIState }) => ({
  autoRefresh: state.ui.autoRefresh,
  interval: state.ui.refreshInterval,
});
export const selectErrors = (state: { ui: UIState }) => state.ui.errors;
export const selectNotifications = (state: { ui: UIState }) => state.ui.notifications;
export const selectPerformance = (state: { ui: UIState }) => state.ui.performance;
export const selectGlobalLoading = (state: { ui: UIState }) => state.ui.globalLoading;

export default uiSlice.reducer;