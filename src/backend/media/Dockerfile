ARG AUDIOWAVEFORM_IMAGE=aweijnitz/band-bridge-audiowaveform:1.0.0
FROM ${AUDIOWAVEFORM_IMAGE} AS audiowaveform-bin

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

# Copy audiowaveform binary from prebuilt image
COPY --from=audiowaveform-bin /usr/local/bin/audiowaveform /usr/local/bin/audiowaveform

# Copy app from builder
COPY --from=app-builder /app /app

EXPOSE 4001

CMD ["node", "dist/index.js"]
