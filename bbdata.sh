#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"

# Optional overrides for testing and non-default compose setups.
DOCKER_BIN="${BBDATA_DOCKER_BIN:-docker}"
TAR_BIN="${BBDATA_TAR_BIN:-tar}"
CURL_BIN="${BBDATA_CURL_BIN:-curl}"
COMPOSE_FILE="${BBDATA_COMPOSE_FILE:-docker-compose.yml}"

DB_SERVICE="${BBDATA_DB_SERVICE:-db}"
MEDIA_SERVICE="${BBDATA_MEDIA_SERVICE:-media}"
ADMIN_SERVICE="${BBDATA_ADMIN_SERVICE:-admin}"
WEB_SERVICE="${BBDATA_WEB_SERVICE:-web}"

DB_NAME="${BBDATA_DB_NAME:-bandbridge}"
DB_USER="${BBDATA_DB_USER:-postgres}"

WEB_HEALTH_URL="${BBDATA_WEB_HEALTH_URL:-http://localhost:3000/api/health}"
ADMIN_HEALTH_URL="${BBDATA_ADMIN_HEALTH_URL:-http://localhost:4002/health}"
HEALTH_RETRIES="${BBDATA_HEALTH_RETRIES:-30}"
HEALTH_SLEEP_SECONDS="${BBDATA_HEALTH_SLEEP_SECONDS:-2}"

FORCE_OVERWRITE=0
CONFIRM_IMPORT=0
WORK_DIR=""
NEEDS_RESTART=0
STOPPED_SERVICES=()

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
  cat <<EOF
Usage:
  ${SCRIPT_NAME} [--force] export <archive.tar.gz>
  ${SCRIPT_NAME} [--yes] import <archive.tar.gz>
  ${SCRIPT_NAME} --help

Operations:
  export   Create a gzipped tar backup containing database and assets
  import   Restore database and assets from a gzipped tar backup (destructive)

Options:
  --force  Overwrite destination archive on export if it already exists
  --yes    Required for import to acknowledge destructive restore
  --help   Show this help text

Examples:
  ./${SCRIPT_NAME} export ./backups/mybackup.tar.gz
  ./${SCRIPT_NAME} --yes import ./backups/mybackup.tar.gz
EOF
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

in_list() {
  local needle="$1"
  shift
  local item
  for item in "$@"; do
    if [[ "$item" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

split_lines_to_array() {
  local input="$1"
  local -n out_arr="$2"
  out_arr=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && out_arr+=("$line")
  done <<< "$input"
}

restart_stopped_services() {
  if [[ ${#STOPPED_SERVICES[@]} -eq 0 ]]; then
    return 0
  fi
  info "Restarting services: ${STOPPED_SERVICES[*]}"
  if ! compose start "${STOPPED_SERVICES[@]}"; then
    error "Failed to restart one or more services: ${STOPPED_SERVICES[*]}"
    return 1
  fi
}

cleanup() {
  local code=$?
  if [[ "$NEEDS_RESTART" -eq 1 ]]; then
    warn "Attempting service restart after interrupted/failed operation"
    restart_stopped_services || true
  fi
  if [[ -n "$WORK_DIR" && -d "$WORK_DIR" ]]; then
    rm -rf "$WORK_DIR"
  fi
  exit "$code"
}

trap cleanup EXIT

wait_for_health() {
  local name="$1"
  local url="$2"
  if [[ -z "$url" ]]; then
    return 0
  fi
  local attempt=1
  while (( attempt <= HEALTH_RETRIES )); do
    if "$CURL_BIN" -fsS "$url" >/dev/null 2>&1; then
      info "$name is healthy at $url"
      return 0
    fi
    sleep "$HEALTH_SLEEP_SECONDS"
    attempt=$((attempt + 1))
  done
  error "$name health check failed at $url"
  return 1
}

ensure_prereqs() {
  require_cmd "$DOCKER_BIN"
  require_cmd "$TAR_BIN"
  require_cmd "$CURL_BIN"

  if ! "$DOCKER_BIN" info >/dev/null 2>&1; then
    error "Docker daemon is not reachable"
    exit 1
  fi

  if ! "$DOCKER_BIN" compose version >/dev/null 2>&1; then
    error "docker compose is not available"
    exit 1
  fi

  if [[ ! -f "$COMPOSE_FILE" ]]; then
    error "Compose file not found: $COMPOSE_FILE"
    exit 1
  fi
}

ensure_running_services() {
  local running_raw
  running_raw="$(compose ps --services --filter status=running || true)"
  local running=()
  split_lines_to_array "$running_raw" running

  local missing=()
  local svc
  for svc in "$DB_SERVICE" "$MEDIA_SERVICE" "$ADMIN_SERVICE" "$WEB_SERVICE"; do
    if ! in_list "$svc" "${running[@]}"; then
      missing+=("$svc")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    error "Required services are not running: ${missing[*]}"
    error "Start the stack first with: docker compose -f $COMPOSE_FILE up -d"
    exit 1
  fi
}

verify_db_ready() {
  info "Checking database readiness"
  compose exec -T "$DB_SERVICE" pg_isready -U "$DB_USER" >/dev/null
}

stop_write_services() {
  local running_raw
  running_raw="$(compose ps --services --filter status=running || true)"
  local running=()
  split_lines_to_array "$running_raw" running

  STOPPED_SERVICES=()
  local svc
  for svc in "$WEB_SERVICE" "$ADMIN_SERVICE" "$MEDIA_SERVICE"; do
    if in_list "$svc" "${running[@]}"; then
      STOPPED_SERVICES+=("$svc")
    fi
  done

  if [[ ${#STOPPED_SERVICES[@]} -eq 0 ]]; then
    info "No write-capable services needed stopping"
    return 0
  fi

  info "Stopping services: ${STOPPED_SERVICES[*]}"
  compose stop "${STOPPED_SERVICES[@]}"
  NEEDS_RESTART=1
}

create_manifest() {
  local target="$1"
  local created_at
  created_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  cat > "$target" <<EOF
{
  "formatVersion": 1,
  "createdAt": "$created_at",
  "source": "band-bridge",
  "database": "$DB_NAME",
  "services": {
    "db": "$DB_SERVICE",
    "media": "$MEDIA_SERVICE",
    "admin": "$ADMIN_SERVICE",
    "web": "$WEB_SERVICE"
  }
}
EOF
}

assert_archive_structure() {
  local archive="$1"
  local listing
  listing="$("$TAR_BIN" -tzf "$archive")"
  local missing=0
  if ! grep -qx 'manifest.json' <<< "$listing"; then
    error "Archive missing manifest.json"
    missing=1
  fi
  if ! grep -qx 'database.sql' <<< "$listing"; then
    error "Archive missing database.sql"
    missing=1
  fi
  if ! grep -qx 'assets.tar' <<< "$listing"; then
    error "Archive missing assets.tar"
    missing=1
  fi
  if [[ "$missing" -eq 1 ]]; then
    exit 1
  fi
}

export_backup() {
  local archive_path="$1"
  local archive_dir
  archive_dir="$(dirname "$archive_path")"

  mkdir -p "$archive_dir"
  if [[ -e "$archive_path" && "$FORCE_OVERWRITE" -ne 1 ]]; then
    error "Archive already exists: $archive_path (use --force to overwrite)"
    exit 1
  fi

  WORK_DIR="$(mktemp -d)"
  local db_dump="$WORK_DIR/database.sql"
  local assets_tar="$WORK_DIR/assets.tar"
  local manifest="$WORK_DIR/manifest.json"

  ensure_running_services
  verify_db_ready
  stop_write_services

  info "Exporting database to $db_dump"
  compose exec -T "$DB_SERVICE" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-privileges > "$db_dump"

  info "Exporting media assets to $assets_tar"
  compose run --rm --no-deps -T "$MEDIA_SERVICE" sh -lc 'mkdir -p /assetfilestore && tar -cf - -C /assetfilestore .' > "$assets_tar"

  info "Generating backup manifest"
  create_manifest "$manifest"

  info "Creating archive $archive_path"
  "$TAR_BIN" -czf "$archive_path" -C "$WORK_DIR" manifest.json database.sql assets.tar

  assert_archive_structure "$archive_path"

  restart_stopped_services
  NEEDS_RESTART=0

  wait_for_health "web" "$WEB_HEALTH_URL"
  wait_for_health "admin" "$ADMIN_HEALTH_URL"

  info "Export complete: $archive_path"
  info "Archive size: $(wc -c < "$archive_path") bytes"
}

import_backup() {
  local archive_path="$1"

  if [[ "$CONFIRM_IMPORT" -ne 1 ]]; then
    error "Import is destructive. Re-run with --yes to confirm."
    exit 1
  fi

  if [[ ! -f "$archive_path" ]]; then
    error "Archive file not found: $archive_path"
    exit 1
  fi
  if [[ ! -r "$archive_path" ]]; then
    error "Archive file is not readable: $archive_path"
    exit 1
  fi

  WORK_DIR="$(mktemp -d)"

  info "Validating archive"
  "$TAR_BIN" -tzf "$archive_path" >/dev/null
  assert_archive_structure "$archive_path"

  info "Extracting archive to temporary directory"
  "$TAR_BIN" -xzf "$archive_path" -C "$WORK_DIR"

  ensure_running_services
  verify_db_ready
  stop_write_services

  info "Restoring database"
  compose exec -T "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$WORK_DIR/database.sql"

  info "Clearing existing media assets"
  compose run --rm --no-deps -T "$MEDIA_SERVICE" sh -lc 'mkdir -p /assetfilestore && find /assetfilestore -mindepth 1 -delete'

  info "Restoring media assets"
  compose run --rm --no-deps -T "$MEDIA_SERVICE" sh -lc 'mkdir -p /assetfilestore && tar -xf - -C /assetfilestore' < "$WORK_DIR/assets.tar"

  restart_stopped_services
  NEEDS_RESTART=0

  wait_for_health "web" "$WEB_HEALTH_URL"
  wait_for_health "admin" "$ADMIN_HEALTH_URL"

  info "Import complete: $archive_path"
}

main() {
  if [[ $# -eq 0 ]]; then
    usage
    exit 1
  fi

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --help|-h)
        usage
        exit 0
        ;;
      --force)
        FORCE_OVERWRITE=1
        shift
        ;;
      --yes)
        CONFIRM_IMPORT=1
        shift
        ;;
      export|import)
        break
        ;;
      *)
        error "Unknown option or operation: $1"
        usage
        exit 1
        ;;
    esac
  done

  if [[ $# -ne 2 ]]; then
    error "Expected operation and filename"
    usage
    exit 1
  fi

  local operation="$1"
  local archive_path="$2"

  ensure_prereqs

  case "$operation" in
    export)
      export_backup "$archive_path"
      ;;
    import)
      import_backup "$archive_path"
      ;;
    *)
      error "Unsupported operation: $operation"
      usage
      exit 1
      ;;
  esac
}

main "$@"
