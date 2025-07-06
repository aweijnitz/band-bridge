#!/bin/bash

# Script to run E2E tests for admin and media microservices
# This script:
# 1. Starts PostgreSQL and microservices in Docker
# 2. Waits for services to be ready
# 3. Runs the E2E tests
# 4. Cleans up Docker containers and volumes

set -e

echo "🚀 Starting E2E tests for microservices..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to cleanup Docker resources
cleanup() {
    print_status "Cleaning up Docker resources..."
    
    # Stop and remove containers
    docker compose -f docker-compose.test.yml down --volumes --remove-orphans 2>/dev/null || true
    
    # Remove test volumes
    docker volume rm band-bridge_test_db_data 2>/dev/null || true
    docker volume rm band-bridge_test_asset_filestore 2>/dev/null || true
    
    # Remove any dangling images
    docker image prune -f 2>/dev/null || true
    
    print_status "Cleanup complete"
}

# Trap cleanup function on script exit
trap cleanup EXIT

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker compose is available
if ! docker compose version >/dev/null 2>&1; then
    print_error "docker compose is not available. Please install Docker Desktop and try again."
    exit 1
fi

# Clean up any existing containers/volumes
cleanup

print_status "Building and starting test services..."

# Build and start the test services
docker compose -f docker-compose.test.yml up -d --build

# Wait for services to be healthy
print_status "Waiting for services to be ready..."

# Function to wait for service health
wait_for_service() {
    local service_name=$1
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker compose -f docker-compose.test.yml ps | grep -q "${service_name}.*healthy"; then
            print_status "${service_name} is ready"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "${service_name} failed to become healthy after ${max_attempts} attempts"
            docker compose -f docker-compose.test.yml logs ${service_name}
            return 1
        fi
        
        print_status "Waiting for ${service_name}... (${attempt}/${max_attempts})"
        sleep 5
        ((attempt++))
    done
}

# Wait for all services to be healthy
wait_for_service "test-db"
wait_for_service "test-media"
wait_for_service "test-admin"

# Run database migrations for the admin service
print_status "Running database migrations..."
docker compose -f docker-compose.test.yml exec -T test-admin npx prisma migrate deploy || {
    print_error "Database migration failed"
    exit 1
}

# Run the E2E tests
print_status "Running E2E tests..."

# Set environment variables for the tests
export PLAYWRIGHT_BASE_URL_ADMIN="http://localhost:4002"
export PLAYWRIGHT_BASE_URL_AUDIO="http://localhost:4001"

# Run only the microservices E2E tests
if npm run test:e2e -- --grep "Admin Server E2E Tests|Media Server E2E Tests"; then
    print_status "✅ All E2E tests passed!"
else
    print_error "❌ Some E2E tests failed!"
    exit 1
fi

print_status "🎉 E2E test run completed successfully!"