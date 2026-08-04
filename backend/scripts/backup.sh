#!/usr/bin/env sh
set -eu

: "${DATABASE_URL:?DATABASE_URL obrigatório}"
: "${BACKUP_DIR:=./backups}"
: "${BACKUP_ENCRYPTION_PASSWORD:?BACKUP_ENCRYPTION_PASSWORD obrigatório}"

mkdir -p "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
plain="$BACKUP_DIR/medper-$stamp.dump"
encrypted="$plain.enc"

pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" > "$plain"
openssl enc -aes-256-cbc -pbkdf2 -salt -in "$plain" -out "$encrypted" -pass env:BACKUP_ENCRYPTION_PASSWORD
sha256sum "$encrypted" > "$encrypted.sha256"
rm -f "$plain"

# Retenção operacional local: 14 diários. O destino remoto deve ter lifecycle próprio.
find "$BACKUP_DIR" -type f -name 'medper-*.dump.enc*' -mtime +14 -delete
printf '%s\n' "$encrypted"
