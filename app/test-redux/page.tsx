/**
 * Redux State Test Component
 * Demonstrates the new Redux store with sliding window data management
 */

'use client';

import React from 'react';
import { useAppSelector, useAppDispatch } from '../store';
import { useWebSocketRedux } from '../hooks/useWebSocketRedux';
import { 
  selectSelectedSymbol, 
  selectTicksForSymbol,
  selectOHLCVForSymbol,
  setSelectedSymbol,
  addTestTick,
} from '../store/slices/marketDataSlice';
import { 
  selectNotifications,
  addNotification,
  toggleTheme,
} from '../store/slices/uiSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ReduxStateTest() {
  const dispatch = useAppDispatch();
  
  // Redux selectors
  const selectedSymbol = useAppSelector(selectSelectedSymbol);
  const ticks = useAppSelector(state => selectTicksForSymbol(state, selectedSymbol || 'BTCUSDT'));
  const ohlcv = useAppSelector(state => selectOHLCVForSymbol(state, selectedSymbol || 'BTCUSDT'));
  const notifications = useAppSelector(selectNotifications);
  const theme = useAppSelector(state => state.ui.theme);
  const websocketState = useAppSelector(state => state.websocket);
  
  // WebSocket hook
  const { connected, connecting, connect, disconnect, stats } = useWebSocketRedux({
    url: 'ws://localhost:8000/ws',
    autoConnect: true,
    symbols: [selectedSymbol || 'BTCUSDT'],
  });
  
  // Test functions
  const handleAddTestTick = () => {
    dispatch(addTestTick({
      symbol: selectedSymbol || 'BTCUSDT',
      price: Math.random() * 50000 + 30000, // Random price between 30k-80k
      quantity: Math.random() * 10,
    }));
  };
  
  const handleAddNotification = () => {
    dispatch(addNotification({
      type: 'info',
      message: `Test notification at ${new Date().toLocaleTimeString()}`,
    }));
  };
  
  const handleSymbolChange = (symbol: string) => {
    dispatch(setSelectedSymbol(symbol));
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Redux State Test Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={() => dispatch(toggleTheme())} variant="outline">
            Toggle Theme ({theme})
          </Button>
          <Button onClick={handleAddNotification} variant="outline">
            Add Test Notification
          </Button>
        </div>
      </div>
      
      {/* WebSocket Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            WebSocket Status
            <Badge variant={connected ? 'default' : 'destructive'}>
              {connected ? 'Connected' : connecting ? 'Connecting...' : 'Disconnected'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>Messages: {stats.totalMessages}</div>
            <div>Reconnects: {stats.reconnectAttempts}</div>
            <div>Subscriptions: {websocketState.subscriptions.length}</div>
            <div>Queue Size: {websocketState.messageQueue.length}</div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={connect} disabled={connected || connecting} size="sm">
              Connect
            </Button>
            <Button onClick={disconnect} disabled={!connected} size="sm" variant="outline">
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Symbol Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Symbol Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT'].map(symbol => (
              <Button
                key={symbol}
                onClick={() => handleSymbolChange(symbol)}
                variant={selectedSymbol === symbol ? 'default' : 'outline'}
                size="sm"
              >
                {symbol}
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Selected: <strong>{selectedSymbol}</strong>
          </p>
        </CardContent>
      </Card>
      
      {/* Market Data - Sliding Window */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Live Ticks
              <Button onClick={handleAddTestTick} size="sm" variant="outline">
                Add Test Tick
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {ticks.slice(-10).reverse().map((tick, idx) => (
                <div key={tick.id} className="flex justify-between text-sm p-2 bg-muted rounded">
                  <span>{tick.symbol}</span>
                  <span className="font-mono">${tick.price.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(tick.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {ticks.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No ticks yet. Add test data or wait for WebSocket data.
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Total ticks: {ticks.length} (sliding window: last 500)
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>OHLCV Candles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {ohlcv.slice(-5).reverse().map((candle, idx) => (
                <div key={candle.id} className="text-sm p-2 bg-muted rounded">
                  <div className="flex justify-between">
                    <span>{candle.symbol}</span>
                    <span className="text-xs">{candle.interval}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 font-mono text-xs mt-1">
                    <span>O: {candle.open.toFixed(2)}</span>
                    <span>H: {candle.high.toFixed(2)}</span>
                    <span>L: {candle.low.toFixed(2)}</span>
                    <span>C: {candle.close.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              {ohlcv.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No OHLCV data yet. Wait for WebSocket data.
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Total candles: {ohlcv.length} (sliding window: last 200)
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {notifications.slice(-5).reverse().map((notification, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-muted rounded">
                <Badge variant={
                  notification.type === 'error' ? 'destructive' : 
                  notification.type === 'warning' ? 'secondary' : 'default'
                }>
                  {notification.type}
                </Badge>
                <span>{notification.message}</span>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No notifications yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}