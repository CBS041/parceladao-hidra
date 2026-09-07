#!/usr/bin/env bash
set -euo pipefail

# Gera backup compactado de banco SQLite e uploads com rotacao por dias.
DATA_DIR="${DATA_DIR:-/opt/parceladao/data}"
UPLOADS_DIR="${UPLOADS_DIR:-/opt/parceladao/uploads}"
DB_FILE_NAME="${DB_FILE_NAME:-parceladao.db}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/parceladao}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# Envio opcional para Discord webhook.
DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"
DISCORD_USERNAME="${DISCORD_USERNAME:-Parceladao Backup}"
DISCORD_MAX_FILE_BYTES="${DISCORD_MAX_FILE_BYTES:-8388608}"
DISCORD_SPLIT_PART_SIZE="${DISCORD_SPLIT_PART_SIZE:-7900000}"
DISCORD_MENTION="${DISCORD_MENTION:-}"
ALLOW_EMPTY_BACKUP="${ALLOW_EMPTY_BACKUP:-false}"

DB_PATH="${DATA_DIR}/${DB_FILE_NAME}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
TMP_DIR="$(mktemp -d)"
ARCHIVE_PATH="${BACKUP_DIR}/parceladao-${TIMESTAMP}.tar.gz"

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

log() {
  echo "[$(date +%Y-%m-%dT%H:%M:%S%z)] $*"
}

require_numeric() {
  local value="$1"
  local label="$2"
  if [[ ! "${value}" =~ ^[0-9]+$ ]]; then
    echo "Variavel ${label} deve ser numerica. Valor atual: ${value}" >&2
    exit 1
  fi
}

upload_to_discord() {
  local file_path="$1"
  local message="$2"
  local response_file
  local http_code

  response_file="$(mktemp)"
  http_code="$({ curl -sS -o "${response_file}" -w "%{http_code}" \
    -F "username=${DISCORD_USERNAME}" \
    -F "content=${message}" \
    -F "file1=@${file_path}" \
    "${DISCORD_WEBHOOK_URL}"; } || true)"

  if [[ ! "${http_code}" =~ ^2 ]]; then
    echo "Falha ao enviar para Discord (HTTP ${http_code})." >&2
    cat "${response_file}" >&2 || true
    rm -f "${response_file}"
    return 1
  fi

  rm -f "${response_file}"
}

send_discord_text() {
  local message="$1"
  local response_file
  local http_code

  response_file="$(mktemp)"
  http_code="$({ curl -sS -o "${response_file}" -w "%{http_code}" \
    -F "username=${DISCORD_USERNAME}" \
    -F "content=${message}" \
    "${DISCORD_WEBHOOK_URL}"; } || true)"

  if [[ ! "${http_code}" =~ ^2 ]]; then
    echo "Falha ao enviar mensagem para Discord (HTTP ${http_code})." >&2
    cat "${response_file}" >&2 || true
    rm -f "${response_file}"
    return 1
  fi

  rm -f "${response_file}"
}

require_numeric "${RETENTION_DAYS}" "RETENTION_DAYS"
require_numeric "${DISCORD_MAX_FILE_BYTES}" "DISCORD_MAX_FILE_BYTES"
require_numeric "${DISCORD_SPLIT_PART_SIZE}" "DISCORD_SPLIT_PART_SIZE"

mkdir -p "${BACKUP_DIR}"
mkdir -p "${TMP_DIR}/data"

if [[ -f "${DB_PATH}" ]]; then
  if command -v sqlite3 >/dev/null 2>&1; then
    # Usa .backup para snapshot consistente do SQLite.
    printf '.backup %q\n' "${TMP_DIR}/data/${DB_FILE_NAME}" | sqlite3 "${DB_PATH}"
  else
    cp "${DB_PATH}" "${TMP_DIR}/data/${DB_FILE_NAME}"
  fi
else
  log "Aviso: banco nao encontrado em ${DB_PATH}."
fi

mkdir -p "${TMP_DIR}/uploads"
if [[ -d "${UPLOADS_DIR}" ]]; then
  # Copia o conteudo (incluindo arquivos ocultos), sem criar subpasta duplicada.
  cp -a "${UPLOADS_DIR}/." "${TMP_DIR}/uploads/"
else
  log "Aviso: uploads nao encontrados em ${UPLOADS_DIR}."
fi

DB_BACKUP_PATH="${TMP_DIR}/data/${DB_FILE_NAME}"
DB_BACKUP_SIZE=0
if [[ -f "${DB_BACKUP_PATH}" ]]; then
  DB_BACKUP_SIZE="$(wc -c < "${DB_BACKUP_PATH}")"
fi
UPLOADS_FILE_COUNT="$(find "${TMP_DIR}/uploads" -type f 2>/dev/null | wc -l | tr -d ' ')"

if [[ "${ALLOW_EMPTY_BACKUP}" != "true" ]] && (( DB_BACKUP_SIZE == 0 )) && (( UPLOADS_FILE_COUNT == 0 )); then
  echo "Erro: backup vazio. Verifique DATA_DIR (${DATA_DIR}) e UPLOADS_DIR (${UPLOADS_DIR})." >&2
  exit 1
fi

log "Resumo origem: db=${DB_PATH}, db_backup_size=${DB_BACKUP_SIZE} bytes, uploads_files=${UPLOADS_FILE_COUNT}"

tar -czf "${ARCHIVE_PATH}" -C "${TMP_DIR}" .
ARCHIVE_SIZE="$(wc -c < "${ARCHIVE_PATH}")"
ARCHIVE_SHA256="$(sha256sum "${ARCHIVE_PATH}" | awk '{print $1}')"

find "${BACKUP_DIR}" -type f -name 'parceladao-*.tar.gz' -mtime +"${RETENTION_DAYS}" -delete

log "Backup criado: ${ARCHIVE_PATH} (${ARCHIVE_SIZE} bytes, sha256=${ARCHIVE_SHA256})"

if [[ -n "${DISCORD_WEBHOOK_URL}" ]]; then
  if ! command -v curl >/dev/null 2>&1; then
    echo "curl nao encontrado para envio ao Discord." >&2
    exit 1
  fi

  mention_prefix=""
  if [[ -n "${DISCORD_MENTION}" ]]; then
    mention_prefix="${DISCORD_MENTION} "
  fi

  base_msg="${mention_prefix}Backup Parceladao em ${TIMESTAMP} | tamanho=${ARCHIVE_SIZE} bytes | sha256=${ARCHIVE_SHA256}"

  if (( ARCHIVE_SIZE <= DISCORD_MAX_FILE_BYTES )); then
    upload_to_discord "${ARCHIVE_PATH}" "${base_msg} | arquivo unico"
    log "Backup enviado ao Discord em arquivo unico."
  else
    split_prefix="${TMP_DIR}/$(basename "${ARCHIVE_PATH}").part-"
    split -b "${DISCORD_SPLIT_PART_SIZE}" -d -a 3 "${ARCHIVE_PATH}" "${split_prefix}"

    mapfile -t parts < <(find "${TMP_DIR}" -maxdepth 1 -type f -name "$(basename "${ARCHIVE_PATH}").part-*" | sort)
    part_count="${#parts[@]}"

    send_discord_text "${base_msg} | arquivo dividido em ${part_count} partes"

    for i in "${!parts[@]}"; do
      part_num=$((i + 1))
      upload_to_discord "${parts[$i]}" "${mention_prefix}Backup Parceladao parte ${part_num}/${part_count} (${TIMESTAMP})"
    done

    log "Backup enviado ao Discord em ${part_count} partes."
  fi
fi
