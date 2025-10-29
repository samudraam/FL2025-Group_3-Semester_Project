#!/bin/bash

# Docker Start Script for Badminton App
# This script starts all services using Docker Compose

set -e

echo "🏸 Starting Badminton App with Docker..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo ".env file not found. Creating from example..."
    cp docker/env.example .env
    echo "Please edit .env file with your configuration before running again."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start services
echo "Building Docker images..."
docker compose build

echo "Starting services..."
docker compose up -d

# Wait for services to be healthy
echo "Waiting for services to be ready..."
sleep 10

# Check service health
echo "Checking service health..."

# Check MongoDB
if docker compose exec mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "MongoDB is healthy"
else
    echo "MongoDB is not responding"
fi

# Check Backend
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "Backend API is healthy"
else
    echo "Backend API is not responding"
fi

# Check Frontend
if curl -f http://localhost:8081 > /dev/null 2>&1; then
    echo "Frontend is healthy"
else
    echo "Frontend is not responding"
fi

echo ""
echo "Badminton App is running!"
echo "Frontend: http://10.232.183.62:8081"
echo "Backend API: http://10.232.183.62:3001"
echo "MongoDB: 10.232.183.62:27017"
echo ""
echo "View logs: docker compose logs -f"
echo "Stop services: docker compose down"
echo ""
