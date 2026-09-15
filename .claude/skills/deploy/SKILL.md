---
name: deploy
description: Publică platforma No.1 & Best Pigeons pe serverul de test (207.180.241.165) — pull, npm install, migrare, build, restart, verificare. Folosește după commit + push pe main, doar când Daniel a cerut publicarea.
---

# Publicarea pe server

Condiții: commit-ul e pe `main` (`git push origin master:main`) și Daniel a cerut publicarea.

1. Pe server există modificări locale cunoscute și inofensive: `backup-db.sh`, `reset-demo.sh` (doar bitul de executare) și `platform/package-lock.json` (zgomot npm). Nu le atinge, cu excepția lock-ului, care se readuce din depozit.
2. Scrie în scratchpad `deploy.sh` (dacă nu există deja) cu:

```bash
#!/bin/bash
set -euo pipefail
cd /opt/licitatii-porumbei
sudo -u nbp git checkout -- platform/package-lock.json
sudo -u nbp -H bash -c '
  set -euo pipefail
  cd /opt/licitatii-porumbei && git pull origin main && git log --oneline -1
  cd platform && npm install --no-audit --no-fund
  npx prisma migrate deploy && npx prisma generate && npm run build
'
systemctl restart licitatii-porumbei
sleep 8
systemctl is-active licitatii-porumbei
for p in /ro /ro/auctions /ro/fixed-price; do curl -s -o /dev/null -w "$p %{http_code}\n" "http://127.0.0.1:3000$p"; done
journalctl -u licitatii-porumbei --since '-5 min' --no-pager | grep -i 'error\|⨯' | head -5
```

3. Rulează (cheia SSH e autorizată, fără parolă):

```bash
scp -o BatchMode=yes -q <scratchpad>/deploy.sh root@207.180.241.165:/tmp/deploy.sh
ssh -o BatchMode=yes root@207.180.241.165 "bash /tmp/deploy.sh 2>&1 | grep -v '^npm warn' | tail -25; rm -f /tmp/deploy.sh"
```

4. Raportează: commit-ul de pe server, migrările aplicate, `active`, codurile HTTP, erorile din jurnal (sau lipsa lor). 307 pe paginile de admin/cont = redirect la login, e normal.

**Niciodată** `reset-demo.sh` sau `db:seed` după publicare.
