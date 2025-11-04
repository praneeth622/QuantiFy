/**
 * QuantiFy API Client
 * Axios-based client for interacting with the FastAPI backend
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { toast } from 'sonner'; // Using sonner for toast notifications
import type {
  Symbol,
  Tick,
  TicksResponse,
  OHLCV,
  SpreadAnalytics,
  CorrelationData,
  RollingCorrelation,
  Alert,
  AlertHistory,
  CreateAlertRequest,
  HealthStatus,
  APIResponse,
  PaginatedResponse,
  ErrorResponse,
  TickQueryParams,
  OHLCVQueryParams,
  AnalyticsQueryParams,
  CorrelationQueryParams,
} from './types';

// ============================================================================
// API Client Configuration
// ============================================================================

/**
 * Get API base URL from environment variable with fallback
 */
const getBaseURL = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: Use Next.js public env variable
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }
  // Server-side: Can use internal URL
  return process.env.API_URL || 'http://localhost:8000';
};

/**
 * Create configured axios instance
 */
const createAPIClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: getBaseURL(),
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  // Request interceptor for logging (development only)
  client.interceptors.request.use(
    (config) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.params);
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ErrorResponse>) => {
      handleAPIError(error);
      return Promise.reject(error);
    }
  );

  return client;
};

// Create singleton instance
const apiClient = createAPIClient();

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Handle API errors with user-friendly toast notifications
 */
const handleAPIError = (error: AxiosError<ErrorResponse>): void => {
  let errorMessage = 'An unexpected error occurred';

  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const detail = error.response.data?.detail || error.message;

    switch (status) {
      case 400:
        errorMessage = `Bad Request: ${detail}`;
        break;
      case 401:
        errorMessage = 'Unauthorized. Please check your credentials.';
        break;
      case 403:
        errorMessage = 'Forbidden. You do not have access to this resource.';
        break;
      case 404:
        errorMessage = `Resource not found: ${detail}`;
        break;
      case 422:
        errorMessage = `Validation Error: ${detail}`;
        break;
      case 429:
        errorMessage = 'Too many requests. Please try again later.';
        break;
      case 500:
        errorMessage = 'Server error. Please try again later.';
        break;
      case 503:
        errorMessage = 'Service unavailable. The server may be down.';
        break;
      default:
        errorMessage = `Error ${status}: ${detail}`;
    }
  } else if (error.request) {
    // Request made but no response received
    errorMessage = 'Network error. Please check your connection.';
  } else {
    // Error setting up the request
    errorMessage = error.message || 'Failed to make request';
  }

  // Show toast notification
  toast.error(errorMessage, {
    duration: 5000,
    position: 'top-right',
  });

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[API Error]', error);
  }
};

// ============================================================================
// Market Data API Functions
// ============================================================================

/**
 * Get list of available trading symbols
 */
export const getSymbols = async (): Promise<Symbol[]> => {
  try {
    const response = await apiClient.get<Symbol[]>('/api/symbols');
    return response.data;
  } catch (error) {
    console.warn('Failed to fetch symbols from API, returning defaults');
    // Return default symbols if API is down
    return [
      { symbol: 'BTCUSDT', exchange: 'binance' },
      { symbol: 'ETHUSDT', exchange: 'binance' },
      { symbol: 'ADAUSDT', exchange: 'binance' },
      { symbol: 'SOLUSDT', exchange: 'binance' },
      { symbol: 'DOTUSDT', exchange: 'binance' },
    ];
  }
};

/**
 * Get raw tick data
 */
export const getTicks = async (params?: TickQueryParams): Promise<Tick[]> => {
  try {
    const response = await apiClient.get<TicksResponse>('/api/ticks', { params });
    // Extract the ticks array from the response object
    const ticks = response.data.ticks || [];
    if (ticks.length > 0) {
      toast.success(`Retrieved ${ticks.length} ticks`, { duration: 2000 });
    }
    return ticks;
  } catch (error) {
    console.warn('Failed to fetch ticks from API');
    return []; // Return empty array instead of throwing
  }
};

/**
 * Get OHLCV (candlestick) data
 */
export const getOHLCV = async (params: OHLCVQueryParams): Promise<OHLCV[]> => {
  try {
    const response = await apiClient.get<OHLCV[]>('/api/ohlcv', { params });
    toast.success(`Retrieved ${response.data.length} candles`, { duration: 2000 });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get latest tick for a symbol
 */
export const getLatestTick = async (symbol: string): Promise<Tick> => {
  try {
    const response = await apiClient.get<Tick>(`/api/market/ticks/latest/${symbol}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// Analytics API Functions
// ============================================================================

/**
 * Get spread analytics (z-score, hedge ratio, etc.)
 */
export const getSpreadAnalytics = async (
  params: AnalyticsQueryParams
): Promise<SpreadAnalytics[]> => {
  try {
    const response = await apiClient.get<SpreadAnalytics[]>(
      '/api/analytics/spread',
      { params }
    );
    toast.success(`Retrieved analytics for ${params.symbol_pair}`, { duration: 2000 });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get correlation between two symbols
 */
export const getCorrelation = async (
  params: CorrelationQueryParams
): Promise<CorrelationData> => {
  try {
    const response = await apiClient.get<CorrelationData>(
      '/api/analytics/correlation',
      { params }
    );
    toast.success(
      `Correlation: ${response.data.correlation.toFixed(3)}`,
      { duration: 2000 }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get rolling correlation data
 */
export const getRollingCorrelation = async (
  params: CorrelationQueryParams
): Promise<any> => {
  try {
    // The backend expects symbol1, symbol2, window parameters
    const response = await apiClient.get('/api/analytics/correlation', { 
      params: {
        symbol1: params.symbol1,
        symbol2: params.symbol2,
        window: params.window_size || 50,
      }
    });
    
    // Transform backend response to expected format
    const data = response.data;
    return {
      timestamps: data.timestamps || [],
      correlations: data.correlations || [],
      symbol_pair: `${params.symbol1}-${params.symbol2}`,
      window_size: params.window_size || 50,
      current_correlation: data.current_correlation,
      mean_correlation: data.mean_correlation,
      std_correlation: data.std_correlation,
      min_correlation: data.min_correlation,
      max_correlation: data.max_correlation,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get latest analytics for a symbol pair
 */
export const getLatestAnalytics = async (symbolPair: string): Promise<SpreadAnalytics> => {
  try {
    const response = await apiClient.get<SpreadAnalytics>(
      `/api/analytics/latest/${symbolPair}`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Calculate Z-Score between two symbols
 */
export const calculateZScore = async (
  symbol1: string,
  symbol2: string,
  params?: { window_minutes?: number; lookback_periods?: number }
) => {
  try {
    const response = await apiClient.post('/api/analytics/z-score', {
      symbol1,
      symbol2,
      window_minutes: params?.window_minutes || 60,
      lookback_periods: params?.lookback_periods || 100,
    });
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Calculate Correlation between two symbols
 */
export const calculateCorrelation = async (
  symbol1: string,
  symbol2: string,
  params?: { window_minutes?: number; lookback_periods?: number }
) => {
  try {
    const response = await apiClient.post('/api/analytics/correlation', {
      symbol1,
      symbol2,
      window_minutes: params?.window_minutes || 60,
      lookback_periods: params?.lookback_periods || 100,
    });
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Calculate Hedge Ratio between two symbols
 */
export const calculateHedgeRatio = async (
  symbol1: string,
  symbol2: string,
  params?: { window_minutes?: number; lookback_periods?: number }
) => {
  try {
    const response = await apiClient.post('/api/analytics/hedge-ratio', {
      symbol1,
      symbol2,
      window_minutes: params?.window_minutes || 60,
      lookback_periods: params?.lookback_periods || 100,
    });
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Calculate Cointegration between two symbols
 */
export const calculateCointegration = async (
  symbol1: string,
  symbol2: string,
  params?: { window_minutes?: number; lookback_periods?: number }
) => {
  try {
    const response = await apiClient.post('/api/analytics/cointegration', {
      symbol1,
      symbol2,
      window_minutes: params?.window_minutes || 60,
      lookback_periods: params?.lookback_periods || 100,
    });
    return response;
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// Alert Management API Functions
// ============================================================================

/**
 * Get all alerts
 */
export const getAlerts = async (activeOnly: boolean = false): Promise<Alert[]> => {
  try {
    const params = activeOnly ? { is_active: true } : {};
    const response = await apiClient.get<Alert[]>('/api/alerts', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get a specific alert by ID
 */
export const getAlert = async (alertId: number): Promise<Alert> => {
  try {
    const response = await apiClient.get<Alert>(`/api/alerts/${alertId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new alert
 */
export const createAlert = async (alertData: CreateAlertRequest): Promise<Alert> => {
  try {
    const response = await apiClient.post<Alert>('/api/alerts', alertData);
    toast.success('Alert created successfully', { duration: 3000 });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing alert
 */
export const updateAlert = async (
  alertId: number,
  alertData: Partial<CreateAlertRequest>
): Promise<Alert> => {
  try {
    const response = await apiClient.put<Alert>(`/api/alerts/${alertId}`, alertData);
    toast.success('Alert updated successfully', { duration: 3000 });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete an alert
 */
export const deleteAlert = async (alertId: number): Promise<void> => {
  try {
    await apiClient.delete(`/api/alerts/${alertId}`);
    toast.success('Alert deleted successfully', { duration: 3000 });
  } catch (error) {
    throw error;
  }
};

/**
 * Get alert history
 */
export const getAlertHistory = async (
  alertId?: number,
  limit: number = 50
): Promise<AlertHistory[]> => {
  try {
    const params = { alert_id: alertId, limit };
    const response = await apiClient.get<AlertHistory[]>('/api/alerts/history', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// Health & Status API Functions
// ============================================================================

/**
 * Get API health status
 */
export const getHealthStatus = async (): Promise<HealthStatus> => {
  try {
    const response = await apiClient.get<HealthStatus>('/api/health');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Check if API is available
 */
export const checkAPIAvailability = async (): Promise<boolean> => {
  try {
    await apiClient.get('/api/health', { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
};

// ============================================================================
// Data Export Functions
// ============================================================================

/**
 * Export data as CSV
 */
export const exportCSV = async (
  dataType: 'ticks' | 'ohlcv' | 'analytics' | 'alerts',
  params: Record<string, any>,
  filename?: string
): Promise<Blob> => {
  try {
    const endpoint = `/api/export/${dataType}`;
    const response = await apiClient.get(endpoint, {
      params,
      responseType: 'blob',
      headers: {
        'Accept': 'text/csv',
      },
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || `${dataType}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    toast.success('Data exported successfully', { duration: 3000 });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Export analytics data as JSON
 */
export const exportJSON = async (
  dataType: 'ticks' | 'ohlcv' | 'analytics' | 'alerts',
  params: Record<string, any>,
  filename?: string
): Promise<any> => {
  try {
    const endpoint = `/api/${dataType}`;
    const response = await apiClient.get(endpoint, { params });

    // Download as JSON file
    const dataStr = JSON.stringify(response.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || `${dataType}_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    toast.success('Data exported successfully', { duration: 3000 });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Build query string from params
 */
export const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
};

/**
 * Format ISO date string to local date
 */
export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString();
};

/**
 * Get WebSocket URL
 */
export const getWebSocketURL = (): string => {
  const baseURL = getBaseURL();
  const wsProtocol = baseURL.startsWith('https') ? 'wss' : 'ws';
  const host = baseURL.replace(/^https?:\/\//, '');
  return `${wsProtocol}://${host}/ws`;
};

// ============================================================================
// Export API client instance and base URL
// ============================================================================

export { apiClient, getBaseURL };

// Default export with all API functions
export default {
  // Market Data
  getSymbols,
  getTicks,
  getOHLCV,
  getLatestTick,
  
  // Analytics
  getSpreadAnalytics,
  getCorrelation,
  getRollingCorrelation,
  getLatestAnalytics,
  
  // Alerts
  getAlerts,
  getAlert,
  createAlert,
  updateAlert,
  deleteAlert,
  getAlertHistory,
  
  // Health
  getHealthStatus,
  checkAPIAvailability,
  
  // Export
  exportCSV,
  exportJSON,
  
  // Utils
  buildQueryString,
  formatDate,
  getWebSocketURL,
};
