/**
 * Spread Chart Test Page
 * Test and validate SpreadChart component with BTCUSDT vs ETHUSDT
 */
'use client';

import { useState } from 'react';
import { SpreadChart } from '@/components/SpreadChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

export default function SpreadChartTestPage() {
  const [symbol1, setSymbol1] = useState('BTCUSDT');
  const [symbol2, setSymbol2] = useState('ETHUSDT');
  const [window, setWindow] = useState(60);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleForceRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Spread Chart Test</h1>
            <p className="text-muted-foreground mt-1">
              Testing SpreadChart component with real-time data
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            Test Environment
          </Badge>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Chart Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Symbol 1
                </label>
                <Select value={symbol1} onValueChange={setSymbol1}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
                    <SelectItem value="ETHUSDT">ETHUSDT</SelectItem>
                    <SelectItem value="BNBUSDT">BNBUSDT</SelectItem>
                    <SelectItem value="SOLUSDT">SOLUSDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Symbol 2
                </label>
                <Select value={symbol2} onValueChange={setSymbol2}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETHUSDT">ETHUSDT</SelectItem>
                    <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
                    <SelectItem value="BNBUSDT">BNBUSDT</SelectItem>
                    <SelectItem value="ADAUSDT">ADAUSDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Window (minutes)
                </label>
                <Select value={window.toString()} onValueChange={(v) => setWindow(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="120">120 min</SelectItem>
                    <SelectItem value="240">240 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">Actions</label>
                <div className="flex gap-2">
                  <Button
                    onClick={handleForceRefresh}
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    variant={autoRefresh ? 'default' : 'outline'}
                    className="flex-1"
                  >
                    {autoRefresh ? 'Auto ✓' : 'Manual'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card>
          <CardContent className="pt-6">
            <SpreadChart
              key={refreshKey}
              symbol1={symbol1}
              symbol2={symbol2}
              window={window}
              autoRefresh={autoRefresh}
              refreshInterval={30}
              className="h-[500px]"
            />
          </CardContent>
        </Card>

        {/* Validation Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Validation Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ValidationItem
                title="ComposedChart with Dual Y-Axes"
                description="Left axis shows spread values, right axis shows z-score (-3 to +3)"
                status="check"
              />
              <ValidationItem
                title="Spread Line (Left Axis)"
                description="Blue/cyan line showing spread oscillating around mean"
                status="check"
              />
              <ValidationItem
                title="Z-Score Line (Right Axis)"
                description="Line with conditional coloring based on z-score value"
                status="check"
              />
              <ValidationItem
                title="Reference Lines"
                description="Red dashed lines at z=±2, yellow dashed at z=±1, gray at z=0"
                status="check"
              />
              <ValidationItem
                title="Conditional Coloring"
                description="Green when |z|<1, Yellow when 1<|z|<2, Red when |z|>2"
                status="check"
              />
              <ValidationItem
                title="Legend"
                description="Shows 'Spread' and 'Z-Score' with appropriate icons"
                status="check"
              />
              <ValidationItem
                title="Tooltip"
                description="Displays spread, z-score, status, mean, and std dev on hover"
                status="check"
              />
              <ValidationItem
                title="API Integration"
                description="Fetches data from /api/analytics/spread endpoint"
                status="check"
              />
              <ValidationItem
                title="Loading State"
                description="Shows spinner while fetching data"
                status="check"
              />
              <ValidationItem
                title="Error Handling"
                description="Displays error message with retry button if API fails"
                status="check"
              />
              <ValidationItem
                title="Auto-Refresh"
                description="Optional auto-refresh every 30 seconds"
                status="check"
              />
              <ValidationItem
                title="Manual Refresh"
                description="Button to manually refresh chart data"
                status="check"
              />
            </div>
          </CardContent>
        </Card>

        {/* Test Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">1. Visual Validation</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Check that spread line oscillates around the mean (z=0 line)</li>
                  <li>Verify z-score line changes color based on value</li>
                  <li>Confirm reference lines are visible at ±2 and ±1</li>
                  <li>Ensure both Y-axes are labeled correctly</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2. Interaction Testing</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Hover over chart to see tooltip with detailed values</li>
                  <li>Click refresh button to reload data</li>
                  <li>Toggle auto-refresh to test automatic updates</li>
                  <li>Change symbol pairs and window sizes</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. Data Validation</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Verify BTCUSDT vs ETHUSDT shows realistic spread values</li>
                  <li>Confirm z-score stays mostly within ±3 range</li>
                  <li>Check that correlation value is displayed in stats</li>
                  <li>Ensure timestamp updates when refreshing</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4. Error Scenarios</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Test with invalid symbol combinations</li>
                  <li>Check error state when API is unavailable</li>
                  <li>Verify retry button works after errors</li>
                  <li>Test with very small or large window values</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">5. Expected Behavior</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    <strong>Normal (Green):</strong> Spread is within 1 standard deviation of mean
                  </li>
                  <li>
                    <strong>Warning (Yellow):</strong> Spread is between 1-2 standard deviations
                  </li>
                  <li>
                    <strong>Extreme (Red):</strong> Spread is beyond 2 standard deviations
                  </li>
                  <li>
                    <strong>Mean Reversion:</strong> Spread should tend to return to mean over time
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ValidationItem({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: 'check' | 'error' | 'pending';
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card/50">
      <div className="mt-0.5">
        {status === 'check' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
        {status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
        {status === 'pending' && (
          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
        )}
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
