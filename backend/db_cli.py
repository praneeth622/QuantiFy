#!/usr/bin/env python3
"""
QuantiFy Database CLI Tool
Manage and test the SQLite database
"""

import asyncio
import sys
import json
from datetime import datetime, timedelta

# Add the backend directory to Python path
sys.path.append('.')

from database.database_init import db_initializer
from database.query_helper import query_helper
from database.connection import database_manager


async def main():
    """Main CLI function"""
    if len(sys.argv) < 2:
        print_usage()
        return
    
    command = sys.argv[1].lower()
    
    try:
        if command == "init":
            print("🚀 Initializing database...")
            await db_initializer.initialize_database()
            print("✅ Database initialized successfully!")
        
        elif command == "sample":
            print("📊 Generating sample data...")
            await db_initializer.generate_sample_data(days_back=3)
            print("✅ Sample data generated!")
        
        elif command == "stats":
            print("📈 Database Statistics:")
            print("=" * 50)
            stats = await db_initializer.get_database_stats()
            for table, data in stats.items():
                if "error" in data:
                    print(f"❌ {table}: ERROR - {data['error']}")
                else:
                    print(f"📋 {table}: {data['row_count']} rows")
                    if data.get('latest_timestamp'):
                        print(f"   📅 Latest: {data['latest_timestamp']}")
            print("=" * 50)
        
        elif command == "test":
            print("🧪 Testing database queries...")
            await test_queries()
        
        elif command == "prices":
            symbols = sys.argv[2:] if len(sys.argv) > 2 else ["BTCUSDT", "ETHUSDT"]
            await show_latest_prices(symbols)
        
        elif command == "candles":
            symbol = sys.argv[2] if len(sys.argv) > 2 else "BTCUSDT"
            timeframe = sys.argv[3] if len(sys.argv) > 3 else "1m"
            await show_candles(symbol, timeframe)
        
        elif command == "analytics":
            pair = sys.argv[2] if len(sys.argv) > 2 else "BTCUSDT-ETHUSDT"
            await show_analytics(pair)
        
        elif command == "cleanup":
            days = int(sys.argv[2]) if len(sys.argv) > 2 else 30
            print(f"🧹 Cleaning up data older than {days} days...")
            await db_initializer.cleanup_old_data(days_to_keep=days)
            print("✅ Cleanup completed!")
        
        elif command == "market":
            await show_market_summary()
        
        else:
            print(f"❌ Unknown command: {command}")
            print_usage()
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await database_manager.close()


def print_usage():
    """Print usage information"""
    print("""
🔧 QuantiFy Database CLI Tool

Usage: python db_cli.py <command> [options]

Commands:
    init                    Initialize database and create tables
    sample                  Generate sample tick data for testing
    stats                   Show database statistics
    test                    Run test queries
    prices [symbols...]     Show latest prices (default: BTCUSDT ETHUSDT)
    candles <symbol> [tf]   Show candle data (default: BTCUSDT 1m)
    analytics <pair>        Show analytics for symbol pair
    cleanup [days]          Clean up old data (default: 30 days)
    market                  Show market summary

Examples:
    python db_cli.py init
    python db_cli.py sample
    python db_cli.py stats
    python db_cli.py prices BTCUSDT ETHUSDT ADAUSDT
    python db_cli.py candles BTCUSDT 5m
    python db_cli.py analytics BTCUSDT-ETHUSDT
    """)


async def test_queries():
    """Test various database queries"""
    try:
        # Test latest prices
        prices = await query_helper.get_latest_prices(["BTCUSDT", "ETHUSDT"])
        print(f"📊 Latest prices: {prices}")
        
        # Test price series
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=1)
        series = await query_helper.get_price_series("BTCUSDT", start_time, end_time, limit=10)
        print(f"📈 Price series (last 10): {len(series)} data points")
        
        # Test market summary
        summary = await query_helper.get_market_summary()
        print(f"🏪 Market summary: {summary['active_symbols']} active symbols")
        
        print("✅ All queries executed successfully!")
        
    except Exception as e:
        print(f"❌ Query test failed: {e}")


async def show_latest_prices(symbols):
    """Show latest prices for symbols"""
    try:
        prices = await query_helper.get_latest_prices(symbols)
        print("💰 Latest Prices:")
        print("-" * 30)
        for symbol, price in prices.items():
            print(f"  {symbol}: ${price:,.8f}")
        print("-" * 30)
    except Exception as e:
        print(f"❌ Error getting prices: {e}")


async def show_candles(symbol, timeframe):
    """Show recent candle data"""
    try:
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=6)
        
        # First try resampled data
        candles = await query_helper.get_ohlcv_data(symbol, timeframe, start_time, end_time, limit=10)
        
        if not candles:
            # Fallback to resampling ticks
            print(f"📊 No resampled data found, generating from ticks...")
            candles = await query_helper.resample_ticks_to_candles(symbol, timeframe, start_time, end_time)
        
        if candles:
            print(f"🕯️ {symbol} {timeframe} Candles (last {len(candles)}):")
            print("-" * 80)
            print(f"{'Time':<20} {'Open':<12} {'High':<12} {'Low':<12} {'Close':<12} {'Volume':<12}")
            print("-" * 80)
            for candle in candles[-10:]:  # Show last 10
                print(f"{candle['timestamp'].strftime('%Y-%m-%d %H:%M'):<20} "
                      f"{candle['open']:<12.4f} "
                      f"{candle['high']:<12.4f} "
                      f"{candle['low']:<12.4f} "
                      f"{candle['close']:<12.4f} "
                      f"{candle['volume']:<12.4f}")
            print("-" * 80)
        else:
            print(f"❌ No candle data found for {symbol} {timeframe}")
    
    except Exception as e:
        print(f"❌ Error getting candles: {e}")


async def show_analytics(symbol_pair):
    """Show analytics for a symbol pair"""
    try:
        # Get latest analytics
        analytics = await query_helper.get_latest_analytics(symbol_pair)
        
        if analytics:
            print(f"📊 Analytics for {symbol_pair}:")
            print("-" * 40)
            print(f"  Timestamp: {analytics['timestamp']}")
            print(f"  Hedge Ratio: {analytics['hedge_ratio']:.6f}" if analytics['hedge_ratio'] else "  Hedge Ratio: N/A")
            print(f"  Spread: {analytics['spread']:.8f}" if analytics['spread'] else "  Spread: N/A")
            print(f"  Z-Score: {analytics['z_score']:.4f}" if analytics['z_score'] else "  Z-Score: N/A")
            print(f"  Correlation: {analytics['correlation']:.4f}" if analytics['correlation'] else "  Correlation: N/A")
            print(f"  Window Size: {analytics['window_size']} seconds")
            print("-" * 40)
            
            # Show Z-score history
            z_history = await query_helper.get_z_score_history(symbol_pair, hours_back=24, limit=5)
            if z_history:
                print(f"📈 Recent Z-Score History:")
                for entry in z_history:
                    print(f"  {entry['timestamp'].strftime('%H:%M:%S')}: {entry['z_score']:.4f}")
        else:
            print(f"❌ No analytics data found for {symbol_pair}")
    
    except Exception as e:
        print(f"❌ Error getting analytics: {e}")


async def show_market_summary():
    """Show market summary"""
    try:
        summary = await query_helper.get_market_summary()
        
        print("🏪 Market Summary:")
        print("=" * 60)
        print(f"Active Symbols: {summary['active_symbols']}")
        print("-" * 60)
        
        for symbol, data in summary['symbols'].items():
            print(f"{symbol}:")
            print(f"  Price: ${data['latest_price']:,.8f}")
            if data['24h_low'] and data['24h_high']:
                print(f"  24h Range: ${data['24h_low']:,.8f} - ${data['24h_high']:,.8f}")
            if data['24h_volume']:
                print(f"  24h Volume: {data['24h_volume']:,.8f}")
            print(f"  Last Update: {data['latest_timestamp']}")
            print()
        
        print("=" * 60)
    
    except Exception as e:
        print(f"❌ Error getting market summary: {e}")


if __name__ == "__main__":
    asyncio.run(main())