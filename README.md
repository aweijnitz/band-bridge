# Band Bridge

A web app for band collaboration: create projects, upload songs, and comment on songs with time-based markers. Built with Next.js, React, TypeScript, Tailwind CSS, and Postgres (via Prisma). Audio files and waveform data are managed by a dedicated microservice.

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

## Environment Variables
- `NEXT_PUBLIC_BAND_NAME` (in `.env`): The band name shown in the UI.
- `AUDIO_SERVICE_PORT` (default: 4001): Port for the audio microservice.

---

## Notes
- **Waveform Pre-Compute:** On upload, the audio microservice runs `audiowaveform` to generate a `.dat` file for fast waveform rendering in the UI.
- **File Storage:** All audio and waveform files are stored in `public/filestore/` (shared between the app and the microservice via Docker volume).
- **Tests:** Run `npm test` to execute all API and UI tests.

---

## License
MIT
