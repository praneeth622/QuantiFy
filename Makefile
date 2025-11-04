.PHONY: help build up down restart logs clean dev prod

# Default target
help:
	@echo "QuantiFy Docker Management"
	@echo ""
	@echo "Available commands:"
	@echo "  make dev          - Start in development mode"
	@echo "  make prod         - Start in production mode"
	@echo "  make build        - Build all Docker images"
	@echo "  make up           - Start all containers"
	@echo "  make down         - Stop all containers"
	@echo "  make restart      - Restart all containers"
	@echo "  make logs         - View logs from all containers"
	@echo "  make clean        - Remove all containers, volumes, and images"
	@echo "  make shell-backend  - Open shell in backend container"
	@echo "  make shell-frontend - Open shell in frontend container"
	@echo "  make db-migrate   - Run database migrations"
	@echo "  make test         - Run tests"

# Development mode
dev:
	@echo "Starting QuantiFy in development mode..."
	docker compose -f docker-compose.dev.yml up --build -d
	@echo "Services started!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"

# Production mode
prod:
	@echo "Starting QuantiFy in production mode..."
	docker compose -f docker-compose.yml up --build -d
	@echo "Services started!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:8000"

# Build images
build:
	@echo "Building Docker images..."
	docker compose -f docker-compose.yml build
	docker compose -f docker-compose.dev.yml build

# Start containers
up:
	docker compose -f docker-compose.yml up -d

# Stop containers
down:
	docker compose -f docker-compose.yml down
	docker compose -f docker-compose.dev.yml down

# Restart containers
restart:
	docker compose -f docker-compose.yml restart
	docker compose -f docker-compose.dev.yml restart

# View logs
logs:
	docker compose -f docker-compose.yml logs -f

# Clean everything
clean:
	@echo "Removing all containers, volumes, and images..."
	docker compose -f docker-compose.yml down -v --rmi all
	docker compose -f docker-compose.dev.yml down -v --rmi all
	@echo "Cleanup complete!"

# Shell access
shell-backend:
	docker exec -it quantify-backend /bin/bash

shell-frontend:
	docker exec -it quantify-frontend /bin/sh

# Database migrations
db-migrate:
	docker exec -it quantify-backend alembic upgrade head

# Run tests
test:
	docker exec -it quantify-backend pytest
	docker exec -it quantify-frontend npm test

# Health check
health:
	@echo "Checking service health..."
	@curl -f http://localhost:8000/health && echo "✓ Backend healthy" || echo "✗ Backend unhealthy"
	@curl -f http://localhost:3000 && echo "✓ Frontend healthy" || echo "✗ Frontend unhealthy"

