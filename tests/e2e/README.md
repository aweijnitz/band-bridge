# End-to-End Tests for Microservices

This directory contains E2E tests for the Band Bridge microservices (admin server and media server).

## Test Files

- `admin-server.spec.ts` - Tests for admin server REST APIs (user management, bands, API keys)
- `media-server.spec.ts` - Tests for media server REST APIs (file upload, retrieval, deletion)
- `microservices.global-setup.ts` - Global setup that starts Docker services
- `microservices.global-teardown.ts` - Global teardown that cleans up Docker resources

## Running the Tests

### Option 1: Using npm scripts (Recommended)

```bash
# Build the prebuilt media test image once (heavy step; cached afterwards)
npm run build:test-media-image

# Run microservices E2E tests with automated Docker management
npm run test:e2e:microservices

# Run with manual script (includes colored output and detailed logging)
npm run test:e2e:microservices:manual
```

By default, the E2E setup expects a prebuilt media image:
- `TEST_MEDIA_IMAGE=band-bridge-test-media:local`

Optional flags:
- `E2E_BUILD_TEST_MEDIA_IMAGE=1` - build media image during setup
- `E2E_BUILD_COMPOSE_IMAGES=1` - force compose rebuild for app/admin images

### Option 2: Manual Docker setup

```bash
# 1. Build test-media image once
TEST_MEDIA_IMAGE=band-bridge-test-media:local ./scripts/build-test-media-image.sh

# 2. Start test services (without forced rebuild)
docker compose -f docker-compose.test.yml up -d

# 3. Wait for services to be healthy (check with docker ps)
docker compose -f docker-compose.test.yml ps

# 4. Run migrations
docker compose -f docker-compose.test.yml exec test-admin npx prisma migrate deploy

# 5. Run tests
npx playwright test --config=playwright.microservices.config.ts

# 6. Clean up
docker compose -f docker-compose.test.yml down --volumes --remove-orphans
```

## Test Services

The tests use isolated Docker containers:

- **test-db**: PostgreSQL database (port 5433)
- **test-media**: Media microservice (port 4001)
- **test-admin**: Admin microservice (port 4002)

## Test Coverage

### Admin Server Tests
- Health check endpoint
- User creation and validation
- Band creation and management
- User-band assignments
- API key creation and management
- API key revocation
- Rate limiting
- Authentication requirements

### Media Server Tests
- Health check endpoint
- File upload (audio, video, text)
- File retrieval
- File deletion
- Waveform generation for audio files
- Upload size limits
- Error handling for missing files
- Unique filename generation

## Environment Variables

The tests use these environment variables:
- `POSTGRES_PASSWORD=testpass`
- `POSTGRES_DB=bandbridge_test`
- `ADMIN_API_KEY=test-admin-key-123`
- `JWT_SECRET=test-jwt-secret`
- `MAX_UPLOAD_SIZE=1GB`

## Test Data

The tests use `test-data/120bpm-test-track.wav` for file upload testing.

## Troubleshooting

1. **Docker not running**: Ensure Docker Desktop is running
2. **Port conflicts**: Check that ports 4001, 4002, and 5433 are available
3. **Services not healthy**: Check service logs with `docker-compose -f docker-compose.test.yml logs [service-name]`
4. **Migration failures**: Ensure database is running and accessible
5. **File upload failures**: Check that the media service has proper file permissions

## Architecture Notes

- Tests run sequentially to avoid resource conflicts
- Each test suite manages its own test data
- Database is reset between test runs
- File uploads are cleaned up after each test
- Global setup/teardown ensures proper environment isolation
