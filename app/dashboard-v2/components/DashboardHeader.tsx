"use client";

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboard } from '../context/DashboardContext';

export default function DashboardHeader() {
  const { refreshData, isLoading } = useDashboard();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          QuantiFy Dashboard
        </h1>
        <p className="text-gray-400 mt-1">Real-time Trading Analytics</p>
      </div>
      
      <Button
        onClick={refreshData}
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh Data
      </Button>
    </div>
  );
}
