/**
 * AlertDialog Component
 * Comprehensive alert management system with:
 * - Create alerts with Symbol, Condition, Threshold
 * - List of active alerts
 * - Delete functionality
 * - Toast notifications
 * - React Hook Form + Zod validation
 */
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Trash2, Loader2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import axios from 'axios';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const alertSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  condition: z.string().min(1, 'Condition is required'),
  threshold: z.coerce.number().min(0, 'Threshold must be positive'),
  alertType: z.string().default('price'),
  severity: z.string().default('Medium'),
  message: z.string().optional(),
});

type AlertFormData = z.infer<typeof alertSchema>;

interface Alert {
  id: number;
  symbol: string;
  condition: string;
  threshold: number;
  is_active: boolean;
  created_at: string;
  alert_type: string;
  severity: string;
  message?: string;
  last_triggered?: string;
  trigger_count: number;
}

interface AlertDialogProps {
  availableSymbols?: string[];
  onAlertTriggered?: (alert: Alert) => void;
}

// ============================================================================
// ALERT CONDITIONS
// ============================================================================

const ALERT_CONDITIONS = [
  { value: 'zscore_above', label: 'Z-Score >', icon: TrendingUp },
  { value: 'zscore_below', label: 'Z-Score <', icon: TrendingDown },
  { value: 'price_above', label: 'Price Above', icon: TrendingUp },
  { value: 'price_below', label: 'Price Below', icon: TrendingDown },
  { value: 'above', label: 'Value >', icon: TrendingUp },
  { value: 'below', label: 'Value <', icon: TrendingDown },
];

const ALERT_SEVERITIES = [
  { value: 'Low', color: 'bg-blue-500' },
  { value: 'Medium', color: 'bg-yellow-500' },
  { value: 'High', color: 'bg-orange-500' },
  { value: 'Critical', color: 'bg-red-500' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AlertDialog({ 
  availableSymbols = ['BTCUSDT', 'ETHUSDT', 'TESTBTC', 'ADAUSDT', 'SOLUSDT'],
  onAlertTriggered
}: AlertDialogProps) {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      symbol: 'BTCUSDT',
      condition: 'zscore_above',
      threshold: 2,
      alertType: 'price',
      severity: 'Medium',
    },
  });

  const selectedCondition = watch('condition');
  const selectedSymbol = watch('symbol');

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('http://localhost:8000/api/alerts', {
        params: { limit: 100 }
      });
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Failed to fetch alerts');
    } finally {
      setIsLoading(false);
    }
  };

  const createAlert = async (data: AlertFormData) => {
    try {
      const response = await axios.post('http://localhost:8000/api/alerts', {
        symbol: data.symbol,
        condition: data.condition,
        threshold: data.threshold,
        alert_type: data.alertType,
        severity: data.severity,
        message: data.message || `${data.symbol} ${data.condition} ${data.threshold}`,
      });

      const newAlert = response.data;
      
      toast.success('Alert Created', {
        description: `${newAlert.symbol} ${newAlert.condition} ${newAlert.threshold}`,
        icon: <Bell className="h-4 w-4" />,
      });

      // Refresh alerts list
      await fetchAlerts();
      
      // Reset form and close dialog
      reset();
      setOpen(false);
    } catch (error: any) {
      console.error('Error creating alert:', error);
      toast.error('Failed to Create Alert', {
        description: error.response?.data?.detail || 'An error occurred',
      });
      throw error;
    }
  };

  const deleteAlert = async (alertId: number) => {
    try {
      setIsDeleting(alertId);
      await axios.delete(`http://localhost:8000/api/alerts/${alertId}`);
      
      toast.success('Alert Deleted', {
        description: 'Alert removed successfully',
      });

      // Remove from local state
      setAlerts(alerts.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error('Failed to Delete Alert');
    } finally {
      setIsDeleting(null);
    }
  };

  // ============================================================================
  // WEBSOCKET MONITORING (for alert triggers)
  // ============================================================================

  useEffect(() => {
    // Connect to WebSocket to receive alert notifications
    const ws = new WebSocket('ws://localhost:8000/ws');

    ws.onopen = () => {
      console.log('[AlertDialog] WebSocket connected for alert monitoring');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Check for alert trigger messages
        if (message.type === 'alert_triggered') {
          const alertData = message.data;
          
          // Show toast notification
          toast.warning(`Alert Triggered!`, {
            description: `${alertData.symbol}: ${alertData.message}`,
            icon: <AlertTriangle className="h-5 w-5" />,
            duration: 10000,
            action: {
              label: 'View',
              onClick: () => {
                // Refresh alerts to show updated trigger count
                fetchAlerts();
              },
            },
          });

          // Call callback if provided
          if (onAlertTriggered) {
            onAlertTriggered(alertData);
          }

          // Refresh alerts list to update trigger counts
          fetchAlerts();
        }
      } catch (error) {
        console.error('[AlertDialog] Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[AlertDialog] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[AlertDialog] WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [onAlertTriggered]);

  // Fetch alerts on mount and when dialog opens
  useEffect(() => {
    if (open) {
      fetchAlerts();
    }
  }, [open]);

  // Initial fetch
  useEffect(() => {
    fetchAlerts();
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Create Alert Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Bell className="h-4 w-4" />
            Create Alert
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Create New Alert
            </DialogTitle>
            <DialogDescription>
              Set up an alert for specific trading conditions. You'll be notified when conditions are met.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(createAlert)} className="space-y-4">
            {/* Symbol Selection */}
            <div className="space-y-2">
              <Label htmlFor="symbol">Trading Symbol</Label>
              <Select
                value={selectedSymbol}
                onValueChange={(value) => setValue('symbol', value)}
              >
                <SelectTrigger id="symbol">
                  <SelectValue placeholder="Select symbol" />
                </SelectTrigger>
                <SelectContent>
                  {availableSymbols.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.symbol && (
                <p className="text-sm text-red-500">{errors.symbol.message}</p>
              )}
            </div>

            {/* Condition Selection */}
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select
                value={selectedCondition}
                onValueChange={(value) => setValue('condition', value)}
              >
                <SelectTrigger id="condition">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_CONDITIONS.map((condition) => {
                    const Icon = condition.icon;
                    return (
                      <SelectItem key={condition.value} value={condition.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {condition.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.condition && (
                <p className="text-sm text-red-500">{errors.condition.message}</p>
              )}
            </div>

            {/* Threshold Input */}
            <div className="space-y-2">
              <Label htmlFor="threshold">Threshold Value</Label>
              <Input
                id="threshold"
                type="number"
                step="0.01"
                placeholder="e.g., 2.0"
                {...register('threshold')}
              />
              {errors.threshold && (
                <p className="text-sm text-red-500">{errors.threshold.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {selectedCondition === 'zscore_above' && 'Alert when z-score exceeds this value'}
                {selectedCondition === 'zscore_below' && 'Alert when z-score falls below this value'}
                {selectedCondition === 'price_above' && 'Alert when price rises above this value'}
                {selectedCondition === 'price_below' && 'Alert when price falls below this value'}
                {selectedCondition === 'above' && 'Alert when value exceeds threshold'}
                {selectedCondition === 'below' && 'Alert when value falls below threshold'}
              </p>
            </div>

            {/* Severity Selection */}
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                defaultValue="Medium"
                onValueChange={(value) => setValue('severity', value)}
              >
                <SelectTrigger id="severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_SEVERITIES.map((severity) => (
                    <SelectItem key={severity.value} value={severity.value}>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${severity.color}`} />
                        {severity.value}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Optional Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Custom Message (Optional)</Label>
              <Input
                id="message"
                placeholder="e.g., High volatility detected"
                {...register('message')}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Add Alert
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Active Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Active Alerts ({alerts.length})
            </span>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No active alerts</p>
              <p className="text-sm">Create an alert to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const severityColor = ALERT_SEVERITIES.find(
                  s => s.value === alert.severity
                )?.color || 'bg-gray-500';

                return (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {alert.symbol}
                        </Badge>
                        <Badge variant="secondary">
                          {alert.condition}
                        </Badge>
                        <span className="text-sm font-semibold">
                          {alert.threshold}
                        </span>
                        <div className={`h-2 w-2 rounded-full ${severityColor}`} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          Created: {new Date(alert.created_at).toLocaleString()}
                        </span>
                        {alert.trigger_count > 0 && (
                          <span className="text-orange-500 font-semibold">
                            Triggered {alert.trigger_count}x
                          </span>
                        )}
                        {alert.last_triggered && (
                          <span>
                            Last: {new Date(alert.last_triggered).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {alert.message && (
                        <p className="text-sm text-muted-foreground">
                          {alert.message}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAlert(alert.id)}
                      disabled={isDeleting === alert.id}
                    >
                      {isDeleting === alert.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-500" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
