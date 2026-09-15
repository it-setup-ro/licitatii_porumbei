---
name: prod-script
description: Rulează un script de date (citire sau modificare) pe baza de producție a platformei No.1 & Best Pigeons — setări, conversii, mutări de înregistrări. Folosește când trebuie schimbate sau verificate date pe server.
---

# Script pe baza de producție

Pentru modificări: **spune întâi ce face scriptul și cere acordul lui Daniel**. Pentru citiri, nu e nevoie.

1. Scrie un `.cjs` în scratchpad, cu `@prisma/client`:
   - afișează starea **înainte** (numărători, câteva exemple);
   - modificările într-o singură `prisma.$transaction(async (tx) => …, { timeout: 60_000 })`;
   - setările: `platformSetting.upsert` (valoare `JSON.stringify`) + `auditLog.create({ action: "SETTING_CHANGED", entity: "PlatformSetting", entityId: key, dataJson })`;
   - afișează starea **după**;
   - nu șterge nimic.
2. Urcă, rulează ca utilizatorul `nbp` cu `.env`, apoi șterge scriptul:

```bash
scp -o BatchMode=yes -q <scratchpad>/x.cjs root@207.180.241.165:/opt/licitatii-porumbei/platform/x-tmp.cjs
ssh -o BatchMode=yes root@207.180.241.165 "chown nbp /opt/licitatii-porumbei/platform/x-tmp.cjs && sudo -u nbp -H bash -c 'cd /opt/licitatii-porumbei/platform && set -a && . ./.env && set +a && node x-tmp.cjs'; rm -f /opt/licitatii-porumbei/platform/x-tmp.cjs"
```

3. Citiri rapide SQL (fără script):

```bash
ssh -o BatchMode=yes root@207.180.241.165 "sudo -u nbp -H bash -c 'cd /opt/licitatii-porumbei/platform && set -a && . ./.env && set +a && psql \"\${DATABASE_URL%%\?*}\" -Atc \"select ...\"'"
```

Serverul mai găzduiește Cleanware și vTiger: nu atinge alte baze sau servicii.
