#!/bin/bash
set -e

cp .env .env.bak
cp .env.local .env

# Start a local Postgres instance if one is not already running
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-testpass}"
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

# Run database migrations and create tables if needed
npx prisma db push

# Prepare admin service Prisma files
npm --prefix src/backend/admin run build:prep

# Default environment variables for local dev
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/bandbridge}"
export MEDIA_SERVICE_URL="${MEDIA_SERVICE_URL:-http://localhost:4001}"
export ADMIN_API_KEY="${ADMIN_API_KEY:-test-admin-key-123}"
export MAX_UPLOAD_SIZE="${MAX_UPLOAD_SIZE:-1GB}"
export FILESTORE_PATH="${FILESTORE_PATH:-$(pwd)/filestore}"

# Start media microservice with hot reload
npx nodemon --watch src/backend/media --ext ts \
  --exec "npm --silent --prefix src/backend/media run build && node src/backend/media/dist/index.js" &
media_pid=$!

# Start admin microservice with hot reload
npx nodemon --watch src/backend/admin/src --ext ts \
  --exec "npm --silent --prefix src/backend/admin run build && node src/backend/admin/dist/src/index.js" &
admin_pid=$!

# Start Next.js app in dev mode (hot reload)
npm run dev &
web_pid=$!

# Function to create test band and user
create_test_data() {
  local test_username="testuser"
  local test_password="testuser"
  local test_bandname="testband"
  
  echo "Waiting for services to be ready..."
  sleep 5
  
  # Wait for admin service to be ready
  while ! curl -s http://localhost:4002/health >/dev/null 2>&1; do
    sleep 1
  done
  
  # Create test band first
  echo "Creating test band..."
  band_response=$(curl -s -w "%{http_code}" -X POST http://localhost:4002/admin/bands \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ADMIN_API_KEY}" \
    -d "{\"name\":\"${test_bandname}\"}" \
    2>/dev/null)
  
  band_http_code="${band_response: -3}"
  band_response_body="${band_response%???}"
  
  if [ "$band_http_code" = "201" ]; then
    echo "✅ Test band created successfully!"
    band_id=$(echo "$band_response_body" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
  elif [ "$band_http_code" = "409" ]; then
    echo "ℹ️  Test band already exists"
    # For simplicity, assume band ID is 1 if it already exists
    band_id=1
  else
    echo "❌ Failed to create test band (HTTP ${band_http_code})"
    echo "Response: ${band_response_body}"
    return 1
  fi
  
  # Create test user
  echo "Creating test user..."
  user_response=$(curl -s -w "%{http_code}" -X POST http://localhost:4002/admin/users \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ADMIN_API_KEY}" \
    -d "{\"username\":\"${test_username}\",\"password\":\"${test_password}\"}" \
    2>/dev/null)
  
  user_http_code="${user_response: -3}"
  user_response_body="${user_response%???}"
  
  if [ "$user_http_code" = "201" ]; then
    echo "✅ Test user created successfully!"
    user_id=$(echo "$user_response_body" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
  elif [ "$user_http_code" = "409" ]; then
    echo "ℹ️  Test user already exists"
    # For simplicity, assume user ID is 1 if it already exists
    user_id=1
  else
    echo "❌ Failed to create test user (HTTP ${user_http_code})"
    echo "Response: ${user_response_body}"
    return 1
  fi
  
  # Assign user to band
  echo "Assigning test user to test band..."
  assignment_response=$(curl -s -w "%{http_code}" -X POST http://localhost:4002/admin/bands/${band_id}/users \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ADMIN_API_KEY}" \
    -d "{\"userId\":${user_id}}" \
    2>/dev/null)
  
  assignment_http_code="${assignment_response: -3}"
  assignment_response_body="${assignment_response%???}"
  
  if [ "$assignment_http_code" = "201" ]; then
    echo "✅ Test user assigned to test band successfully!"
  elif [ "$assignment_http_code" = "409" ]; then
    echo "ℹ️  Test user already assigned to test band"
  else
    echo "❌ Failed to assign test user to test band (HTTP ${assignment_http_code})"
    echo "Response: ${assignment_response_body}"
  fi
  
  echo "📝 Login credentials:"
  echo "   Username: ${test_username}"
  echo "   Password: ${test_password}"
  echo "   Band: ${test_bandname}"
}

# Create test data in background
create_test_data &

cleanup() {
  echo "Stopping..."
  kill $media_pid $admin_pid $web_pid 2>/dev/null || true
  docker rm -f ${PG_CONTAINER_NAME} >/dev/null 2>&1 || true
}

trap cleanup INT TERM EXIT

wait $web_pid
