/**
 * WebSocket Hook with Redux Integration
 * Manages real-time data connection and sliding window updates
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  setConnecting,
  setConnected,
  setConnectionError,
  addMessage,
  incrementReconnectAttempts,
  addSubscription,
  removeSubscription,
} from '../store/slices/websocketSlice';
import {
  addTick,
  addOHLCV,
  setConnectionStatus,
  selectSelectedSymbol,
} from '../store/slices/marketDataSlice';
import { addAlertNotification } from '../store/slices/alertSlice';
import { addNotification } from '../store/slices/uiSlice';

interface UseWebSocketReduxOptions {
  url?: string;
  autoConnect?: boolean;
  symbols?: string[];
}

export function useWebSocketRedux({ 
  url = 'ws://localhost:8000/ws', 
  autoConnect = true,
  symbols = [],
}: UseWebSocketReduxOptions = {}) {
  const dispatch = useAppDispatch();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Redux state
  const { connected, connecting, error, autoReconnect, reconnectDelay, maxReconnectAttempts, stats } = 
    useAppSelector(state => state.websocket);
  const selectedSymbol = useAppSelector(selectSelectedSymbol);
  
  // Message handler
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      const timestamp = Date.now();
      
      console.log('📨 WebSocket message received:', {
        type: message.type,
        dataType: Array.isArray(message.data) ? 'array' : typeof message.data,
        dataLength: Array.isArray(message.data) ? message.data.length : 1,
        sample: Array.isArray(message.data) ? message.data[0] : message.data
      });
      
      // Add to message queue
      dispatch(addMessage({
        type: message.type || 'unknown',
        data: message,
        timestamp,
      }));
      
      // Route message based on type
      switch (message.type) {
        case 'tick':
          // Backend sends array of ticks in message.data
          const tickData = Array.isArray(message.data) ? message.data : [message.data];
          
          console.log(`✅ Processing ${tickData.length} ticks`);
          
          tickData.forEach((tick: any) => {
            // Validate tick has required fields
            if (!tick.symbol || !tick.price) {
              console.warn('Invalid tick data:', tick);
              return;
            }
            
            const processedTick = {
              id: tick.id || Date.now(),
              timestamp: tick.timestamp || new Date().toISOString(),
              symbol: tick.symbol,
              price: parseFloat(tick.price),
              quantity: parseFloat(tick.quantity || tick.size || 0),
              created_at: new Date().toISOString(),
            };
            
            console.log('💾 Adding tick to Redux:', processedTick);
            
            dispatch(addTick(processedTick));
          });
          break;
          
        case 'ohlcv':
        case 'candle':
          dispatch(addOHLCV({
            id: message.data.id || Date.now(),
            timestamp: message.data.timestamp,
            symbol: message.data.symbol,
            interval: message.data.interval || '1m',
            timeframe: message.data.timeframe || message.data.interval || '1m',
            open: parseFloat(message.data.open),
            high: parseFloat(message.data.high),
            low: parseFloat(message.data.low),
            close: parseFloat(message.data.close),
            volume: parseFloat(message.data.volume),
            number_of_ticks: parseInt(message.data.trade_count || message.data.number_of_ticks || 0),
            created_at: new Date().toISOString(),
          }));
          break;
          
        case 'alert':
          dispatch(addAlertNotification({
            id: message.data.id,
            message: message.data.message || 'Alert triggered',
            severity: message.data.severity || 'Medium',
          }));
          break;
          
        case 'status':
          dispatch(addNotification({
            type: 'info',
            message: message.data.message || 'Status update',
          }));
          break;
          
        case 'error':
          dispatch(addNotification({
            type: 'error',
            message: message.data.message || 'WebSocket error',
          }));
          break;
          
        default:
          console.log('Unknown message type:', message.type, message);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to parse WebSocket message',
      }));
    }
  }, [dispatch]);
  
  // Connection handlers
  const handleOpen = useCallback(() => {
    console.log('WebSocket connected');
    dispatch(setConnected(true));
    dispatch(setConnectionStatus({ connected: true }));
    
    // Subscribe to symbols after a small delay to ensure connection is fully established
    setTimeout(() => {
      if (symbols.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
        symbols.forEach(symbol => {
          dispatch(addSubscription(symbol));
          // Send subscription message if the WebSocket supports it
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'subscribe',
              symbol: symbol,
            }));
          }
        });
      }
    }, 100);
  }, [dispatch, symbols]);
  
  const handleClose = useCallback((event: CloseEvent) => {
    console.log('WebSocket disconnected:', event.code, event.reason);
    dispatch(setConnected(false));
    dispatch(setConnectionStatus({ connected: false }));
    
    // Auto-reconnect if enabled and not a clean close
    if (autoReconnect && event.code !== 1000 && stats.reconnectAttempts < maxReconnectAttempts) {
      dispatch(incrementReconnectAttempts());
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!connected) { // Only reconnect if still disconnected
          connect();
        }
      }, reconnectDelay);
    }
  }, [dispatch, autoReconnect, reconnectDelay, maxReconnectAttempts, stats.reconnectAttempts, connected]);
  
  const handleError = useCallback((event: Event) => {
    // Log a useful message instead of an empty object
    const anyEvent = event as any;
    const message = anyEvent?.message || anyEvent?.reason || anyEvent?.type || 'Connection failed';
    const code = anyEvent?.code;
    
    // Only log if not already logged
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.CLOSED) {
      console.warn('WebSocket error:', { message, type: anyEvent?.type, code });
    }
    
    dispatch(setConnectionError(message));
    dispatch(setConnectionStatus({ connected: false, error: message }));
  }, [dispatch]);
  
  // Connect function
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return; // Already connected or connecting
    }
    
    dispatch(setConnecting(true));
    
    try {
      wsRef.current = new WebSocket(url);
      
      wsRef.current.onopen = handleOpen;
      wsRef.current.onmessage = handleMessage;
      wsRef.current.onclose = handleClose;
      wsRef.current.onerror = handleError;
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      dispatch(setConnectionError('Failed to create connection'));
      dispatch(setConnecting(false));
    }
  }, [url, dispatch, handleOpen, handleMessage, handleClose, handleError]);
  
  // Disconnect function
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    // Only dispatch if not already disconnected to prevent loops
    if (connected) {
      dispatch(setConnected(false));
      dispatch(setConnectionStatus({ connected: false }));
    }
  }, [dispatch, connected]);
  
  // Send message function
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);
  
  // Subscribe to symbol
  const subscribe = useCallback((symbol: string) => {
    dispatch(addSubscription(symbol));
    return sendMessage({ type: 'subscribe', symbol });
  }, [dispatch, sendMessage]);
  
  // Unsubscribe from symbol
  const unsubscribe = useCallback((symbol: string) => {
    dispatch(removeSubscription(symbol));
    return sendMessage({ type: 'unsubscribe', symbol });
  }, [dispatch, sendMessage]);
  
  // Auto-connect effect
  useEffect(() => {
    if (autoConnect && !connected && !connecting) {
      connect();
    }
    
    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [autoConnect]); // Removed connected and connecting from dependencies to prevent loops
  
  // Subscribe to selected symbol effect
  useEffect(() => {
    if (connected && selectedSymbol && wsRef.current?.readyState === WebSocket.OPEN) {
      subscribe(selectedSymbol);
    }
  }, [selectedSymbol]); // Removed connected and subscribe from dependencies
  
  // Final cleanup effect
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close(1000, 'Component unmount');
      }
    };
  }, []); // Empty dependency array for cleanup only
  
  return {
    connected,
    connecting,
    error,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    unsubscribe,
    stats,
  };
}