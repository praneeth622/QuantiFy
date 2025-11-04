'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Zap, 
  Activity, 
  Database,
  ArrowLeft,
  Clock,
  BarChart3,
  Waves,
  Gauge,
  TrendingDown,
  Cpu,
  RefreshCw
} from 'lucide-react';

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Navigation */}
      <nav className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                QuantiFy
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <Link href="/dashboard-redux">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                  Launch Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <Badge className="mb-4">Features</Badge>
          <h1 className="text-5xl font-bold mb-6">
            Live Analytics That Scales
          </h1>
          <p className="text-xl text-muted-foreground">
            Our production-grade architecture delivers real-time insights while maintaining optimal performance
            through intelligent update strategies and memory management.
          </p>
        </div>
      </section>

      {/* Live Analytics Feature */}
      <section className="container mx-auto px-4 py-12">
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-900">
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-10 h-10 text-blue-600" />
              <div>
                <CardTitle className="text-3xl">Live Analytics Engine</CardTitle>
                <CardDescription className="text-base mt-2">
                  Intelligent real-time updates with adaptive refresh rates
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-lg">
                Our Live Analytics system solves a critical challenge: <strong>how to provide real-time insights 
                without overwhelming the UI or wasting computational resources</strong>.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <Clock className="w-8 h-8 text-green-600 mb-2" />
                  <CardTitle className="text-xl">Tick-Based Metrics (500ms)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Fast-changing indicators updated at high frequency:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-yellow-600 mt-1 flex-shrink-0" />
                      <div>
                        <strong>Z-Score:</strong> Real-time price deviation from mean
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Gauge className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                      <div>
                        <strong>VWAP:</strong> Volume-weighted average price
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <strong>Momentum:</strong> Price velocity and acceleration
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Activity className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0" />
                      <div>
                        <strong>Tick Rate:</strong> Messages per second
                      </div>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <BarChart3 className="w-8 h-8 text-purple-600 mb-2" />
                  <CardTitle className="text-xl">Resampled Charts (Interval-Based)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    OHLCV charts update only when new candles close:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-600 mt-1 flex-shrink-0" />
                      <div>
                        <strong>5m chart:</strong> Updates every 5 minutes
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-600 mt-1 flex-shrink-0" />
                      <div>
                        <strong>1h chart:</strong> Updates every hour
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Cpu className="w-4 h-4 text-orange-600 mt-1 flex-shrink-0" />
                      <div>
                        <strong>Backend aggregation:</strong> Reduces client load
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <RefreshCw className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                      <div>
                        <strong>No unnecessary re-renders:</strong> Saves CPU cycles
                      </div>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Redux Architecture */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Database className="w-10 h-10 text-blue-600 mb-2" />
              <CardTitle className="text-2xl">Redux State Management</CardTitle>
              <CardDescription>Single source of truth with predictable state updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Sliding Window Architecture</h4>
                <p className="text-sm text-muted-foreground">
                  Keep last 500 ticks in memory per symbol with automatic pruning. O(1) access time,
                  predictable memory usage (~50KB per symbol).
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Memoized Selectors</h4>
                <p className="text-sm text-muted-foreground">
                  Use Reselect to compute derived data only when dependencies change. Prevents 
                  expensive recalculations on every render.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Immutable Updates</h4>
                <p className="text-sm text-muted-foreground">
                  Redux Toolkit handles immutability automatically with Immer. Write code that 
                  "mutates" but produces new state under the hood.
                </p>
              </div>
              <div className="pt-4">
                <code className="text-xs bg-muted px-3 py-2 rounded block overflow-x-auto">
                  {`// Redux slice handles sliding window\naddTick: (state, action) => {\n  state.ticks.data.push(action.payload);\n  if (state.ticks.data.length > 500) {\n    state.ticks.data = \n      state.ticks.data.slice(-500);\n  }\n}`}
                </code>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Waves className="w-10 h-10 text-purple-600 mb-2" />
              <CardTitle className="text-2xl">WebSocket Streaming</CardTitle>
              <CardDescription>Persistent real-time data connections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Auto-Reconnection Logic</h4>
                <p className="text-sm text-muted-foreground">
                  Exponential backoff with max retry attempts. Handles network failures gracefully
                  without manual intervention.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Message Batching</h4>
                <p className="text-sm text-muted-foreground">
                  Backend sends 10 ticks per message every 500ms. Reduces WebSocket overhead and 
                  enables efficient Redux dispatches.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Type Validation</h4>
                <p className="text-sm text-muted-foreground">
                  All incoming messages validated and parsed. Invalid data gracefully ignored with
                  console warnings for debugging.
                </p>
              </div>
              <div className="pt-4">
                <code className="text-xs bg-muted px-3 py-2 rounded block overflow-x-auto">
                  {`// WebSocket message handling\ncase 'tick':\n  const ticks = Array.isArray(data)\n    ? data : [data];\n  ticks.forEach(tick => {\n    if (validate(tick)) {\n      dispatch(addTick(tick));\n    }\n  });\n  break;`}
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Performance Optimizations */}
      <section className="container mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <Cpu className="w-10 h-10 text-orange-600 mb-2" />
            <CardTitle className="text-3xl">Performance Optimizations</CardTitle>
            <CardDescription className="text-base">
              Production-grade techniques to ensure smooth 60 FPS rendering
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                  Memoization
                </h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• useMemo for chart data transformations</li>
                  <li>• useCallback for stable event handlers</li>
                  <li>• React.memo for pure components</li>
                  <li>• Reselect for derived Redux state</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  Throttling
                </h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• 500ms update interval for analytics</li>
                  <li>• Disabled chart animations</li>
                  <li>• Batched Redux dispatches</li>
                  <li>• Debounced user input handlers</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5 text-green-600" />
                  Memory Management
                </h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Sliding window (500 ticks max)</li>
                  <li>• Automatic old data pruning</li>
                  <li>• Selective component subscriptions</li>
                  <li>• Cleanup on unmount</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
          <CardContent className="pt-12 pb-12 text-center">
            <h2 className="text-4xl font-bold mb-4">See It In Action</h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Experience real-time analytics with intelligent update strategies and 
              production-grade performance optimizations.
            </p>
            <Link href="/dashboard-redux">
              <Button size="lg" variant="secondary" className="font-semibold">
                <Activity className="w-5 h-5 mr-2" />
                Open Live Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
