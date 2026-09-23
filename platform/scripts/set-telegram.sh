#!/bin/bash
# Leagă platforma de un bot de Telegram, ca anunțurile pentru administrator să
# ajungă pe telefon: cerere de cont, mesaj de contact, porumbel de aprobat,
# cerere de licitație, comandă nouă.
#
# Rulează-l TU pe server — token-ul se scrie aici, la prompt, și nu trece prin
# chat, prin git sau prin istoricul comenzilor:
#
#   ssh root@207.180.241.165
#   bash /opt/licitatii-porumbei/platform/scripts/set-telegram.sh
#
# De unde iei token-ul, o singură dată:
#   1. în Telegram caută @BotFather și scrie-i /newbot
#   2. îți cere un nume (ex. „No.1 & Best Pigeons") și un nume de utilizator
#      care se termină în „bot" (ex. no1bestpigeons_bot)
#   3. îți răspunde cu un token de forma 123456789:AAH...  — ăla se lipește aici
#
# Pe cine anunță se alege din site: Administrare → Anunțuri.
set -euo pipefail

ENV_FILE=/opt/licitatii-porumbei/platform/.env
SITE_DEFAULT=http://207.180.241.165:3000

read -rsp "Token-ul botului (nu se afișează): " TOKEN; echo
if [[ ! "$TOKEN" =~ ^[0-9]+:[A-Za-z0-9_-]+$ ]]; then
  echo "Token-ul nu arată a token de bot (cifre, două puncte, litere). Nu am schimbat nimic."
  exit 1
fi

read -rp "Adresa site-ului, pentru linkurile din anunțuri [$SITE_DEFAULT]: " SITE_URL
SITE_URL=${SITE_URL:-$SITE_DEFAULT}

# proba înainte să schimbăm ceva: dacă token-ul e greșit, aflăm acum
NUME=$(curl -s --max-time 20 "https://api.telegram.org/bot${TOKEN}/getMe" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);if(!j.ok){console.error(j.description||"token respins");process.exit(1);}process.stdout.write(j.result.username);})')
echo "Botul răspunde: @${NUME}"

cp "$ENV_FILE" "${ENV_FILE}.bak-$(date +%Y%m%d%H%M%S)"
grep -v '^TELEGRAM_BOT_TOKEN=\|^SITE_URL=' "$ENV_FILE" > "${ENV_FILE}.tmp" || true
{
  cat "${ENV_FILE}.tmp"
  printf 'TELEGRAM_BOT_TOKEN="%s"\n' "$TOKEN"
  printf 'SITE_URL="%s"\n' "$SITE_URL"
} > "$ENV_FILE"
rm -f "${ENV_FILE}.tmp"
chown nbp "$ENV_FILE"
chmod 600 "$ENV_FILE"

systemctl restart licitatii-porumbei
sleep 6
systemctl is-active licitatii-porumbei

echo
echo "Gata. Mai departe, din site:"
echo "  1. Administrare → Anunțuri"
echo "  2. „Fă un link\" pentru cine vrei să primească anunțurile"
echo "  3. Îi trimiți linkul; el apasă Start în Telegram — și gata"
echo "Copia vechiului .env a rămas lângă el (.env.bak-…)."
