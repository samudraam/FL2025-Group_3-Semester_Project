#!/bin/bash

# Docker Logs Script for Badminton App
# This script shows logs for all services or specific service

set -e

SERVICE=${1:-""}

if [ -z "$SERVICE" ]; then
    echo "Showing logs for all services..."
    echo "Usage: $0 [service_name] (mongodb|backend|frontend)"
    echo ""
    docker compose logs -f
else
    echo "Showing logs for $SERVICE..."
    docker compose logs -f "$SERVICE"
fi
