"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboard } from '../context/DashboardContext';
import { AlertTriangle, Clock, Target, TrendingUp, Loader2 } from 'lucide-react';

export default function AlertsPanel() {
  const { alerts, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="bg-card border-border p-8">
        <div className="text-center text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-sans">No alerts configured</p>
        </div>
      </Card>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'medium':
        return 'bg-chart-4 text-foreground';
      case 'low':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {alerts.map((alert) => (
        <Card key={alert.id} className="bg-card border-border p-4 hover:bg-accent/5 transition-colors">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-accent" />
                <span className="font-semibold text-foreground font-sans">{alert.symbol}</span>
              </div>
              <Badge className={`${getSeverityColor(alert.severity)} font-sans`}>
                {alert.severity}
              </Badge>
            </div>

            {/* Message */}
            <p className="text-sm text-muted-foreground font-sans">{alert.message}</p>

            {/* Details */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground font-sans">
                <Target className="w-4 h-4" />
                <span>Threshold: {alert.threshold}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground font-sans">
                <TrendingUp className="w-4 h-4" />
                <span>Triggers: {alert.trigger_count}</span>
              </div>
            </div>

            {/* Timestamps */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="font-sans">Created: {new Date(alert.created_at).toLocaleDateString()}</span>
              </div>
              {alert.last_triggered && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span className="font-sans">Last: {new Date(alert.last_triggered).toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            {/* Additional Info */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs border-border text-muted-foreground font-sans">
                {alert.alert_type}
              </Badge>
              <Badge variant="outline" className="text-xs border-border text-muted-foreground font-sans">
                {alert.condition}
              </Badge>
              {alert.strategy_name && (
                <Badge variant="outline" className="text-xs border-border text-muted-foreground font-sans">
                  {alert.strategy_name}
                </Badge>
              )}
              <Badge 
                variant="outline" 
                className={`text-xs font-sans ${alert.is_active ? 'border-chart-5 text-chart-5' : 'border-border text-muted-foreground'}`}
              >
                {alert.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
