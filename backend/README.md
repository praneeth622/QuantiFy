# QuantiFy Backend

## Setup Instructions

### 1. Environment Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
# Important: Update these values:
# - DATABASE_URL
# - REDIS_URL  
# - BINANCE_API_KEY
# - BINANCE_SECRET_KEY
# - SECRET_KEY
```

### 3. Database Setup

For PostgreSQL (Production):
```bash
# Create database
createdb quantify_db

# Run migrations (if using Alembic)
alembic upgrade head
```

For SQLite (Development):
```bash
# Database will be created automatically
# File: ./quantify.db
```

### 4. Run the Application

Development mode:
```bash
# Start the FastAPI server
python main.py

# Or with uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Production mode:
```bash
# Set environment
export ENVIRONMENT=production

# Start with multiple workers
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 5. Docker Setup (Optional)

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build Docker image only
docker build -t quantify-backend .
docker run -p 8000:8000 quantify-backend
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── main.py                 # FastAPI application entry point
├── config.py              # Configuration management
├── requirements.txt       # Python dependencies
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose setup
├── .env.example          # Environment template
├── utils.py              # Utility functions
│
├── api/                  # API layer
│   ├── __init__.py
│   └── routes/          # API routes
│       ├── __init__.py
│       ├── health.py    # Health check endpoints
│       ├── market_data.py  # Market data endpoints
│       ├── analytics.py    # Analytics endpoints
│       └── alerts.py       # Alert endpoints
│
├── database/            # Database layer
│   ├── __init__.py
│   ├── models.py       # SQLAlchemy models
│   └── connection.py   # Database connection management
│
├── ingestion/          # Data ingestion
│   ├── __init__.py
│   └── websocket_manager.py  # WebSocket data streams
│
├── analytics/          # Analytics engine
│   ├── __init__.py
│   └── engine.py      # Quantitative calculations
│
└── alerts/            # Alert system
    ├── __init__.py
    └── manager.py     # Alert monitoring and triggering
```

## Key Features

### Real-time Data Ingestion
- WebSocket connections to Binance API
- Tick data storage and processing
- Multiple symbol support

### Analytics Engine
- Statistical arbitrage calculations
- Correlation analysis
- Hedge ratio computation
- Z-score calculations
- Cointegration testing
- Volatility analysis

### Alert System
- Real-time monitoring
- User-defined alert rules
- Multiple alert types (price, z-score, volatility)
- Configurable thresholds and conditions

### RESTful API
- Market data endpoints
- Analytics calculations
- Alert management
- Historical data access

## Environment Variables

Key configuration options:

```bash
# Server
ENVIRONMENT=development
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/quantify_db

# Redis (for caching)
REDIS_URL=redis://localhost:6379/0

# Binance API
BINANCE_API_KEY=your_api_key
BINANCE_SECRET_KEY=your_secret_key
BINANCE_TESTNET=true

# Security
SECRET_KEY=your-secret-key

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## Development

### Code Style
```bash
# Format code
black .
isort .

# Lint code  
flake8 .
mypy .
```

### Testing
```bash
# Run tests
pytest

# Run with coverage
pytest --cov=.
```

## Production Deployment

1. Set `ENVIRONMENT=production`
2. Use PostgreSQL for database
3. Set up Redis for caching
4. Configure proper SECRET_KEY
5. Set up reverse proxy (nginx)
6. Use process manager (systemd, supervisor)
7. Set up monitoring and logging

## Monitoring

The application includes:
- Health check endpoints
- Prometheus metrics (if enabled)
- Structured logging
- Error tracking

## Security

- CORS configuration
- Rate limiting
- Input validation
- SQL injection prevention
- Environment-based configuration