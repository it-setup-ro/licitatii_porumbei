# No.1 & Best Pigeons — Platformă de licitații de porumbei

Platformă web custom, full-stack, bilingvă RO/EN, cu licitații live în timp real,
proxy-bidding, anti-sniping, plăți cu comision, notificări și rating de vânzători.
Construită conform `../research-report.md` și `../client-decisions.md`.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Prisma 6** + **PostgreSQL** (local: baza `nbp`; testele e2e folosesc `nbp_test`)
- **next-intl** — bilingv RO/EN cu comutator de limbă
- **SSE** (Server-Sent Events) — actualizări live la licitare (preț, prelungiri, închidere)
- **Tailwind 4** — design system pe paleta din logo (ivory / negru / degrade aripă)
- Plăți: strat de abstractizare (`src/lib/payments.ts`) cu **MockProvider** în dev
  și schelet **Stripe Connect** pentru producție

## Pornire

```bash
npm install
# DATABASE_URL in .env: postgresql://postgres:...@localhost:5432/nbp
npx prisma migrate dev   # aplica schema pe PostgreSQL
npm run db:seed          # date demo
npm run dev              # http://localhost:3000
```

## Conturi demo (după seed)

| Rol | E-mail | Parolă | Note |
|---|---|---|---|
| Admin | admin@nbp.test | admin1234 | panou `/ro/admin` |
| Vânzător aprobat | seller@nbp.test | seller1234 | Columbodromul Câmpeanu |
| Vânzător în așteptare | pending-seller@nbp.test | seller1234 | pt. testul de aprobare |
| Cumpărător cu istoric | buyer1@nbp.test | buyer1234 | fără limită de licitare |
| Cumpărător nou | buyer2@nbp.test | buyer1234 | limită 1.000 EUR (KYC hibrid) |

## Teste

```bash
npm test          # unitare (Vitest): motorul de proxy-bidding, anti-sniping, bani
npm run test:e2e  # Playwright: 19 teste pe DB separată (nbp_test), server pe :3100
```

Suita e2e acoperă: pagini publice + i18n, înregistrare/login, cererea de cont
vânzător, războiul de oferte între doi utilizatori reali (cu actualizări SSE),
limita conturilor noi, anti-sniping, închiderea licitației cu animația stolului,
plata mock, recenzii, moderarea admin (vânzători/loturi/recenzii) și panoul de
setări cu audit trail.

## Arhitectură — pe scurt

- `src/lib/bidding.ts` — logica pură de proxy-bidding (testabilă fără DB)
- `src/lib/auction-service.ts` — tranzacții DB + race-condition safety + sweep
  (pornire/închidere licitații; rulează la 15s prin `src/instrumentation.ts`)
- `src/lib/settings.ts` — panoul de setări (client-decisions §G): toți parametrii
  comerciali sunt configurabili din admin, cu audit trail
- `src/lib/events.ts` — bus de evenimente in-memory (înlocuibil cu Redis pub/sub)
- `src/app/api/*` — API-ul (auth, bid, stream SSE, sell, orders, admin)
- `src/app/[locale]/*` — paginile, toate bilingve (messages/ro.json, en.json)

## Deploy live (test) — Contabo

Rulează acum pe `http://207.180.241.165:3000` (fără domeniu/SSL încă — acces direct pe IP:port).

- Cod: `/opt/licitatii-porumbei` pe server, clonat din [github.com/it-setup-ro/licitatii_porumbei](https://github.com/it-setup-ro/licitatii_porumbei) (public), branch `main`.
- Serviciu: `licitatii-porumbei.service` (systemd), rulează ca user dedicat `nbp`, pornește automat la boot, `Restart=always`.
- Bază de date: `nbp_prod` pe PostgreSQL-ul nativ al serverului (user dedicat `nbp_app`, izolat de baza `cleanware`).
- **Reset la starea demo:** `ssh root@207.180.241.165 'bash /opt/licitatii-porumbei/reset-demo.sh'` — golește și repopulează cu datele demo (aceleași conturi ca local).
- **Deploy al unei schimbări noi:**
  ```bash
  ssh root@207.180.241.165 'sudo -u nbp -H bash -c "cd /opt/licitatii-porumbei && git pull origin main && cd platform && npm install --no-audit --no-fund && npx prisma migrate deploy && npm run build"'
  ssh root@207.180.241.165 'systemctl restart licitatii-porumbei.service'
  ```
- **Important:** cookie-ul de sesiune e `Secure` doar dacă setezi `COOKIE_SECURE=true` în `.env` de pe server — activează asta abia după ce pui domeniu + certificat SSL (altfel login-ul se rupe pe HTTP simplu).

## Producție — ce rămâne de făcut

- Domeniu + certificat SSL (Let's Encrypt) + server block nginx dedicat, apoi `COOKIE_SECURE=true`
- Redis pub/sub pt. SSE multi-instanță (o singură instanță merge fără)
- Stripe Connect real (chei în env, webhook-uri) — interfața există deja
- Upload de imagini (acum: URL-uri) și e-mail real (acum: EmailLog + consolă)
- SMS (Twilio/SMSLink) — pregătit, dezactivat conform deciziei D16
