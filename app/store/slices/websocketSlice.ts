/**
 * WebSocket Slice for Real-time Data Management
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

export interface WebSocketMessage {
  type: 'tick' | 'ohlcv' | 'alert' | 'status' | 'error';
  data: any;
  timestamp: number;
}

export interface ConnectionStats {
  connectedAt: number | null;
  disconnectedAt: number | null;
  totalMessages: number;
  messagesPerSecond: number;
  lastMessageAt: number;
  reconnectAttempts: number;
  latency: number;
}

export interface WebSocketState {
  // Connection state
  connected: boolean;
  connecting: boolean;
  error: string | null;
  
  // Connection configuration
  url: string;
  autoReconnect: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  
  // Message handling
  lastMessage: WebSocketMessage | null;
  messageQueue: WebSocketMessage[];
  maxQueueSize: number;
  
  // Statistics
  stats: ConnectionStats;
  
  // Subscriptions
  subscriptions: string[]; // List of subscribed symbols
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: WebSocketState = {
  connected: false,
  connecting: false,
  error: null,
  
  url: '',
  autoReconnect: true,
  reconnectDelay: 3000, // 3 seconds
  maxReconnectAttempts: 10,
  
  lastMessage: null,
  messageQueue: [],
  maxQueueSize: 100,
  
  stats: {
    connectedAt: null,
    disconnectedAt: null,
    totalMessages: 0,
    messagesPerSecond: 0,
    lastMessageAt: 0,
    reconnectAttempts: 0,
    latency: 0,
  },
  
  subscriptions: [],
};

// ============================================================================
// Slice Definition
// ============================================================================

const websocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {
    // Connection actions
    setConnecting: (state, action: PayloadAction<boolean>) => {
      state.connecting = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
      state.connecting = false;
      
      if (action.payload) {
        state.stats.connectedAt = Date.now();
        state.stats.disconnectedAt = null;
        state.stats.reconnectAttempts = 0;
        state.error = null;
        toast.success('WebSocket connected');
      } else {
        state.stats.disconnectedAt = Date.now();
        if (state.stats.connectedAt) {
          toast.warning('WebSocket disconnected');
        }
      }
    },
    
    setConnectionError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.connected = false;
      state.connecting = false;
      state.stats.disconnectedAt = Date.now();
      toast.error(`WebSocket error: ${action.payload}`);
    },
    
    // Configuration actions
    setUrl: (state, action: PayloadAction<string>) => {
      state.url = action.payload;
    },
    
    setAutoReconnect: (state, action: PayloadAction<boolean>) => {
      state.autoReconnect = action.payload;
    },
    
    setReconnectDelay: (state, action: PayloadAction<number>) => {
      state.reconnectDelay = Math.max(1000, Math.min(30000, action.payload));
    },
    
    // Message handling
    addMessage: (state, action: PayloadAction<WebSocketMessage>) => {
      const message = action.payload;
      const now = Date.now();
      
      state.lastMessage = message;
      state.messageQueue.push(message);
      
      // Maintain queue size
      if (state.messageQueue.length > state.maxQueueSize) {
        state.messageQueue = state.messageQueue.slice(-state.maxQueueSize);
      }
      
      // Update statistics
      state.stats.totalMessages += 1;
      state.stats.lastMessageAt = now;
      
      // Calculate messages per second
      if (state.stats.connectedAt) {
        const connectionDuration = (now - state.stats.connectedAt) / 1000;
        state.stats.messagesPerSecond = state.stats.totalMessages / connectionDuration;
      }
      
      // Calculate latency (if message has timestamp)
      if (message.timestamp) {
        state.stats.latency = now - message.timestamp;
      }
    },
    
    clearMessageQueue: (state) => {
      state.messageQueue = [];
    },
    
    // Subscription management
    addSubscription: (state, action: PayloadAction<string>) => {
      const symbol = action.payload;
      if (!state.subscriptions.includes(symbol)) {
        state.subscriptions.push(symbol);
      }
    },
    
    removeSubscription: (state, action: PayloadAction<string>) => {
      const symbol = action.payload;
      state.subscriptions = state.subscriptions.filter(s => s !== symbol);
    },
    
    clearSubscriptions: (state) => {
      state.subscriptions = [];
    },
    
    // Statistics management
    incrementReconnectAttempts: (state) => {
      state.stats.reconnectAttempts += 1;
    },
    
    resetStats: (state) => {
      state.stats = {
        connectedAt: null,
        disconnectedAt: null,
        totalMessages: 0,
        messagesPerSecond: 0,
        lastMessageAt: 0,
        reconnectAttempts: 0,
        latency: 0,
      };
    },
    
    // Reset entire state
    reset: (state) => {
      return { ...initialState, url: state.url };
    },
  },
});

// ============================================================================
// Actions and Selectors
// ============================================================================

export const {
  setConnecting,
  setConnected,
  setConnectionError,
  setUrl,
  setAutoReconnect,
  setReconnectDelay,
  addMessage,
  clearMessageQueue,
  addSubscription,
  removeSubscription,
  clearSubscriptions,
  incrementReconnectAttempts,
  resetStats,
  reset,
} = websocketSlice.actions;

// Selectors
export const selectWebSocketConnected = (state: { websocket: WebSocketState }) => state.websocket.connected;
export const selectWebSocketConnecting = (state: { websocket: WebSocketState }) => state.websocket.connecting;
export const selectWebSocketError = (state: { websocket: WebSocketState }) => state.websocket.error;
export const selectWebSocketStats = (state: { websocket: WebSocketState }) => state.websocket.stats;
export const selectWebSocketSubscriptions = (state: { websocket: WebSocketState }) => state.websocket.subscriptions;
export const selectLastMessage = (state: { websocket: WebSocketState }) => state.websocket.lastMessage;
export const selectMessageQueue = (state: { websocket: WebSocketState }) => state.websocket.messageQueue;

// Derived selectors
export const selectConnectionStatus = (state: { websocket: WebSocketState }) => {
  const ws = state.websocket;
  return {
    connected: ws.connected,
    connecting: ws.connecting,
    error: ws.error,
    uptime: ws.stats.connectedAt ? Date.now() - ws.stats.connectedAt : 0,
    messagesReceived: ws.stats.totalMessages,
    averageLatency: ws.stats.latency,
  };
};

export const selectRecentMessages = (state: { websocket: WebSocketState }, count: number = 10) => {
  return state.websocket.messageQueue.slice(-count);
};

export default websocketSlice.reducer;