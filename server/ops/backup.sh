#!/usr/bin/env bash
# Nightly consistent backup of the SQLite database (safe while the API is running).
# Keeps 14 daily + 8 weekly (Sunday) copies. Files are chmod 600.
#
# Usage:  DB_PATH=/opt/mates/server/data/mates.db BACKUP_DIR=/var/backups/mates ./backup.sh
# Restore procedure: see server/README.md ("Restaurar").
set -euo pipefail
umask 077

DB_PATH="${DB_PATH:-/opt/mates/server/data/mates.db}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/mates}"
KEEP_DAILY="${KEEP_DAILY:-14}"
KEEP_WEEKLY="${KEEP_WEEKLY:-8}"

command -v sqlite3 >/dev/null || { echo "sqlite3 not installed" >&2; exit 1; }
[ -f "$DB_PATH" ] || { echo "database not found" >&2; exit 1; }

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"
chmod 700 "$BACKUP_DIR" "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

stamp="$(date +%Y-%m-%d)"
tmp="$BACKUP_DIR/.tmp-$stamp-$$.db"
target="$BACKUP_DIR/daily/mates-$stamp.db"
trap 'rm -f "$tmp"' EXIT

# .backup uses SQLite's online backup API: consistent snapshot, WAL included.
sqlite3 "$DB_PATH" ".timeout 10000" ".backup '$tmp'"
[ "$(sqlite3 "$tmp" 'PRAGMA integrity_check;')" = "ok" ] || { echo "integrity check failed" >&2; exit 1; }

mv "$tmp" "$target"
chmod 600 "$target"

# Sunday (date +%u = 7): keep a weekly copy.
if [ "$(date +%u)" = "7" ]; then
  cp "$target" "$BACKUP_DIR/weekly/mates-$stamp.db"
  chmod 600 "$BACKUP_DIR/weekly/mates-$stamp.db"
fi

prune() { # dir keep
  # `ls` exits non-zero when the directory has no backups yet (first nights, no Sunday yet); with `pipefail`
  # that would abort the whole script after the backup was already made, so it must not count as a failure.
  { ls -1t "$1"/mates-*.db 2>/dev/null || true; } | tail -n +"$(($2 + 1))" | xargs -r rm -f --
}
prune "$BACKUP_DIR/daily" "$KEEP_DAILY"
prune "$BACKUP_DIR/weekly" "$KEEP_WEEKLY"

echo "backup ok: $target"
