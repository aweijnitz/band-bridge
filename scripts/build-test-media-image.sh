#!/bin/bash
set -euo pipefail

IMAGE_TAG="${TEST_MEDIA_IMAGE:-band-bridge-test-media:local}"
DOCKERFILE_PATH="${TEST_MEDIA_DOCKERFILE:-src/backend/media/Dockerfile}"
BUILD_CONTEXT="${TEST_MEDIA_BUILD_CONTEXT:-src/backend/media}"

echo "[INFO] Building test media image: ${IMAGE_TAG}"
docker build -f "${DOCKERFILE_PATH}" -t "${IMAGE_TAG}" "${BUILD_CONTEXT}"
echo "[INFO] Test media image built: ${IMAGE_TAG}"
