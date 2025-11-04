/**
 * Alert Slice for Managing Trading Alerts
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as api from '../../services/api';
import type { Alert, CreateAlertRequest } from '../../services/types';

// ============================================================================
// Types
// ============================================================================

export interface AlertState {
  alerts: Alert[];
  activeAlerts: Alert[];
  
  // Loading states
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  
  // Error states
  error: string | null;
  
  // Filters and settings
  showActiveOnly: boolean;
  sortBy: 'created_at' | 'last_triggered' | 'trigger_count';
  sortOrder: 'asc' | 'desc';
  
  // Real-time alert notifications
  recentAlerts: Array<{
    id: number;
    message: string;
    timestamp: number;
    severity: string;
  }>;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: AlertState = {
  alerts: [],
  activeAlerts: [],
  
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  
  error: null,
  
  showActiveOnly: false,
  sortBy: 'created_at',
  sortOrder: 'desc',
  
  recentAlerts: [],
};

// ============================================================================
// Async Thunks
// ============================================================================

export const fetchAlerts = createAsyncThunk(
  'alerts/fetchAlerts',
  async (activeOnly: boolean = false, { rejectWithValue }) => {
    try {
      const alerts = await api.getAlerts(activeOnly);
      return alerts;
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || 'Failed to fetch alerts';
      return rejectWithValue(message);
    }
  }
);

export const createAlert = createAsyncThunk(
  'alerts/createAlert',
  async (alertData: CreateAlertRequest, { rejectWithValue }) => {
    try {
      const alert = await api.createAlert(alertData);
      return alert;
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || 'Failed to create alert';
      return rejectWithValue(message);
    }
  }
);

export const updateAlert = createAsyncThunk(
  'alerts/updateAlert',
  async ({ id, data }: { id: number; data: Partial<CreateAlertRequest> }, { rejectWithValue }) => {
    try {
      const alert = await api.updateAlert(id, data);
      return alert;
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || 'Failed to update alert';
      return rejectWithValue(message);
    }
  }
);

export const deleteAlert = createAsyncThunk(
  'alerts/deleteAlert',
  async (id: number, { rejectWithValue }) => {
    try {
      await api.deleteAlert(id);
      return id;
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || 'Failed to delete alert';
      return rejectWithValue(message);
    }
  }
);

// ============================================================================
// Slice Definition
// ============================================================================

const alertSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    // Filter and sort actions
    setShowActiveOnly: (state, action: PayloadAction<boolean>) => {
      state.showActiveOnly = action.payload;
    },
    
    setSortBy: (state, action: PayloadAction<'created_at' | 'last_triggered' | 'trigger_count'>) => {
      state.sortBy = action.payload;
    },
    
    setSortOrder: (state, action: PayloadAction<'asc' | 'desc'>) => {
      state.sortOrder = action.payload;
    },
    
    // Real-time alert notifications
    addAlertNotification: (state, action: PayloadAction<{
      id: number;
      message: string;
      severity: string;
    }>) => {
      const notification = {
        ...action.payload,
        timestamp: Date.now(),
      };
      
      state.recentAlerts.unshift(notification);
      
      // Keep only last 50 notifications
      if (state.recentAlerts.length > 50) {
        state.recentAlerts = state.recentAlerts.slice(0, 50);
      }
      
      // Show toast notification
      const toastType = notification.severity === 'Critical' ? 'error' : 
                       notification.severity === 'High' ? 'warning' : 'info';
      
      toast[toastType](notification.message, {
        duration: notification.severity === 'Critical' ? 10000 : 5000,
      });
    },
    
    clearAlertNotifications: (state) => {
      state.recentAlerts = [];
    },
    
    // Update alert status (for real-time updates)
    updateAlertStatus: (state, action: PayloadAction<{
      id: number;
      last_triggered?: string;
      trigger_count?: number;
      is_active?: boolean;
    }>) => {
      const { id, ...updates } = action.payload;
      
      const alertIndex = state.alerts.findIndex(a => a.id === id);
      if (alertIndex >= 0) {
        state.alerts[alertIndex] = { ...state.alerts[alertIndex], ...updates };
      }
      
      const activeAlertIndex = state.activeAlerts.findIndex(a => a.id === id);
      if (activeAlertIndex >= 0) {
        state.activeAlerts[activeAlertIndex] = { ...state.activeAlerts[activeAlertIndex], ...updates };
      }
    },
    
    // Clear errors
    clearError: (state) => {
      state.error = null;
    },
  },
  
  extraReducers: (builder) => {
    // Fetch alerts
    builder
      .addCase(fetchAlerts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.alerts = action.payload;
        state.activeAlerts = action.payload.filter(alert => alert.is_active);
        state.error = null;
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(`Failed to fetch alerts: ${action.payload}`);
      });
    
    // Create alert
    builder
      .addCase(createAlert.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createAlert.fulfilled, (state, action) => {
        state.creating = false;
        state.alerts.push(action.payload);
        if (action.payload.is_active) {
          state.activeAlerts.push(action.payload);
        }
        state.error = null;
        toast.success('Alert created successfully');
      })
      .addCase(createAlert.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
        toast.error(`Failed to create alert: ${action.payload}`);
      });
    
    // Update alert
    builder
      .addCase(updateAlert.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateAlert.fulfilled, (state, action) => {
        state.updating = false;
        
        const alertIndex = state.alerts.findIndex(a => a.id === action.payload.id);
        if (alertIndex >= 0) {
          state.alerts[alertIndex] = action.payload;
        }
        
        const activeAlertIndex = state.activeAlerts.findIndex(a => a.id === action.payload.id);
        if (action.payload.is_active) {
          if (activeAlertIndex >= 0) {
            state.activeAlerts[activeAlertIndex] = action.payload;
          } else {
            state.activeAlerts.push(action.payload);
          }
        } else if (activeAlertIndex >= 0) {
          state.activeAlerts.splice(activeAlertIndex, 1);
        }
        
        state.error = null;
        toast.success('Alert updated successfully');
      })
      .addCase(updateAlert.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
        toast.error(`Failed to update alert: ${action.payload}`);
      });
    
    // Delete alert
    builder
      .addCase(deleteAlert.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteAlert.fulfilled, (state, action) => {
        state.deleting = false;
        
        state.alerts = state.alerts.filter(a => a.id !== action.payload);
        state.activeAlerts = state.activeAlerts.filter(a => a.id !== action.payload);
        
        state.error = null;
        toast.success('Alert deleted successfully');
      })
      .addCase(deleteAlert.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload as string;
        toast.error(`Failed to delete alert: ${action.payload}`);
      });
  },
});

// ============================================================================
// Actions and Selectors
// ============================================================================

export const {
  setShowActiveOnly,
  setSortBy,
  setSortOrder,
  addAlertNotification,
  clearAlertNotifications,
  updateAlertStatus,
  clearError,
} = alertSlice.actions;

// Selectors
export const selectAlerts = (state: { alerts: AlertState }) => state.alerts.alerts;
export const selectActiveAlerts = (state: { alerts: AlertState }) => state.alerts.activeAlerts;
export const selectAlertsLoading = (state: { alerts: AlertState }) => state.alerts.loading;
export const selectAlertsError = (state: { alerts: AlertState }) => state.alerts.error;
export const selectRecentAlerts = (state: { alerts: AlertState }) => state.alerts.recentAlerts;

// Filtered and sorted alerts selector
export const selectFilteredAlerts = (state: { alerts: AlertState }) => {
  let alerts = state.alerts.showActiveOnly ? state.alerts.activeAlerts : state.alerts.alerts;
  
  // Sort alerts
  alerts = [...alerts].sort((a, b) => {
    const aValue = a[state.alerts.sortBy];
    const bValue = b[state.alerts.sortBy];
    
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return state.alerts.sortOrder === 'asc' ? comparison : -comparison;
  });
  
  return alerts;
};

export default alertSlice.reducer;