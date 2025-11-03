"""
Generate Mock Live Data for Testing
This script continuously inserts new ticks with current timestamps to simulate live data
"""

import asyncio
import random
from datetime import datetime, timezone
from decimal import Decimal
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.connection import database_manager
from database.models import RawTicks

# Base prices for each symbol
BASE_PRICES = {
    "BTCUSDT": 110000.0,
    "ETHUSDT": 4100.0,
    "ADAUSDT": 0.95,
    "SOLUSDT": 195.0,
    "DOTUSDT": 10.5,
}


async def generate_live_ticks():
    """Generate live mock ticks with realistic price movements"""
    print("🚀 Starting live mock data generator...")
    print("📊 Generating ticks every 500ms with price variations")
    print("Press Ctrl+C to stop\n")
    
    # Initialize database
    await database_manager.init_db()
    print("✅ Database initialized\n")
    
    # Track current prices (they'll fluctuate)
    current_prices = BASE_PRICES.copy()
    tick_count = 0
    
    while True:
        try:
            async for session in database_manager.get_session():
                # Generate one tick for each symbol
                for symbol, base_price in BASE_PRICES.items():
                    # Add random price movement (-0.1% to +0.1%)
                    price_change = random.uniform(-0.001, 0.001)
                    current_prices[symbol] = current_prices[symbol] * (1 + price_change)
                    
                    # Keep price within realistic range
                    current_prices[symbol] = max(
                        base_price * 0.95,
                        min(base_price * 1.05, current_prices[symbol])
                    )
                    
                    # Generate random quantity
                    quantity = random.uniform(0.0001, 0.1)
                    
                    # Create tick with CURRENT timestamp
                    tick = RawTicks(
                        symbol=symbol,
                        price=Decimal(str(round(current_prices[symbol], 2))),
                        quantity=Decimal(str(round(quantity, 4))),
                        timestamp=datetime.now(timezone.utc)
                    )
                    
                    session.add(tick)
                    tick_count += 1
                
                await session.commit()
                
                # Print status every 10 ticks
                if tick_count % 50 == 0:
                    print(f"✅ Generated {tick_count} ticks | "
                          f"BTC: ${current_prices['BTCUSDT']:.2f} | "
                          f"ETH: ${current_prices['ETHUSDT']:.2f}")
                
                break  # Exit session context
            
            # Wait 500ms before next batch
            await asyncio.sleep(0.5)
            
        except KeyboardInterrupt:
            print(f"\n⏹️  Stopped. Total ticks generated: {tick_count}")
            break
        except Exception as e:
            print(f"❌ Error: {e}")
            await asyncio.sleep(1)


if __name__ == "__main__":
    try:
        asyncio.run(generate_live_ticks())
    except KeyboardInterrupt:
        print("\n👋 Mock data generator stopped")
