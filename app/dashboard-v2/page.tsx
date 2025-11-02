"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardHeader from './components/DashboardHeader';
import SymbolSelector from './components/SymbolSelector';
import TimeframeSelector from './components/TimeframeSelector';
import PriceChart from './components/PriceChart';
import VolumeChart from './components/VolumeChart';
import TicksTable from './components/TicksTable';
import AlertsPanel from './components/AlertsPanel';
import StatsPanel from './components/StatsPanel';
import { DashboardProvider, useDashboard } from './context/DashboardContext';

/**
 * Main Dashboard Content Component
 */
function DashboardContent() {
  const { selectedSymbol, timeframe, isLoading } = useDashboard();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <DashboardHeader />

        {/* Controls Row */}
        <Card className="bg-gray-800/50 border-gray-700 p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <SymbolSelector />
            <TimeframeSelector />
          </div>
        </Card>

        {/* Stats Panel */}
        <StatsPanel />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-gray-800/50 border border-gray-700">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ticks">Recent Ticks</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Price Chart */}
              <Card className="bg-gray-800/50 border-gray-700 p-4">
                <h3 className="text-lg font-semibold mb-4">Price Chart - {selectedSymbol}</h3>
                <PriceChart />
              </Card>

              {/* Volume Chart */}
              <Card className="bg-gray-800/50 border-gray-700 p-4">
                <h3 className="text-lg font-semibold mb-4">Volume Chart</h3>
                <VolumeChart />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ticks">
            <Card className="bg-gray-800/50 border-gray-700 p-4">
              <h3 className="text-lg font-semibold mb-4">Recent Ticks - {selectedSymbol}</h3>
              <TicksTable />
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/**
 * Main Dashboard Page with Context Provider
 */
export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}
