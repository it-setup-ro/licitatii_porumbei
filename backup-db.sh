#!/bin/bash
# Copie de siguranță a bazei de producție (nbp_prod).
#
# Rulează automat în fiecare noapte la 03:00 (/etc/cron.d/nbp-backup) și
# manual: bash /opt/licitatii-porumbei/backup-db.sh
#
# Se păstrează ultimele 30 de zile. O copie are câteva sute de KB, iar pe
# server sunt 131 GB liberi — nu e un cost de care să ne pese.

set -euo pipefail

DIR=/opt/licitatii-porumbei/backups
KEEP_DAYS=30

mkdir -p "$DIR"
STAMP=$(date +%Y-%m-%d_%H-%M-%S)
FILE="$DIR/nbp_prod_$STAMP.sql.gz"

sudo -u postgres pg_dump nbp_prod | gzip > "$FILE"

# ștergem copiile mai vechi decât KEEP_DAYS
find "$DIR" -name 'nbp_prod_*.sql.gz' -mtime "+$KEEP_DAYS" -delete

echo "Copie salvată: $FILE ($(du -h "$FILE" | cut -f1))"
