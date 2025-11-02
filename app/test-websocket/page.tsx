/**
 * WebSocket Test Component
 * Test and verify WebSocket connection with real-time data display
 */
'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import type { WebSocketTickData } from '../services/types';

export default function WebSocketTestPage() {
  const {
    ticks,
    analytics,
    alerts,
    isConnected,
    isReconnecting,
    reconnectAttempts,
    error,
    disconnect,
    connect,
    clearData,
  } = useWebSocket({
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    showNotifications: true,
    debug: true, // Enable console logging
  });

  const [stats, setStats] = useState({
    totalTicks: 0,
    totalAnalytics: 0,
    totalAlerts: 0,
    startTime: Date.now(),
  });

  // Update statistics
  useEffect(() => {
    setStats((prev) => ({
      ...prev,
      totalTicks: prev.totalTicks + 1,
    }));
  }, [ticks.length]);

  useEffect(() => {
    if (analytics) {
      setStats((prev) => ({
        ...prev,
        totalAnalytics: prev.totalAnalytics + 1,
      }));
    }
  }, [analytics]);

  useEffect(() => {
    setStats((prev) => ({
      ...prev,
      totalAlerts: prev.totalAlerts + 1,
    }));
  }, [alerts.length]);

  // Calculate uptime
  const [uptime, setUptime] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(Date.now() - stats.startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [stats.startTime]);

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  };

  const getTickRate = () => {
    const seconds = (Date.now() - stats.startTime) / 1000;
    return seconds > 0 ? (stats.totalTicks / seconds).toFixed(2) : '0.00';
  };

  // Group ticks by symbol
  const ticksBySymbol = ticks.reduce((acc, tick) => {
    if (!acc[tick.symbol]) {
      acc[tick.symbol] = [];
    }
    acc[tick.symbol].push(tick);
    return acc;
  }, {} as Record<string, WebSocketTickData[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            WebSocket Connection Test
          </h1>
          <p className="text-slate-300">
            Real-time verification of WebSocket data streaming
          </p>
        </div>

        {/* Connection Status Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 mb-6 border border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Connection Status */}
            <div className="text-center">
              <div className="text-slate-400 text-sm mb-2">Connection Status</div>
              <div
                className={`text-2xl font-bold ${
                  isConnected
                    ? 'text-green-400'
                    : isReconnecting
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}
              >
                {isConnected ? (
                  <span>🟢 CONNECTED</span>
                ) : isReconnecting ? (
                  <span>🟡 RECONNECTING...</span>
                ) : (
                  <span>🔴 DISCONNECTED</span>
                )}
              </div>
              {reconnectAttempts > 0 && (
                <div className="text-xs text-slate-400 mt-1">
                  Attempt: {reconnectAttempts}
                </div>
              )}
            </div>

            {/* Uptime */}
            <div className="text-center">
              <div className="text-slate-400 text-sm mb-2">Uptime</div>
              <div className="text-2xl font-bold text-blue-400">
                {formatUptime(uptime)}
              </div>
            </div>

            {/* Tick Rate */}
            <div className="text-center">
              <div className="text-slate-400 text-sm mb-2">Tick Rate</div>
              <div className="text-2xl font-bold text-purple-400">
                {getTickRate()} /sec
              </div>
            </div>

            {/* Total Messages */}
            <div className="text-center">
              <div className="text-slate-400 text-sm mb-2">Total Messages</div>
              <div className="text-2xl font-bold text-emerald-400">
                {stats.totalTicks + stats.totalAnalytics + stats.totalAlerts}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-200 text-sm">
              <strong>Error:</strong> {error.message}
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex gap-3 mt-4">
            {isConnected ? (
              <button
                onClick={disconnect}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={connect}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
              >
                Connect
              </button>
            )}
            <button
              onClick={clearData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
            >
              Clear Data
            </button>
          </div>
        </div>

        {/* Data Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Ticks Stats */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              📊 Tick Data
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Buffered:</span>
                <span className="text-white font-bold">{ticks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Received:</span>
                <span className="text-white font-bold">{stats.totalTicks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Unique Symbols:</span>
                <span className="text-white font-bold">
                  {Object.keys(ticksBySymbol).length}
                </span>
              </div>
            </div>
          </div>

          {/* Analytics Stats */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              📈 Analytics Data
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Current:</span>
                <span className="text-white font-bold">
                  {analytics ? '1' : '0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Received:</span>
                <span className="text-white font-bold">{stats.totalAnalytics}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Update:</span>
                <span className="text-white font-bold">
                  {analytics ? 'Just now' : 'Never'}
                </span>
              </div>
            </div>
          </div>

          {/* Alerts Stats */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              🔔 Alerts
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Buffered:</span>
                <span className="text-white font-bold">{alerts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Received:</span>
                <span className="text-white font-bold">{stats.totalAlerts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Alert:</span>
                <span className="text-white font-bold">
                  {alerts.length > 0 ? 'Just now' : 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Data Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Ticks */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Latest Ticks ({ticks.length})
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {ticks.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  {isConnected
                    ? 'Waiting for tick data...'
                    : 'Connect to receive tick data'}
                </div>
              ) : (
                ticks.slice(0, 20).map((tick, idx) => {
                  // Safety checks for undefined values
                  if (!tick || !tick.symbol || tick.price === undefined) {
                    return null;
                  }
                  
                  return (
                    <div
                      key={`${tick.timestamp}-${idx}`}
                      className="bg-slate-700/50 p-3 rounded animate-fade-in"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-white font-bold">{tick.symbol}</span>
                          <span className="text-slate-400 text-sm ml-2">
                            ${typeof tick.price === 'number' ? tick.price.toFixed(2) : '0.00'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-300 text-sm">
                            Qty: {tick.quantity ?? 0}
                          </div>
                          <div className="text-slate-500 text-xs">
                            {tick.timestamp ? new Date(tick.timestamp).toLocaleTimeString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Latest Analytics + Alerts */}
          <div className="space-y-6">
            {/* Analytics */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Current Analytics
              </h3>
              {analytics ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-slate-400 text-sm">Symbol Pair</div>
                      <div className="text-white font-bold">
                        {analytics.symbol_pair}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm">Z-Score</div>
                      <div className="text-white font-bold">
                        {typeof analytics.z_score === 'number' ? analytics.z_score.toFixed(3) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm">Spread</div>
                      <div className="text-white font-bold">
                        {typeof analytics.spread === 'number' ? analytics.spread.toFixed(4) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm">Correlation</div>
                      <div className="text-white font-bold">
                        {typeof analytics.correlation === 'number' ? analytics.correlation.toFixed(3) : 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-500 text-xs">
                    Updated: {analytics.timestamp ? new Date(analytics.timestamp).toLocaleString() : 'N/A'}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  {isConnected
                    ? 'Waiting for analytics data...'
                    : 'Connect to receive analytics'}
                </div>
              )}
            </div>

            {/* Recent Alerts */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Recent Alerts ({alerts.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    {isConnected
                      ? 'No alerts received yet'
                      : 'Connect to receive alerts'}
                  </div>
                ) : (
                  alerts.slice(0, 5).map((alert, idx) => {
                    // Safety checks for undefined values
                    if (!alert || !alert.alert_type) {
                      return null;
                    }
                    
                    return (
                      <div
                        key={`${alert.timestamp || idx}-${idx}`}
                        className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-yellow-400 font-bold">
                              {alert.alert_type}
                            </div>
                            <div className="text-slate-300 text-sm">
                              {alert.message || 'No message'}
                            </div>
                          </div>
                          <div className="text-slate-500 text-xs">
                            {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        {isConnected && (
          <div className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              🔍 Debug Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">WebSocket URL:</span>
                <span className="text-white ml-2 font-mono">
                  ws://localhost:8000/ws
                </span>
              </div>
              <div>
                <span className="text-slate-400">Auto-reconnect:</span>
                <span className="text-green-400 ml-2">✓ Enabled</span>
              </div>
              <div>
                <span className="text-slate-400">Reconnect Interval:</span>
                <span className="text-white ml-2">3000ms</span>
              </div>
              <div>
                <span className="text-slate-400">Max Buffer Size:</span>
                <span className="text-white ml-2">100 ticks, 50 alerts</span>
              </div>
            </div>
          </div>
        )}

        {/* Verification Checklist */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-4">
            ✅ Verification Checklist
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className={isConnected ? 'text-green-400' : 'text-slate-400'}>
                {isConnected ? '✓' : '○'}
              </span>
              <span className="text-slate-300">
                WebSocket connection established
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={ticks.length > 0 ? 'text-green-400' : 'text-slate-400'}>
                {ticks.length > 0 ? '✓' : '○'}
              </span>
              <span className="text-slate-300">
                Receiving tick data (expected: every 500ms)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={stats.totalTicks > 10 ? 'text-green-400' : 'text-slate-400'}>
                {stats.totalTicks > 10 ? '✓' : '○'}
              </span>
              <span className="text-slate-300">
                Continuous data stream verified
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={analytics ? 'text-green-400' : 'text-yellow-400'}>
                {analytics ? '✓' : '○'}
              </span>
              <span className="text-slate-300">
                Analytics data received (expected: every 5s, may need data in DB)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">○</span>
              <span className="text-slate-300">
                Alerts received (triggered when conditions met)
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
