/**
 * useWebSocket Hook
 * Custom React hook for WebSocket connection with auto-reconnect
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { getWebSocketURL } from '../services/api';
import type {
  WebSocketMessage,
  WebSocketTickData,
  WebSocketAnalyticsData,
  WebSocketAlertData,
} from '../services/types';

interface UseWebSocketOptions {
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Reconnect interval in milliseconds (default: 3000) */
  reconnectInterval?: number;
  /** Maximum reconnect attempts (default: 10, 0 = infinite) */
  maxReconnectAttempts?: number;
  /** Show toast notifications (default: true) */
  showNotifications?: boolean;
  /** Log WebSocket events to console (default: false) */
  debug?: boolean;
}

interface UseWebSocketReturn {
  /** Latest tick data received */
  ticks: WebSocketTickData[];
  /** Latest analytics data received */
  analytics: WebSocketAnalyticsData | null;
  /** Latest alerts received */
  alerts: WebSocketAlertData[];
  /** WebSocket connection status */
  isConnected: boolean;
  /** Is currently attempting to reconnect */
  isReconnecting: boolean;
  /** Number of reconnect attempts made */
  reconnectAttempts: number;
  /** WebSocket connection error */
  error: Error | null;
  /** Manually disconnect */
  disconnect: () => void;
  /** Manually connect */
  connect: () => void;
  /** Send a message to the server */
  sendMessage: (message: any) => void;
  /** Clear all data */
  clearData: () => void;
}

/**
 * Custom hook for WebSocket connection to QuantiFy backend
 * 
 * @example
 * ```tsx
 * const { ticks, analytics, alerts, isConnected } = useWebSocket();
 * 
 * return (
 *   <div>
 *     <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
 *     <p>Ticks received: {ticks.length}</p>
 *   </div>
 * );
 * ```
 */
export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    showNotifications = true,
    debug = false,
  } = options;

  // State
  const [ticks, setTicks] = useState<WebSocketTickData[]>([]);
  const [analytics, setAnalytics] = useState<WebSocketAnalyticsData | null>(null);
  const [alerts, setAlerts] = useState<WebSocketAlertData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const mountedRef = useRef(true);

  const log = useCallback((...args: any[]) => {
    if (debug) {
      console.log('[useWebSocket]', ...args);
    }
  }, [debug]);

  /**
   * Clear all received data
   */
  const clearData = useCallback(() => {
    setTicks([]);
    setAnalytics(null);
    setAlerts([]);
    log('Data cleared');
  }, [log]);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage<any> = JSON.parse(event.data);
      log('Received message:', message.type);

      switch (message.type) {
        case 'connection':
          log('Connection confirmed:', message.data);
          if (showNotifications) {
            toast.success('WebSocket connected', { duration: 2000 });
          }
          break;

        case 'tick':
          const tickData = message.data as WebSocketTickData;
          // Validate tick data before adding
          if (tickData && tickData.symbol && typeof tickData.price === 'number') {
            setTicks((prev) => {
              // Keep last 100 ticks
              const newTicks = [tickData, ...prev].slice(0, 100);
              return newTicks;
            });
            log('Tick received:', tickData.symbol, tickData.price);
          } else {
            console.warn('[useWebSocket] Invalid tick data received:', tickData);
          }
          break;

        case 'analytics':
          const analyticsData = message.data as WebSocketAnalyticsData;
          // Validate analytics data before setting
          if (analyticsData && analyticsData.symbol_pair) {
            setAnalytics(analyticsData);
            log('Analytics received:', analyticsData.symbol_pair);
          } else {
            console.warn('[useWebSocket] Invalid analytics data received:', analyticsData);
          }
          break;

        case 'alert':
          const alertData = message.data as WebSocketAlertData;
          // Validate alert data before adding
          if (alertData && alertData.alert_type && alertData.message) {
            setAlerts((prev) => [alertData, ...prev].slice(0, 50));
            log('Alert received:', alertData.alert_type);
            if (showNotifications) {
              toast.warning(`Alert: ${alertData.message}`, {
                duration: 5000,
              });
            }
          } else {
            console.warn('[useWebSocket] Invalid alert data received:', alertData);
          }
          break;

        case 'pong':
          log('Pong received');
          break;

        case 'error':
          log('Server error:', message.data);
          if (showNotifications) {
            toast.error(`Server error: ${message.data?.message || 'Unknown error'}`);
          }
          break;

        default:
          log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[useWebSocket] Failed to parse message:', error);
    }
  }, [showNotifications, log]);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('Already connected');
      return;
    }

    try {
      log('Connecting to WebSocket...');
      const wsUrl = getWebSocketURL();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!mountedRef.current) return;
        log('WebSocket opened');
        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectAttempts(0);
        setError(null);
      };

      ws.onmessage = handleMessage;

      ws.onerror = (event) => {
        if (!mountedRef.current) return;
        log('WebSocket error:', event);
        const err = new Error('WebSocket connection error');
        setError(err);
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect logic
        if (shouldReconnectRef.current && autoReconnect) {
          const maxAttempts = maxReconnectAttempts === 0 ? Infinity : maxReconnectAttempts;
          
          if (reconnectAttempts < maxAttempts) {
            setIsReconnecting(true);
            setReconnectAttempts((prev) => prev + 1);
            
            log(`Reconnecting in ${reconnectInterval}ms... (attempt ${reconnectAttempts + 1})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                connect();
              }
            }, reconnectInterval);
          } else {
            log('Max reconnect attempts reached');
            setIsReconnecting(false);
            if (showNotifications) {
              toast.error('Failed to connect to WebSocket after multiple attempts');
            }
          }
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[useWebSocket] Failed to create WebSocket:', error);
      setError(error as Error);
    }
  }, [
    autoReconnect,
    reconnectInterval,
    maxReconnectAttempts,
    reconnectAttempts,
    showNotifications,
    handleMessage,
    log,
  ]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    log('Disconnecting...');
    shouldReconnectRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsReconnecting(false);
  }, [log]);

  /**
   * Send a message to the server
   */
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msgString = typeof message === 'string' ? message : JSON.stringify(message);
      wsRef.current.send(msgString);
      log('Message sent:', message);
    } else {
      console.warn('[useWebSocket] Cannot send message: WebSocket not connected');
    }
  }, [log]);

  /**
   * Initial connection and cleanup
   */
  useEffect(() => {
    mountedRef.current = true;
    shouldReconnectRef.current = true;
    
    log('Initializing WebSocket connection');
    connect();

    return () => {
      log('Cleaning up WebSocket connection');
      mountedRef.current = false;
      shouldReconnectRef.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []); // Only run once on mount

  /**
   * Ping server every 30 seconds to keep connection alive
   */
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'ping' });
        log('Ping sent');
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [isConnected, sendMessage, log]);

  return {
    ticks,
    analytics,
    alerts,
    isConnected,
    isReconnecting,
    reconnectAttempts,
    error,
    disconnect,
    connect,
    sendMessage,
    clearData,
  };
};

export default useWebSocket;
