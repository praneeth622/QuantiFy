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
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 p-8">
        <div className="text-center text-gray-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No alerts configured</p>
        </div>
      </Card>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'bg-red-600';
      case 'medium':
        return 'bg-orange-600';
      case 'low':
        return 'bg-yellow-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {alerts.map((alert) => (
        <Card key={alert.id} className="bg-gray-800/50 border-gray-700 p-4 hover:bg-gray-800/70 transition-colors">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <span className="font-semibold text-white">{alert.symbol}</span>
              </div>
              <Badge className={`${getSeverityColor(alert.severity)} text-white`}>
                {alert.severity}
              </Badge>
            </div>

            {/* Message */}
            <p className="text-sm text-gray-300">{alert.message}</p>

            {/* Details */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Target className="w-4 h-4" />
                <span>Threshold: {alert.threshold}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <TrendingUp className="w-4 h-4" />
                <span>Triggers: {alert.trigger_count}</span>
              </div>
            </div>

            {/* Timestamps */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-700">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Created: {new Date(alert.created_at).toLocaleDateString()}</span>
              </div>
              {alert.last_triggered && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Last: {new Date(alert.last_triggered).toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            {/* Additional Info */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                {alert.alert_type}
              </Badge>
              <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                {alert.condition}
              </Badge>
              {alert.strategy_name && (
                <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                  {alert.strategy_name}
                </Badge>
              )}
              <Badge 
                variant="outline" 
                className={`text-xs ${alert.is_active ? 'border-green-600 text-green-400' : 'border-gray-600 text-gray-400'}`}
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
