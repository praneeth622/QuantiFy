"use client";

import React, { useState } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboard } from '../context/DashboardContext';
import { useToast } from '@/hooks/use-toast';

export default function DashboardHeader() {
  const { refreshData, isLoading, selectedSymbol, timeframe } = useDashboard();
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExportCSV = async () => {
    setIsExporting(true);
    
    try {
      const response = await fetch(
        `http://localhost:8000/api/export/${selectedSymbol}/${timeframe}?limit=1000`
      );
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Get the blob data
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedSymbol}_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: `Downloaded ${selectedSymbol} ${timeframe} data as CSV`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Could not export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent font-sans">
          QuantiFy Dashboard
        </h1>
        <p className="text-muted-foreground mt-1 font-sans">Real-time Trading Analytics</p>
      </div>
      
      <div className="flex gap-3">
        <Button
          onClick={handleExportCSV}
          disabled={isExporting}
          variant="outline"
          className="border-accent/30 hover:bg-accent/10 hover:border-accent font-sans"
        >
          <Download className={`w-4 h-4 mr-2 ${isExporting ? 'animate-bounce' : ''}`} />
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </Button>
        
        <Button
          onClick={refreshData}
          disabled={isLoading}
          className="bg-accent hover:bg-accent/90 font-sans"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>
    </div>
  );
}
