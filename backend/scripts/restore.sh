#!/usr/bin/env sh
set -eu

: "${DATABASE_URL:?DATABASE_URL obrigatório}"
: "${BACKUP_ENCRYPTION_PASSWORD:?BACKUP_ENCRYPTION_PASSWORD obrigatório}"
archive="${1:?Uso: restore.sh arquivo.dump.enc}"

sha256sum -c "$archive.sha256"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
openssl enc -d -aes-256-cbc -pbkdf2 -in "$archive" -out "$tmp" -pass env:BACKUP_ENCRYPTION_PASSWORD
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$DATABASE_URL" "$tmp"
