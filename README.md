# Band Bridge

A web app for band collaboration: create projects, upload songs, and comment on songs with time-based markers. Built with Next.js, React, TypeScript, Tailwind CSS, and Postgres (via Prisma). Audio files and waveform data are managed by a dedicated microservice. User, band, and API key management is handled by a secure admin microservice.

<picture>
   <img src="doc/project-dashboard.png" alt="Screenshot project dashboard" width="320" />
</picture>

<picture>
   <img src="doc/project-view.png" alt="Screenshot project view" width="320" />
</picture>

<picture>
   <img src="doc/song-view.png" alt="Screenshot song view" width="320" />
</picture>

---

## Features

- Band/project management
- Song upload (MP3/WAV), download, and deletion
- Precomputed waveform rendering for instant audio visualization
- Time-based comments on songs
- Deep links to song details (with share button)
- Responsive, modern UI (Next.js, Tailwind CSS)
- Robust API and UI test suite
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
   cp src/backend/admin/.env.example src/backend/admin/.env.example/.env
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
     - The audio microservice (Express, with audiowaveform and ffmpeg)
     - The admin microservice (Express, Prisma)

4. **Stop all services:**
   ```sh
   docker compose down
   ```

---

## Project Architecture

```
band-bridge/
├── src/
│   ├── app/                # Next.js frontend & API routes
│   └── backend/
│       ├── audio/          # Audio microservice (Express, waveform pre-compute)
│       └── admin/          # Admin microservice (Express, Prisma)
├── public/
│   └── (static assets only)
├── prisma/                 # Prisma schema and migrations
├── tests/                  # API and UI tests
├── docker-compose.yml      # Multi-service orchestration
└── README.md
```

**Audio Microservice:**
  - Located at `src/backend/audio/`
  - Handles audio file uploads, deletions, and waveform pre-computation using [BBC audiowaveform](https://github.com/bbc/audiowaveform).
  - All audio and waveform files are stored in a Docker volume mounted at `/assetfilestore` inside the audio microservice container. This volume is not directly accessible from the host or the Next.js app.
  - Waveform data is saved as `.dat` files next to the audio files (e.g., `song.wav` → `song.wav.dat`).

- **Admin Microservice:**
  - Located at `src/backend/admin/`
  - Handles user, band, and API key management (admin-only, static API key required).
  - All endpoints require `Authorization: Bearer <ADMIN_API_KEY>` header.

---

## UI/UX

- Download, delete, and share buttons are consistently placed at the top right of each song card and the song details page.
- Sharing a song copies a deep link to the clipboard and shows a toast notification.
- All file and waveform requests are proxied through the Next.js API for security and abstraction.


---

## Deep Linking & Sharing

Every song has a unique URL (`/project/[projectId]/song/[songId]`). Use the share button to copy a direct link to the clipboard.

---

## Audio Microservice API

### Health Check
```sh
curl http://localhost:4001/health
```

### Upload Audio File (with waveform pre-compute)
```sh
curl -F "file=@/path/to/song.wav" http://localhost:4001/upload
```
- Response: `{ "fileName": "<timestamp>_song.wav" }`
- Also creates `<timestamp>_song.wav.dat` in the filestore.

### Delete Audio File and Waveform Data
```sh
curl -X DELETE http://localhost:4001/delete-song \
  -H "Content-Type: application/json" \
  -d '{"fileName":"<timestamp>_song.wav"}'
```
- Deletes both the audio file and its `.dat` waveform file.

### Download Audio or Waveform File
```sh
curl http://localhost:4001/files/<fileName>
curl http://localhost:4001/files/<fileName>.dat
```

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

### Songs

- **List Songs in Project**
  ```sh
  curl http://localhost:3000/api/project/1/song
  ```
- **Get Song**
  ```sh
  curl http://localhost:3000/api/project/1/song/2
  ```
- **Upload Song**
  ```sh
  curl -F "file=@/path/to/song.wav" -F "title=My Song" http://localhost:3000/api/project/1/song
  ```
- **Delete Song**
  ```sh
  curl -X DELETE http://localhost:3000/api/project/1/song/2
  ```

### Comments

- **List Comments for Song**
  ```sh
  curl http://localhost:3000/api/project/1/song/2/comment
  ```
- **Add Comment (requires authentication)**
  ```sh
  curl -X POST http://localhost:3000/api/project/1/song/2/comment \
    -H "Content-Type: application/json" \
    -d '{"text":"Great solo!","time":42.5}'
  ```

### Audio Proxy Endpoints

- **Download Audio File**
  ```sh
  curl http://localhost:3000/api/project/1/song/audio?file=<fileName>
  ```
- **Download Waveform Data**
  ```sh
  curl http://localhost:3000/api/project/1/song/waveform?file=<fileName>
  ```

---

## API Proxying

All audio and waveform file requests from the frontend are proxied through the Next.js API, which streams data from the audio microservice. The frontend does not access the file storage directly.

---

## Environment Variables
- `NEXT_PUBLIC_BAND_NAME`: The band name shown in the UI.
- `AUDIO_SERVICE_PORT`: Port for the audio microservice (default: 4001, internal only).
- `AUDIO_SERVICE_URL`: URL for the audio microservice (used by the Next.js API to proxy requests).
- `ADMIN_API_KEY`: Static API key for admin microservice.
- `DATABASE_URL`: Postgres connection string for all services.
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`: For NextAuth.js (if used).

---

## Notes
- **Waveform Pre-Compute:** On upload, the audio microservice runs `audiowaveform` to generate a `.dat` file for fast waveform rendering in the UI.
- **File Storage:** All audio and waveform files are stored in a Docker volume at `/assetfilestore` inside the audio microservice. They are not accessible from the Next.js app or the host filesystem.
- **Tests:** Run `npm test` to execute all API and UI tests.

---

## AI Transparency

This project was created with heavy support by AI agentic code generation workflows, using [Cursor](https://www.cursor.com/). It is amazing what one can achieve, but also amazing what such an advanced tool overlooks. 

---

## License
MIT
