#!/bin/bash
set -e

# Start a local Postgres instance if one is not already running
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postrespass}"
PG_CONTAINER_NAME="bandbridge-dev-postgres"

if command -v docker >/dev/null; then
  if ! docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER_NAME}$"; then
    echo "Starting postgres container ${PG_CONTAINER_NAME}..."
    docker run -d --name ${PG_CONTAINER_NAME} \
      -e POSTGRES_USER=postgres \
      -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
      -e POSTGRES_DB=bandbridge \
      -p 5432:5432 postgres:15
  else
    docker start ${PG_CONTAINER_NAME}
  fi

  echo "Waiting for postgres to be ready..."
  until docker exec ${PG_CONTAINER_NAME} pg_isready -U postgres >/dev/null 2>&1; do
    sleep 1
  done
else
  echo "Docker is required to run the local database" >&2
  exit 1
fi

# Build Prisma client used by all services
npm run generate:schema

# Prepare admin service Prisma files
npm --prefix src/backend/admin run build:prep

# Default environment variables for local dev
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/bandbridge}"
export AUDIO_SERVICE_URL="${AUDIO_SERVICE_URL:-http://localhost:4001}"
export ADMIN_API_KEY="${ADMIN_API_KEY:-changeme}"
export MAX_UPLOAD_SIZE="${MAX_UPLOAD_SIZE:-1GB}"

# Start audio microservice with hot reload
npx nodemon --watch src/backend/audio --ext ts \
  --exec "npm --silent --prefix src/backend/audio run build && node src/backend/audio/dist/index.js" &
audio_pid=$!

# Start admin microservice with hot reload
npx nodemon --watch src/backend/admin/src --ext ts \
  --exec "npm --silent --prefix src/backend/admin run build && node src/backend/admin/dist/src/index.js" &
admin_pid=$!

# Start Next.js app in dev mode (hot reload)
npm run dev &
web_pid=$!

# Function to create test user
create_test_user() {
  local test_username="testuser"
  local test_password="testuser"
  
  echo "Waiting for services to be ready..."
  sleep 5
  
  # Wait for admin service to be ready
  while ! curl -s http://localhost:4002/health >/dev/null 2>&1; do
    sleep 1
  done
  
  echo "Creating test user..."
  response=$(curl -s -w "%{http_code}" -X POST http://localhost:4002/admin/users \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ADMIN_API_KEY}" \
    -d "{\"username\":\"${test_username}\",\"password\":\"${test_password}\"}" \
    2>/dev/null)
  
  http_code="${response: -3}"
  response_body="${response%???}"
  
  if [ "$http_code" = "201" ]; then
    echo "✅ Test user created successfully!"
    echo "📝 Login credentials:"
    echo "   Username: ${test_username}"
    echo "   Password: ${test_password}"
  elif [ "$http_code" = "409" ]; then
    echo "ℹ️  Test user already exists"
    echo "📝 Login credentials:"
    echo "   Username: ${test_username}"
    echo "   Password: ${test_password}"
  else
    echo "❌ Failed to create test user (HTTP ${http_code})"
    echo "Response: ${response_body}"
  fi
}

# Create test user in background
create_test_user &

cleanup() {
  echo "Stopping..."
  kill $audio_pid $admin_pid $web_pid 2>/dev/null || true
  docker rm -f ${PG_CONTAINER_NAME} >/dev/null 2>&1 || true
}

trap cleanup INT TERM EXIT

wait $web_pid
