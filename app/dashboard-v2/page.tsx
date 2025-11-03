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
import StatsTable from './components/StatsTable';
import CorrelationHeatmap from './components/CorrelationHeatmap';
import { DashboardProvider, useDashboard } from './context/DashboardContext';

/**
 * Main Dashboard Content Component
 */
function DashboardContent() {
  const { selectedSymbol, timeframe, isLoading } = useDashboard();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 text-foreground p-6 font-sans">
      <div className="max-w-[1920px] mx-auto space-y-6">
        {/* Header */}
        <div className="animate-in fade-in slide-in-from-top-4 duration-700">
          <DashboardHeader />
        </div>

        {/* Controls Row - Glassmorphism Style */}
        <div className="animate-in fade-in slide-in-from-top-5 duration-700 delay-100">
          <Card className="bg-card/80 backdrop-blur-xl border-border/50 p-6 shadow-2xl hover:shadow-accent/20 transition-all duration-300">
            <div className="flex flex-wrap gap-4 items-center">
              <SymbolSelector />
              <TimeframeSelector />
            </div>
          </Card>
        </div>

        {/* Stats Panel with Enhanced Shadow */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <StatsPanel />
        </div>

        {/* Main Content Tabs */}
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-card/90 backdrop-blur-lg border border-border/50 shadow-xl p-1.5 rounded-xl">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-accent data-[state=active]:to-accent/80 data-[state=active]:text-accent-foreground transition-all duration-300 rounded-lg px-6 py-2.5"
              >
                📊 Overview
              </TabsTrigger>
              <TabsTrigger 
                value="stats"
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-accent data-[state=active]:to-accent/80 data-[state=active]:text-accent-foreground transition-all duration-300 rounded-lg px-6 py-2.5"
              >
                📈 Statistics
              </TabsTrigger>
              <TabsTrigger 
                value="correlation"
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-accent data-[state=active]:to-accent/80 data-[state=active]:text-accent-foreground transition-all duration-300 rounded-lg px-6 py-2.5"
              >
                🔗 Correlation
              </TabsTrigger>
              <TabsTrigger 
                value="ticks"
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-accent data-[state=active]:to-accent/80 data-[state=active]:text-accent-foreground transition-all duration-300 rounded-lg px-6 py-2.5"
              >
                ⚡ Live Ticks
              </TabsTrigger>
              <TabsTrigger 
                value="alerts"
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-accent data-[state=active]:to-accent/80 data-[state=active]:text-accent-foreground transition-all duration-300 rounded-lg px-6 py-2.5"
              >
                🔔 Alerts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Price Chart - Larger Card */}
                <Card className="xl:col-span-2 bg-card/80 backdrop-blur-xl border-border/50 p-6 shadow-2xl hover:shadow-accent/20 transition-all duration-500 group">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-8 bg-gradient-to-b from-accent to-accent/50 rounded-full group-hover:h-10 transition-all duration-300"></div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Price Chart - {selectedSymbol}
                    </h3>
                  </div>
                  <PriceChart />
                </Card>

                {/* Volume Chart */}
                <Card className="xl:col-span-2 bg-card/80 backdrop-blur-xl border-border/50 p-6 shadow-2xl hover:shadow-accent/20 transition-all duration-500 group">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-8 bg-gradient-to-b from-accent to-accent/50 rounded-full group-hover:h-10 transition-all duration-300"></div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Volume Chart
                    </h3>
                  </div>
                  <VolumeChart />
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="stats">
              <Card className="bg-card/80 backdrop-blur-xl border-border/50 p-6 shadow-2xl hover:shadow-accent/20 transition-all duration-500 group">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-8 bg-gradient-to-b from-accent to-accent/50 rounded-full group-hover:h-10 transition-all duration-300"></div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Time-Series Statistics - {selectedSymbol} ({timeframe})
                  </h3>
                </div>
                <StatsTable />
              </Card>
            </TabsContent>

            <TabsContent value="correlation">
              <Card className="bg-card/80 backdrop-blur-xl border-border/50 p-8 shadow-2xl hover:shadow-accent/20 transition-all duration-500">
                <CorrelationHeatmap />
              </Card>
            </TabsContent>

            <TabsContent value="ticks">
              <Card className="bg-card/80 backdrop-blur-xl border-border/50 p-6 shadow-2xl hover:shadow-accent/20 transition-all duration-500 group">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-8 bg-gradient-to-b from-accent to-accent/50 rounded-full group-hover:h-10 transition-all duration-300"></div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Recent Ticks - {selectedSymbol}
                  </h3>
                </div>
                <TicksTable />
              </Card>
            </TabsContent>

            <TabsContent value="alerts">
              <AlertsPanel />
            </TabsContent>
          </Tabs>
        </div>
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
