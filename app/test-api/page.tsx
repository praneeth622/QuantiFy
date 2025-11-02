/**
 * API Test Page
 * Test all API client functions
 */
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  getSymbols,
  getTicks,
  getOHLCV,
  getSpreadAnalytics,
  getCorrelation,
  getAlerts,
  createAlert,
  getHealthStatus,
  exportCSV,
  checkAPIAvailability,
  getWebSocketURL,
} from '../services/api';
import type { Symbol, Tick, OHLCV, Alert, HealthStatus } from '../services/types';

export default function APITestPage() {
  const [loading, setLoading] = useState(false);
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [ohlcv, setOHLCV] = useState<OHLCV[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Test API availability
  const testAPIStatus = async () => {
    setApiStatus('checking');
    const isAvailable = await checkAPIAvailability();
    setApiStatus(isAvailable ? 'online' : 'offline');
    toast[isAvailable ? 'success' : 'error'](
      isAvailable ? 'API is online' : 'API is offline'
    );
  };

  // Test getSymbols
  const testGetSymbols = async () => {
    setLoading(true);
    try {
      const data = await getSymbols();
      setSymbols(data);
      toast.success(`Retrieved ${data.length} symbols`);
    } catch (error) {
      console.error('Error getting symbols:', error);
    } finally {
      setLoading(false);
    }
  };

  // Test getTicks
  const testGetTicks = async () => {
    setLoading(true);
    try {
      const data = await getTicks({ limit: 10 });
      setTicks(data);
    } catch (error) {
      console.error('Error getting ticks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Test getOHLCV
  const testGetOHLCV = async () => {
    setLoading(true);
    try {
      const data = await getOHLCV({
        symbol: 'BTCUSDT',
        timeframe: '1m',
        limit: 10,
      });
      setOHLCV(data);
    } catch (error) {
      console.error('Error getting OHLCV:', error);
    } finally {
      setLoading(false);
    }
  };

  // Test getSpreadAnalytics
  const testGetSpreadAnalytics = async () => {
    setLoading(true);
    try {
      await getSpreadAnalytics({
        symbol_pair: 'BTCUSDT_ETHUSDT',
        limit: 10,
      });
    } catch (error) {
      console.error('Error getting spread analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Test getCorrelation
  const testGetCorrelation = async () => {
    setLoading(true);
    try {
      await getCorrelation({
        symbol1: 'BTCUSDT',
        symbol2: 'ETHUSDT',
        window_size: 30,
      });
    } catch (error) {
      console.error('Error getting correlation:', error);
    } finally {
      setLoading(false);
    }
  };

  // Test getAlerts
  const testGetAlerts = async () => {
    setLoading(true);
    try {
      const data = await getAlerts(true); // Active only
      setAlerts(data);
      toast.success(`Retrieved ${data.length} alerts`);
    } catch (error) {
      console.error('Error getting alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Test createAlert
  const testCreateAlert = async () => {
    setLoading(true);
    try {
      await createAlert({
        symbol_pair: 'BTCUSDT_ETHUSDT',
        condition_type: 'z_score_threshold',
        threshold_value: 2.0,
        cooldown_minutes: 5,
      });
    } catch (error) {
      console.error('Error creating alert:', error);
    } finally {
      setLoading(false);
    }
  };

  // Test getHealthStatus
  const testGetHealth = async () => {
    setLoading(true);
    try {
      const data = await getHealthStatus();
      setHealth(data);
      toast.success('Health check complete');
    } catch (error) {
      console.error('Error getting health:', error);
    } finally {
      setLoading(false);
    }
  };

  // Test exportCSV
  const testExportCSV = async () => {
    setLoading(true);
    try {
      await exportCSV('ticks', { limit: 100 }, 'test_ticks.csv');
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">API Client Test Page</h1>
        <p className="text-slate-300 mb-8">Test all API functions and view results</p>

        {/* API Status */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 mb-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">API Status</h2>
              <p className="text-slate-400">WebSocket URL: {getWebSocketURL()}</p>
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`px-4 py-2 rounded-full font-medium ${
                  apiStatus === 'online'
                    ? 'bg-green-500/20 text-green-400'
                    : apiStatus === 'offline'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}
              >
                {apiStatus === 'online' ? '🟢 Online' : apiStatus === 'offline' ? '🔴 Offline' : '🟡 Checking...'}
              </span>
              <button
                onClick={testAPIStatus}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Check Status
              </button>
            </div>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={testGetSymbols}
            disabled={loading}
            className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white rounded-lg transition font-medium"
          >
            Get Symbols
          </button>
          <button
            onClick={testGetTicks}
            disabled={loading}
            className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white rounded-lg transition font-medium"
          >
            Get Ticks
          </button>
          <button
            onClick={testGetOHLCV}
            disabled={loading}
            className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white rounded-lg transition font-medium"
          >
            Get OHLCV
          </button>
          <button
            onClick={testGetSpreadAnalytics}
            disabled={loading}
            className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white rounded-lg transition font-medium"
          >
            Get Analytics
          </button>
          <button
            onClick={testGetCorrelation}
            disabled={loading}
            className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white rounded-lg transition font-medium"
          >
            Get Correlation
          </button>
          <button
            onClick={testGetAlerts}
            disabled={loading}
            className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white rounded-lg transition font-medium"
          >
            Get Alerts
          </button>
          <button
            onClick={testCreateAlert}
            disabled={loading}
            className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg transition font-medium"
          >
            Create Alert
          </button>
          <button
            onClick={testGetHealth}
            disabled={loading}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg transition font-medium"
          >
            Health Check
          </button>
          <button
            onClick={testExportCSV}
            disabled={loading}
            className="px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 text-white rounded-lg transition font-medium"
          >
            Export CSV
          </button>
        </div>

        {/* Results Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Symbols */}
          {symbols.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Symbols ({symbols.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {symbols.map((symbol, idx) => (
                  <div key={idx} className="bg-slate-700/50 p-3 rounded">
                    <p className="text-white font-medium">{symbol.symbol}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ticks */}
          {ticks.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Ticks ({ticks.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {ticks.map((tick) => (
                  <div key={tick.id} className="bg-slate-700/50 p-3 rounded">
                    <p className="text-white font-medium">{tick.symbol}</p>
                    <p className="text-slate-300 text-sm">
                      Price: ${tick.price.toFixed(2)} | Qty: {tick.quantity}
                    </p>
                    <p className="text-slate-400 text-xs">{new Date(tick.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OHLCV */}
          {ohlcv.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">OHLCV Data ({ohlcv.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {ohlcv.map((candle) => (
                  <div key={candle.id} className="bg-slate-700/50 p-3 rounded">
                    <p className="text-white font-medium">{candle.symbol} - {candle.timeframe}</p>
                    <p className="text-slate-300 text-sm">
                      O: ${candle.open.toFixed(2)} | H: ${candle.high.toFixed(2)} | L: ${candle.low.toFixed(2)} | C: ${candle.close.toFixed(2)}
                    </p>
                    <p className="text-slate-400 text-xs">{new Date(candle.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Active Alerts ({alerts.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {alerts.map((alert) => (
                  <div key={alert.id} className="bg-slate-700/50 p-3 rounded">
                    <p className="text-white font-medium">{alert.symbol_pair}</p>
                    <p className="text-slate-300 text-sm">
                      {alert.condition_type} | Threshold: {alert.threshold_value}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {alert.is_active ? '🟢 Active' : '🔴 Inactive'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Health Status */}
          {health && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700 col-span-full">
              <h3 className="text-lg font-semibold text-white mb-4">Health Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-700/50 p-4 rounded">
                  <p className="text-slate-400 text-sm">Status</p>
                  <p className={`text-lg font-bold ${health.status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                    {health.status.toUpperCase()}
                  </p>
                </div>
                <div className="bg-slate-700/50 p-4 rounded">
                  <p className="text-slate-400 text-sm">Database</p>
                  <p className="text-lg font-bold text-white">
                    {health.database?.connected ? '🟢 Connected' : '🔴 Disconnected'}
                  </p>
                </div>
                <div className="bg-slate-700/50 p-4 rounded">
                  <p className="text-slate-400 text-sm">Symbols</p>
                  <p className="text-lg font-bold text-white">{health.database?.symbol_count || 0}</p>
                </div>
                <div className="bg-slate-700/50 p-4 rounded">
                  <p className="text-slate-400 text-sm">Ticks</p>
                  <p className="text-lg font-bold text-white">{health.database?.tick_count || 0}</p>
                </div>
              </div>
              {health.services && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(health.services).map(([service, status]) => (
                    <div key={service} className="bg-slate-700/50 p-3 rounded">
                      <p className="text-slate-400 text-sm capitalize">{service.replace('_', ' ')}</p>
                      <p className={`text-sm font-medium ${status === 'running' ? 'text-green-400' : 'text-red-400'}`}>
                        {status === 'running' ? '🟢 Running' : '🔴 Stopped'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
