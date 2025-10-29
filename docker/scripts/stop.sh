#!/bin/bash

# Docker Stop Script for Badminton App
# This script stops all services and cleans up

set -e

echo "Stopping Badminton App..."

# Stop all services
docker compose down

echo "Cleaning up unused Docker resources..."

# Remove unused containers, networks, and images
docker system prune -f

echo "Badminton App stopped and cleaned up!"
echo ""
echo "To start again: ./docker/scripts/start.sh"
