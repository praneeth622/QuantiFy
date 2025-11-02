"""
Alert Manager for Real-time Trading Alerts
Monitors conditions and triggers alerts every 5 seconds
"""

import asyncio
import json
import logging
from typing import Dict, List, Callable, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from database.connection import database_manager
from database.models import Alerts, AlertHistory, RawTicks, AnalyticsResults
from config import settings

logger = logging.getLogger(__name__)


class AlertManager:
    """
    Manages real-time alert monitoring and triggering
    
    Features:
    - Checks alert conditions every 5 seconds
    - Supports: zscore_above, zscore_below, price_above, price_below
    - Stores triggered alerts in AlertHistory
    - Broadcasts to WebSocket subscribers
    - Cooldown period to prevent spam (default: 60 seconds)
    """
    
    # Alert condition types
    CONDITION_ZSCORE_ABOVE = "zscore_above"
    CONDITION_ZSCORE_BELOW = "zscore_below"
    CONDITION_PRICE_ABOVE = "price_above"
    CONDITION_PRICE_BELOW = "price_below"
    CONDITION_ABOVE = "above"
    CONDITION_BELOW = "below"
    
    # Supported conditions
    SUPPORTED_CONDITIONS = [
        CONDITION_ZSCORE_ABOVE,
        CONDITION_ZSCORE_BELOW,
        CONDITION_PRICE_ABOVE,
        CONDITION_PRICE_BELOW,
        CONDITION_ABOVE,
        CONDITION_BELOW,
    ]
    
    def __init__(self, check_interval: int = 5, cooldown_seconds: int = 60):
        """
        Initialize AlertManager
        
        Args:
            check_interval: Seconds between alert checks (default: 5)
            cooldown_seconds: Seconds before same alert can trigger again (default: 60)
        """
        self.check_interval = check_interval
        self.cooldown_seconds = cooldown_seconds
        
        # Active alerts cache {alert_id: alert_object}
        self.active_alerts: Dict[int, Alerts] = {}
        
        # Alert cooldown tracking {alert_id: last_triggered_time}
        self.alert_cooldowns: Dict[int, datetime] = {}
        
        # WebSocket subscribers {channel: [callback_functions]}
        self.websocket_subscribers: Dict[str, List[Callable]] = {}
        
        # Monitoring task
        self.monitoring_task: Optional[asyncio.Task] = None
        self.is_running = False
        
        # Statistics
        self.stats = {
            "checks_performed": 0,
            "alerts_triggered": 0,
            "alerts_in_cooldown": 0,
            "last_check_time": None,
        }
    
    async def start(self):
        """Start alert monitoring"""
        if self.is_running:
            logger.warning("Alert manager already running")
            return
        
        self.is_running = True
        
        # Load active alerts from database
        await self._load_active_alerts()
        
        # Start monitoring task
        self.monitoring_task = asyncio.create_task(self._monitor_alerts_loop())
        
        logger.info(
            f"🔔 Alert manager started - "
            f"Check interval: {self.check_interval}s, "
            f"Cooldown: {self.cooldown_seconds}s, "
            f"Active alerts: {len(self.active_alerts)}"
        )
    
    async def stop(self):
        """Stop alert monitoring"""
        self.is_running = False
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        
        logger.info("🔔 Alert manager stopped")
    
    def subscribe_websocket(self, channel: str, callback: Callable):
        """
        Subscribe to alert broadcasts on a WebSocket channel
        
        Args:
            channel: Channel name (e.g., 'alerts', 'alerts:BTCUSDT')
            callback: Async function to call when alert is triggered
        """
        if channel not in self.websocket_subscribers:
            self.websocket_subscribers[channel] = []
        
        self.websocket_subscribers[channel].append(callback)
        logger.info(f"📡 WebSocket subscribed to channel: {channel}")
    
    def unsubscribe_websocket(self, channel: str, callback: Callable):
        """Unsubscribe from alert broadcasts"""
        if channel in self.websocket_subscribers:
            try:
                self.websocket_subscribers[channel].remove(callback)
                logger.info(f"📡 WebSocket unsubscribed from channel: {channel}")
            except ValueError:
                pass
    
    async def _load_active_alerts(self):
        """Load active alerts from database"""
        try:
            async for session in database_manager.get_session():
                result = await session.execute(
                    select(Alerts).where(Alerts.is_active == True)
                )
                alerts = result.scalars().all()
                
                for alert in alerts:
                    self.active_alerts[alert.id] = alert
                
                logger.info(f"✅ Loaded {len(self.active_alerts)} active alerts")
                break
                
        except Exception as e:
            logger.error(f"❌ Error loading active alerts: {e}", exc_info=True)
    
    async def reload_alerts(self):
        """Reload alerts from database (useful after adding/updating alerts)"""
        self.active_alerts.clear()
        await self._load_active_alerts()
    
    async def _monitor_alerts_loop(self):
        """Main monitoring loop - checks alerts every 5 seconds"""
        logger.info(f"🔄 Starting alert monitoring loop (every {self.check_interval}s)")
        
        while self.is_running:
            try:
                start_time = datetime.now()
                
                # Check all active alerts
                checked_count = 0
                triggered_count = 0
                cooldown_count = 0
                
                for alert_id, alert in list(self.active_alerts.items()):
                    try:
                        # Check if in cooldown
                        if self._is_in_cooldown(alert_id):
                            cooldown_count += 1
                            continue
                        
                        # Check alert condition
                        triggered = await self._check_alert_condition(alert)
                        checked_count += 1
                        
                        if triggered:
                            triggered_count += 1
                            
                    except Exception as e:
                        logger.error(f"Error checking alert {alert_id}: {e}")
                
                # Update stats
                elapsed = (datetime.now() - start_time).total_seconds()
                self.stats["checks_performed"] += checked_count
                self.stats["alerts_in_cooldown"] = cooldown_count
                self.stats["last_check_time"] = datetime.now()
                
                if checked_count > 0:
                    logger.debug(
                        f"⏱️  Alert check cycle: {checked_count} checked, "
                        f"{triggered_count} triggered, {cooldown_count} in cooldown "
                        f"({elapsed:.2f}s)"
                    )
                
                # Wait before next check
                await asyncio.sleep(self.check_interval)
                
            except asyncio.CancelledError:
                logger.info("Alert monitoring loop cancelled")
                break
            except Exception as e:
                logger.error(f"❌ Error in alert monitoring loop: {e}", exc_info=True)
                await asyncio.sleep(5)  # Wait before retrying
    
    def _is_in_cooldown(self, alert_id: int) -> bool:
        """Check if alert is in cooldown period"""
        if alert_id not in self.alert_cooldowns:
            return False
        
        last_triggered = self.alert_cooldowns[alert_id]
        elapsed = (datetime.now() - last_triggered).total_seconds()
        
        return elapsed < self.cooldown_seconds
    
    async def _check_alert_condition(self, alert: Alerts) -> bool:
        """
        Check if alert condition is met
        
        Returns:
            True if alert was triggered, False otherwise
        """
        try:
            # Get current value based on alert type
            if alert.alert_type == "price":
                current_value = await self._get_current_price(alert.symbol)
            elif alert.alert_type == "z_score" or alert.alert_type == "zscore":
                current_value = await self._get_current_zscore(alert.symbol)
            else:
                # Default to price
                current_value = await self._get_current_price(alert.symbol)
            
            if current_value is None:
                return False
            
            # Evaluate condition
            condition_met = self._evaluate_condition(
                alert.condition,
                current_value,
                float(alert.threshold)
            )
            
            if condition_met:
                await self._trigger_alert(alert, current_value)
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking alert condition for {alert.id}: {e}")
            return False
    
    async def _get_current_price(self, symbol: str) -> Optional[float]:
        """Get current price for a symbol"""
        try:
            async for session in database_manager.get_session():
                result = await session.execute(
                    select(RawTicks.price)
                    .where(RawTicks.symbol == symbol)
                    .order_by(RawTicks.timestamp.desc())
                    .limit(1)
                )
                price = result.scalar_one_or_none()
                
                if price:
                    return float(price)
                
                break
                
        except Exception as e:
            logger.error(f"Error getting current price for {symbol}: {e}")
        
        return None
    
    async def _get_current_zscore(self, symbol_pair: str) -> Optional[float]:
        """
        Get current z-score from analytics results
        
        Args:
            symbol_pair: Format "BTCUSDT-ETHUSDT" or just "BTCUSDT" (will look for any pair)
        """
        try:
            async for session in database_manager.get_session():
                # Try to get most recent z-score for this symbol pair
                result = await session.execute(
                    select(AnalyticsResults.z_score)
                    .where(AnalyticsResults.symbol_pair.like(f"%{symbol_pair}%"))
                    .order_by(AnalyticsResults.timestamp.desc())
                    .limit(1)
                )
                zscore = result.scalar_one_or_none()
                
                if zscore:
                    return float(zscore)
                
                break
                
        except Exception as e:
            logger.error(f"Error getting z-score for {symbol_pair}: {e}")
        
        return None
    
    def _evaluate_condition(self, condition: str, current_value: float, threshold: float) -> bool:
        """Evaluate if condition is met"""
        condition = condition.lower()
        
        if condition in ["above", "price_above", "zscore_above", "greater_than", "gt"]:
            return current_value > threshold
        elif condition in ["below", "price_below", "zscore_below", "less_than", "lt"]:
            return current_value < threshold
        elif condition in ["equals", "eq"]:
            return abs(current_value - threshold) < 0.0001
        elif condition in ["crosses_above"]:
            # Would need historical data to check if crossed
            return current_value > threshold
        elif condition in ["crosses_below"]:
            return current_value < threshold
        else:
            logger.warning(f"Unknown condition: {condition}")
            return False
    
    async def _trigger_alert(self, alert: Alerts, current_value: float):
        """Trigger an alert - store in history and broadcast"""
        try:
            # Set cooldown
            self.alert_cooldowns[alert.id] = datetime.now()
            
            # Create alert history record
            alert_history = AlertHistory(
                alert_id=alert.id,
                symbol=alert.symbol,
                condition=alert.condition,
                threshold_value=alert.threshold,
                actual_value=Decimal(str(current_value)),
                triggered_at=datetime.now(),
                market_conditions=json.dumps({
                    "current_value": current_value,
                    "threshold": float(alert.threshold),
                    "condition": alert.condition,
                    "alert_type": alert.alert_type,
                })
            )
            
            # Store in database
            async for session in database_manager.get_session():
                session.add(alert_history)
                
                # Update alert trigger count and last triggered time
                result = await session.execute(
                    select(Alerts).where(Alerts.id == alert.id)
                )
                db_alert = result.scalar_one_or_none()
                
                if db_alert:
                    db_alert.last_triggered = datetime.now()
                    db_alert.trigger_count = (db_alert.trigger_count or 0) + 1
                
                await session.commit()
                await session.refresh(alert_history)
                
                break
            
            # Update stats
            self.stats["alerts_triggered"] += 1
            
            # Prepare alert message
            alert_message = {
                "alert_id": alert.id,
                "alert_history_id": alert_history.id,
                "symbol": alert.symbol,
                "alert_type": alert.alert_type,
                "condition": alert.condition,
                "threshold": float(alert.threshold),
                "current_value": current_value,
                "message": alert.message or f"{alert.symbol} {alert.condition} {alert.threshold}",
                "severity": alert.severity,
                "triggered_at": datetime.now().isoformat(),
                "user_id": alert.user_id,
                "strategy_name": alert.strategy_name,
            }
            
            # Broadcast to WebSocket subscribers
            await self._broadcast_alert(alert_message)
            
            logger.info(
                f"🔔 ALERT TRIGGERED: {alert.symbol} {alert.condition} {alert.threshold} "
                f"(current: {current_value:.4f}) - Severity: {alert.severity}"
            )
            
        except Exception as e:
            logger.error(f"❌ Error triggering alert {alert.id}: {e}", exc_info=True)
    
    async def _broadcast_alert(self, alert_message: Dict[str, Any]):
        """Broadcast alert to all WebSocket subscribers"""
        try:
            # Broadcast to local subscribers (internal callbacks)
            if "alerts" in self.websocket_subscribers:
                for callback in self.websocket_subscribers["alerts"]:
                    try:
                        await callback(alert_message)
                    except Exception as e:
                        logger.error(f"Error in WebSocket callback: {e}")
            
            # Broadcast to symbol-specific channel
            symbol_channel = f"alerts:{alert_message['symbol']}"
            if symbol_channel in self.websocket_subscribers:
                for callback in self.websocket_subscribers[symbol_channel]:
                    try:
                        await callback(alert_message)
                    except Exception as e:
                        logger.error(f"Error in WebSocket callback: {e}")
            
            # Broadcast to WebSocket clients (frontend)
            try:
                from api.websocket import broadcast_alert_to_websocket
                await broadcast_alert_to_websocket(alert_message)
            except Exception as e:
                logger.error(f"Error broadcasting to WebSocket clients: {e}")
            
            logger.debug(f"📡 Alert broadcasted to {len(self.websocket_subscribers)} channels")
            
        except Exception as e:
            logger.error(f"Error broadcasting alert: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get alert manager statistics"""
        return {
            **self.stats,
            "active_alerts": len(self.active_alerts),
            "alerts_in_cooldown": len([
                aid for aid in self.alert_cooldowns
                if self._is_in_cooldown(aid)
            ]),
            "is_running": self.is_running,
            "check_interval": self.check_interval,
            "cooldown_seconds": self.cooldown_seconds,
        }


# Global alert manager instance
alert_manager = AlertManager()
