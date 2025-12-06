#!/bin/bash
# Setup script for CT 200 - Run this INSIDE the container after SSH

set -e

echo "=== Setting up CT 200 for Portfolio Deployment ==="

# Step 1: Check if /srv/docker exists
if [ ! -d "/srv/docker" ]; then
    echo "Creating /srv/docker directory..."
    mkdir -p /srv/docker
else
    echo "✓ /srv/docker already exists"
fi

# Step 2: Create portfolio project directory
echo "Creating portfolio project directory..."
mkdir -p /srv/docker/portfolio

# Step 3: Verify Docker is installed
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed!"
    echo "Please install Docker first:"
    echo "  curl -fsSL https://get.docker.com | sh"
    exit 1
else
    echo "✓ Docker is installed: $(docker --version)"
fi

# Step 4: Verify Docker Compose is installed
if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
    echo "ERROR: Docker Compose is not installed!"
    echo "Please install Docker Compose plugin"
    exit 1
else
    echo "✓ Docker Compose is installed: $(docker compose version)"
fi

# Step 5: Check if webnet network exists
if ! docker network ls | grep -q webnet; then
    echo "Creating webnet Docker network..."
    docker network create webnet
else
    echo "✓ webnet network already exists"
fi

# Step 6: Show current directory structure
echo ""
echo "=== Current Directory Structure ==="
ls -lah /srv/docker/

echo ""
echo "=== Setup Complete! ==="
echo "You can now proceed with deployment:"
echo "  cd /srv/docker/portfolio"
echo ""
