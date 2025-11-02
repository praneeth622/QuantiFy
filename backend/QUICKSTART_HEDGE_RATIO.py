#!/usr/bin/env python3
"""
Quick Start Guide: Hedge Ratio Calculation

This file shows the simplest way to use the hedge ratio module.
"""

import pandas as pd
from analytics.hedge_ratio import calculate_hedge_ratio

# ============================================================================
# BASIC USAGE
# ============================================================================

# 1. Prepare your data as pandas Series
btc_prices = pd.Series([50000, 51000, 52000, 53000, 54000])
eth_prices = pd.Series([2500, 2550, 2600, 2650, 2700])

# 2. Calculate hedge ratio
beta, alpha, r_squared, residuals = calculate_hedge_ratio(btc_prices, eth_prices)

# 3. Use the results
if beta is not None:
    print(f"Hedge Ratio: {beta:.4f}")
    print(f"To hedge 1 unit of ETH, use {beta:.4f} units of BTC")
else:
    print("Calculation failed (insufficient data or errors)")

# ============================================================================
# REAL-WORLD EXAMPLE
# ============================================================================

def hedge_portfolio(asset1_prices, asset2_prices, position_value):
    """
    Calculate how much of asset1 to short to hedge a long position in asset2.
    
    Args:
        asset1_prices: pd.Series of asset 1 prices
        asset2_prices: pd.Series of asset 2 prices  
        position_value: Dollar value of asset 2 position
    
    Returns:
        dict with hedging details
    """
    beta, alpha, r2, residuals = calculate_hedge_ratio(asset1_prices, asset2_prices)
    
    if beta is None:
        return {"error": "Unable to calculate hedge ratio"}
    
    hedge_value = abs(beta) * position_value
    
    return {
        "beta": beta,
        "r_squared": r2,
        "position_value": position_value,
        "hedge_value": hedge_value,
        "hedge_quality": "Excellent" if r2 > 0.7 else "Good" if r2 > 0.5 else "Poor",
        "recommendation": f"Short ${hedge_value:,.0f} of asset1 to hedge ${position_value:,.0f} of asset2"
    }

# ============================================================================
# USAGE WITH DATABASE DATA
# ============================================================================

"""
async def get_hedge_ratio_from_db(symbol1, symbol2):
    from database.connection import DatabaseManager
    
    db = DatabaseManager()
    
    # Fetch prices from database
    prices1 = await get_price_series_from_db(db, symbol1, '1m', limit=100)
    prices2 = await get_price_series_from_db(db, symbol2, '1m', limit=100)
    
    # Calculate hedge ratio
    beta, alpha, r2, residuals = calculate_hedge_ratio(prices1, prices2)
    
    return {
        'symbol1': symbol1,
        'symbol2': symbol2,
        'beta': beta,
        'alpha': alpha,
        'r_squared': r2,
        'tracking_error': residuals.std() if residuals is not None else None
    }
"""

# ============================================================================
# KEY POINTS
# ============================================================================

"""
✅ INPUTS:
   - Two pandas Series with price data
   - Series can have different indices (automatically aligned)
   - NaN values are automatically removed

✅ OUTPUTS:
   - beta: Hedge ratio (units of asset1 per unit of asset2)
   - alpha: Intercept (constant offset)
   - r_squared: Fit quality (0 to 1, higher is better)
   - residuals: Tracking error for each data point

✅ INTERPRETATION:
   - Beta > 0: Assets move together
   - Beta < 0: Assets move inversely
   - R² > 0.7: Excellent hedge
   - R² < 0.4: Poor hedge

✅ EDGE CASES HANDLED:
   - Empty series → returns None
   - All NaN values → returns None
   - Insufficient data (<10 points) → returns None
   - Zero variance (constant prices) → returns None
"""
