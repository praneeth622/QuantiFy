"""
Quick Reference: calculate_rolling_correlation()

Fast example for using the rolling correlation function.
"""

import sys
import pandas as pd
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from analytics.hedge_ratio import calculate_rolling_correlation, interpret_rolling_correlation


# ============================================================================
# BASIC USAGE
# ============================================================================

# Example 1: Calculate rolling correlation
btc_prices = pd.Series([100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
                        110, 111, 112, 113, 114, 115, 116, 117, 118, 119])
eth_prices = pd.Series([200, 202, 204, 206, 208, 210, 212, 214, 216, 218,
                        220, 222, 224, 226, 228, 230, 232, 234, 236, 238])

# Calculate with default window (20)
rolling_corr = calculate_rolling_correlation(btc_prices, eth_prices, window=10)

print("Rolling Correlation:")
print(rolling_corr)
print(f"\nLatest correlation: {rolling_corr.iloc[-1]:.4f}")

# Interpret the result
interpretation = interpret_rolling_correlation(rolling_corr.iloc[-1])
print(f"Interpretation: {interpretation}")


# ============================================================================
# VISUALIZATION
# ============================================================================

# Quick plot (requires matplotlib)
try:
    import matplotlib.pyplot as plt
    
    rolling_corr.plot(figsize=(10, 5), title='Rolling Correlation')
    plt.axhline(y=0.7, color='green', linestyle='--', alpha=0.5)
    plt.axhline(y=0, color='black', linestyle='-', alpha=0.3)
    plt.axhline(y=-0.7, color='red', linestyle='--', alpha=0.5)
    plt.ylabel('Correlation')
    plt.grid(alpha=0.3)
    # plt.show()  # Uncomment to display
    print("\n✓ Plot created (uncomment plt.show() to display)")
except ImportError:
    print("\n⚠ matplotlib not available for plotting")


# ============================================================================
# TRADING SIGNAL EXAMPLE
# ============================================================================

print("\n" + "="*80)
print("TRADING SIGNAL EXAMPLE")
print("="*80)

# Check latest correlation for trading decision
latest_corr = rolling_corr.iloc[-1]

if latest_corr > 0.7:
    print(f"\n✅ Strong correlation ({latest_corr:.2f}) - Safe for pairs trading")
elif latest_corr < 0.3:
    print(f"\n⚠️  Weak correlation ({latest_corr:.2f}) - Risky for pairs trading")
else:
    print(f"\n➡️  Moderate correlation ({latest_corr:.2f}) - Use with caution")


# ============================================================================
# KEY PARAMETERS
# ============================================================================

print("\n" + "="*80)
print("PARAMETER GUIDE")
print("="*80)
print("""
window parameter:
  - Smaller (5-10): More responsive, noisier
  - Medium (20-30): Balanced (default: 20)
  - Larger (50+): Smoother, more lagged

Correlation thresholds:
  - |ρ| > 0.7: Strong correlation
  - 0.3 < |ρ| < 0.7: Moderate correlation  
  - |ρ| < 0.3: Weak correlation

Return format:
  - pandas.Series with same index as input
  - First (window-1) values are NaN
  - Values clipped to [-1, 1]
  - Ready for .plot()
""")
print("="*80)


# ============================================================================
# ERROR HANDLING EXAMPLE
# ============================================================================

print("\n" + "="*80)
print("ERROR HANDLING")
print("="*80)

# Example of proper error handling
try:
    # This will raise ValueError (mismatched lengths)
    short_series = pd.Series([1, 2, 3])
    long_series = pd.Series([1, 2, 3, 4, 5])
    result = calculate_rolling_correlation(short_series, long_series)
except ValueError as e:
    print(f"✓ Caught expected error: {e}")

print("="*80)


if __name__ == "__main__":
    print("\n" + "="*80)
    print("✅ QUICK REFERENCE COMPLETE")
    print("="*80)
    print("""
Function: calculate_rolling_correlation(asset1, asset2, window=20)

Returns: pandas.Series with rolling correlation values

Key Features:
  ✓ Uses pandas.Series.rolling().corr()
  ✓ Automatic NaN handling
  ✓ Values clipped to [-1, 1]
  ✓ Visualization-ready output
  ✓ Comprehensive error checking

See test_rolling_correlation.py for comprehensive examples.
See demo_rolling_correlation.py for verification details.
    """)
    print("="*80)
