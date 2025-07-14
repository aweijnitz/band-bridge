# Band Bridge

A web app for band collaboration: create projects, upload media, and comment on media with time-based markers. Built with Next.js, React, TypeScript, Tailwind CSS, and Postgres (via Prisma). Audio and video files are managed by a dedicated microservice. User, band, and API key management is handled by a secure admin microservice.

<picture>
   <img src="doc/project-dashboard.png" alt="Screenshot project dashboard" width="320" />
</picture>

<picture>
   <img src="doc/project-view.png" alt="Screenshot project view" width="320" />
</picture>

<picture>
   <img src="doc/media-view.png" alt="Screenshot song view" width="320" />
</picture>

---

## Features

- Band/project management
- Media upload (audio MP3/WAV and video MP4/MOV/AVI/H.264), download, and deletion
- Precomputed waveform rendering for instant audio visualization
- Time-based comments on media items with precise timeCode positioning
- Deep links to media details (with share button)
- Responsive, modern UI (Next.js, Tailwind CSS)
- Robust API and UI test suite with Jest and Playwright
- Rich text editor for comments using Jodit React
- Image gallery support with React Image Gallery
- Audio waveform visualization using WaveSurfer.js
- Video playback with Video.js and timeline markers
- Admin microservice for user, band, and API key management There is no admin UI. Use curl (see examples below)

---

## System Requirements
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- Node.js 18+ (for local development)
- npm (for local development)

---

## Installation & Setup

1. **Clone the repository:**
   ```sh
   git clone https://github.com/aweijnitz/band-bridge.git
   cd band-bridge
   ```

2. **Copy and edit environment variables:**
   ```sh
   cp .env.example .env
   cp src/backend/admin/.env.example src/backend/admin/.env
   # Edit .env as needed (e.g., set ADMIN_API_KEY, DB_URL, ...)
   ```
### Changing/setting database password

**Change the actual password**

```sh
  docker exec -it <container_name_or_id> psql -U postgres
  ALTER USER postgres WITH PASSWORD 'your_new_secure_password';
  CTRL-D exits
```

**Set the password in the shell that starts docker compose**

  ```export POSTGRES_PASSWORD=your_new_secure_database_password```



3. **Start all services (including the audio and admin microservices):**
   ```sh
   export POSTGRES_PASSWORD=your_new_secure_database_password
   export ADMIN_API_KEY=your_new_secure_API_key
   ./buildDockerImages.sh
   docker compose up # or docker compose up -d  to run in the background
   ```
   - This will start:
     - The Next.js webapp
     - The Postgres database
     - The media microservice (Express, with audiowaveform and ffmpeg)
     - The admin microservice (Express, Prisma)

4. **Stop all services:**
   ```sh
   docker compose down
   ```
5. (upgrade scenario) Migrating the database

If the a new version has been deployed that includes changes to the database schema, the database has to be migrated.

  ```sh
  docker compose -f docker-compose.yml exec admin npx prisma migrate deploy  # Assuming system running
  ```

---

## Project Architecture

```
band-bridge/
├── src/
│   ├── app/                # Next.js frontend & API routes
│   │   ├── api/            # API endpoints
│   │   │   ├── auth/       # Authentication routes
│   │   │   ├── project/    # Project CRUD and media/song management
│   │   │   ├── health/     # Health check endpoint
│   │   │   └── mine/       # User's own projects
│   │   ├── components/     # Reusable UI components
│   │   ├── dashboard/      # Dashboard UI
│   │   └── project/        # Project detail pages
│   ├── backend/
│   │   ├── media/          # Media microservice (Express, waveform pre-compute)
│   │   └── admin/          # Admin microservice (Express, Prisma)
│   ├── generated/          # Generated Prisma client
│   └── lib/                # Utility libraries
├── public/
│   └── (static assets only)
├── prisma/                 # Prisma schema and migrations (in admin service)
├── tests/                  # API and UI tests
├── docker-compose.yml      # Multi-service orchestration
└── README.md
```

**Media Microservice:**
  - Located at `src/backend/media/`
  - Handles media file uploads, deletions, and waveform pre-computation using [BBC audiowaveform](https://github.com/bbc/audiowaveform).
  - All media and waveform files are stored in a Docker volume mounted at `/assetfilestore` inside the media microservice container. This volume is not directly accessible from the host or the Next.js app.
  - Waveform data is saved as `.dat` files next to the media files (e.g., `media.wav` → `media.wav.dat`).

- **Admin Microservice:**
  - Located at `src/backend/admin/`
  - Handles user, band, and API key management (admin-only, static API key required).
  - All endpoints require `Authorization: Bearer <ADMIN_API_KEY>` header.

---

## UI/UX

- Download, delete, and share buttons are consistently placed at the top right of each media card and the media details page.
- Sharing a media copies a deep link to the clipboard and shows a toast notification.
- All file and waveform requests are proxied through the Next.js API for security and abstraction.


---

## Deep Linking & Sharing

Every media item has a unique URL (`/project/[projectId]/media/[mediaId]`). Songs also have their own URLs (`/project/[projectId]/song/[songId]`). Use the share button to copy a direct link to the clipboard.

---

## Media Microservice API

### Health Check
```sh
curl http://localhost:4001/health
```

### Upload Media File
```sh
curl -F "file=@/path/to/file.mp4" http://localhost:4001/upload
```
- Response: `{ "fileName": "<timestamp>_file.wav" }`
- Also creates `<timestamp>_file.wav.dat` in the filestore.

### Delete Media File
```sh
curl -X DELETE http://localhost:4001/delete-media \
  -H "Content-Type: application/json" \
  -d '{"fileName":"<timestamp>_file.mp4"}'
```
- Deletes both the audio file and its `.dat` waveform file.

### Download Audio or Waveform File
```sh
curl http://localhost:4001/files/<fileName>
curl http://localhost:4001/files/<fileName>.dat
```

### Reset All Media Files
**⚠️ WARNING: This will permanently delete ALL stored media files and waveform data!**

```sh
curl -X POST http://localhost:4001/reset \
  -H "Authorization: Bearer <ADMIN_API_KEY>"
```
- Requires admin API key authorization
- Deletes all files in the filestore directory
- Returns success status and count of deleted files
- This endpoint is typically called by the admin service reset endpoint

---

## Admin Microservice API

All endpoints require the `Authorization: Bearer <ADMIN_API_KEY>` header.

### Health Check
```sh
curl http://localhost:4002/health
```

### Create User
```sh
curl -X POST http://localhost:4002/admin/users \
  -H "Authorization: Bearer <ADMIN_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"supersecret123"}'
```

### Create Band
```sh
curl -X POST http://localhost:4002/admin/bands \
  -H "Authorization: Bearer <ADMIN_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"name":"The Rockers"}'
```

### Assign User to Band
```sh
curl -X POST http://localhost:4002/admin/bands/1/users \
  -H "Authorization: Bearer <ADMIN_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"userId":2}'
```

### Create API Key for User
```sh
curl -X POST http://localhost:4002/admin/users/2/apikeys \
  -H "Authorization: Bearer <ADMIN_API_KEY>"
```
- Response: `{ "id": 1, "apiKey": "<PLAIN_API_KEY>" }` (shown only once)

### Revoke API Key
```sh
curl -X POST http://localhost:4002/admin/apikeys/1/revoke \
  -H "Authorization: Bearer <ADMIN_API_KEY>"
```

### Reset Complete Application State
**⚠️ WARNING: This will permanently delete ALL data including users, bands, projects, media, and comments!**

```sh
curl -X POST http://localhost:4002/admin/reset \
  -H "Authorization: Bearer <ADMIN_API_KEY>"
```
- Deletes all database records (users, bands, projects, media, comments, sessions, API keys)
- Calls the media service reset endpoint to delete all stored media files
- Returns success status and count of deleted media files

---

## Main API Service (Next.js)

### Projects

- **List Projects**
  ```sh
  curl http://localhost:3000/api/project
  ```
- **Get Project**
  ```sh
  curl http://localhost:3000/api/project/1
  ```
- **Create Project**
  ```sh
  curl -X POST http://localhost:3000/api/project \
    -H "Content-Type: application/json" \
    -d '{"name":"New Project","ownerId":1,"status":"open","bandId":1}'
  ```
- **Update Project**
  ```sh
  curl -X PUT http://localhost:3000/api/project/1 \
    -H "Content-Type: application/json" \
    -d '{"name":"Renamed Project","ownerId":1,"status":"released","bandId":1}'
  ```
- **Delete Project**
  ```sh
  curl -X DELETE http://localhost:3000/api/project/1
  ```

### Media

- **List Media in Project**
  ```sh
  curl http://localhost:3000/api/project/1/media
  ```
- **Get Media**
  ```sh
  curl http://localhost:3000/api/project/1/media/2
  ```
- **Upload Media (audio/video)**
  ```sh
  curl -F "file=@/path/to/file.mp4" -F "title=My File" http://localhost:3000/api/project/1/media
  ```
- **Delete Media**
  ```sh
  curl -X DELETE http://localhost:3000/api/project/1/media/2
  ```

### Songs (Legacy Media API)

- **List Songs in Project**
  ```sh
  curl http://localhost:3000/api/project/1/song
  ```
- **Get Song**
  ```sh
  curl http://localhost:3000/api/project/1/song/2
  ```
- **Get Song Audio**
  ```sh
  curl http://localhost:3000/api/project/1/song/audio?fileName=<fileName>
  ```
- **Get Song Waveform**
  ```sh
  curl http://localhost:3000/api/project/1/song/waveform?fileName=<fileName>
  ```

### Comments

- **List Comments for Media**
  ```sh
  curl http://localhost:3000/api/project/1/media/2/comment
  ```
- **Add Comment (requires authentication)**
  ```sh
  curl -X POST http://localhost:3000/api/project/1/media/2/comment \
    -H "Content-Type: application/json" \
    -d '{"text":"Great comment!","time":42.5}'
  ```
- **Comments for Songs (Legacy)**
  ```sh
  curl http://localhost:3000/api/project/1/song/2/comment
  ```

### Media File Proxy Endpoints

- **Download Media File**
  ```sh
  curl "http://localhost:3000/api/project/1/media/file?file=<fileName>&type=file"
  ```
- **Download Waveform Data**
  ```sh
  curl "http://localhost:3000/api/project/1/media/file?file=<fileName>&type=waveform"
  ```
- **Get Signed URL for Media**
  ```sh
  curl http://localhost:3000/api/project/1/media/2/signed-url
  ```
- Automatically sets proper MIME types based on file extension (video/mp4, audio/mpeg, etc.)
- Supports all media types: audio, video, and waveform data

---

## API Proxying

All media and waveform file requests from the frontend are proxied through the Next.js API, which streams data from the media microservice. The frontend does not access the file storage directly.

---

## Environment Variables
- `NEXT_PUBLIC_BAND_NAME`: The band name shown in the UI.
- `MEDIA_SERVICE_PORT`: Port for the media microservice (default: 4001, internal only).
- `MEDIA_SERVICE_URL`: URL for the media microservice (used by the Next.js API to proxy requests).
- `MAX_UPLOAD_SIZE`: Maximum allowed file upload size for the media microservice. Accepts human readable values like `1GB`, `500MB`, `0.5GB` (default: `1GB`).
- `ADMIN_API_KEY`: Static API key for admin microservice.
- `DATABASE_URL`: Postgres connection string for all services.
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`: For NextAuth.js (if used).

---

## Notes
- **Waveform Pre-Compute:** On upload, the media microservice runs `audiowaveform` to generate a `.dat` file for fast waveform rendering in the UI.
- **File Storage:** All media and waveform files are stored in a Docker volume at `/assetfilestore` inside the media microservice. They are not accessible from the Next.js app or the host filesystem.
- **Tests:** Run `npm test` to execute all API and UI tests.
- **E2E Tests:** Run `npm run test:e2e` to execute the Playwright end-to-end suite.

---

## AI Transparency

This project was created with heavy support by AI agentic code generation workflows, using [Cursor](https://www.cursor.com/). It is amazing what one can achieve, but also amazing what such an advanced tool overlooks. 

Further feature development was done with OpenAI Codex (very compoentent and interesting interaction model!) and Anthropic Claude (amazing, but expensive as you run out of tokens quickly at the €17/month tier).
---

## License
MIT
