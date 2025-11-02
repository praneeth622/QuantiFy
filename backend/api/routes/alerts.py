"""
Alerts API Routes
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from database.connection import get_db
from database.models import Alert, UserAlert
from alerts.manager import alert_manager

router = APIRouter()


class AlertResponse(BaseModel):
    id: int
    alert_type: str
    symbol: str
    title: str
    message: str
    severity: str
    threshold_value: Optional[float]
    actual_value: Optional[float]
    is_active: bool
    triggered_at: datetime


class CreateAlertRequest(BaseModel):
    symbol: str
    alert_type: str
    condition: str  # greater_than, less_than, etc.
    threshold: float
    user_id: str = "default"


class UserAlertResponse(BaseModel):
    id: int
    symbol: str
    alert_type: str
    condition: str
    threshold: float
    is_enabled: bool
    last_triggered: Optional[datetime]
    created_at: datetime


@router.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(
    symbol: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    limit: int = Query(default=100, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get alerts with optional filters"""
    try:
        query = select(Alert)
        
        # Apply filters
        conditions = []
        if symbol:
            conditions.append(Alert.symbol == symbol.upper())
        if severity:
            conditions.append(Alert.severity == severity)
        if is_active is not None:
            conditions.append(Alert.is_active == is_active)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        query = query.order_by(desc(Alert.triggered_at)).limit(limit)
        
        result = await db.execute(query)
        alerts = result.scalars().all()
        
        return [
            AlertResponse(
                id=alert.id,
                alert_type=alert.alert_type,
                symbol=alert.symbol,
                title=alert.title,
                message=alert.message,
                severity=alert.severity,
                threshold_value=alert.threshold_value,
                actual_value=alert.actual_value,
                is_active=alert.is_active,
                triggered_at=alert.triggered_at
            )
            for alert in alerts
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/{alert_id}", response_model=AlertResponse)
async def get_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    """Get specific alert by ID"""
    try:
        query = select(Alert).where(Alert.id == alert_id)
        result = await db.execute(query)
        alert = result.scalar_one_or_none()
        
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return AlertResponse(
            id=alert.id,
            alert_type=alert.alert_type,
            symbol=alert.symbol,
            title=alert.title,
            message=alert.message,
            severity=alert.severity,
            threshold_value=alert.threshold_value,
            actual_value=alert.actual_value,
            is_active=alert.is_active,
            triggered_at=alert.triggered_at
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    """Mark an alert as resolved"""
    try:
        query = select(Alert).where(Alert.id == alert_id)
        result = await db.execute(query)
        alert = result.scalar_one_or_none()
        
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        alert.is_active = False
        alert.resolved_at = datetime.utcnow()
        
        await db.commit()
        
        return {"message": "Alert resolved successfully", "alert_id": alert_id}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user-alerts", response_model=List[UserAlertResponse])
async def get_user_alerts(
    user_id: str = Query(default="default"),
    symbol: Optional[str] = Query(None),
    is_enabled: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get user-defined alert configurations"""
    try:
        query = select(UserAlert).where(UserAlert.user_id == user_id)
        
        if symbol:
            query = query.where(UserAlert.symbol == symbol.upper())
        if is_enabled is not None:
            query = query.where(UserAlert.is_enabled == is_enabled)
        
        query = query.order_by(desc(UserAlert.created_at))
        
        result = await db.execute(query)
        user_alerts = result.scalars().all()
        
        return [
            UserAlertResponse(
                id=alert.id,
                symbol=alert.symbol,
                alert_type=alert.alert_type,
                condition=alert.condition,
                threshold=alert.threshold,
                is_enabled=alert.is_enabled,
                last_triggered=alert.last_triggered,
                created_at=alert.created_at
            )
            for alert in user_alerts
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user-alerts", response_model=UserAlertResponse)
async def create_user_alert(
    request: CreateAlertRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new user alert configuration"""
    try:
        user_alert = UserAlert(
            user_id=request.user_id,
            symbol=request.symbol.upper(),
            alert_type=request.alert_type,
            condition=request.condition,
            threshold=request.threshold,
            is_enabled=True
        )
        
        db.add(user_alert)
        await db.commit()
        await db.refresh(user_alert)
        
        # Register alert with alert manager
        await alert_manager.register_user_alert(user_alert.id)
        
        return UserAlertResponse(
            id=user_alert.id,
            symbol=user_alert.symbol,
            alert_type=user_alert.alert_type,
            condition=user_alert.condition,
            threshold=user_alert.threshold,
            is_enabled=user_alert.is_enabled,
            last_triggered=user_alert.last_triggered,
            created_at=user_alert.created_at
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/user-alerts/{alert_id}")
async def update_user_alert(
    alert_id: int,
    is_enabled: bool,
    threshold: Optional[float] = None,
    db: AsyncSession = Depends(get_db)
):
    """Update user alert configuration"""
    try:
        query = select(UserAlert).where(UserAlert.id == alert_id)
        result = await db.execute(query)
        user_alert = result.scalar_one_or_none()
        
        if not user_alert:
            raise HTTPException(status_code=404, detail="User alert not found")
        
        user_alert.is_enabled = is_enabled
        if threshold is not None:
            user_alert.threshold = threshold
        user_alert.updated_at = datetime.utcnow()
        
        await db.commit()
        
        return {"message": "User alert updated successfully", "alert_id": alert_id}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/user-alerts/{alert_id}")
async def delete_user_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    """Delete user alert configuration"""
    try:
        query = select(UserAlert).where(UserAlert.id == alert_id)
        result = await db.execute(query)
        user_alert = result.scalar_one_or_none()
        
        if not user_alert:
            raise HTTPException(status_code=404, detail="User alert not found")
        
        await db.delete(user_alert)
        await db.commit()
        
        # Unregister from alert manager
        await alert_manager.unregister_user_alert(alert_id)
        
        return {"message": "User alert deleted successfully", "alert_id": alert_id}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/summary")
async def get_alerts_summary(db: AsyncSession = Depends(get_db)):
    """Get alerts summary statistics"""
    try:
        # Count alerts by severity
        severity_query = select(Alert.severity).where(Alert.is_active == True)
        result = await db.execute(severity_query)
        severities = [row[0] for row in result.fetchall()]
        
        severity_counts = {}
        for severity in severities:
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        # Count total active alerts
        total_active = len(severities)
        
        # Count alerts by type
        type_query = select(Alert.alert_type).where(Alert.is_active == True)
        result = await db.execute(type_query)
        alert_types = [row[0] for row in result.fetchall()]
        
        type_counts = {}
        for alert_type in alert_types:
            type_counts[alert_type] = type_counts.get(alert_type, 0) + 1
        
        return {
            "total_active_alerts": total_active,
            "severity_breakdown": severity_counts,
            "type_breakdown": type_counts,
            "timestamp": datetime.utcnow()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))