# No.1 & Best Pigeons — ghid de lucru

Platformă de licitații de porumbei pentru Daniel (intermediar) și clientul lui,
**Buca Ionuț (Demeco Arad)**. Codul e în `platform/` (Next.js 16 App Router,
React 19, Prisma 6 + PostgreSQL, next-intl în 13 limbi, Tailwind 4, zod 4,
Playwright + Vitest). Repo **public** — nimic secret în cod.

**Nu parcurge proiectul.** Citește doar ce-ți trebuie: `STARE-PROIECT.md` (ce
merge, ce rămâne, istoric) → harta de mai jos → fișierul exact.

## Cum lucrez o cerere

Cererile vin de la client, pe WhatsApp, în liste scurte. Ordinea care
funcționează:

1. **Împarte lista** în puncte și ia-le pe rând, cu cel care îl blochează întâi.
2. **Întreabă doar ce schimbă munca** (2–3 întrebări, cu o recomandare la
   fiecare). Restul alege-le singur și spune ce ai ales.
3. **Caută în hartă, nu în proiect.** O singură citire țintită per fișier.
4. **Scrie cu script, nu cu editări oarbe** → skill `batch-edits`.
5. **Texte noi** → skill `texte-13-limbi` (nu lăsa o limbă pe dinafară).
6. **Verifică**: `npx tsc --noEmit`, `npm test`, apoi e2e țintit → skill `e2e`.
   Suita completă (~24 min, 304 teste) doar înainte de publicare.
7. **Scrie în documente**: rând în istoricul din `STARE-PROIECT.md`, rând nou în
   harta de aici dacă a apărut un fișier care contează.
8. **Commit doar la cerere**; publicarea → skill `deploy`.
9. **Răspunde-i lui Daniel** cu ce se vede, nu cu ce ai scris: ce apasă clientul,
   unde, ce se schimbă. Plus un mesaj gata de trimis clientului, în română,
   stil WhatsApp.

Când clientul reclamă ceva ce testele nu prind (actualizare live, mesaje,
e-mailuri), nu te apăra cu testele: fă proba pe server → skill `proba-live`.

## Skill-uri

| Când | Skill |
|---|---|
| Modificări în peste 3 fișiere | `batch-edits` |
| Orice text nou pe ecran sau în e-mail | `texte-13-limbi` |
| Teste Playwright, țintite sau complete | `e2e` |
| Publicare pe server | `deploy` |
| Citit sau schimbat date pe producție | `prod-script` |
| „La mine nu merge" — probă pe serverul viu | `proba-live` |

## Harta codului (`platform/src`)

| Domeniu | Unde |
|---|---|
| Motorul de licitare | `lib/bidding.ts` (pur: proxy, pași, rezervă), `lib/bid-history.ts` (jurnal de fapte: rândurile nu se rescriu, răspunsul liderului e marcat `auto`), `lib/auction-service.ts` (tranzacții serializate + retry, sweeper, închidere, comision) |
| Cât trebuie să ofere omul | `minimumAcceptableMax` = minimul public; pentru **lider**, `computeBid` cere plafonul lui + un pas. `nextMinimumForAuction(auctionId, viewerId)` dă minimul **celui care se uită** — orice loc care propune o sumă trebuie să-l folosească, altfel pagina propune o sumă pe care serverul o refuză. Pagina: `minNextForViewer` + `yourMaxCents` → `components/LiveAuctionPanel.tsx`; test: `tests/e2e/plafon-propriu.spec.ts` |
| Licitații pe loturi (crescător → licitație → lot → porumbei) | `lib/lots.ts` (reguli pure), `lib/lot-service.ts` (Start lot), `lib/lot-notices.ts` (aviz 30 min), `lib/sale-cards.ts` + `components/SaleCard.tsx` (lista publică: **un card pe licitație, fără porumbei**), `lib/lot-cards.ts`; admin: `app/[locale]/admin/sales/**`, `components/admin/LotAdminPanel.tsx` (inclusiv mutarea finalului și ștergerea unui lot pornit, cât n-a licitat nimeni) |
| Pagina unei licitații (macheta clientului) | `app/[locale]/sales/[slug]/page.tsx`: cap de pagină cu fundal din Setări (`saleHeroUrl`), poza crescătorului, cifre, `components/CountdownBoxes.tsx`; „Despre crescător" scurt cu `ExpandableText`; „Rezultate importante" din `lib/breeder-results.ts` (`Loc 1 \| Maraton – Berlin \| 2025`); loturile cu insignă aurie |
| Pagina porumbelului | `app/[locale]/auctions/[id]/page.tsx` (fișa: serie, reprodus de, **vândut de**), `components/LiveAuctionPanel.tsx`, `BuyNowPanel.tsx`, `SellForm.tsx`, `LotEditForm.tsx`, `AuctionCard.tsx` |
| Actualizare live | `lib/events.ts`, `app/api/auctions/[id]/stream` (SSE: `sync` la conectare, keepalive, se închide curat la oprirea serviciului), `lib/live-auction.ts` (o legătură pe pagină; se reface la revenirea în pagină sau a internetului), `lib/live-streams.ts` (registrul fluxurilor + oprirea), `lib/mask-name.ts` |
| Setări (cheie → JSON, cache 5 s) | `lib/settings.ts` + `app/api/admin/settings/route.ts` (schema zod) + `components/admin/SettingsForm.tsx` (are și câmp de tip `image`) |
| Bani și curs lei / € | `lib/money.ts` (`formatMoney`, RON → „lei"), `lib/fx-math.ts` (pur), `lib/fx.ts` (BNR), `components/PriceInput.tsx` |
| Orele de pe site | `lib/platform-time.ts` (`platformFormat`, `PLATFORM_TZ` = Europe/Bucharest) — **orice dată arătată omului trece pe aici**; serviciul are și `TZ=Europe/Bucharest`. Cronometrul: `components/Countdown.tsx` (`zeroLabel` = „se închide acum", `refreshOnZero` pentru carduri) |
| Porumbelul | `lib/pigeon.ts`, `lib/pigeon-traits.ts`, `lib/lot-editing.ts` |
| Conturi, aprobare, admini | `lib/registration.ts`, `lib/company.ts`, `lib/regions.ts`, `components/RegisterForm.tsx`, `app/api/auth/**`, `app/[locale]/admin/accounts`, `lib/nickname.ts` |
| Contul de crescător | `lib/breeder-access.ts` (`Breeder.userId`), `lib/breeder-view.ts` (cumpărătorul: alias până la plată, nume + localitate după), `app/[locale]/breeder/**`, `api/breeder/profile`; admin: `components/admin/BreederAccountForm.tsx` + `api/admin/breeders/[id]/account` |
| Avizele crescătorului | `lib/breeder-notices.ts` (nu aruncă niciodată; bifa `Breeder.notifyByEmail`), `lib/lot-summary.ts`, `lib/breeder-emails.ts` (pure) |
| E-mail și notificări | `lib/mailer.ts`, `lib/notify.ts` (tipuri, subiecte, textul), `lib/notif-text.ts` (pur: suma scrisă din `...Cents`, link întreg), `lib/outbid-email.ts` + `lib/outbid-notice.ts` („ai fost depășit": porumbel, lot, preț, plafonul lui, ora închiderii) |
| E-mail: configurare | din Administrare → E-mailuri: `components/admin/EmailSetupCard.tsx` + `api/admin/email-config`, parola criptată (`lib/secret-box.ts`); `.env` are întâietate (`scripts/set-smtp.sh`); jurnal: `app/[locale]/admin/emails` |
| Comenzi, plată, decont | `lib/orders.ts`, `lib/settlement-math.ts`, `lib/payment-instructions.ts` (pure); admin: `app/[locale]/admin/orders`, `admin/settlements`; cumpărător: `app/[locale]/orders/[id]` |
| Anunțuri pentru administrator | `lib/alerts.ts`, `lib/telegram.ts`, `lib/telegram-link.ts`, `app/[locale]/admin/alerts`; pe server: `scripts/set-telegram.sh` |
| Prima pagină, concursuri, meniu | `app/[locale]/page.tsx`, `components/ContestCarousel.tsx`, `ContestBanner.tsx`, `SiteHeader.tsx` (`linkGroups`), `AccountMenu.tsx` |
| Ajutor, articole, magazin | `lib/faq.ts` + `app/[locale]/help`; articole: `app/[locale]/articles/**`, propuneri: `api/articles/propose`; magazin: `admin/shop-orders`, `admin/products` |
| Ascundere / arhivare / ștergere | `Auction.hiddenAt`, `Sale.archivedAt`, `Breeder.hiddenAt`; rute `/hide`, `/withdraw`, `/archive`, DELETE; butoane: `AuctionVisibility.tsx`, `SaleAdminActions.tsx`, `RowActions.tsx` |
| Erori pe câmpuri | `lib/api.ts` (`jsonValidationError`, `validationFields`; corp fără JSON → `INVALID_JSON` 400) |
| Acoperire pe roluri | `tests/e2e/harta-acces.spec.ts`, `permisiuni-api.spec.ts`, `butoane-admin.spec.ts`, `butoane-client.spec.ts`; adrese de probă: `tests/e2e/fixtures/ids.ts`; pagina unui porumbel: `deschidePorumbel()` din `helpers.ts` |
| Sweeper (15 s) | `instrumentation.ts` |
| Limbile (13) | `lib/locales.ts` (`pick` = română sau engleză pentru conținutul adminului; `intlLocale`; araba e RTL), `lib/messages.ts` (`emailTranslator`, `notifTranslator` — doar pe server), `messages/<limbă>.json` |

## Comenzi (din `platform/`)

```bash
npx tsc --noEmit                         # tipuri (ignoră erorile din .next/)
npx eslint <fișiere>                     # 2 erori vechi cunoscute: Countdown, WinCelebration
npm test                                 # unitare (Vitest)
npx playwright test tests/e2e/<spec>.ts --reporter=line
node scripts/check-locale.cjs --all      # aceleași chei în toate limbile
```

## Convenții

- **Comentarii și UI în română**, cu diacritice; explică *de ce*, nu *ce*.
  Cererea clientului se citează scurt în comentariu, acolo unde a născut codul.
- **Nu scrie `locale === "en"`**: conținut din baza de date → `pick(locale, ro, en)`;
  date și ore → `platformFormat`; limba contului → `normalizeLocale`. Spațierea
  e logică (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`), ca araba să se oglindească.
- **Setare nouă** = 4 locuri: tip + default în `settings.ts`, schema în
  `api/admin/settings/route.ts`, câmp în `SettingsForm.tsx`, și
  `tests/e2e/fixtures/pin-test-settings.ts` dacă schimbă testele vechi.
- **Migrări doar aditive**. Fișier în `prisma/migrations/<timestamp>_<nume>/`,
  apoi `npx prisma migrate deploy && npx prisma generate` (oprește întâi dev-ul).
- **Bani în bani/cenți** (`...Cents`), cu `currency` pe înregistrare; moneda
  platformei pe server: RON.
- `data-testid` pe tot ce verifică e2e.

## Reguli de siguranță

- **Nu rula `reset-demo.sh` / `db:seed` pe server** fără acordul lui Daniel —
  șterge date reale (s-a întâmplat).
- Scripturi care modifică date pe producție: spune ce fac, cere acordul, arată
  înainte/după.
- Parolele stau doar în `credentiale-acces.md` (exclus din git).
- Commit doar la cerere; push: `git push origin master:main`.

## Capcane (au mușcat deja)

- **Bash heredoc cu ghilimele amestecate** eșuează, iar backslash-urile dintr-un
  script Python trimis prin heredoc pot ajunge altfel decât le-ai scris (`\\n`
  devine newline). Scrie scriptul cu `Write` în scratchpad și rulează-l; în
  ancore, evită textele cu backslash.
- **Ghilimelele românești**: `„text"` cu ghilimea dreaptă la final rupe scriptul.
  Închide cu `”`.
- Python `io.open` în mod text transformă CRLF în LF → diff pe tot fișierul.
- **Câmpurile React** pierd ce scrie Playwright înainte de hidratare:
  `await asteaptaFormularViu(page, "field-…")` înainte de orice completare.
- **Catalogul de traduceri e trimis întreg browserului**: `grep` după un text în
  HTML-ul paginii dă potriviri și pe o pagină 404. Caută `data-testid`.
- Baza e2e e comună: testele nu se bazează pe ce apare „primul" într-o listă.
- Screenshot-urile din Browser pane ies des goale → `get_page_text` sau JS.
- **Cronometrul și ora**: SSR și browserul nu pot afișa aceeași secundă →
  `suppressHydrationWarning` pe elementul cu textul, nu pe părinte.
- „Nu sunt robot" (ALTCHA) cere HTTPS sau localhost; pe `http://IP` e oprit din
  `.env` (`CAPTCHA_DISABLED=1`). **După domeniu + HTTPS: scoate linia.**
- BNR: `https://curs.bnr.ro/nbrfxrates.xml`, numai TLS 1.2 — `https.get` cu
  `minVersion/maxVersion` (vezi `lib/fx.ts`).
