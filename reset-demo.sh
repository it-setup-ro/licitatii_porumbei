#!/bin/bash
# ȘTERGE toate datele din baza de producție și readuce starea demo.
#
# Comanda asta a șters odată, din greșeală, loturi reale aflate în testare.
# De atunci face două lucruri înainte de orice:
#   1. cere confirmare scrisă (sau `--da`, pentru rulări automate)
#   2. face o copie de siguranță a bazei, ca revenirea să fie posibilă
#
# Pozele și clipurile urcate NU se șterg niciodată — rămân în platform/uploads/,
# indiferent de câte ori se resetează baza.

set -euo pipefail

BACKUP=/opt/licitatii-porumbei/backup-db.sh

if [ "${1:-}" != "--da" ]; then
  echo
  echo "  ⚠  ATENȚIE"
  echo
  echo "  Comanda ȘTERGE din baza de producție toate loturile, articolele,"
  echo "  produsele, comenzile, ofertele și conturile reale, și pune la loc"
  echo "  datele demo."
  echo
  echo "  Pozele și clipurile urcate rămân pe disc (platform/uploads/)."
  echo
  read -r -p "  Scrie DA (cu majuscule) ca să continui: " raspuns </dev/tty
  if [ "$raspuns" != "DA" ]; then
    echo "  Anulat. Nu s-a schimbat nimic."
    exit 1
  fi
  echo
fi

echo "Fac întâi o copie de siguranță a bazei..."
bash "$BACKUP"

cd /opt/licitatii-porumbei/platform
sudo -u nbp -H npm run db:seed

echo 'Gata — datele au fost resetate la starea demo initiala.'
echo "Dacă a fost o greșeală, copia de dinainte e în /opt/licitatii-porumbei/backups/."
