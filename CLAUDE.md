# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build application (includes Prisma generation)
- `npm run generate:schema` - Generate Prisma client
- `npm start` - Start production server

### Testing
- `npm test` - Run all tests (API and UI)
- `npm run test:api` - Run API tests only
- `npm run test:ui` - Run UI tests only  
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:e2e` - Run Playwright end-to-end tests

### Code Quality
- `npm run lint` - Run ESLint

### Database
- `npm run reset` - Reset database and clear filestore (destructive)

### Microservices
- `npm run start:audio-service` - Start audio service independently
- `npm run build:audio-service` - Build audio service

## Architecture Overview

Band Bridge is a microservices-based web application for band collaboration with the following key components:

### Core Services
1. **Next.js App** (`src/app/`) - Main web application with API routes
2. **Audio Microservice** (`src/backend/audio/`) - Handles media uploads and waveform generation
3. **Admin Microservice** (`src/backend/admin/`) - User and band management

### Database Schema
- **Users** - Authentication and user management
- **Bands** - Band/group organization
- **Projects** - Individual musical projects
- **Media** - Audio/video files with metadata
- **Comments** - Time-based comments on media
- **Sessions** - User session management
- **ApiKeys** - API key management for users

### Key Features
- Time-based commenting on audio/video files
- Waveform pre-computation using BBC audiowaveform
- Deep linking to media with timestamps
- File proxying through Next.js API for security
- Session-based authentication with middleware

## Development Patterns

### API Structure
- RESTful API routes in `src/app/api/`
- Nested routes for projects and media: `/api/project/[id]/media/[mediaId]`
- Authentication middleware protects most routes
- File operations proxied through Next.js to audio microservice

### Authentication
- Session-based auth with database-stored sessions
- Middleware in `src/app/middleware.ts` protects routes
- Public paths: login, root, and deep-linked media URLs
- Session validation in `src/app/api/auth/session.ts`

### Media Handling
- Audio microservice handles file uploads and processing
- Waveform generation using `audiowaveform` for `.dat` files
- Files stored in Docker volume at `/assetfilestore`
- Media types: audio (MP3/WAV), video (MP4/MOV/AVI/H.264)

### Database Operations
- Prisma ORM with PostgreSQL
- Generated client in `src/generated/prisma/`
- Multiple binary targets for cross-platform deployment
- Migrations in `prisma/migrations/`

## Testing Strategy

### API Tests (`tests/api/`)
- Jest with ts-jest
- Tests for projects, media, comments, and file operations
- Separate test configuration in `tsconfig.jest.json`

### UI Tests (`tests/ui/`)
- React Testing Library with Jest
- Component-level testing for dashboard and project components
- jsdom environment for browser simulation

### E2E Tests (`tests/e2e/`)
- Playwright for end-to-end testing
- Global setup/teardown for test environment

## Docker Architecture

The application runs in a multi-container setup:
- Main app container (Next.js)
- Audio service container (Express + audiowaveform)
- Admin service container (Express + Prisma)
- PostgreSQL database container
- Shared volume for file storage

## Environment Configuration

Key environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `ADMIN_API_KEY` - Static API key for admin service
- `AUDIO_SERVICE_URL` - Internal URL for audio service
- `MAX_UPLOAD_SIZE` - File upload limit (default: 1GB)
- `NEXT_PUBLIC_BAND_NAME` - Band name displayed in UI

## Important Notes

- All file operations go through the audio microservice
- Waveform data is pre-computed on upload for performance
- Deep linking supports sharing media with timestamps
- API routes require session authentication except for public paths
- Media files are not directly accessible from the host filesystem