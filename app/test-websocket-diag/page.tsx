/**
 * WebSocket Diagnostic Page
 * Test and debug WebSocket connectivity and data flow
 */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Activity } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

export default function WebSocketDiagnosticPage() {
  const { 
    ticks, 
    analytics, 
    alerts, 
    isConnected, 
    isReconnecting, 
    reconnectAttempts, 
    error,
    clearData,
    connect,
    disconnect
  } = useWebSocket({
    autoReconnect: true,
    showNotifications: true,
    debug: true,
  });

  const [stats, setStats] = useState({
    tickCount: 0,
    analyticsReceived: false,
    alertCount: 0,
    lastTickTime: null as Date | null,
    lastAnalyticsTime: null as Date | null,
  });

  useEffect(() => {
    setStats(prev => ({
      ...prev,
      tickCount: ticks.length,
      analyticsReceived: analytics !== null,
      alertCount: alerts.length,
      lastTickTime: ticks.length > 0 ? new Date() : prev.lastTickTime,
      lastAnalyticsTime: analytics ? new Date() : prev.lastAnalyticsTime,
    }));
  }, [ticks, analytics, alerts]);

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WebSocket Diagnostics</h1>
          <p className="text-muted-foreground">Debug real-time data connection</p>
        </div>
        {isConnected ? (
          <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</Badge>
        ) : isReconnecting ? (
          <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Reconnecting...</Badge>
        ) : (
          <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Disconnected</Badge>
        )}
      </div>

      {/* Connection Info */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>WebSocket endpoint: {wsUrl}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold mb-1">
                {isConnected ? <CheckCircle2 className="h-8 w-8 mx-auto text-green-500" /> : <XCircle className="h-8 w-8 mx-auto text-red-500" />}
              </div>
              <div className="text-xs text-muted-foreground">Connection</div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold mb-1">{reconnectAttempts}</div>
              <div className="text-xs text-muted-foreground">Reconnect Attempts</div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold mb-1">{stats.tickCount}</div>
              <div className="text-xs text-muted-foreground">Ticks Received</div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold mb-1">{stats.alertCount}</div>
              <div className="text-xs text-muted-foreground">Alerts Received</div>
            </div>
          </div>

          {error && (
            <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span className="font-semibold text-destructive">Connection Error</span>
              </div>
              <p className="text-sm">{error.message}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={disconnect} variant="outline" size="sm" disabled={!isConnected}>
              Disconnect
            </Button>
            <Button onClick={connect} variant="outline" size="sm" disabled={isConnected}>
              Connect
            </Button>
            <Button onClick={clearData} variant="outline" size="sm">
              Clear Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Latest Ticks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Latest Ticks
            {stats.lastTickTime && (
              <Badge variant="outline" className="ml-auto">
                Last: {stats.lastTickTime.toLocaleTimeString()}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Real-time price updates (showing last 10)</CardDescription>
        </CardHeader>
        <CardContent>
          {ticks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No tick data received yet</p>
              <p className="text-xs mt-2">
                {isConnected ? 'Waiting for data...' : 'Not connected to WebSocket'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {ticks.slice(0, 10).map((tick, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{tick.symbol}</Badge>
                    <span className="font-mono font-semibold">${tick.price.toFixed(2)}</span>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>Qty: {tick.quantity?.toFixed(4) || 'N/A'}</div>
                    <div>{new Date(tick.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Analytics Data
            {stats.lastAnalyticsTime && (
              <Badge variant="outline" className="ml-auto">
                Last: {stats.lastAnalyticsTime.toLocaleTimeString()}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Spread analysis and correlation</CardDescription>
        </CardHeader>
        <CardContent>
          {!analytics ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No analytics data received yet</p>
              <p className="text-xs mt-2">
                {isConnected ? 'Waiting for data...' : 'Not connected to WebSocket'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Symbol Pair</div>
                <div className="font-semibold">{analytics.symbol_pair || 'N/A'}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Spread</div>
                <div className="font-mono font-semibold">{analytics.spread?.toFixed(4) || 'N/A'}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Z-Score</div>
                <div className="font-mono font-semibold">{analytics.z_score?.toFixed(3) || 'N/A'}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Correlation</div>
                <div className="font-mono font-semibold">{analytics.correlation?.toFixed(3) || 'N/A'}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts ({alerts.length})</CardTitle>
          <CardDescription>Real-time alert notifications</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No alerts received</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge>{alert.severity || 'Medium'}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>
                  <div className="text-sm">{alert.message || 'No message'}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold mb-2">If no data is showing:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Check that the backend is running on http://localhost:8000</li>
                <li>Verify NEXT_PUBLIC_WS_URL in .env.local is set to: ws://localhost:8000/ws</li>
                <li>Open browser console (F12) and look for WebSocket connection errors</li>
                <li>Check backend logs for any errors</li>
                <li>Ensure database has tick data (backend should be ingesting from Binance)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Backend check commands:</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
curl http://localhost:8000/api/health{'\n'}
curl http://localhost:8000/api/symbols{'\n'}
curl "http://localhost:8000/api/ticks?symbol=BTCUSDT&limit=5"
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
