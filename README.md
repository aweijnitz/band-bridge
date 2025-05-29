# Band Bridge

A web app for band collaboration: create projects, upload songs, and comment on songs with time-based markers. Built with Next.js, React, TypeScript, Tailwind CSS, and Postgres (via Prisma). Audio files and waveform data are managed by a dedicated microservice.

---

## Features

- Band/project management
- Song upload (MP3/WAV), download, and deletion
- Precomputed waveform rendering for instant audio visualization
- Time-based comments on songs
- Deep links to song details (with share button)
- Responsive, modern UI (Next.js, Tailwind CSS)
- Robust API and UI test suite

---

## System Requirements
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- Node.js 18+ (for local development)
- npm (for local development)

---

## Installation & Setup

1. **Clone the repository:**
   ```sh
   git clone <repo-url>
   cd band-bridge
   ```

2. **Copy and edit environment variables:**
   ```sh
   cp .env.example .env
   # Edit .env as needed (e.g., set NEXT_PUBLIC_BAND_NAME)
   ```

3. **Start all services (including the audio microservice):**
   ```sh
   docker compose up --build
   ```
   - This will start:
     - The Next.js app
     - The Postgres database
     - The audio microservice (Express, with audiowaveform and ffmpeg)

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
│       └── audio/          # Audio microservice (Express, waveform pre-compute)
├── public/
│   └── filestore/          # Uploaded audio files and waveform .dat files
├── prisma/                 # Prisma schema and migrations
├── tests/                  # API and UI tests
├── docker-compose.yml      # Multi-service orchestration
└── README.md
```

- **Audio Microservice:**
  - Located at `src/backend/audio/`
  - Handles audio file uploads, deletions, and waveform pre-computation using [BBC audiowaveform](https://github.com/bbc/audiowaveform).
  - Waveform data is saved as `.dat` files next to the audio files (e.g., `song.wav` → `song.wav.dat`).

---

## UI/UX

- Download, delete, and share buttons are consistently placed at the top right of each song card and the song details page.
- Sharing a song copies a deep link to the clipboard and shows a toast notification.
- All file and waveform requests are proxied through the Next.js API for security and abstraction.
- Song details pages and project pages have consistent, modern layouts and backgrounds.

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
curl -X DELETE http://localhost:4001/delete/<timestamp>_song.wav
```
- Deletes both the audio file and its `.dat` waveform file.

---

## API Proxying

All audio and waveform file requests from the frontend are proxied through the Next.js API, which streams data from the audio microservice. The frontend does not access the file storage directly.

---

## Environment Variables
- `NEXT_PUBLIC_BAND_NAME`: The band name shown in the UI.
- `AUDIO_SERVICE_PORT`: Port for the audio microservice (default: 4001).
- `AUDIO_FILESTORE_PATH`: Filesystem path for audio storage (used by the microservice, set in docker-compose).
- `AUDIO_SERVICE_URL`: URL for the audio microservice (used by the Next.js API to proxy requests).

---

## Notes
- **Waveform Pre-Compute:** On upload, the audio microservice runs `audiowaveform` to generate a `.dat` file for fast waveform rendering in the UI.
- **File Storage:** All audio and waveform files are stored in `public/filestore/` (shared between the app and the microservice via Docker volume).
- **Tests:** Run `npm test` to execute all API and UI tests.

---

## License
MIT
