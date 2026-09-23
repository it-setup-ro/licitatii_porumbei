#!/bin/bash
# Leagă platforma de un serviciu de e-mail: Gmail (pentru probe), Brevo, sau altul.
#
# Rulează-l TU pe server — parola se scrie aici, la prompt, și nu trece prin
# chat, prin git sau prin istoricul comenzilor:
#
#   ssh root@207.180.241.165
#   bash /opt/licitatii-porumbei/platform/scripts/set-smtp.sh
#
# Starea se vede după aceea în site: Administrare → E-mailuri (sus).
set -euo pipefail

ENV_FILE=/opt/licitatii-porumbei/platform/.env

echo "De unde pleacă e-mailurile?"
echo "  1) Gmail — bun pentru probe. Cere „parolă de aplicație” (cont Google cu"
echo "     verificare în doi pași → Securitate → Parole pentru aplicații)."
echo "     În jur de 500 de mesaje pe zi; NU e bun pentru trimiteri în masă."
echo "  2) Brevo — 300 de e-mailuri pe zi gratuit, făcut pentru trimiteri multe."
echo "     Cheia: Transactional → Email → Settings → SMTP & API."
echo "  3) Altul — scrii tu serverul și portul (Mailgun, Amazon SES, gazda ta)."
read -rp "Alege 1, 2 sau 3: " ALEGERE

case "$ALEGERE" in
  1)
    HOST=smtp.gmail.com; PORT=587
    read -rp "Adresa de Gmail (ex. licitatii@gmail.com): " LOGIN
    read -rsp "Parola de aplicație (16 litere, nu parola contului): " KEY; echo
    FROM_EMAIL_DEFAULT="$LOGIN"
    ;;
  2)
    HOST=smtp-relay.brevo.com; PORT=587
    read -rp "Login SMTP Brevo (de forma 9a1b2c001@smtp-brevo.com): " LOGIN
    read -rsp "Cheia SMTP Brevo (nu se afișează): " KEY; echo
    FROM_EMAIL_DEFAULT=""
    ;;
  3)
    read -rp "Serverul SMTP (ex. smtp.firma.ro): " HOST
    read -rp "Portul [587]: " PORT; PORT=${PORT:-587}
    read -rp "Utilizator: " LOGIN
    read -rsp "Parola (nu se afișează): " KEY; echo
    FROM_EMAIL_DEFAULT="$LOGIN"
    ;;
  *)
    echo "Nu am înțeles alegerea. Nu am schimbat nimic."
    exit 1
    ;;
esac

read -rp "Adresa de pe care pleacă mesajele${FROM_EMAIL_DEFAULT:+ [$FROM_EMAIL_DEFAULT]}: " FROM_EMAIL
FROM_EMAIL=${FROM_EMAIL:-$FROM_EMAIL_DEFAULT}
if [[ -z "$FROM_EMAIL" ]]; then
  echo "Fără adresă de expediere nu putem trimite. Nu am schimbat nimic."
  exit 1
fi
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
echo
echo "Gata. Starea se vede în site: Administrare → E-mailuri (caseta de sus),"
echo "de unde poți trimite oricând un alt e-mail de probă."
echo "Copia vechiului .env a rămas lângă el (.env.bak-…)."
