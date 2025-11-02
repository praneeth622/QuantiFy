/**
 * TypeScript interfaces for QuantiFy API responses
 */

// ============================================================================
// Market Data Types
// ============================================================================

export interface Symbol {
  symbol: string;
  name?: string;
  exchange?: string;
  asset_type?: string;
}

export interface Tick {
  id: number;
  timestamp: string;
  symbol: string;
  price: number;
  quantity: number;
  created_at: string;
}

export interface OHLCV {
  id: number;
  timestamp: string;
  symbol: string;
  interval: string;
  timeframe: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  number_of_ticks: number;
  created_at: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface SpreadAnalytics {
  id: number;
  symbol_pair: string;
  interval: string;
  timestamp: string;
  spread: number;
  spread_mean: number;
  spread_std: number;
  z_score: number;
  half_life: number;
  hedge_ratio: number;
  correlation: number;
  created_at: string;
}

export interface CorrelationData {
  symbol_pair: string;
  window_size: number;
  correlation: number;
  p_value: number;
  is_significant: boolean;
  data_points: number;
  timestamp: string;
}

export interface RollingCorrelation {
  timestamps: string[];
  correlations: number[];
  symbol_pair: string;
  window_size: number;
}

// ============================================================================
// Alert Types
// ============================================================================

export interface Alert {
  id: number;
  symbol: string;
  symbol_pair: string;
  condition: string;
  condition_type: string;
  threshold: number;
  threshold_value: number;
  comparison_operator?: string;
  is_active: boolean;
  cooldown_minutes?: number;
  created_at: string;
  alert_type?: string;
  severity?: string;
  message?: string;
  last_triggered?: string;
  trigger_count?: number;
  user_id?: string;
  strategy_name?: string;
}

export interface AlertHistory {
  id: number;
  alert_id: number;
  symbol: string;
  condition: string;
  threshold_value: number;
  actual_value: number;
  triggered_at: string;
  market_conditions?: string;
  resolution_time?: string;
}

export interface CreateAlertRequest {
  symbol?: string;
  symbol_pair: string;
  condition?: string;
  condition_type: string;
  threshold?: number;
  threshold_value: number;
  comparison_operator?: string;
  cooldown_minutes?: number;
  alert_type?: string;
  severity?: string;
  message?: string;
  is_active?: boolean;
  user_id?: string;
  strategy_name?: string;
}

// ============================================================================
// Health & Status Types
// ============================================================================

export interface HealthStatus {
  status: string;
  timestamp: string;
  database: {
    connected: boolean;
    tables: number;
    symbol_count?: number;
    tick_count?: number;
    ohlcv_count?: number;
    analytics_count?: number;
  };
  services: {
    websocket: string;
    resampler: string;
    analytics: string;
  };
}

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ErrorResponse {
  detail: string;
  status_code?: number;
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface TickQueryParams {
  symbol?: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
  offset?: number;
}

export interface OHLCVQueryParams {
  symbol: string;
  interval?: string;
  timeframe: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
}

export interface AnalyticsQueryParams {
  symbol_pair: string;
  interval?: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
}

export interface CorrelationQueryParams {
  symbol1: string;
  symbol2: string;
  window_size?: number;
  start_time?: string;
  end_time?: string;
}

// ============================================================================
// WebSocket Types
// ============================================================================

export interface WebSocketMessage<T = any> {
  type: 'tick' | 'analytics' | 'alert' | 'connection' | 'pong' | 'error';
  data: T;
  timestamp: string;
}

export interface WebSocketTickData {
  symbol: string;
  price: number;
  quantity: number;
  timestamp: string;
}

export interface WebSocketAnalyticsData {
  symbol_pair: string;
  interval: string;
  spread: number;
  spread_mean: number;
  spread_std: number;
  z_score: number;
  half_life: number;
  hedge_ratio: number;
  correlation: number;
  timestamp: string;
}

export interface WebSocketAlertData {
  alert_id: number;
  alert_history_id: number;
  symbol: string;
  alert_type: string;
  condition: string;
  threshold: number;
  current_value: number;
  message: string;
  severity: string;
  triggered_at: string;
  timestamp: string;
  user_id?: string;
  strategy_name?: string;
}

// ============================================================================
// Export & Data Processing Types
// ============================================================================

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  filename?: string;
}

export interface CSVExportRequest {
  data_type: 'ticks' | 'ohlcv' | 'analytics' | 'alerts';
  params: Record<string, any>;
  filename?: string;
}
