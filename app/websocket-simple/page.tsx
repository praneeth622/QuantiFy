/**
 * Simple WebSocket Example
 * Minimal example showing how to use useWebSocket hook
 */
'use client';

import { useWebSocket } from '../hooks/useWebSocket';

export default function SimpleWebSocketExample() {
  const { ticks, analytics, alerts, isConnected } = useWebSocket({
    autoReconnect: true,
    showNotifications: true,
    debug: false, // Set to true for debugging
  });

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">
          Simple WebSocket Example
        </h1>

        {/* Connection Status */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl text-white mb-4">Connection Status</h2>
          <div className="flex items-center gap-3">
            <div
              className={`w-4 h-4 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-white">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Latest Tick */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl text-white mb-4">Latest Tick</h2>
          {ticks.length > 0 && ticks[0] ? (
            <div className="text-white">
              <p className="text-2xl font-bold">
                {ticks[0].symbol}: ${typeof ticks[0].price === 'number' ? ticks[0].price.toFixed(2) : 'N/A'}
              </p>
              <p className="text-slate-400 text-sm">
                Quantity: {ticks[0].quantity ?? 0}
              </p>
              <p className="text-slate-500 text-xs">
                {ticks[0].timestamp ? new Date(ticks[0].timestamp).toLocaleString() : 'N/A'}
              </p>
            </div>
          ) : (
            <p className="text-slate-400">
              {isConnected ? 'Waiting for data...' : 'Connect to receive data'}
            </p>
          )}
        </div>

        {/* Recent Ticks */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl text-white mb-4">
            Recent Ticks ({ticks.length})
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {ticks.slice(0, 10).map((tick, idx) => {
              if (!tick || !tick.symbol || typeof tick.price !== 'number') {
                return null;
              }
              
              return (
                <div key={idx} className="bg-slate-700 p-3 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">{tick.symbol}</span>
                    <span className="text-slate-300">${tick.price.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
            {ticks.length === 0 && (
              <p className="text-slate-400 text-center py-4">
                No ticks received yet
              </p>
            )}
          </div>
        </div>

        {/* Analytics */}
        {analytics && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl text-white mb-4">Current Analytics</h2>
            <div className="grid grid-cols-2 gap-4 text-white">
              <div>
                <p className="text-slate-400 text-sm">Symbol Pair</p>
                <p className="font-bold">{analytics.symbol_pair || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Z-Score</p>
                <p className="font-bold">
                  {typeof analytics.z_score === 'number'
                    ? analytics.z_score.toFixed(3)
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Spread</p>
                <p className="font-bold">
                  {typeof analytics.spread === 'number'
                    ? analytics.spread.toFixed(4)
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Correlation</p>
                <p className="font-bold">
                  {typeof analytics.correlation === 'number'
                    ? analytics.correlation.toFixed(3)
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl text-white mb-4">
              Recent Alerts ({alerts.length})
            </h2>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert, idx) => {
                if (!alert || !alert.alert_type) {
                  return null;
                }
                
                return (
                  <div
                    key={idx}
                    className="bg-yellow-500/20 border border-yellow-500/50 p-3 rounded"
                  >
                    <p className="text-yellow-400 font-bold">
                      {alert.alert_type}
                    </p>
                    <p className="text-slate-300 text-sm">
                      {alert.message || 'No message'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-blue-300 font-semibold mb-2">
            📝 How to verify data
          </h3>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>✓ Connection status should show "Connected"</li>
            <li>✓ Latest tick should update every ~500ms</li>
            <li>✓ Recent ticks list should grow (max 100)</li>
            <li>✓ Analytics appear after ~30-60 seconds</li>
            <li>✓ Alerts appear when conditions are met</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
