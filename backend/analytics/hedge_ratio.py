"""
Hedge Ratio Calculation Module

Provides OLS linear regression for calculating hedge ratios between two assets.
Plus statistical tests for time series analysis.
"""

import numpy as np
import pandas as pd
from typing import Tuple, Optional, Dict, Any
from sklearn.linear_model import LinearRegression
from statsmodels.tsa.stattools import adfuller
import logging

logger = logging.getLogger(__name__)


def calculate_hedge_ratio(
    asset1: pd.Series,
    asset2: pd.Series,
    min_data_points: int = 10
) -> Tuple[Optional[float], Optional[float], Optional[float], Optional[pd.Series]]:
    """
    Calculate hedge ratio using OLS linear regression.
    
    Performs linear regression: asset2 = beta * asset1 + alpha
    
    The hedge ratio (beta) represents how many units of asset1 are needed
    to hedge one unit of asset2. This is useful for pairs trading and
    portfolio hedging strategies.
    
    Args:
        asset1: Pandas Series of prices for asset 1 (independent variable X)
        asset2: Pandas Series of prices for asset 2 (dependent variable Y)
        min_data_points: Minimum number of data points required (default: 10)
    
    Returns:
        Tuple containing:
        - beta (float): Hedge ratio (slope of regression line)
        - alpha (float): Intercept of regression line
        - r_squared (float): R² goodness of fit metric (0 to 1)
        - residuals (pd.Series): Regression residuals (actual - predicted)
        
        Returns (None, None, None, None) if calculation fails.
    
    Raises:
        ValueError: If inputs are not pandas Series
    
    Examples:
        >>> import pandas as pd
        >>> asset1 = pd.Series([100, 102, 101, 103, 105])
        >>> asset2 = pd.Series([200, 204, 202, 206, 210])
        >>> beta, alpha, r2, residuals = calculate_hedge_ratio(asset1, asset2)
        >>> print(f"Hedge Ratio: {beta:.4f}")
        Hedge Ratio: 2.0000
    """
    # Input validation
    if not isinstance(asset1, pd.Series):
        logger.error(f"asset1 must be pandas Series, got {type(asset1)}")
        raise ValueError("asset1 must be a pandas Series")
    
    if not isinstance(asset2, pd.Series):
        logger.error(f"asset2 must be pandas Series, got {type(asset2)}")
        raise ValueError("asset2 must be a pandas Series")
    
    # Check for empty series
    if len(asset1) == 0 or len(asset2) == 0:
        logger.warning("Empty series provided")
        return None, None, None, None
    
    # Align the two series (handle different indices)
    try:
        df = pd.DataFrame({
            'asset1': asset1,
            'asset2': asset2
        })
        
        # Drop rows with NaN values
        df_clean = df.dropna()
        
        if len(df_clean) < min_data_points:
            logger.warning(
                f"Insufficient data after cleaning: {len(df_clean)} < {min_data_points}"
            )
            return None, None, None, None
        
        # Extract clean series
        X = df_clean['asset1'].values.reshape(-1, 1)  # Independent variable
        y = df_clean['asset2'].values  # Dependent variable
        
        # Check for zero variance (constant values)
        if np.std(X) == 0:
            logger.warning("asset1 has zero variance (constant values)")
            return None, None, None, None
        
        if np.std(y) == 0:
            logger.warning("asset2 has zero variance (constant values)")
            return None, None, None, None
        
        # Perform OLS linear regression
        model = LinearRegression()
        model.fit(X, y)
        
        # Extract parameters
        beta = float(model.coef_[0])  # Hedge ratio (slope)
        alpha = float(model.intercept_)  # Intercept
        
        # Calculate R²
        r_squared = float(model.score(X, y))
        
        # Calculate residuals
        predictions = model.predict(X)
        residuals_array = y - predictions
        residuals = pd.Series(
            residuals_array,
            index=df_clean.index,
            name='residuals'
        )
        
        logger.info(
            f"Hedge ratio calculated: beta={beta:.6f}, alpha={alpha:.6f}, "
            f"R²={r_squared:.4f}, n={len(df_clean)}"
        )
        
        return beta, alpha, r_squared, residuals
        
    except Exception as e:
        logger.error(f"Error calculating hedge ratio: {e}", exc_info=True)
        return None, None, None, None


def validate_hedge_ratio_inputs(
    asset1: pd.Series,
    asset2: pd.Series
) -> Tuple[bool, str]:
    """
    Validate inputs for hedge ratio calculation.
    
    Args:
        asset1: Pandas Series of prices for asset 1
        asset2: Pandas Series of prices for asset 2
    
    Returns:
        Tuple of (is_valid: bool, error_message: str)
    """
    if not isinstance(asset1, pd.Series):
        return False, f"asset1 must be pandas Series, got {type(asset1)}"
    
    if not isinstance(asset2, pd.Series):
        return False, f"asset2 must be pandas Series, got {type(asset2)}"
    
    if len(asset1) == 0:
        return False, "asset1 is empty"
    
    if len(asset2) == 0:
        return False, "asset2 is empty"
    
    if asset1.isnull().all():
        return False, "asset1 contains only NaN values"
    
    if asset2.isnull().all():
        return False, "asset2 contains only NaN values"
    
    return True, ""


def interpret_hedge_ratio(
    beta: float,
    r_squared: float
) -> str:
    """
    Provide human-readable interpretation of hedge ratio results.
    
    Args:
        beta: Hedge ratio (slope)
        r_squared: R² goodness of fit
    
    Returns:
        String interpretation of the results
    """
    interpretation = []
    
    # Interpret beta
    if abs(beta) < 0.1:
        interpretation.append("Very weak relationship between assets")
    elif abs(beta) < 0.5:
        interpretation.append("Weak relationship")
    elif abs(beta) < 1.5:
        interpretation.append("Moderate relationship")
    else:
        interpretation.append("Strong relationship")
    
    # Interpret direction
    if beta > 0:
        interpretation.append("Assets move in the same direction")
    else:
        interpretation.append("Assets move in opposite directions")
    
    # Interpret R²
    if r_squared < 0.3:
        interpretation.append(f"Poor fit (R²={r_squared:.2%})")
    elif r_squared < 0.7:
        interpretation.append(f"Moderate fit (R²={r_squared:.2%})")
    else:
        interpretation.append(f"Good fit (R²={r_squared:.2%})")
    
    # Hedging interpretation
    interpretation.append(
        f"To hedge 1 unit of asset2, use {abs(beta):.4f} units of asset1"
    )
    
    return ". ".join(interpretation) + "."


def calculate_spread(
    asset1_prices: pd.Series,
    asset2_prices: pd.Series,
    hedge_ratio: float
) -> pd.Series:
    """
    Calculate the spread between two assets using a hedge ratio.
    
    The spread represents the deviation from the hedged relationship between
    two assets. Used in pairs trading to identify mean-reversion opportunities.
    
    Formula: spread = asset2 - (hedge_ratio * asset1)
    
    Args:
        asset1_prices: Pandas Series of prices for asset 1
        asset2_prices: Pandas Series of prices for asset 2
        hedge_ratio: Hedge ratio (beta) from regression, units of asset1 per asset2
    
    Returns:
        Pandas Series containing the spread values, aligned with input indices
        
    Raises:
        ValueError: If inputs are not pandas Series or hedge_ratio is not numeric
        
    Examples:
        >>> import pandas as pd
        >>> asset1 = pd.Series([100, 101, 102])
        >>> asset2 = pd.Series([200, 202, 204])
        >>> spread = calculate_spread(asset1, asset2, hedge_ratio=2.0)
        >>> print(spread.tolist())
        [0.0, 0.0, 0.0]
    """
    # Input validation
    if not isinstance(asset1_prices, pd.Series):
        logger.error(f"asset1_prices must be pandas Series, got {type(asset1_prices)}")
        raise ValueError("asset1_prices must be a pandas Series")
    
    if not isinstance(asset2_prices, pd.Series):
        logger.error(f"asset2_prices must be pandas Series, got {type(asset2_prices)}")
        raise ValueError("asset2_prices must be a pandas Series")
    
    if not isinstance(hedge_ratio, (int, float)):
        logger.error(f"hedge_ratio must be numeric, got {type(hedge_ratio)}")
        raise ValueError("hedge_ratio must be a numeric value")
    
    try:
        # Align the two series (handles different indices)
        asset1_aligned, asset2_aligned = asset1_prices.align(asset2_prices, join='inner')
        
        # Calculate spread
        spread = asset2_aligned - (hedge_ratio * asset1_aligned)
        spread.name = 'spread'
        
        logger.info(
            f"Spread calculated: {len(spread)} points, "
            f"mean={spread.mean():.4f}, std={spread.std():.4f}"
        )
        
        return spread
        
    except Exception as e:
        logger.error(f"Error calculating spread: {e}", exc_info=True)
        raise


def calculate_zscore(
    spread: pd.Series,
    window: int = 20
) -> pd.Series:
    """
    Calculate rolling z-score of a spread time series.
    
    The z-score measures how many standard deviations the current spread is
    from its rolling mean. Used to identify overbought/oversold conditions
    in pairs trading strategies.
    
    Formula: zscore = (spread - rolling_mean) / rolling_std
    
    Args:
        spread: Pandas Series of spread values
        window: Rolling window size for mean and std calculation (default: 20)
    
    Returns:
        Pandas Series containing z-score values
        - Initial values (first 'window' points) will be NaN
        - Positive z-score: spread above mean
        - Negative z-score: spread below mean
        
    Raises:
        ValueError: If spread is not a pandas Series or window is invalid
        
    Examples:
        >>> import pandas as pd
        >>> spread = pd.Series([0, 1, 2, 1, 0, -1, -2, -1, 0] * 3)
        >>> zscore = calculate_zscore(spread, window=5)
        >>> # First 4 values will be NaN, then z-scores calculated
    
    Notes:
        - NaN values at the start are expected behavior (insufficient data)
        - Use min_periods in rolling calculations to get values sooner
        - Z-score > 2: potential sell signal (spread too high)
        - Z-score < -2: potential buy signal (spread too low)
    """
    # Input validation
    if not isinstance(spread, pd.Series):
        logger.error(f"spread must be pandas Series, got {type(spread)}")
        raise ValueError("spread must be a pandas Series")
    
    if not isinstance(window, int) or window < 2:
        logger.error(f"window must be int >= 2, got {window}")
        raise ValueError("window must be an integer >= 2")
    
    if len(spread) < window:
        logger.warning(
            f"Spread length ({len(spread)}) < window ({window}). "
            f"All z-scores will be NaN"
        )
    
    try:
        # Calculate rolling mean and standard deviation
        rolling_mean = spread.rolling(window=window, min_periods=window).mean()
        rolling_std = spread.rolling(window=window, min_periods=window).std()
        
        # Calculate z-score
        # Handle division by zero (constant spread)
        with np.errstate(divide='ignore', invalid='ignore'):
            zscore = (spread - rolling_mean) / rolling_std
        
        # Replace inf values with NaN
        zscore = zscore.replace([np.inf, -np.inf], np.nan)
        zscore.name = 'zscore'
        
        # Log statistics
        valid_zscores = zscore.dropna()
        if len(valid_zscores) > 0:
            logger.info(
                f"Z-score calculated: {len(valid_zscores)} valid points, "
                f"mean={valid_zscores.mean():.4f}, "
                f"std={valid_zscores.std():.4f}, "
                f"range=[{valid_zscores.min():.4f}, {valid_zscores.max():.4f}]"
            )
        else:
            logger.warning("No valid z-scores calculated (all NaN)")
        
        return zscore
        
    except Exception as e:
        logger.error(f"Error calculating z-score: {e}", exc_info=True)
        raise


def interpret_zscore(zscore_value: float) -> str:
    """
    Provide trading signal interpretation for a z-score value.
    
    Args:
        zscore_value: Current z-score value
    
    Returns:
        String with trading interpretation
    """
    if pd.isna(zscore_value):
        return "Insufficient data for signal"
    
    if zscore_value > 2.5:
        return f"Strong SELL signal (z={zscore_value:.2f}): Spread extremely high"
    elif zscore_value > 2.0:
        return f"SELL signal (z={zscore_value:.2f}): Spread significantly above mean"
    elif zscore_value > 1.0:
        return f"Weak sell (z={zscore_value:.2f}): Spread moderately high"
    elif zscore_value < -2.5:
        return f"Strong BUY signal (z={zscore_value:.2f}): Spread extremely low"
    elif zscore_value < -2.0:
        return f"BUY signal (z={zscore_value:.2f}): Spread significantly below mean"
    elif zscore_value < -1.0:
        return f"Weak buy (z={zscore_value:.2f}): Spread moderately low"
    else:
        return f"NEUTRAL (z={zscore_value:.2f}): Spread near mean, no clear signal"


def perform_adf_test(series: pd.Series, significance_level: float = 0.05) -> Dict[str, Any]:
    """
    Perform Augmented Dickey-Fuller test for stationarity.
    
    The ADF test checks the null hypothesis that a unit root is present in the time series.
    If we reject the null hypothesis (p-value < significance_level), the series is stationary.
    
    Args:
        series: Time series data to test for stationarity
        significance_level: Threshold for determining stationarity (default: 0.05)
    
    Returns:
        Dictionary containing:
            - adf_statistic: The test statistic from the ADF test
            - p_value: The p-value for the test
            - is_stationary: Boolean indicating if series is stationary
            - critical_values: Dict of critical values at 1%, 5%, and 10% levels
            - num_lags: Number of lags used in the test
            - num_observations: Number of observations used
    
    Raises:
        ValueError: If series is empty, too short, or contains only NaN values
    
    Example:
        >>> import pandas as pd
        >>> import numpy as np
        >>> 
        >>> # Test stationary series (white noise)
        >>> np.random.seed(42)
        >>> stationary = pd.Series(np.random.randn(100))
        >>> result = perform_adf_test(stationary)
        >>> print(f"Stationary: {result['is_stationary']}")
        >>> print(f"P-value: {result['p_value']:.4f}")
        >>> 
        >>> # Test non-stationary series (random walk)
        >>> non_stationary = pd.Series(np.cumsum(np.random.randn(100)))
        >>> result = perform_adf_test(non_stationary)
        >>> print(f"Stationary: {result['is_stationary']}")
        >>> print(f"P-value: {result['p_value']:.4f}")
    """
    # Input validation
    if series is None or len(series) == 0:
        raise ValueError("Series cannot be None or empty")
    
    # Remove NaN values
    clean_series = series.dropna()
    
    if len(clean_series) == 0:
        raise ValueError("Series contains only NaN values")
    
    # Check minimum data requirements (ADF test typically needs at least 12 observations)
    min_required = 12
    if len(clean_series) < min_required:
        raise ValueError(
            f"Insufficient data for ADF test. Need at least {min_required} observations, "
            f"got {len(clean_series)} after removing NaN values"
        )
    
    try:
        # Perform Augmented Dickey-Fuller test
        # Returns: (adf_statistic, p_value, num_lags, num_observations, critical_values, icbest)
        adf_result = adfuller(clean_series, autolag='AIC')
        
        adf_statistic = adf_result[0]
        p_value = adf_result[1]
        num_lags = adf_result[2]
        num_observations = adf_result[3]
        critical_values = adf_result[4]
        
        # Determine if series is stationary
        # Lower p-value means stronger evidence against null hypothesis (unit root)
        # If p_value < significance_level, reject null hypothesis → series is stationary
        is_stationary = p_value < significance_level
        
        logging.info(
            f"ADF Test Results: statistic={adf_statistic:.4f}, p_value={p_value:.4f}, "
            f"is_stationary={is_stationary}, lags={num_lags}, n_obs={num_observations}"
        )
        
        result = {
            'adf_statistic': adf_statistic,
            'p_value': p_value,
            'is_stationary': is_stationary,
            'critical_values': critical_values,
            'num_lags': num_lags,
            'num_observations': num_observations
        }
        
        return result
        
    except Exception as e:
        logging.error(f"Error performing ADF test: {str(e)}")
        raise RuntimeError(f"ADF test failed: {str(e)}") from e


def calculate_rolling_correlation(
    asset1: pd.Series,
    asset2: pd.Series,
    window: int = 20
) -> pd.Series:
    """
    Calculate rolling correlation between two asset price series.
    
    Rolling correlation helps identify how the relationship between two assets
    changes over time. This is crucial for pairs trading and portfolio management,
    as correlation drift can signal when to exit positions or rebalance.
    
    Args:
        asset1: First asset price series
        asset2: Second asset price series
        window: Rolling window size (default: 20). Larger windows provide 
               smoother but lagged correlation estimates.
    
    Returns:
        pandas.Series: Rolling correlation values, range [-1, 1]
                      - Values near +1: Strong positive correlation
                      - Values near 0: No linear relationship
                      - Values near -1: Strong negative correlation
                      - NaN for first (window-1) observations
    
    Raises:
        ValueError: If inputs are invalid (None, empty, mismatched lengths, window too large)
    
    Notes:
        - First (window-1) values will be NaN (expected behavior)
        - NaN values in input are automatically handled by pandas
        - Output is clipped to [-1, 1] to handle numerical precision issues
        - Returns data in visualization-ready format with proper indexing
    
    Example:
        >>> import pandas as pd
        >>> import numpy as np
        >>> 
        >>> # Perfect positive correlation
        >>> asset1 = pd.Series([100, 101, 102, 103, 104])
        >>> asset2 = pd.Series([200, 202, 204, 206, 208])
        >>> corr = calculate_rolling_correlation(asset1, asset2, window=3)
        >>> print(corr)
        >>> 
        >>> # Visualization-ready output
        >>> import matplotlib.pyplot as plt
        >>> corr.plot(title='Rolling Correlation', ylabel='Correlation')
        >>> plt.axhline(y=0, color='black', linestyle='--', alpha=0.3)
        >>> plt.show()
    """
    # Input validation
    if asset1 is None or asset2 is None:
        raise ValueError("Both asset1 and asset2 must be provided")
    
    if len(asset1) == 0 or len(asset2) == 0:
        raise ValueError("Asset series cannot be empty")
    
    if len(asset1) != len(asset2):
        raise ValueError(
            f"Asset series must have same length. Got asset1={len(asset1)}, asset2={len(asset2)}"
        )
    
    if window < 2:
        raise ValueError(f"Window must be at least 2, got {window}")
    
    if window > len(asset1):
        raise ValueError(
            f"Window size ({window}) cannot exceed series length ({len(asset1)})"
        )
    
    try:
        # Align series indices (handles different indices gracefully)
        asset1_aligned, asset2_aligned = asset1.align(asset2, join='inner')
        
        if len(asset1_aligned) == 0:
            raise ValueError("No overlapping indices between asset1 and asset2")
        
        # Calculate rolling correlation
        # This uses pandas' efficient rolling window implementation
        rolling_corr = asset1_aligned.rolling(window=window).corr(asset2_aligned)
        
        # Clip to valid correlation range [-1, 1]
        # (handles potential numerical precision issues)
        rolling_corr = rolling_corr.clip(lower=-1.0, upper=1.0)
        
        # Log summary statistics
        valid_corr = rolling_corr.dropna()
        if len(valid_corr) > 0:
            logging.info(
                f"Rolling correlation calculated: window={window}, "
                f"valid_points={len(valid_corr)}, "
                f"mean_corr={valid_corr.mean():.4f}, "
                f"std_corr={valid_corr.std():.4f}, "
                f"min_corr={valid_corr.min():.4f}, "
                f"max_corr={valid_corr.max():.4f}"
            )
        else:
            logging.warning(f"All correlation values are NaN (window={window} may be too large)")
        
        return rolling_corr
        
    except Exception as e:
        logging.error(f"Error calculating rolling correlation: {str(e)}")
        raise RuntimeError(f"Rolling correlation calculation failed: {str(e)}") from e


def interpret_rolling_correlation(
    correlation_value: float,
    threshold_strong: float = 0.7,
    threshold_weak: float = 0.3
) -> str:
    """
    Interpret a rolling correlation value for trading decisions.
    
    Args:
        correlation_value: Correlation value to interpret (should be in [-1, 1])
        threshold_strong: Threshold for strong correlation (default: 0.7)
        threshold_weak: Threshold for weak correlation (default: 0.3)
    
    Returns:
        Human-readable interpretation string
    
    Example:
        >>> interpret_rolling_correlation(0.85)
        'Strong positive correlation (ρ=0.85): Assets move together closely'
        
        >>> interpret_rolling_correlation(-0.92)
        'Strong negative correlation (ρ=-0.92): Assets move in opposite directions'
    """
    if pd.isna(correlation_value):
        return "Insufficient data: Correlation not yet available"
    
    abs_corr = abs(correlation_value)
    
    # Strong correlations
    if abs_corr >= threshold_strong:
        if correlation_value > 0:
            return (
                f"Strong positive correlation (ρ={correlation_value:.2f}): "
                f"Assets move together closely. Good for pairs trading."
            )
        else:
            return (
                f"Strong negative correlation (ρ={correlation_value:.2f}): "
                f"Assets move in opposite directions. Good for hedging."
            )
    
    # Moderate correlations
    elif abs_corr >= threshold_weak:
        if correlation_value > 0:
            return (
                f"Moderate positive correlation (ρ={correlation_value:.2f}): "
                f"Assets tend to move together."
            )
        else:
            return (
                f"Moderate negative correlation (ρ={correlation_value:.2f}): "
                f"Assets tend to move oppositely."
            )
    
    # Weak/no correlation
    else:
        return (
            f"Weak correlation (ρ={correlation_value:.2f}): "
            f"No strong linear relationship. Pairs trading may be risky."
        )
