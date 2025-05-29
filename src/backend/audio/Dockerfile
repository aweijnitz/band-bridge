# ---- audiowaveform builder ----
FROM debian:bullseye AS audiowaveform-builder

RUN apt-get update && \
    apt-get install -y --fix-missing ffmpeg curl git cmake g++ libboost-all-dev libtag1-dev libmad0-dev libsndfile1-dev zlib1g-dev pkg-config make libgd-dev libid3tag0-dev

WORKDIR /build
RUN git clone https://github.com/bbc/audiowaveform.git . && \
    git submodule update --init --recursive || true && \
    if [ ! -d googletest ]; then \
      git clone https://github.com/google/googletest.git googletest; \
    fi && \
    cmake . && \
    make

# ---- app builder ----
FROM node:20-bullseye AS app-builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx tsc --project tsconfig.json

# ---- final image ----
FROM node:20-bullseye

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg libsndfile1 libgd3 libmad0 libid3tag0 libboost-program-options1.74.0 libboost-filesystem1.74.0 libboost-regex1.74.0 && \
    rm -rf /var/lib/apt/lists/*

# Copy audiowaveform binary from builder
COPY --from=audiowaveform-builder /build/audiowaveform /usr/local/bin/audiowaveform

# Copy app from builder
COPY --from=app-builder /app /app

EXPOSE 4001

CMD ["node", "dist/index.js"] 