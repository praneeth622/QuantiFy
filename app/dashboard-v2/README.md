# QuantiFy Dashboard V2

## Overview
A completely redesigned, modular dashboard with proper state management and component separation for easy debugging and maintenance.

## Architecture

### Main Structure
```
/app/dashboard-v2/
├── page.tsx                    # Main dashboard layout (minimal logic)
├── context/
│   └── DashboardContext.tsx   # Centralized state management
└── components/
    ├── DashboardHeader.tsx    # Header with refresh button
    ├── SymbolSelector.tsx     # Trading symbol dropdown
    ├── TimeframeSelector.tsx  # Timeframe and rolling window controls
    ├── StatsPanel.tsx         # Key metrics cards
    ├── PriceChart.tsx         # Price chart with bid/ask
    ├── VolumeChart.tsx        # Volume bar chart
    ├── TicksTable.tsx         # Recent ticks table
    └── AlertsPanel.tsx        # Alerts grid
```

## Features

### ✅ Fixed Issues
1. **Symbol Dropdown** - Now fetches and displays all symbols from `/api/symbols`
2. **Timeframe Filter** - Properly implemented with data filtering
3. **Rolling Window** - Affects chart data display
4. **Refresh Button** - Invalidates all queries and refetches fresh data
5. **Stable Initial Load** - Proper state initialization prevents flickering
6. **Real-time Ticks** - Auto-refreshes every 2 seconds
7. **Complete Alert Details** - Shows all alert information (no more "N/A")

### Data Fetching Strategy
- **Symbols**: Fetched once, cached for 5 minutes
- **Ticks**: Fetched for selected symbol, auto-refresh every 2 seconds
- **Alerts**: Fetched globally, auto-refresh every 5 seconds

### State Management
All state is managed through `DashboardContext`:
- `selectedSymbol` - Currently selected trading symbol
- `timeframe` - Selected timeframe (1s, 1m, 5m, etc.)
- `rollingWindow` - Number of data points to display
- `symbols` - Available symbols from API
- `ticks` - Tick data for selected symbol
- `alerts` - All active alerts

### Component Isolation
Each component:
- Has a single, clear responsibility
- Uses the `useDashboard()` hook for data access
- Handles its own loading and error states
- Is independently debuggable

## Usage

### Access the Dashboard
Navigate to: `http://localhost:3000/dashboard-v2`

### Controls
1. **Symbol Selector** - Choose which symbol to monitor
2. **Timeframe** - Select data timeframe (affects aggregation)
3. **Rolling Window** - Number of ticks to display in charts
4. **Refresh Button** - Manually refresh all data

### Tabs
- **Overview** - Price and volume charts
- **Recent Ticks** - Detailed tick data table
- **Alerts** - All configured alerts with status

## API Endpoints Used
- `GET /api/symbols` - Fetch available symbols
- `GET /api/ticks?symbol={symbol}&limit=100` - Fetch tick data
- `GET /api/alerts` - Fetch all alerts

## Development

### Adding New Features
1. Create a new component in `/components`
2. Import and add to `page.tsx`
3. Access data via `useDashboard()` hook

### Debugging
- Each component logs its own errors
- Check browser console for component-specific issues
- Network tab shows API calls with proper labels

### State Updates
To add new state:
1. Add to `DashboardContextType` interface
2. Create state variable in provider
3. Add to context value object
4. Use in components via `useDashboard()`

## Performance
- React Query handles caching and deduplication
- Components only re-render when their data changes
- Charts are optimized with `useMemo`
- Auto-refresh intervals are staggered to reduce load

## Next Steps
- [ ] Add WebSocket integration for real-time updates
- [ ] Implement OHLCV candlestick charts
- [ ] Add analytics endpoints (correlation, hedge ratio)
- [ ] Create alert management UI
- [ ] Add export functionality
- [ ] Implement user preferences
