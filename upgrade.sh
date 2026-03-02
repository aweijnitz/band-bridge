#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
COMPOSE_FILE="${UPGRADE_COMPOSE_FILE:-docker-compose.yml}"
ROOT_ENV_FILE="${UPGRADE_ENV_FILE:-.env}"
ADMIN_ENV_FILE="${UPGRADE_ADMIN_ENV_FILE:-src/backend/admin/.env}"
IMAGE_PREFIX="${UPGRADE_IMAGE_PREFIX:-band-bridge}"
DOCKER_BIN="${UPGRADE_DOCKER_BIN:-docker}"
GIT_BIN="${UPGRADE_GIT_BIN:-git}"
CURL_BIN="${UPGRADE_CURL_BIN:-curl}"
HEALTH_RETRIES="${UPGRADE_HEALTH_RETRIES:-30}"
HEALTH_SLEEP_SECONDS="${UPGRADE_HEALTH_SLEEP_SECONDS:-2}"
WEB_HEALTH_URL="${UPGRADE_WEB_HEALTH_URL:-http://localhost:3000/api/health}"
ADMIN_HEALTH_URL="${UPGRADE_ADMIN_HEALTH_URL:-http://localhost:4002/health}"

TARGET_TAG=""
SKIP_FETCH=0
SKIP_HEALTH=0

ORIGINAL_REF=""
ROLLBACK_REQUIRED=0
STACK_WAS_RUNNING=0

log() {
  printf '[%s] %s\n' "$1" "$2"
}

info() {
  log "INFO" "$1"
}

warn() {
  log "WARN" "$1"
}

error() {
  log "ERROR" "$1" >&2
}

usage() {
  cat <<USAGE
Usage:
  ./${SCRIPT_NAME} [--tag <tag>] [--skip-fetch] [--skip-health]
  ./${SCRIPT_NAME} --help

Options:
  --tag <tag>      Upgrade to a specific git tag (example: v1.2.1)
  --skip-fetch     Do not fetch latest tags from remote before selecting target
  --skip-health    Skip HTTP health checks after startup
  --help           Show this help text

Environment overrides:
  UPGRADE_COMPOSE_FILE     Compose file path (default: docker-compose.yml)
  UPGRADE_ENV_FILE         Root env file path (default: .env)
  UPGRADE_ADMIN_ENV_FILE   Admin env file path (default: src/backend/admin/.env)
  UPGRADE_IMAGE_PREFIX     Image tag prefix (default: band-bridge)
  UPGRADE_WEB_HEALTH_URL   Web health endpoint (default: http://localhost:3000/api/health)
  UPGRADE_ADMIN_HEALTH_URL Admin health endpoint (default: http://localhost:4002/health)
USAGE
}

compose() {
  "$DOCKER_BIN" compose -f "$COMPOSE_FILE" "$@"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    error "Required command not found: $1"
    exit 1
  fi
}

get_env_value() {
  local file="$1"
  local key="$2"
  awk -v key="$key" '
    /^[[:space:]]*#/ { next }
    {
      line=$0
      sub(/^[[:space:]]+/, "", line)
      if (line ~ "^export[[:space:]]+") {
        sub(/^export[[:space:]]+/, "", line)
      }
      if (line ~ "^" key "=") {
        sub("^" key "=", "", line)
        print line
      }
    }
  ' "$file" | tail -n 1
}

assert_env_vars_present() {
  local file="$1"
  shift
  local missing=()
  local key value
  for key in "$@"; do
    value="$(get_env_value "$file" "$key" || true)"
    if [[ -z "$value" ]]; then
      missing+=("$key")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    error "Missing required variables in ${file}: ${missing[*]}"
    exit 1
  fi
}

collect_required_compose_vars() {
  local varset
  varset="$({
    grep -Eo '\$\{[A-Z0-9_]+(:-[^}]*)?\}' "$COMPOSE_FILE" || true
  } | sed -E 's/^\$\{//; s/\}$//' | awk -F':-' '{if (NF == 1) print $1}' | sort -u)"
  if [[ -n "$varset" ]]; then
    printf '%s\n' "$varset"
  fi
}

ensure_admin_env_file() {
  if [[ -f "$ADMIN_ENV_FILE" ]]; then
    return 0
  fi

  local admin_api_key database_url
  admin_api_key="$(get_env_value "$ROOT_ENV_FILE" "ADMIN_API_KEY" || true)"
  database_url="$(get_env_value "$ROOT_ENV_FILE" "DATABASE_URL" || true)"

  if [[ -z "$admin_api_key" || -z "$database_url" ]]; then
    error "${ADMIN_ENV_FILE} is missing and cannot be auto-created because ADMIN_API_KEY and/or DATABASE_URL are missing in ${ROOT_ENV_FILE}"
    exit 1
  fi

  info "Creating missing ${ADMIN_ENV_FILE} from ${ROOT_ENV_FILE}"
  mkdir -p "$(dirname "$ADMIN_ENV_FILE")"
  {
    printf 'ADMIN_API_KEY=%s\n' "$admin_api_key"
    printf 'DATABASE_URL=%s\n' "$database_url"
  } > "$ADMIN_ENV_FILE"
}

wait_for_health() {
  local name="$1"
  local url="$2"
  local attempt=1

  while (( attempt <= HEALTH_RETRIES )); do
    if "$CURL_BIN" -fsS "$url" >/dev/null 2>&1; then
      info "${name} is healthy at ${url}"
      return 0
    fi
    sleep "$HEALTH_SLEEP_SECONDS"
    attempt=$((attempt + 1))
  done

  error "Health check failed for ${name}: ${url}"
  return 1
}

resolve_latest_tag() {
  "$GIT_BIN" tag -l 'v*' --sort=-v:refname | head -n 1
}

assert_git_clean() {
  local status
  status="$($GIT_BIN status --porcelain)"
  if [[ -n "$status" ]]; then
    error "Git working tree is not clean. Commit/stash changes before running upgrade."
    exit 1
  fi
}

tag_service_image() {
  local service="$1"
  local version_tag="$2"
  local image_id

  image_id="$(compose images -q "$service" | head -n 1)"
  if [[ -z "$image_id" ]]; then
    warn "No image found for service '${service}', skipping custom tag"
    return 0
  fi

  "$DOCKER_BIN" tag "$image_id" "${IMAGE_PREFIX}-${service}:${version_tag}"
  "$DOCKER_BIN" tag "$image_id" "${IMAGE_PREFIX}-${service}:latest"
  info "Tagged ${service} image as ${IMAGE_PREFIX}-${service}:${version_tag} and :latest"
}

rollback_if_needed() {
  local exit_code=$?
  if [[ $exit_code -eq 0 ]]; then
    return 0
  fi

  error "Upgrade failed (exit code ${exit_code})."

  if [[ "$ROLLBACK_REQUIRED" -eq 1 ]]; then
    warn "Attempting rollback to previous git ref: ${ORIGINAL_REF}"
    if "$GIT_BIN" checkout -q "$ORIGINAL_REF"; then
      info "Checked out previous git ref: ${ORIGINAL_REF}"
    else
      error "Failed to checkout previous git ref: ${ORIGINAL_REF}"
    fi

    if [[ "$STACK_WAS_RUNNING" -eq 1 ]]; then
      warn "Attempting to restore previous stack"
      if compose up -d; then
        info "Previous stack restart attempted"
      else
        error "Failed to restart previous stack"
      fi
    fi
  fi

  exit "$exit_code"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --tag)
        if [[ $# -lt 2 ]]; then
          error "--tag requires a value"
          usage
          exit 1
        fi
        TARGET_TAG="$2"
        shift 2
        ;;
      --skip-fetch)
        SKIP_FETCH=1
        shift
        ;;
      --skip-health)
        SKIP_HEALTH=1
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        error "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
  done
}

main() {
  parse_args "$@"

  trap rollback_if_needed EXIT

  require_cmd "$DOCKER_BIN"
  require_cmd "$GIT_BIN"
  require_cmd "$CURL_BIN"

  if [[ ! -f "$COMPOSE_FILE" ]]; then
    error "Compose file not found: ${COMPOSE_FILE}"
    exit 1
  fi

  if [[ ! -f "$ROOT_ENV_FILE" ]]; then
    error "Root env file not found: ${ROOT_ENV_FILE}"
    exit 1
  fi

  if ! "$GIT_BIN" rev-parse --git-dir >/dev/null 2>&1; then
    error "Current directory is not a git repository"
    exit 1
  fi

  if ! "$DOCKER_BIN" info >/dev/null 2>&1; then
    error "Docker daemon is not reachable"
    exit 1
  fi

  if ! "$DOCKER_BIN" compose version >/dev/null 2>&1; then
    error "docker compose v2 is required"
    exit 1
  fi

  ORIGINAL_REF="$($GIT_BIN rev-parse --abbrev-ref HEAD)"
  if [[ "$ORIGINAL_REF" == "HEAD" ]]; then
    ORIGINAL_REF="$($GIT_BIN rev-parse HEAD)"
  fi

  assert_git_clean

  mapfile -t required_compose_vars < <(collect_required_compose_vars)
  if [[ ${#required_compose_vars[@]} -gt 0 ]]; then
    assert_env_vars_present "$ROOT_ENV_FILE" "${required_compose_vars[@]}"
  fi

  ensure_admin_env_file
  assert_env_vars_present "$ADMIN_ENV_FILE" ADMIN_API_KEY DATABASE_URL

  local running_services
  running_services="$(compose ps --services --filter status=running || true)"
  if [[ -n "$running_services" ]]; then
    STACK_WAS_RUNNING=1
  fi

  if [[ "$SKIP_FETCH" -eq 0 ]]; then
    info "Fetching latest git tags from remote"
    "$GIT_BIN" fetch --tags --force
  else
    warn "Skipping git tag fetch (--skip-fetch)"
  fi

  if [[ -z "$TARGET_TAG" ]]; then
    TARGET_TAG="$(resolve_latest_tag)"
  fi

  if [[ -z "$TARGET_TAG" ]]; then
    error "No release tags found (expected tags like v1.2.1)"
    exit 1
  fi

  if ! "$GIT_BIN" rev-parse "$TARGET_TAG" >/dev/null 2>&1; then
    error "Target tag does not exist locally: ${TARGET_TAG}"
    exit 1
  fi

  info "Upgrading to release tag: ${TARGET_TAG}"

  ROLLBACK_REQUIRED=1

  if [[ "$STACK_WAS_RUNNING" -eq 1 ]]; then
    info "Stopping running stack"
    compose down
  else
    info "No running containers found for this compose project"
  fi

  "$GIT_BIN" checkout -q "$TARGET_TAG"

  info "Building images for ${TARGET_TAG}"
  compose build --pull

  tag_service_image web "$TARGET_TAG"
  tag_service_image admin "$TARGET_TAG"
  tag_service_image media "$TARGET_TAG"

  info "Starting upgraded stack"
  compose up -d --remove-orphans

  if [[ "$SKIP_HEALTH" -eq 0 ]]; then
    wait_for_health "web" "$WEB_HEALTH_URL"
    wait_for_health "admin" "$ADMIN_HEALTH_URL"
  else
    warn "Skipping health checks (--skip-health)"
  fi

  ROLLBACK_REQUIRED=0

  info "Upgrade completed successfully"
  info "Active git tag: ${TARGET_TAG}"
  info "Tagged images: ${IMAGE_PREFIX}-web:${TARGET_TAG}, ${IMAGE_PREFIX}-admin:${TARGET_TAG}, ${IMAGE_PREFIX}-media:${TARGET_TAG}"
}

main "$@"
