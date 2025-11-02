/**
 * Control Panel Test Page
 * Demonstrates ControlPanel component usage
 */
'use client';

import { useState } from 'react';
import { ControlPanel, useControlPanel, type ControlPanelConfig } from '@/components/ControlPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function TestControlPanelPage() {
  const { config, setConfig } = useControlPanel({
    symbols: ['BTCUSDT', 'ETHUSDT'],
    timeframe: '1m',
    rollingWindow: 50,
  });

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const handleConfigChange = (newConfig: ControlPanelConfig) => {
    setConfig(newConfig);
    setLastUpdate(new Date());
    
    // Show toast notification
    toast.success('Configuration Updated', {
      description: `Updated to ${newConfig.symbols.join(', ')} @ ${newConfig.timeframe}`,
    });
  };

  const handleRefresh = () => {
    toast.info('Refreshing data...', {
      description: 'Fetching latest market data',
    });
    
    // Simulate refresh delay
    setTimeout(() => {
      toast.success('Data refreshed successfully');
      setLastUpdate(new Date());
    }, 1000);
  };

  const handleExport = (dateRange: { from: Date; to: Date }) => {
    const from = dateRange.from.toLocaleDateString();
    const to = dateRange.to.toLocaleDateString();
    
    toast.success('Exporting CSV', {
      description: `Date range: ${from} to ${to}`,
    });
    
    // Simulate CSV export
    console.log('Exporting CSV:', {
      symbols: config.symbols,
      timeframe: config.timeframe,
      dateRange,
      analytics: config.analytics,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Control Panel Test</h1>
          <p className="text-muted-foreground">Interactive control panel component</p>
        </div>
        <Badge>Test Environment</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Control Panel - Full Size */}
        <div className="lg:col-span-1">
          <ControlPanel
            config={config}
            onChange={handleConfigChange}
            onRefresh={handleRefresh}
            onExport={handleExport}
          />
        </div>

        {/* Configuration Display */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Current Configuration</CardTitle>
              <CardDescription>
                Live preview of control panel settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Symbols ({config.symbols.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {config.symbols.map((symbol) => (
                    <Badge key={symbol} variant="default">{symbol}</Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Timeframe</h3>
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    {config.timeframe}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Rolling Window</h3>
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    {config.rollingWindow} periods
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Analytics Enabled</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(config.analytics).map(([key, enabled]) => (
                    <Badge 
                      key={key} 
                      variant={enabled ? 'default' : 'outline'}
                      className="justify-center"
                    >
                      {key.charAt(0).toUpperCase() + key.slice(1)}: {enabled ? '✓' : '✗'}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Export Date Range</h3>
                <p className="text-sm text-muted-foreground">
                  From: {config.dateRange.from.toLocaleDateString()}
                  {' → '}
                  To: {config.dateRange.to.toLocaleDateString()}
                </p>
              </div>

              {lastUpdate && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Last updated: {lastUpdate.toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compact Version */}
          <Card>
            <CardHeader>
              <CardTitle>Compact Mode</CardTitle>
              <CardDescription>
                Minimal control panel for toolbar usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ControlPanel
                config={config}
                onChange={handleConfigChange}
                onRefresh={handleRefresh}
                compact
              />
            </CardContent>
          </Card>

          {/* JSON Output */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration JSON</CardTitle>
              <CardDescription>
                Raw configuration object
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(config, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Usage Example */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Example</CardTitle>
              <CardDescription>
                How to use the ControlPanel component
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`import { ControlPanel, useControlPanel } from '@/components/ControlPanel';

export default function Dashboard() {
  const { config, setConfig } = useControlPanel({
    symbols: ['BTCUSDT'],
    timeframe: '1m',
    rollingWindow: 50,
  });

  const handleRefresh = () => {
    // Fetch fresh data
    console.log('Refreshing data for:', config.symbols);
  };

  const handleExport = (dateRange) => {
    // Export CSV
    console.log('Exporting:', dateRange);
  };

  return (
    <ControlPanel
      config={config}
      onChange={setConfig}
      onRefresh={handleRefresh}
      onExport={handleExport}
    />
  );
}`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
