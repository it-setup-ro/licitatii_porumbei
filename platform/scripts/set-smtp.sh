#!/bin/bash
# Leagă platforma de serviciul de e-mail (Brevo sau orice alt SMTP).
#
# Rulează-l TU pe server — parola SMTP se scrie aici, la prompt, și nu trece
# prin chat, prin git sau prin istoricul comenzilor:
#
#   ssh root@207.180.241.165
#   bash /opt/licitatii-porumbei/platform/scripts/set-smtp.sh
#
# Brevo → Transactional → Email → Settings → SMTP & API:
#   - Login:   de forma 9a1b2c001@smtp-brevo.com
#   - SMTP key: butonul „Generate a new SMTP key"
set -euo pipefail

ENV_FILE=/opt/licitatii-porumbei/platform/.env
HOST=smtp-relay.brevo.com
PORT=587

read -rp "Login SMTP Brevo: " LOGIN
read -rsp "Cheia SMTP (nu se afișează): " KEY; echo
read -rp "Adresa expeditorului (verificată în Brevo → Senders): " FROM_EMAIL
read -rp "Numele expeditorului [No.1 & Best Pigeons]: " FROM_NAME
FROM_NAME=${FROM_NAME:-No.1 & Best Pigeons}

# login-ul și cheia conțin caractere care trebuie codate într-un URL (@, /, +)
enc() { node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$1"; }
SMTP_URL="smtp://$(enc "$LOGIN"):$(enc "$KEY")@${HOST}:${PORT}"
SMTP_FROM="${FROM_NAME} <${FROM_EMAIL}>"

cp "$ENV_FILE" "${ENV_FILE}.bak-$(date +%Y%m%d%H%M%S)"
grep -v '^SMTP_URL=\|^SMTP_FROM=' "$ENV_FILE" > "${ENV_FILE}.tmp" || true
{
  cat "${ENV_FILE}.tmp"
  printf 'SMTP_URL="%s"\n' "$SMTP_URL"
  printf 'SMTP_FROM="%s"\n' "$SMTP_FROM"
} > "$ENV_FILE"
rm -f "${ENV_FILE}.tmp"
chown nbp "$ENV_FILE"
chmod 600 "$ENV_FILE"

read -rp "Trimit un e-mail de probă la adresa: " TEST_TO
sudo -u nbp -H bash -c "cd /opt/licitatii-porumbei/platform && set -a && . ./.env && set +a && node -e '
const nodemailer = require(\"nodemailer\");
nodemailer.createTransport(process.env.SMTP_URL)
  .sendMail({ from: process.env.SMTP_FROM, to: process.argv[1], subject: \"Probă No.1 & Best Pigeons\", text: \"E-mailul platformei funcționează.\" })
  .then(r => console.log(\"TRIMIS:\", r.response))
  .catch(e => { console.error(\"EROARE:\", e.message); process.exit(1); });
' \"$TEST_TO\""

systemctl restart licitatii-porumbei
echo "Gata: platforma trimite e-mailuri prin Brevo. Copia vechiului .env a rămas lângă el (.env.bak-…)."
