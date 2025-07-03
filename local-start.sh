#!/bin/bash
set -e

# Build prisma client
npm run generate:schema

# Build audio microservice
npm --prefix src/backend/audio run build

# Build admin microservice (copy prisma client and compile)
npm --prefix src/backend/admin run build:prep
npm --prefix src/backend/admin run build

# Build Next.js app
npm run build

# Default environment variables
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/bandbridge}"
export AUDIO_SERVICE_URL="${AUDIO_SERVICE_URL:-http://localhost:4001}"
export ADMIN_API_KEY="${ADMIN_API_KEY:-changeme}"
export MAX_UPLOAD_SIZE="${MAX_UPLOAD_SIZE:-1GB}"

# Start services
npm --prefix src/backend/audio start &
audio_pid=$!

npm --prefix src/backend/admin start &
admin_pid=$!

npm start &
web_pid=$!

trap 'echo Stopping...; kill $audio_pid $admin_pid $web_pid' INT TERM

wait $web_pid
