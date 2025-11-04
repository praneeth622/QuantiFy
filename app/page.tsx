'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Zap, 
  BarChart3, 
  Activity, 
  Database, 
  Shield,
  ArrowRight,
  CheckCircle2,
  Code2,
  Sparkles
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Navigation */}
      <nav className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                QuantiFy
              </span>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <Link href="/features">
                <Button variant="ghost">Features</Button>
              </Link>
              <Link href="/architecture">
                <Button variant="ghost">Architecture</Button>
              </Link>
              <Link href="/about">
                <Button variant="ghost">About</Button>
              </Link>
              <Link href="/dashboard">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Launch Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <Badge className="mb-4" variant="secondary">
            <Sparkles className="w-3 h-3 mr-1" />
            Real-Time Trading Analytics Platform
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Institutional-Grade
            <br />
            Market Analytics
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Stream, analyze, and visualize cryptocurrency market data in real-time with production-grade 
            Redux state management and WebSocket infrastructure.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full sm:w-auto">
                <Activity className="w-5 h-5 mr-2" />
                Live Dashboard
              </Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Learn More
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Zap, label: 'Real-Time Updates', value: '< 500ms latency' },
            { icon: Database, label: 'Sliding Window', value: '500 ticks buffered' },
            { icon: BarChart3, label: 'Timeframes', value: '7 intervals' },
            { icon: Shield, label: 'Redux State', value: '100% type-safe' },
          ].map((stat, i) => (
            <Card key={i} className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <stat.icon className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Powered by Modern Technology</h2>
          <p className="text-xl text-muted-foreground">
            Built with industry best practices and production-grade architecture
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Activity,
              title: 'Live Analytics Engine',
              description: 'Real-time z-score, VWAP, momentum, and correlation calculations with 500ms throttled updates.',
              features: ['Client-side computation', 'Memoized selectors', 'Smart re-rendering']
            },
            {
              icon: Database,
              title: 'Redux State Management',
              description: 'Single source of truth with normalized data structure and sliding window memory management.',
              features: ['Immutable updates', 'Time-travel debugging', 'Redux DevTools']
            },
            {
              icon: Zap,
              title: 'WebSocket Streaming',
              description: 'Persistent connections with automatic reconnection and message queueing.',
              features: ['Auto-reconnect logic', 'Tick batching', 'Message validation']
            },
            {
              icon: BarChart3,
              title: 'Multi-Timeframe Resampling',
              description: 'OHLCV candles generated for 1s, 1m, 5m, 15m, 1h, 4h, and 1d intervals.',
              features: ['Backend aggregation', 'Pandas-powered', 'Auto-cleanup']
            },
            {
              icon: Code2,
              title: 'Type-Safe Architecture',
              description: 'End-to-end TypeScript with strict mode and comprehensive type definitions.',
              features: ['Zero runtime errors', 'IDE autocomplete', 'Refactoring confidence']
            },
            {
              icon: Shield,
              title: 'Production Ready',
              description: 'Error boundaries, fallback states, and graceful degradation.',
              features: ['Offline support', 'Error recovery', 'Loading states']
            },
          ].map((feature, i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <feature.icon className="w-10 h-10 mb-3 text-blue-600" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feature.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
          <CardContent className="pt-12 pb-12 text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to Explore?</h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Experience institutional-grade market analytics with real-time data streaming and 
              interactive visualizations.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button size="lg" variant="secondary" className="font-semibold w-full sm:w-auto">
                  <Activity className="w-5 h-5 mr-2" />
                  Open Dashboard
                </Button>
              </Link>
              <Link href="/architecture">
                <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 w-full sm:w-auto">
                  View Architecture
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <span className="font-bold">QuantiFy</span>
              <Badge variant="outline">v1.0</Badge>
            </div>
            <div className="text-sm text-muted-foreground text-center md:text-right">
              Built with Next.js, Redux Toolkit, FastAPI, and WebSocket
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
