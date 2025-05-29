# Dockerfile for Audio Microservice
FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Install build dependencies for audiowaveform and ffmpeg with robust retry logic
RUN set -e; \
    for i in 1 2 3 4 5; do \
      apt-get update && \
      apt-get install -y --fix-missing ffmpeg curl git cmake g++ libboost-all-dev libtag1-dev libmad0-dev libsndfile1-dev zlib1g-dev pkg-config make libgd-dev libid3tag0-dev && \
      rm -rf /var/lib/apt/lists/* && break || sleep 10; \
    done

# Build audiowaveform from source (clone with submodules)
RUN git clone https://github.com/bbc/audiowaveform.git /tmp/audiowaveform && \
    cd /tmp/audiowaveform && \
    git submodule update --init --recursive || true && \
    if [ ! -d googletest ]; then \
      git clone https://github.com/google/googletest.git googletest; \
    fi && \
    cmake . && \
    make && \
    cp audiowaveform /usr/local/bin/audiowaveform && \
    cd /app && \
    rm -rf /tmp/audiowaveform

# Optionally remove build dependencies to reduce image size (uncomment if desired)
# RUN apt-get purge -y git cmake g++ libboost-all-dev libtag1-dev libmad0-dev libsndfile1-dev zlib1g-dev pkg-config make libgd-dev libid3tag0-dev && \
#     apt-get autoremove -y && \
#     rm -rf /var/lib/apt/lists/*

# Build TypeScript (if needed)
RUN npx tsc --project tsconfig.json

EXPOSE 4001

CMD ["node", "dist/index.js"] 