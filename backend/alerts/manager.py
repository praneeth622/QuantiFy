"""
Alert Manager for Real-time Trading Alerts
"""

import asyncio
import logging
from typing import Dict, List, Set, Callable, Optional
from datetime import datetime, timedelta

from database.connection import database_manager
from database.models import Alert, UserAlert
from analytics.engine import analytics_engine
from config import settings

logger = logging.getLogger(__name__)


class AlertManager:
    """Manages real-time alert monitoring and triggering"""
    
    def __init__(self):
        self.active_alerts: Dict[int, UserAlert] = {}
        self.alert_callbacks: Dict[str, Callable] = {}
        self.monitoring_task: Optional[asyncio.Task] = None
        self.is_running = False
        self.alert_cooldowns: Dict[int, datetime] = {}
    
    async def start(self):
        """Start alert monitoring"""
        self.is_running = True
        
        # Load active user alerts
        await self._load_user_alerts()
        
        # Start monitoring task
        self.monitoring_task = asyncio.create_task(self._monitor_alerts())
        
        logger.info("Alert manager started")
    
    async def stop(self):
        """Stop alert monitoring"""
        self.is_running = False
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Alert manager stopped")
    
    async def register_user_alert(self, alert_id: int):
        """Register a new user alert"""
        try:
            async for session in database_manager.get_session():
                user_alert = await session.get(UserAlert, alert_id)
                if user_alert and user_alert.is_enabled:
                    self.active_alerts[alert_id] = user_alert
                    logger.info(f"Registered user alert {alert_id}")
                break
        except Exception as e:
            logger.error(f"Error registering user alert {alert_id}: {e}")
    
    async def unregister_user_alert(self, alert_id: int):
        """Unregister a user alert"""
        if alert_id in self.active_alerts:
            del self.active_alerts[alert_id]
            logger.info(f"Unregistered user alert {alert_id}")
    
    def register_callback(self, name: str, callback: Callable):
        """Register alert callback"""
        self.alert_callbacks[name] = callback
        logger.info(f"Registered alert callback: {name}")
    
    async def trigger_alert(
        self,
        alert_type: str,
        symbol: str,
        title: str,
        message: str,
        severity: str = "medium",
        threshold_value: Optional[float] = None,
        actual_value: Optional[float] = None
    ):
        """Trigger a new alert"""
        try:
            # Create alert record
            alert = Alert(
                alert_type=alert_type,
                symbol=symbol,
                title=title,
                message=message,
                severity=severity,
                threshold_value=threshold_value,
                actual_value=actual_value,
                triggered_at=datetime.utcnow()
            )
            
            # Store in database
            async for session in database_manager.get_session():
                session.add(alert)
                await session.commit()
                await session.refresh(alert)
                break
            
            # Call registered callbacks
            await self._call_alert_callbacks(alert)
            
            logger.info(f"Alert triggered: {alert_type} for {symbol}")
            
        except Exception as e:
            logger.error(f"Error triggering alert: {e}")
    
    async def _load_user_alerts(self):
        """Load active user alerts from database"""
        try:
            async for session in database_manager.get_session():
                result = await session.execute(
                    "SELECT * FROM user_alerts WHERE is_enabled = true"
                )
                user_alerts = result.fetchall()
                
                for alert_data in user_alerts:
                    user_alert = UserAlert(**dict(alert_data))
                    self.active_alerts[user_alert.id] = user_alert
                
                logger.info(f"Loaded {len(self.active_alerts)} active user alerts")
                break
                
        except Exception as e:
            logger.error(f"Error loading user alerts: {e}")
    
    async def _monitor_alerts(self):
        """Main monitoring loop"""
        while self.is_running:
            try:
                # Check each active alert
                for alert_id, user_alert in self.active_alerts.items():
                    await self._check_user_alert(user_alert)
                
                # Sleep between checks
                await asyncio.sleep(10)  # Check every 10 seconds
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in alert monitoring: {e}")
                await asyncio.sleep(5)
    
    async def _check_user_alert(self, user_alert: UserAlert):
        """Check if a user alert should be triggered"""
        try:
            # Check cooldown
            if self._is_in_cooldown(user_alert.id):
                return
            
            # Get current value based on alert type
            current_value = await self._get_current_value(user_alert)
            
            if current_value is None:
                return
            
            # Check condition
            should_trigger = self._evaluate_condition(
                current_value,
                user_alert.condition,
                user_alert.threshold
            )
            
            if should_trigger:
                await self._trigger_user_alert(user_alert, current_value)
                
        except Exception as e:
            logger.error(f"Error checking user alert {user_alert.id}: {e}")
    
    async def _get_current_value(self, user_alert: UserAlert) -> Optional[float]:
        """Get current value for alert evaluation"""
        try:
            if user_alert.alert_type == "price":
                # Get latest price
                async for session in database_manager.get_session():
                    result = await session.execute(
                        f"SELECT price FROM tick_data WHERE symbol = '{user_alert.symbol}' "
                        f"ORDER BY timestamp DESC LIMIT 1"
                    )
                    row = result.fetchone()
                    return row[0] if row else None
            
            elif user_alert.alert_type == "z_score":
                # Calculate Z-score (assuming symbol format like "BTCUSDT-ETHUSDT")
                if "-" in user_alert.symbol:
                    symbol1, symbol2 = user_alert.symbol.split("-")
                    z_score = await analytics_engine.calculate_spread_zscore(symbol1, symbol2)
                    return z_score
            
            elif user_alert.alert_type == "volatility":
                volatility = await analytics_engine.calculate_volatility(user_alert.symbol)
                return volatility
            
            # Add more alert types as needed
            return None
            
        except Exception as e:
            logger.error(f"Error getting current value: {e}")
            return None
    
    def _evaluate_condition(self, current_value: float, condition: str, threshold: float) -> bool:
        """Evaluate alert condition"""
        if condition == "greater_than":
            return current_value > threshold
        elif condition == "less_than":
            return current_value < threshold
        elif condition == "equals":
            return abs(current_value - threshold) < 0.0001
        elif condition == "not_equals":
            return abs(current_value - threshold) >= 0.0001
        else:
            return False
    
    async def _trigger_user_alert(self, user_alert: UserAlert, current_value: float):
        """Trigger a user-defined alert"""
        try:
            # Set cooldown
            self.alert_cooldowns[user_alert.id] = datetime.utcnow()
            
            # Update last triggered time
            async for session in database_manager.get_session():
                user_alert.last_triggered = datetime.utcnow()
                await session.commit()
                break
            
            # Create alert message
            title = f"{user_alert.alert_type.title()} Alert: {user_alert.symbol}"
            message = (
                f"{user_alert.symbol} {user_alert.alert_type} is {current_value:.4f}, "
                f"which is {user_alert.condition} threshold {user_alert.threshold:.4f}"
            )
            
            # Determine severity based on how far from threshold
            severity = self._calculate_severity(current_value, user_alert.threshold, user_alert.condition)
            
            # Trigger alert
            await self.trigger_alert(
                alert_type=user_alert.alert_type,
                symbol=user_alert.symbol,
                title=title,
                message=message,
                severity=severity,
                threshold_value=user_alert.threshold,
                actual_value=current_value
            )
            
        except Exception as e:
            logger.error(f"Error triggering user alert: {e}")
    
    def _is_in_cooldown(self, alert_id: int) -> bool:
        """Check if alert is in cooldown period"""
        if alert_id not in self.alert_cooldowns:
            return False
        
        last_triggered = self.alert_cooldowns[alert_id]
        cooldown_period = timedelta(seconds=settings.ALERT_COOLDOWN_SECONDS)
        
        return datetime.utcnow() - last_triggered < cooldown_period
    
    def _calculate_severity(self, current_value: float, threshold: float, condition: str) -> str:
        """Calculate alert severity based on deviation from threshold"""
        if condition in ["greater_than", "less_than"]:
            deviation = abs(current_value - threshold) / threshold
            
            if deviation > 0.1:  # 10% deviation
                return "high"
            elif deviation > 0.05:  # 5% deviation
                return "medium"
            else:
                return "low"
        
        return "medium"
    
    async def _call_alert_callbacks(self, alert: Alert):
        """Call registered alert callbacks"""
        for callback_name, callback in self.alert_callbacks.items():
            try:
                await callback(alert)
            except Exception as e:
                logger.error(f"Error in alert callback {callback_name}: {e}")


# Global alert manager instance
alert_manager = AlertManager()