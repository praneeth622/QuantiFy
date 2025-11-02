"""
Configuration management for QuantiFy backend
"""

from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings"""
    
    # Environment
    ENVIRONMENT: str = Field(default="development", description="Application environment")
    DEBUG: bool = Field(default=True, description="Debug mode")
    
    # Server
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8000, description="Server port")
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    
    # Database
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./quantify.db",
        description="Database connection URL"
    )
    
    # Redis
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL"
    )
    
    # External APIs
    BINANCE_API_KEY: str = Field(default="", description="Binance API key")
    BINANCE_SECRET_KEY: str = Field(default="", description="Binance secret key")
    BINANCE_TESTNET: bool = Field(default=True, description="Use Binance testnet")
    
    # CORS
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8080"],
        description="Allowed CORS origins"
    )
    
    # WebSocket
    WS_MAX_CONNECTIONS: int = Field(default=1000, description="Max WebSocket connections")
    WS_HEARTBEAT_INTERVAL: int = Field(default=30, description="WebSocket heartbeat interval")
    
    # Analytics
    ANALYTICS_WINDOW_SIZES: str = Field(
        default="60,300,900,3600",
        description="Analytics window sizes in seconds"
    )
    DEFAULT_LOOKBACK_PERIODS: int = Field(default=100, description="Default lookback periods")
    MAX_SYMBOLS_PER_REQUEST: int = Field(default=50, description="Max symbols per request")
    
    # Alerts
    ALERT_COOLDOWN_SECONDS: int = Field(default=60, description="Alert cooldown period")
    MAX_ALERTS_PER_MINUTE: int = Field(default=10, description="Max alerts per minute")
    
    # Security
    SECRET_KEY: str = Field(
        default="dev-secret-key-change-in-production",
        description="Secret key for JWT tokens"
    )
    ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, description="Token expiry time")
    
    # Monitoring
    ENABLE_METRICS: bool = Field(default=True, description="Enable Prometheus metrics")
    METRICS_PORT: int = Field(default=9090, description="Metrics server port")
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = Field(default=100, description="Rate limit per minute")
    
    # Data Retention
    TICK_DATA_RETENTION_DAYS: int = Field(default=30, description="Tick data retention")
    ANALYTICS_DATA_RETENTION_DAYS: int = Field(default=365, description="Analytics data retention")
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    @property
    def analytics_windows(self) -> List[int]:
        """Parse analytics window sizes"""
        return [int(x.strip()) for x in self.ANALYTICS_WINDOW_SIZES.split(",")]
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.ENVIRONMENT.lower() == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.ENVIRONMENT.lower() == "production"


# Global settings instance
settings = Settings()