/**
 * Alert System Test Page
 * Demonstrates AlertDialog functionality with simulated alert triggers
 */
'use client';

import { useState, useEffect } from 'react';
import { AlertDialog } from '@/components/AlertDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Zap, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

export default function AlertTestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentZScore, setCurrentZScore] = useState<number>(0);

  // Add test result to log
  const addTestResult = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, `[${timestamp}] ${message}`]);
    
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else {
      toast.info(message);
    }
  };

  // ============================================================================
  // TEST SCENARIO: Create BTCUSDT Z-Score > 2 Alert
  // ============================================================================

  const runTestScenario = async () => {
    setIsSimulating(true);
    setTestResults([]);

    try {
      addTestResult('🚀 Starting Alert Test Scenario', 'info');

      // Step 1: Create the alert
      addTestResult('Step 1: Creating alert "BTCUSDT z-score > 2"', 'info');
      
      const alertResponse = await axios.post('http://localhost:8000/api/alerts', {
        symbol: 'BTCUSDT',
        condition: 'zscore_above',
        threshold: 2.0,
        alert_type: 'price',
        severity: 'High',
        message: 'BTCUSDT z-score exceeded threshold - potential trading opportunity',
      });

      const alertId = alertResponse.data.id;
      addTestResult(`✅ Alert created successfully (ID: ${alertId})`, 'success');

      // Step 2: Wait for alert manager to pick up the alert
      addTestResult('Step 2: Waiting for alert manager to activate alert (5 seconds)...', 'info');
      await sleep(5000);

      // Step 3: Simulate z-score increasing
      addTestResult('Step 3: Simulating z-score conditions...', 'info');
      
      // Simulate z-score values
      const zScores = [0.5, 1.0, 1.5, 1.8, 2.1, 2.3, 2.5];
      
      for (const zScore of zScores) {
        setCurrentZScore(zScore);
        addTestResult(`   Current z-score: ${zScore.toFixed(2)}`, 'info');
        
        if (zScore > 2.0) {
          addTestResult(`   ⚠️  Z-score ${zScore.toFixed(2)} exceeds threshold 2.0`, 'info');
          addTestResult('   Alert should trigger within 5 seconds...', 'info');
        }
        
        await sleep(2000);
      }

      // Step 4: Check alert history
      addTestResult('Step 4: Checking if alert was triggered...', 'info');
      await sleep(6000); // Wait for alert manager check cycle

      const alertsResponse = await axios.get('http://localhost:8000/api/alerts');
      const triggeredAlert = alertsResponse.data.alerts.find((a: any) => a.id === alertId);

      if (triggeredAlert && triggeredAlert.trigger_count > 0) {
        addTestResult(
          `✅ SUCCESS! Alert triggered ${triggeredAlert.trigger_count}x`,
          'success'
        );
        addTestResult(
          `   Last triggered: ${new Date(triggeredAlert.last_triggered).toLocaleString()}`,
          'success'
        );
      } else {
        addTestResult('⚠️  Alert not yet triggered - may need to wait longer', 'info');
        addTestResult('   Note: Alert manager checks conditions every 5 seconds', 'info');
      }

      // Step 5: Cleanup
      addTestResult('Step 5: Cleaning up test alert...', 'info');
      await axios.delete(`http://localhost:8000/api/alerts/${alertId}`);
      addTestResult('✅ Test alert deleted', 'success');

      addTestResult('', 'info');
      addTestResult('🎉 Test scenario completed!', 'success');

    } catch (error: any) {
      console.error('Test scenario error:', error);
      addTestResult(`❌ Error: ${error.message}`, 'error');
      addTestResult(`   ${error.response?.data?.detail || 'Unknown error'}`, 'error');
    } finally {
      setIsSimulating(false);
      setCurrentZScore(0);
    }
  };

  // Helper function
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // ============================================================================
  // MANUAL TEST FUNCTIONS
  // ============================================================================

  const createTestAlert = async () => {
    try {
      const response = await axios.post('http://localhost:8000/api/alerts', {
        symbol: 'BTCUSDT',
        condition: 'zscore_above',
        threshold: 2.0,
        alert_type: 'price',
        severity: 'High',
        message: 'Test alert for demonstration',
      });

      toast.success('Test Alert Created', {
        description: `Alert ID: ${response.data.id}`,
      });
    } catch (error) {
      toast.error('Failed to create test alert');
    }
  };

  const simulateAlertTrigger = () => {
    // Manually trigger a toast to simulate alert
    toast.warning('Alert Triggered!', {
      description: 'BTCUSDT: Z-score exceeded threshold of 2.0',
      icon: <AlertTriangle className="h-5 w-5" />,
      duration: 10000,
      action: {
        label: 'View',
        onClick: () => toast.info('Opening alerts panel...'),
      },
    });
  };

  const checkBackendStatus = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/symbols');
      addTestResult(`✅ Backend is running - ${response.data.length} symbols available`, 'success');
    } catch (error) {
      addTestResult('❌ Backend not responding - Make sure it\'s running on port 8000', 'error');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bell className="h-8 w-8" />
          Alert System Test Page
        </h1>
        <p className="text-muted-foreground">
          Test and demonstrate the AlertDialog component with real-time notifications
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Alert Dialog */}
        <div className="space-y-6">
          <AlertDialog
            availableSymbols={['BTCUSDT', 'ETHUSDT', 'TESTBTC', 'ADAUSDT', 'SOLUSDT']}
            onAlertTriggered={(alert) => {
              addTestResult(
                `🔔 Alert triggered: ${alert.symbol} ${alert.condition} ${alert.threshold}`,
                'success'
              );
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Manual Tests
              </CardTitle>
              <CardDescription>
                Quick actions to test alert functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={createTestAlert}
                variant="outline"
                className="w-full justify-start"
              >
                <Bell className="h-4 w-4 mr-2" />
                Create Test Alert (BTCUSDT z-score &gt; 2)
              </Button>
              
              <Button
                onClick={simulateAlertTrigger}
                variant="outline"
                className="w-full justify-start"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Simulate Alert Trigger (Toast)
              </Button>
              
              <Button
                onClick={checkBackendStatus}
                variant="outline"
                className="w-full justify-start"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Check Backend Status
              </Button>
            </CardContent>
          </Card>

          {/* Current Z-Score Display */}
          {isSimulating && (
            <Card className="border-2 border-orange-500">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Current Z-Score</p>
                  <p className="text-4xl font-bold">
                    {currentZScore.toFixed(2)}
                  </p>
                  <Badge 
                    variant={currentZScore > 2 ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {currentZScore > 2 ? 'Above Threshold' : 'Below Threshold'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Test Scenario */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Automated Test Scenario
              </CardTitle>
              <CardDescription>
                Run a complete test of alert creation, triggering, and notification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="font-semibold">Test Steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Create alert: "BTCUSDT z-score &gt; 2"</li>
                  <li>Wait for alert manager to activate</li>
                  <li>Simulate z-score increasing from 0.5 to 2.5</li>
                  <li>Verify alert triggers when z-score &gt; 2</li>
                  <li>Check alert history and trigger count</li>
                  <li>Clean up test alert</li>
                </ol>
              </div>

              <Button
                onClick={runTestScenario}
                disabled={isSimulating}
                className="w-full"
                size="lg"
              >
                {isSimulating ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Running Test...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Run Test Scenario
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Test Results Log */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Test Results Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs h-[400px] overflow-y-auto">
                {testResults.length === 0 ? (
                  <p className="text-gray-500">No test results yet. Run a test to see output.</p>
                ) : (
                  testResults.map((result, index) => (
                    <div key={index} className="mb-1">
                      {result}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Instructions */}
      <Card className="border-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-500" />
            Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-semibold mb-1">Prerequisites:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Backend must be running on <code className="bg-muted px-1 rounded">http://localhost:8000</code></li>
              <li>Alert manager should be active (checks every 5 seconds)</li>
              <li>WebSocket connection should be established</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1">What to Expect:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Toast notifications appear in top-right corner when alerts trigger</li>
              <li>Active alerts list updates automatically via WebSocket</li>
              <li>Alert trigger counts increment when conditions are met</li>
              <li>60-second cooldown prevents spam notifications</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1">Manual Testing:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Click "Create Alert" to open the dialog</li>
              <li>Select symbol, condition, and threshold</li>
              <li>Submit the form to create an alert</li>
              <li>Use "Simulate Alert Trigger" to see toast notification</li>
              <li>Check the active alerts list to see your created alerts</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
