# Band Bridge

A collaborative workspace for bands to organise projects, upload media and leave time-coded feedback. Band Bridge ships as a Next.js monorepo with dedicated microservices for media processing and admin automation. The stack combines Next.js 15, React 19, Tailwind CSS 4, PostgreSQL and Prisma, with Docker images for production deployment.

<picture>
  <img src="doc/project-dashboard.png" alt="Screenshot of the project dashboard" width="320" />
</picture>

<picture>
  <img src="doc/project-view.png" alt="Screenshot of the project view" width="320" />
</picture>

<picture>
  <img src="doc/song-view.png" alt="Screenshot of the song view" width="320" />
</picture>

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Requirements](#system-requirements)
- [Getting Started](#getting-started)
  - [Prepare environment variables](#prepare-environment-variables)
  - [Production (Docker Compose)](#production-docker-compose)
  - [Database migrations](#database-migrations)
  - [Local development](#local-development)
- [Useful commands](#useful-commands)
- [Project layout](#project-layout)
- [Microservices](#microservices)
  - [Next.js web app](#nextjs-web-app)
  - [Media service](#media-service)
  - [Admin service](#admin-service)
- [API overview](#api-overview)
  - [Media microservice](#media-microservice-api)
  - [Admin microservice](#admin-microservice-api)
  - [Next.js API](#nextjs-api)
- [Environment notes](#environment-notes)
- [Testing](#testing)
- [AI transparency](#ai-transparency)
- [License](#license)

---

## Features
- Band and project management with multiple members
- Upload, download and delete media (audio, video and images)
- Precomputed waveform rendering using BBC audiowaveform
- Time-based comments on audio and video
- Image galleries with project-level comments and deep links
- Session-based authentication with API route protection
- Rich text editor for media descriptions (Jodit React)
- Audio playback with WaveSurfer.js and video with HTML5 controls
- Jest and Playwright test suites covering API, UI and E2E scenarios
- Dedicated admin microservice for managing users, bands and API keys

## Tech Stack
- **Frontend:** Next.js 15, React 19, Tailwind CSS 4
- **Backend:** Express microservices (media + admin) written in TypeScript
- **Database:** PostgreSQL 15 with Prisma ORM
- **Media processing:** FFmpeg and BBC audiowaveform for waveform generation
- **Testing:** Jest, React Testing Library, Playwright
- **Packaging:** Docker Compose for production, Turbopack for local dev

## System Requirements
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) v2+
- Node.js 18+ (for local development)
- npm 8+ (for local development)

---

## Getting Started

### Prepare environment variables
1. Copy the example files:
   ```sh
   cp .env.example .env
   cp src/backend/admin/.env.example src/backend/admin/.env
   ```
2. Update values before starting services. The most important variables are summarised below:

   | Variable | Description | Example |
   | --- | --- | --- |
   | `POSTGRES_PASSWORD` | Password for the Postgres container | `super-secret-password` |
   | `DATABASE_URL` | Prisma connection string used by the Next.js app | `postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/bandbridge` |
   | `MEDIA_SERVICE_URL` | Internal URL for the media service | `http://media:4001` (Docker) or `http://localhost:4001` (local) |
   | `ADMIN_API_KEY` | Shared secret for admin microservice requests | `generate-a-long-random-value` |
   | `MAX_UPLOAD_SIZE` | Upload limit understood by media service | `1GB` |
   | `NEXTAUTH_SECRET` | Secret for NextAuth session encryption | `run openssl rand -base64 32` |
   | `NEXTAUTH_URL` | Base URL for auth callbacks | `http://localhost:3000` |
   | `JWT_SECRET` | JWT signing secret for API routes | `another-long-secret` |

   The admin microservice reads the same `DATABASE_URL` and `ADMIN_API_KEY` values from `src/backend/admin/.env`.

### Production (Docker Compose)
1. Clone the repository and move into it:
   ```sh
   git clone https://github.com/aweijnitz/band-bridge.git
   cd band-bridge
   ```
2. Build the Docker images:
   ```sh
   ./buildDockerImages.sh
   ```
3. Start the full stack:
   ```sh
   docker compose up -d
   ```
4. Verify the services:
   ```sh
   docker compose ps
   curl http://localhost:3000/api/health
   curl http://localhost:4002/health
   ```
5. Stop the stack when finished:
   ```sh
   docker compose down
   ```

### Database migrations
The schema is created automatically on the first start. When deploying schema changes:
```sh
# Recommended: run against the running admin container
docker compose exec admin npx prisma migrate deploy

# Alternative workflow if you need to restart containers
docker compose down
docker compose up -d db
until docker compose exec db pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
docker compose up -d admin
docker compose exec admin npx prisma migrate deploy
docker compose up -d
```

Common maintenance commands:
```sh
docker compose exec db psql -U postgres -d bandbridge                     # interactive psql
docker compose exec admin npx prisma migrate reset --force                 # ⚠️ destructive reset
docker compose exec db psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'new_password';"  # change password
```

### Local development
1. Install dependencies:
   ```sh
   npm install
   ```
2. Start supporting services (Postgres, media, admin) with Docker:
   ```sh
   docker compose up -d db media admin
   ```
3. Generate the Prisma client and sync the schema:
   ```sh
   npm run generate:schema
   npx prisma db push
   npm --prefix src/backend/admin run build:prep
   ```
4. Launch the Next.js development server:
   ```sh
   npm run dev
   ```
   The app is available at http://localhost:3000 with hot reloading.

**Automation:** `./dev-local.sh` wraps the steps above, provisions a local Postgres container, creates sample data via the admin API and starts all three services with hot reload.

Run tests and linting during development:
```sh
npm run test          # Jest API + UI suites
npm run test:e2e      # Playwright end-to-end tests
npm run lint          # ESLint
```

---

## Useful commands
| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js with Turbopack |
| `npm run build` | Generate Prisma client then build the production bundle |
| `npm start` | Run the production build |
| `npm run generate:schema` | Regenerate the Prisma client in `src/generated/prisma` |
| `npm run test`, `npm run test:api`, `npm run test:ui` | Jest test suites |
| `npm run test:e2e` | Playwright tests against running services |
| `npm run lint` | ESLint checks |
| `npm run reset` | Reset database and clear local filestore (⚠️ destructive) |
| `npm run start:media-service` | Run the media microservice in isolation |
| `npm run build:media-service` | Build the media microservice bundle |

---

## Project layout
```
band-bridge/
├── src/
│   ├── app/                # Next.js frontend & API routes
│   │   ├── api/            # REST endpoints
│   │   ├── components/     # Shared UI components
│   │   ├── dashboard/      # Dashboard pages
│   │   └── project/        # Project detail views
│   ├── backend/
│   │   ├── media/          # Media microservice (Express + waveform generation)
│   │   └── admin/          # Admin microservice (Express + Prisma)
│   ├── generated/prisma/   # Prisma client shared across services
│   └── lib/                # Utility helpers
├── prisma/                 # Prisma schema & migrations for the main database
├── public/                 # Static assets served by Next.js
├── scripts/                # Helper scripts (e.g. Playwright orchestration)
├── tests/                  # Jest and Playwright tests
├── docker-compose.yml      # Production-ready compose file
├── docker-compose.test.yml # Compose file optimised for automated tests
└── README.md
```

---

## Microservices

### Next.js web app
- Hosts all UI pages and API routes under `src/app`
- Proxies media downloads/uploads to the media service
- Handles authentication via NextAuth and JWT session cookies

### Media service
- Location: `src/backend/media/`
- Responsibilities:
  - Accept audio/video/image uploads via multipart form data
  - Store media and waveform `.dat` files in `/assetfilestore`
  - Generate waveform data using BBC audiowaveform
  - Provide download endpoints for media and waveform files
- Storage is isolated inside a Docker volume and not exposed directly to the frontend

### Admin service
- Location: `src/backend/admin/`
- Responsibilities:
  - Manage users, bands and API keys via REST endpoints
  - Forward destructive reset requests to the media service
  - Require `Authorization: Bearer <ADMIN_API_KEY>` for every request

---

## API overview

### Media microservice API
- **Health check**
  ```sh
  curl http://localhost:4001/health
  ```
- **Upload media**
  ```sh
  curl -F "file=@/path/to/file.mp4" http://localhost:4001/upload
  ```
  Returns `{ "fileName": "<timestamp>_file.ext" }` and creates a matching `.dat` file.
- **Delete media**
  ```sh
  curl -X DELETE http://localhost:4001/delete-media \
    -H "Content-Type: application/json" \
    -d '{"fileName":"<timestamp>_file.mp4"}'
  ```
- **Download files**
  ```sh
  curl http://localhost:4001/files/<fileName>
  curl http://localhost:4001/files/<fileName>.dat
  ```
- **Reset filestore (⚠️ destructive)**
  ```sh
  curl -X POST http://localhost:4001/reset \
    -H "Authorization: Bearer <ADMIN_API_KEY>"
  ```

### Admin microservice API
All endpoints require the `Authorization: Bearer <ADMIN_API_KEY>` header.

- **Health check**
  ```sh
  curl http://localhost:4002/health
  ```
- **Create user**
  ```sh
  curl -X POST http://localhost:4002/admin/users \
    -H "Authorization: Bearer <ADMIN_API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{"username":"alice","password":"supersecret123"}'
  ```
- **Create band**
  ```sh
  curl -X POST http://localhost:4002/admin/bands \
    -H "Authorization: Bearer <ADMIN_API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{"name":"The Rockers"}'
  ```
- **Assign user to band**
  ```sh
  curl -X POST http://localhost:4002/admin/bands/1/users \
    -H "Authorization: Bearer <ADMIN_API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{"userId":2}'
  ```
- **Create API key**
  ```sh
  curl -X POST http://localhost:4002/admin/users/2/apikeys \
    -H "Authorization: Bearer <ADMIN_API_KEY>"
  ```
  Response: `{ "id": 1, "apiKey": "<PLAIN_API_KEY>" }` (displayed once).
- **Revoke API key**
  ```sh
  curl -X POST http://localhost:4002/admin/apikeys/1/revoke \
    -H "Authorization: Bearer <ADMIN_API_KEY>"
  ```
- **Reset entire system (⚠️ destructive)**
  ```sh
  curl -X POST http://localhost:4002/admin/reset \
    -H "Authorization: Bearer <ADMIN_API_KEY>"
  ```
  Removes all database records and calls the media service reset endpoint.

### Next.js API

#### Projects
- **List projects**
  ```sh
  curl http://localhost:3000/api/project
  ```
- **Get project**
  ```sh
  curl http://localhost:3000/api/project/1
  ```
- **Create project**
  ```sh
  curl -X POST http://localhost:3000/api/project \
    -H "Content-Type: application/json" \
    -d '{"name":"New Project","ownerId":1,"status":"open","bandId":1}'
  ```
- **Update project**
  ```sh
  curl -X PUT http://localhost:3000/api/project/1 \
    -H "Content-Type: application/json" \
    -d '{"name":"Renamed Project","ownerId":1,"status":"released","bandId":1}'
  ```
- **Delete project**
  ```sh
  curl -X DELETE http://localhost:3000/api/project/1
  ```

#### Media
- **List project media**
  ```sh
  curl http://localhost:3000/api/project/1/media
  ```
- **Get media item**
  ```sh
  curl http://localhost:3000/api/project/1/media/2
  ```
- **Upload media**
  ```sh
  # Audio file
  curl -F "file=@/path/to/audio.mp3" -F "title=My Song" -F "description=<p>Rich text description</p>" \
    http://localhost:3000/api/project/1/media

  # Video file
  curl -F "file=@/path/to/video.mp4" -F "title=My Video" \
    http://localhost:3000/api/project/1/media

  # Image file
  curl -F "file=@/path/to/image.jpg" -F "title=My Image" \
    http://localhost:3000/api/project/1/media
  ```
- **Delete media**
  ```sh
  curl -X DELETE http://localhost:3000/api/project/1/media/2
  ```

#### Songs (legacy endpoints)
- **List songs**
  ```sh
  curl http://localhost:3000/api/project/1/song
  ```
- **Get song**
  ```sh
  curl http://localhost:3000/api/project/1/song/2
  ```
- **Download song audio/waveform**
  ```sh
  curl http://localhost:3000/api/project/1/song/audio?fileName=<fileName>
  curl http://localhost:3000/api/project/1/song/waveform?fileName=<fileName>
  ```

#### Comments
- **List media comments**
  ```sh
  curl http://localhost:3000/api/project/1/media/2/comment
  ```
- **Add media comment (auth required)**
  ```sh
  curl -X POST http://localhost:3000/api/project/1/media/2/comment \
    -H "Content-Type: application/json" \
    -d '{"text":"Great comment!","time":42.5}'
  ```
- **List gallery comments**
  ```sh
  curl http://localhost:3000/api/project/1/gallery/comment
  ```
- **Add gallery comment (auth required)**
  ```sh
  curl -X POST http://localhost:3000/api/project/1/gallery/comment \
    -H "Content-Type: application/json" \
    -d '{"text":"Great gallery comment!"}'
  ```
  Gallery comments use `time: -1` to represent project-wide discussion threads.
- **Legacy song comments**
  ```sh
  curl http://localhost:3000/api/project/1/song/2/comment
  ```

#### Media file proxy endpoints
- **Download media file**
  ```sh
  curl "http://localhost:3000/api/project/1/media/file?file=<fileName>&type=file"
  ```
- **Download waveform data**
  ```sh
  curl "http://localhost:3000/api/project/1/media/file?file=<fileName>&type=waveform"
  ```
- **Request signed URL**
  ```sh
  curl http://localhost:3000/api/project/1/media/2/signed-url
  ```

All media transfers are streamed through the Next.js API to avoid exposing the storage volume directly.

---

## Environment notes
- Waveform files are generated as `<media-file>.dat` alongside the uploaded file.
- The filestore lives inside the media service container at `/assetfilestore` and is mounted as a Docker volume.
- Session-based authentication relies on HTTP-only cookies stored in the database via Prisma.
- DOMPurify sanitises all rich-text HTML submitted through the editor.
- Media sharing copies a deep-link URL to the clipboard and presents a toast notification in the UI.

---

## Testing
- **Unit & integration tests:** `npm run test` (or `npm run test:api` / `npm run test:ui`)
- **E2E tests:** `npm run test:e2e` using Playwright and the `playwright.microservices.config.ts` configuration
- **Coverage:** `npm run test:coverage`
- **Linting:** `npm run lint`

---

## AI transparency
This project was bootstrapped using AI-powered tooling including Cursor, OpenAI Codex and Anthropic Claude. Manual review and iteration continues to refine the codebase.

---

## License
MIT
