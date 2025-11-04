'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  ArrowLeft,
  Layers,
  Database,
  Zap,
  Activity,
  Shield,
  Code2,
  GitBranch,
  AlertCircle
} from 'lucide-react';

export default function ArchitecturePage() {
  const mermaidCode = `flowchart LR
  subgraph External[External Data]
    BINANCE["Binance WebSocket API"]
  end

  subgraph Backend[Backend - FastAPI]
    WS_MGR["WebSocket Manager / Ingestion"]
    INGESTION["Ingestion Validator & Queue"]
    DB[("DB: SQLite / Postgres / TimescaleDB")]
    RESAMPLER["Resampler (1s,1m,5m,...)"]
    ANALYTICS["Analytics Engine (zscore, corr, hedge)"]
    ALERTS["Alert Manager"]
    API["REST API / /docs"]
    WSS["WebSocket Broadcaster (clients)"]
  end

  subgraph Frontend[Frontend - Next.js + Redux]
    UI["React Dashboard"]
    WS_CLIENT["WebSocket Client (useWebSocketRedux)"]
    STORE["Redux Store (marketData, analytics, ui)"]
    CHARTS["Charts (Recharts)"]
    LIVE_ANALYTICS["Live Analytics Hook (500ms throttled)"]
  end

  BINANCE -->|live ticks| WS_MGR
  WS_MGR --> INGESTION
  INGESTION -->|store raw ticks| DB
  DB -->|historical queries| API
  DB --> RESAMPLER
  RESAMPLER -->|candles| DB
  RESAMPLER --> ANALYTICS
  ANALYTICS -->|metrics| DB
  ANALYTICS --> ALERTS
  ALERTS --> WSS
  WSS --> WS_CLIENT
  API --> UI
  WS_CLIENT -->|tick messages| STORE
  STORE --> CHARTS
  STORE --> LIVE_ANALYTICS
  LIVE_ANALYTICS --> STORE`;

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
          <Badge className="mb-4">Architecture & Design</Badge>
          <h1 className="text-5xl font-bold mb-6">
            Production-Grade Infrastructure
          </h1>
          <p className="text-xl text-muted-foreground">
            A comprehensive look at our system architecture, design decisions, and trade-offs.
          </p>
        </div>
      </section>

      {/* Architecture Diagram */}
      <section className="container mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <Layers className="w-10 h-10 text-blue-600 mb-2" />
            <CardTitle className="text-3xl">System Architecture Diagram</CardTitle>
            <CardDescription className="text-base">
              Real-time data flow from ingestion to visualization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-6 overflow-x-auto">
              <img 
                src="/architecture.svg" 
                alt="QuantiFy Architecture" 
                className="max-w-full h-auto mx-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden text-center text-muted-foreground py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                <p>Architecture diagram not found. View Mermaid code below.</p>
              </div>
            </div>

            <Card className="bg-muted/50">
              <CardHeader>
                <Code2 className="w-6 h-6 mb-2" />
                <CardTitle className="text-xl">Mermaid Diagram Code</CardTitle>
                <CardDescription>
                  Copy this code and paste it into <a href="https://mermaid.live/" target="_blank" rel="noopener" className="text-blue-600 hover:underline">mermaid.live</a> to generate a high-res PNG/SVG
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-slate-950 dark:bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                  {mermaidCode}
                </pre>
                <Button 
                  className="mt-4" 
                  onClick={() => {
                    navigator.clipboard.writeText(mermaidCode);
                    alert('Mermaid code copied to clipboard!');
                  }}
                >
                  Copy Mermaid Code
                </Button>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </section>

      {/* Component Breakdown */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-6 text-center">Component Breakdown</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Backend */}
          <Card>
            <CardHeader>
              <Database className="w-10 h-10 text-purple-600 mb-2" />
              <CardTitle className="text-2xl">Backend Services (FastAPI)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">WebSocket Manager</h4>
                <p className="text-sm text-muted-foreground">
                  Maintains persistent connections to Binance API. Handles reconnection logic, rate limiting, and multi-symbol subscriptions.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Data Ingestion Service</h4>
                <p className="text-sm text-muted-foreground">
                  Validates and stores raw tick data with microsecond timestamps. Async database writes prevent blocking.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Resampler Service</h4>
                <p className="text-sm text-muted-foreground">
                  Aggregates ticks into OHLCV candles every 10 seconds using pandas. Supports 7 timeframes (1s-1d).
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Analytics Engine</h4>
                <p className="text-sm text-muted-foreground">
                  Computes statistical metrics: correlation, hedge ratios, z-scores, ADF tests. Runs periodically or on-demand.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Alert Manager</h4>
                <p className="text-sm text-muted-foreground">
                  Monitors conditions every 5 seconds. Triggers notifications with configurable cooldowns to prevent spam.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Frontend */}
          <Card>
            <CardHeader>
              <Activity className="w-10 h-10 text-blue-600 mb-2" />
              <CardTitle className="text-2xl">Frontend Components (Next.js)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">React Dashboard</h4>
                <p className="text-sm text-muted-foreground">
                  Main trading interface with multi-panel layout. Symbol selector, timeframe switcher, and control panel.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">WebSocket Client Hook</h4>
                <p className="text-sm text-muted-foreground">
                  Custom React hook (<code className="text-xs bg-muted px-1">useWebSocketRedux</code>) for real-time data subscription. Auto-connects and routes messages to Redux.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Redux Store</h4>
                <p className="text-sm text-muted-foreground">
                  Single source of truth with 4 slices: marketData, analytics, ui, websocket. Redux DevTools for time-travel debugging.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Chart Components</h4>
                <p className="text-sm text-muted-foreground">
                  PriceChart, VolumeChart, SpreadChart, CorrelationChart built with Recharts. Memoized for performance.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Live Analytics Hook</h4>
                <p className="text-sm text-muted-foreground">
                  Throttled 500ms updates for tick-based metrics. Computes z-score, VWAP, momentum from Redux sliding window.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Design Decisions */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-6 text-center">Design Decisions & Trade-offs</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              icon: Zap,
              title: 'Client vs Server Analytics',
              decision: 'Hybrid Approach',
              description: 'Tick-level metrics (z-score, VWAP) computed client-side for low latency. Heavy analytics (correlation, hedge ratios) run server-side to reduce client load.',
              tradeoff: 'Client CPU usage vs network latency'
            },
            {
              icon: Database,
              title: 'In-Memory vs Persistent Storage',
              decision: 'Sliding Window + Database',
              description: 'Keep last 500 ticks in memory for instant access. Store all data in database for historical queries and long-term analysis.',
              tradeoff: 'Memory usage vs query performance'
            },
            {
              icon: GitBranch,
              title: 'WebSocket vs Polling',
              decision: 'WebSocket with Polling Fallback',
              description: 'Primary: WebSocket for real-time streaming. Fallback: HTTP polling when WebSocket unavailable (corporate firewalls).',
              tradeoff: 'Connection complexity vs reliability'
            },
            {
              icon: Shield,
              title: 'SQLite vs PostgreSQL',
              description: 'Development: SQLite for zero config. Production: PostgreSQL/TimescaleDB for horizontal scaling and time-series optimizations.',
              tradeoff: 'Setup simplicity vs production scalability'
            }
          ].map((item, i) => (
            <Card key={i}>
              <CardHeader>
                <item.icon className="w-8 h-8 text-blue-600 mb-2" />
                <CardTitle>{item.title}</CardTitle>
                {item.decision && <Badge className="w-fit">{item.decision}</Badge>}
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{item.description}</p>
                {item.tradeoff && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded p-3">
                    <p className="text-xs font-semibold text-yellow-900 dark:text-yellow-200">
                      Trade-off: {item.tradeoff}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Extensibility */}
      <section className="container mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <GitBranch className="w-10 h-10 text-green-600 mb-2" />
            <CardTitle className="text-3xl">Extensibility & Future Scaling</CardTitle>
            <CardDescription className="text-base">
              How the architecture supports growth and new features
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Adding New Exchanges</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Modular ingestion layer allows plugging in new exchange APIs without modifying core logic.
              </p>
              <code className="text-xs bg-muted px-2 py-1 rounded block">
                class BinanceIngestion<br/>
                class CoinbaseIngestion<br/>
                class KrakenIngestion
              </code>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Horizontal Scaling</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Use message brokers (Redis/RabbitMQ) to distribute ingestion across multiple workers.
              </p>
              <code className="text-xs bg-muted px-2 py-1 rounded block">
                Worker 1: BTC, ETH<br/>
                Worker 2: ADA, SOL<br/>
                Worker 3: DOT, ...
              </code>
            </div>
            <div>
              <h4 className="font-semibold mb-3">New Analytics</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Add new analytics modules by extending the AnalyticsEngine interface.
              </p>
              <code className="text-xs bg-muted px-2 py-1 rounded block">
                class KalmanFilter<br/>
                class HiddenMarkov<br/>
                class LSTM
              </code>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
          <CardContent className="pt-12 pb-12 text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to Dive Deeper?</h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Explore the implementation details in our comprehensive README and source code.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/about">
                <Button size="lg" variant="secondary" className="font-semibold">
                  About This Project
                </Button>
              </Link>
              <Link href="/dashboard-redux">
                <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                  Launch Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
