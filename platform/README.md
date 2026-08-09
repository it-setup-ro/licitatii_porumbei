# No.1 & Best Pigeons — Platformă de licitații de porumbei

Platformă web custom, full-stack, bilingvă RO/EN, cu licitații live în timp real,
proxy-bidding, anti-sniping, plăți cu comision, notificări și rating de vânzători.
Construită conform `../research-report.md` și `../client-decisions.md`.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Prisma 6** + SQLite (dev) — schemă compatibilă PostgreSQL pentru producție
- **next-intl** — bilingv RO/EN cu comutator de limbă
- **SSE** (Server-Sent Events) — actualizări live la licitare (preț, prelungiri, închidere)
- **Tailwind 4** — design system pe paleta din logo (ivory / negru / degrade aripă)
- Plăți: strat de abstractizare (`src/lib/payments.ts`) cu **MockProvider** în dev
  și schelet **Stripe Connect** pentru producție

## Pornire

```bash
npm install
npx prisma migrate dev   # creeaza dev.db
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
npm run test:e2e  # Playwright: 19 teste pe DB separată (prisma/test.db), server pe :3100
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

## Producție — ce rămâne de făcut

- PostgreSQL (schimbă `datasource` în `prisma/schema.prisma`) + Redis pub/sub pt. SSE multi-instanță
- Stripe Connect real (chei în env, webhook-uri) — interfața există deja
- Upload de imagini (acum: URL-uri) și e-mail real (acum: EmailLog + consolă)
- SMS (Twilio/SMSLink) — pregătit, dezactivat conform deciziei D16
