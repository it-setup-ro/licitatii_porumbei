# No.1 & Best Pigeons — ghid de lucru

Platformă de licitații de porumbei pentru Daniel (intermediar) și clientul lui, **Buca Ionuț (Demeco Arad)**. Codul e în `platform/` (Next.js 16 App Router, React 19, Prisma 6 + PostgreSQL, next-intl în 13 limbi, Tailwind 4, zod 4, Playwright + Vitest). Repo **public** — nimic secret în cod.

**Nu parcurge proiectul.** Citește doar ce trebuie, în ordinea asta:
1. `STARE-PROIECT.md` — ce funcționează, ce rămâne, istoric.
2. `CERINTE-LICITATII-PE-PARTI.md` — cerințele clientului pentru licitațiile pe loturi (v4 + răspunsuri).
3. Harta de mai jos → fișierul exact.

## Harta codului (`platform/src`)

| Domeniu | Unde |
|---|---|
| Motorul de licitare (proxy, prelungire) | `lib/bidding.ts` (pur, testat), `lib/bid-history.ts` (ce se scrie in istoric: jurnal de fapte, randuri care nu se rescriu, raspuns `auto` pentru lider), `lib/auction-service.ts` (tranzactii, sweeper, inchidere, comision) |
| Licitații pe loturi (crescător → licitație → lot → porumbei) | `lib/lots.ts` (reguli pure), `lib/lot-service.ts` (Start lot), `lib/lot-notices.ts` (aviz 30 min), `lib/lot-cards.ts`; admin: `app/[locale]/admin/sales/**`, `components/admin/LotAdminPanel.tsx`; public: `app/[locale]/sales/[slug]` |
| Setări (cheie → JSON, cache 5 s) | `lib/settings.ts` + `app/api/admin/settings/route.ts` (schema zod) + `components/admin/SettingsForm.tsx` |
| Bani și curs lei / € | `lib/money.ts` (`formatMoney`, RON → „lei"), `lib/fx-math.ts` (pur: BNR, conversie, echivalent), `lib/fx.ts` (server: `getEurRate`, `refreshBnrRate`), `components/PriceInput.tsx`, `components/admin/FxRateCard.tsx` |
| Porumbelul | `lib/pigeon.ts` (`yearFromRing`, `SEX_SYMBOL`), `lib/pigeon-traits.ts`, `lib/lot-editing.ts` |
| Pagini porumbel / listare | `app/[locale]/auctions/[id]/page.tsx`, `components/LiveAuctionPanel.tsx`, `BuyNowPanel.tsx`, `SellForm.tsx`, `LotEditForm.tsx`, `AuctionCard.tsx` |
| Conturi, aprobare, admini | `lib/registration.ts` (schema contului: PF/PJ, obligatorii), `lib/company.ts` (CUI, IBAN), `lib/regions.ts`, `components/RegisterForm.tsx`, `app/api/auth/register`, `app/api/auth/login` (e-mail sau nume de utilizator), `app/[locale]/admin/accounts`, `lib/nickname.ts` |
| „Nu sunt robot" | `lib/captcha.ts` (ALTCHA pe serverul nostru), `app/api/captcha`, `components/CaptchaField.tsx`; oprit în e2e cu `CAPTCHA_DISABLED=1`, verificat în `tests/unit/captcha.test.ts` |
| Textele legale | `prisma/legal-texts.ts` (textele de pornire RO/EN), `lib/legal-placeholders.ts` ({{firma}}… din Setări), `app/[locale]/info/[slug]` |
| Comenzi, plată în afara site-ului, decont (faza 2) | `lib/orders.ts` (Plătit / Predat / anulare / decont, e-mail cu datele de plată), `lib/settlement-math.ts` (pur), `lib/payment-instructions.ts` (pur); admin: `app/[locale]/admin/orders`, `admin/settlements`, `components/admin/SettlementSection.tsx`, export `app/api/admin/settlements/export` (exceljs); cumpărător: `app/[locale]/orders/[id]` |
| E-mail și notificări | `lib/mailer.ts` (EmailLog + SMTP din `SMTP_URL`), `lib/notify.ts` (tipuri + subiecte), `lib/newsletter.ts` |
| Prima pagină: carusel concursuri, subcategorii meniu | `components/ContestCarousel.tsx` (rotire + puncte), `components/ContestBanner.tsx` (banda întreagă e link), subcategorii: `ExternalLink.category` → `components/SiteHeader.tsx` (`linkGroups`), admin: `app/[locale]/admin/links` |
| Pagina crescătorului | `app/[locale]/sales/[slug]` (poveste cu `components/ExpandableText.tsx` + articolele lui), legătura articol → crescător: `Article.breederId`, admin: `components/admin/ArticleComposer.tsx` |
| Cereri „Vreau să organizez o licitație" | `components/AuctionRequestForm.tsx` (cardul de pe prima pagină), `app/api/auction-requests`, admin: `app/[locale]/admin/auction-requests` + `components/admin/RequestHandledButton.tsx` |
| Evidențe și unelte de admin | istoric: `app/[locale]/admin/transactions` + export `app/api/admin/transactions/export`; magazin: `app/[locale]/admin/shop-orders` + `app/api/admin/shop-orders/[id]`; preț fix: `app/[locale]/admin/fixed-price`; paginare: `components/admin/Pager.tsx` |
| Ascundere / arhivare / ștergere | `Auction.hiddenAt`, `Sale.archivedAt`, `Breeder.hiddenAt` (filtrate în toate paginile publice); rute: `api/admin/auctions/[id]` (DELETE), `/hide`, `/withdraw` (anunță ofertanții), `api/admin/sales/[id]` (DELETE) + `/archive`, `api/admin/sale-lots/[id]` (DELETE); butoane: `components/admin/AuctionVisibility.tsx`, `SaleAdminActions.tsx`, `RowActions.tsx`, `RecordEditor.tsx` (prop `deletable`) |
| Anunțuri pentru administrator (cont nou, mesaj de contact, porumbel de aprobat, cerere de licitație, comandă) | `lib/alerts.ts` (catalogul de evenimente + `alertAdmin`, nu aruncă niciodată), `lib/telegram.ts` (API-ul botului, token în `.env`), `lib/telegram-link.ts` (legarea prin cod, ascultată din sweeper), admin: `app/[locale]/admin/alerts` + `components/admin/AlertsPanel.tsx`, rute: `api/admin/alerts/**`; pe server: `scripts/set-telegram.sh` |
| E-mail: cum se configurează | **din administrare** (Administrare → E-mailuri, caseta de sus): `components/admin/EmailSetupCard.tsx` + `api/admin/email-config`, datele în `PlatformSetting.smtpConfig` cu parola criptată (`lib/secret-box.ts`, cheie din `AUTH_SECRET`); rezolvarea în `lib/smtp-config.ts` — **serverul are întâietate** (`.env`: `SMTP_URL`, `SMTP_FROM`, puse cu `scripts/set-smtp.sh`); starea fără parolă: `lib/smtp-status.ts` (`smtpStatusFull`), probă: `api/admin/email-test` |
| E-mailuri: ce a plecat | `EmailLog.sentAt/error/attempts`, `lib/mailer.ts` (`deliver`), retrimitere: `api/admin/emails/[id]/resend`, pagina `app/[locale]/admin/emails` |
| Ajutor (întrebări frecvente) | `lib/faq.ts` (grupele fixe, ca titlurile să fie traduse), `prisma/faq-texts.ts` (întrebările de pornire, în seed), public: `app/[locale]/help`, admin: `app/[locale]/admin/faq` + `api/admin/faq/**` (formularul generic `RecordEditor`) |
| Articole propuse de crescători | `api/articles/propose` (doar crescători aprobați, 3/zi), public: `app/[locale]/articles/propose` + `components/ProposeArticleForm.tsx`; admin: secțiunea de propuneri din `app/[locale]/admin/articles` + `components/admin/ProposalActions.tsx` + `api/admin/articles/[id]/review` (publică / respinge cu motiv, autorul e anunțat) |
| Erori pe câmpuri | `lib/api.ts` (`jsonValidationError`, `validationFields`; cerere fără corp JSON → `INVALID_JSON` 400, nu 500 — `handleApiError`) |
| Actualizare live (preț, istoric, cronometru) | `lib/events.ts` (`AuctionEvent`, `PublicAuctionEvent`, `PublicBid`), `app/api/auctions/[id]/stream` (instantaneu la conectare + keepalive), `lib/live-auction.ts` (o singură legătură pe pagină), `lib/mask-name.ts` (numele public, același pe server și live); teste: `tests/e2e/intensive.spec.ts`, `live-sync.spec.ts` |
| Acoperire pe roluri (anonim / cumpărător / crescător / admin) | `tests/e2e/harta-acces.spec.ts` (toate paginile, cine unde intră), `permisiuni-api.spec.ts` (toate rutele de administrare, chemate direct), `butoane-admin.spec.ts` și `butoane-client.spec.ts` (butoanele și urmarea lor); adresele de probă: `tests/e2e/fixtures/ids.ts` |
| Sweeper (15 s) | `instrumentation.ts` |
| Limbile (13) | `lib/locales.ts` (lista, `pick` = conținutul adminului: română sau, altfel, engleză; `intlLocale` pentru date/numere; araba e RTL), `i18n/routing.ts`, `components/LanguageSwitcher.tsx`; e-mailuri în limba contului: `lib/messages.ts` (`emailTranslator`, doar pe server) |
| Texte | `platform/messages/<limbă>.json` — `ro`, `en` + zh ja nl fr de es pl ar hi gu sw; verificare: `node scripts/check-locale.cjs --all` |

## Comenzi (din `platform/`)

```bash
npx tsc --noEmit                         # tipuri
npx eslint <fișiere>                     # 2 erori vechi cunoscute: Countdown, WinCelebration
npm test                                 # unitare (Vitest)
npx playwright test tests/e2e/<spec>.ts --reporter=line   # e2e țintit; toate: ~9 min
```

Publicare și scripturi pe server: skill-urile `deploy` și `prod-script`. E2e: skill-ul `e2e`.

## Convenții

- **Comentarii și UI în română**, cu diacritice; explică *de ce*, nu *ce*. Cererile clientului se citează scurt în comentariu.
- **Texte noi**: script node în scratchpad care face merge în `messages/ro.json` + `en.json` **și în celelalte 11 limbi** (traduse; un agent pe limbă merge bine), apoi `node scripts/check-locale.cjs --all` (aceleași chei și argumente ICU). Fără `\"` în ICU — ghilimele tipografice.
- **Nu scrie `locale === "en"`**: conținut din baza de date → `pick(locale, ro, en)`; date și numere → `intlLocale(locale)`; limba contului → `normalizeLocale`. Clasele de spațiere sunt logice (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`/`text-start`), ca araba să se oglindească.
- **Setare nouă** = 4 locuri: tip + default în `settings.ts`, schema în `api/admin/settings/route.ts`, câmp în `SettingsForm.tsx` (dacă e editabilă), și, dacă schimbă comportamentul testelor vechi, `tests/e2e/fixtures/pin-test-settings.ts`.
- **Migrări doar aditive** (coloane/tabele noi). Fișier în `prisma/migrations/<timestamp>_<nume>/migration.sql`, apoi `npx prisma migrate deploy && npx prisma generate` (oprește întâi serverul de dev — EPERM).
- **Bani în bani/cenți** (`...Cents`), cu `currency` pe înregistrare. Moneda platformei pe server: RON, cu echivalent €.
- Erori de formular: API întoarce `fields` (mesaje în română), formularul le arată sub câmp.
- `data-testid` pe tot ce testează e2e.
- Mesaje pentru client: română, stil WhatsApp, fără termeni tehnici.

## Reguli de siguranță

- **Nu rula `reset-demo.sh` / `db:seed` pe server** fără acordul explicit al lui Daniel — șterge date reale (s-a întâmplat).
- Scripturi care modifică date pe producție: spune ce fac, cere acordul, afișează înainte/după.
- Parolele și tokenurile stau doar în `credentiale-acces.md` (exclus din git). Cheile SMTP le introduce Daniel singur (`platform/scripts/set-smtp.sh`).
- Commit doar la cerere; push: `git push origin master:main`.

## Capcane (au mușcat deja)

- Bash heredoc cu ghilimele amestecate eșuează → scrie scriptul cu Write în scratchpad și rulează-l.
- Python `io.open` în mod text transformă CRLF în LF → diff pe tot fișierul; e doar zgomot.
- Câmpurile React controlate pierd ce scrie Playwright înainte de hidratare. Rescrisul până rămâne valoarea nu e destul: ce s-a scris pare că stă, dar dispare când React preia formularul, iar salvarea pleacă cu valorile vechi (sau deloc, dacă un câmp obligatoriu rămâne gol — browserul o oprește fără mesaj). Înaintea oricărei completări în administrare: `await asteaptaFormularViu(page, "field-…")` (`tests/e2e/helpers.ts`, așteaptă cheia `__reactFiber# No.1 & Best Pigeons — ghid de lucru

Platformă de licitații de porumbei pentru Daniel (intermediar) și clientul lui, **Buca Ionuț (Demeco Arad)**. Codul e în `platform/` (Next.js 16 App Router, React 19, Prisma 6 + PostgreSQL, next-intl în 13 limbi, Tailwind 4, zod 4, Playwright + Vitest). Repo **public** — nimic secret în cod.

**Nu parcurge proiectul.** Citește doar ce trebuie, în ordinea asta:
1. `STARE-PROIECT.md` — ce funcționează, ce rămâne, istoric.
2. `CERINTE-LICITATII-PE-PARTI.md` — cerințele clientului pentru licitațiile pe loturi (v4 + răspunsuri).
3. Harta de mai jos → fișierul exact.

## Harta codului (`platform/src`)

| Domeniu | Unde |
|---|---|
| Motorul de licitare (proxy, prelungire) | `lib/bidding.ts` (pur, testat), `lib/auction-service.ts` (tranzacții, sweeper, închidere, comision) |
| Licitații pe loturi (crescător → licitație → lot → porumbei) | `lib/lots.ts` (reguli pure), `lib/lot-service.ts` (Start lot), `lib/lot-notices.ts` (aviz 30 min), `lib/lot-cards.ts`; admin: `app/[locale]/admin/sales/**`, `components/admin/LotAdminPanel.tsx`; public: `app/[locale]/sales/[slug]` |
| Setări (cheie → JSON, cache 5 s) | `lib/settings.ts` + `app/api/admin/settings/route.ts` (schema zod) + `components/admin/SettingsForm.tsx` |
| Bani și curs lei / € | `lib/money.ts` (`formatMoney`, RON → „lei"), `lib/fx-math.ts` (pur: BNR, conversie, echivalent), `lib/fx.ts` (server: `getEurRate`, `refreshBnrRate`), `components/PriceInput.tsx`, `components/admin/FxRateCard.tsx` |
| Porumbelul | `lib/pigeon.ts` (`yearFromRing`, `SEX_SYMBOL`), `lib/pigeon-traits.ts`, `lib/lot-editing.ts` |
| Pagini porumbel / listare | `app/[locale]/auctions/[id]/page.tsx`, `components/LiveAuctionPanel.tsx`, `BuyNowPanel.tsx`, `SellForm.tsx`, `LotEditForm.tsx`, `AuctionCard.tsx` |
| Conturi, aprobare, admini | `lib/registration.ts` (schema contului: PF/PJ, obligatorii), `lib/company.ts` (CUI, IBAN), `lib/regions.ts`, `components/RegisterForm.tsx`, `app/api/auth/register`, `app/api/auth/login` (e-mail sau nume de utilizator), `app/[locale]/admin/accounts`, `lib/nickname.ts` |
| „Nu sunt robot" | `lib/captcha.ts` (ALTCHA pe serverul nostru), `app/api/captcha`, `components/CaptchaField.tsx`; oprit în e2e cu `CAPTCHA_DISABLED=1`, verificat în `tests/unit/captcha.test.ts` |
| Textele legale | `prisma/legal-texts.ts` (textele de pornire RO/EN), `lib/legal-placeholders.ts` ({{firma}}… din Setări), `app/[locale]/info/[slug]` |
| Comenzi, plată în afara site-ului, decont (faza 2) | `lib/orders.ts` (Plătit / Predat / anulare / decont, e-mail cu datele de plată), `lib/settlement-math.ts` (pur), `lib/payment-instructions.ts` (pur); admin: `app/[locale]/admin/orders`, `admin/settlements`, `components/admin/SettlementSection.tsx`, export `app/api/admin/settlements/export` (exceljs); cumpărător: `app/[locale]/orders/[id]` |
| E-mail și notificări | `lib/mailer.ts` (EmailLog + SMTP din `SMTP_URL`), `lib/notify.ts` (tipuri + subiecte), `lib/newsletter.ts` |
| Prima pagină: carusel concursuri, subcategorii meniu | `components/ContestCarousel.tsx` (rotire + puncte), `components/ContestBanner.tsx` (banda întreagă e link), subcategorii: `ExternalLink.category` → `components/SiteHeader.tsx` (`linkGroups`), admin: `app/[locale]/admin/links` |
| Pagina crescătorului | `app/[locale]/sales/[slug]` (poveste cu `components/ExpandableText.tsx` + articolele lui), legătura articol → crescător: `Article.breederId`, admin: `components/admin/ArticleComposer.tsx` |
| Cereri „Vreau să organizez o licitație" | `components/AuctionRequestForm.tsx` (cardul de pe prima pagină), `app/api/auction-requests`, admin: `app/[locale]/admin/auction-requests` + `components/admin/RequestHandledButton.tsx` |
| Evidențe și unelte de admin | istoric: `app/[locale]/admin/transactions` + export `app/api/admin/transactions/export`; magazin: `app/[locale]/admin/shop-orders` + `app/api/admin/shop-orders/[id]`; preț fix: `app/[locale]/admin/fixed-price`; paginare: `components/admin/Pager.tsx` |
| Ascundere / arhivare / ștergere | `Auction.hiddenAt`, `Sale.archivedAt`, `Breeder.hiddenAt` (filtrate în toate paginile publice); rute: `api/admin/auctions/[id]` (DELETE), `/hide`, `/withdraw` (anunță ofertanții), `api/admin/sales/[id]` (DELETE) + `/archive`, `api/admin/sale-lots/[id]` (DELETE); butoane: `components/admin/AuctionVisibility.tsx`, `SaleAdminActions.tsx`, `RowActions.tsx`, `RecordEditor.tsx` (prop `deletable`) |
| Anunțuri pentru administrator (cont nou, mesaj de contact, porumbel de aprobat, cerere de licitație, comandă) | `lib/alerts.ts` (catalogul de evenimente + `alertAdmin`, nu aruncă niciodată), `lib/telegram.ts` (API-ul botului, token în `.env`), `lib/telegram-link.ts` (legarea prin cod, ascultată din sweeper), admin: `app/[locale]/admin/alerts` + `components/admin/AlertsPanel.tsx`, rute: `api/admin/alerts/**`; pe server: `scripts/set-telegram.sh` |
| E-mail: cum se configurează | cheia stă doar pe server (`.env`: `SMTP_URL`, `SMTP_FROM`), se pune cu `scripts/set-smtp.sh` (Gmail pentru probe / Brevo / altul); starea și butonul de probă: `lib/smtp-status.ts` (fără parolă) + `components/admin/EmailSetupCard.tsx` sus în `app/[locale]/admin/emails`, probă: `api/admin/email-test` |
| E-mailuri: ce a plecat | `EmailLog.sentAt/error/attempts`, `lib/mailer.ts` (`deliver`), retrimitere: `api/admin/emails/[id]/resend`, pagina `app/[locale]/admin/emails` |
| Ajutor (întrebări frecvente) | `lib/faq.ts` (grupele fixe, ca titlurile să fie traduse), `prisma/faq-texts.ts` (întrebările de pornire, în seed), public: `app/[locale]/help`, admin: `app/[locale]/admin/faq` + `api/admin/faq/**` (formularul generic `RecordEditor`) |
| Articole propuse de crescători | `api/articles/propose` (doar crescători aprobați, 3/zi), public: `app/[locale]/articles/propose` + `components/ProposeArticleForm.tsx`; admin: secțiunea de propuneri din `app/[locale]/admin/articles` + `components/admin/ProposalActions.tsx` + `api/admin/articles/[id]/review` (publică / respinge cu motiv, autorul e anunțat) |
| Erori pe câmpuri | `lib/api.ts` (`jsonValidationError`, `validationFields`; cerere fără corp JSON → `INVALID_JSON` 400, nu 500 — `handleApiError`) |
| Actualizare live (preț, istoric, cronometru) | `lib/events.ts` (`AuctionEvent`, `PublicAuctionEvent`, `PublicBid`), `app/api/auctions/[id]/stream` (instantaneu la conectare + keepalive), `lib/live-auction.ts` (o singură legătură pe pagină), `lib/mask-name.ts` (numele public, același pe server și live); teste: `tests/e2e/intensive.spec.ts`, `live-sync.spec.ts` |
| Sweeper (15 s) | `instrumentation.ts` |
| Limbile (13) | `lib/locales.ts` (lista, `pick` = conținutul adminului: română sau, altfel, engleză; `intlLocale` pentru date/numere; araba e RTL), `i18n/routing.ts`, `components/LanguageSwitcher.tsx`; e-mailuri în limba contului: `lib/messages.ts` (`emailTranslator`, doar pe server) |
| Texte | `platform/messages/<limbă>.json` — `ro`, `en` + zh ja nl fr de es pl ar hi gu sw; verificare: `node scripts/check-locale.cjs --all` |

## Comenzi (din `platform/`)

```bash
npx tsc --noEmit                         # tipuri
npx eslint <fișiere>                     # 2 erori vechi cunoscute: Countdown, WinCelebration
npm test                                 # unitare (Vitest)
npx playwright test tests/e2e/<spec>.ts --reporter=line   # e2e țintit; toate: ~9 min
```

Publicare și scripturi pe server: skill-urile `deploy` și `prod-script`. E2e: skill-ul `e2e`.

## Convenții

- **Comentarii și UI în română**, cu diacritice; explică *de ce*, nu *ce*. Cererile clientului se citează scurt în comentariu.
- **Texte noi**: script node în scratchpad care face merge în `messages/ro.json` + `en.json` **și în celelalte 11 limbi** (traduse; un agent pe limbă merge bine), apoi `node scripts/check-locale.cjs --all` (aceleași chei și argumente ICU). Fără `\"` în ICU — ghilimele tipografice.
- **Nu scrie `locale === "en"`**: conținut din baza de date → `pick(locale, ro, en)`; date și numere → `intlLocale(locale)`; limba contului → `normalizeLocale`. Clasele de spațiere sunt logice (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`/`text-start`), ca araba să se oglindească.
- **Setare nouă** = 4 locuri: tip + default în `settings.ts`, schema în `api/admin/settings/route.ts`, câmp în `SettingsForm.tsx` (dacă e editabilă), și, dacă schimbă comportamentul testelor vechi, `tests/e2e/fixtures/pin-test-settings.ts`.
- **Migrări doar aditive** (coloane/tabele noi). Fișier în `prisma/migrations/<timestamp>_<nume>/migration.sql`, apoi `npx prisma migrate deploy && npx prisma generate` (oprește întâi serverul de dev — EPERM).
- **Bani în bani/cenți** (`...Cents`), cu `currency` pe înregistrare. Moneda platformei pe server: RON, cu echivalent €.
- Erori de formular: API întoarce `fields` (mesaje în română), formularul le arată sub câmp.
- `data-testid` pe tot ce testează e2e.
- Mesaje pentru client: română, stil WhatsApp, fără termeni tehnici.

## Reguli de siguranță

- **Nu rula `reset-demo.sh` / `db:seed` pe server** fără acordul explicit al lui Daniel — șterge date reale (s-a întâmplat).
- Scripturi care modifică date pe producție: spune ce fac, cere acordul, afișează înainte/după.
- Parolele și tokenurile stau doar în `credentiale-acces.md` (exclus din git). Cheile SMTP le introduce Daniel singur (`platform/scripts/set-smtp.sh`).
- Commit doar la cerere; push: `git push origin master:main`.

## Capcane (au mușcat deja)

- Bash heredoc cu ghilimele amestecate eșuează → scrie scriptul cu Write în scratchpad și rulează-l.
- Python `io.open` în mod text transformă CRLF în LF → diff pe tot fișierul; e doar zgomot.
 pe câmp).
- Baza e2e e comună: testele nu se bazează pe ce apare „primul" într-o listă.
- Screenshot-urile din Browser pane ies des goale → verifică prin `get_page_text` / JS.
- React pune `<!-- -->` între bucăți de text → grep pe HTML după ce le scoți.
- „Nu sunt robot" (ALTCHA) folosește `crypto.subtle`, pe care browserul îl dă doar pe HTTPS sau localhost. Pe serverul `http://IP` bifa eșuează, deci acolo `.env` are `CAPTCHA_DISABLED=1` (bifa se ascunde). **După domeniu + HTTPS: scoate linia și repornește serviciul.**
- BNR: fișierul e la `https://curs.bnr.ro/nbrfxrates.xml` (adresa veche redirecționează) și **acceptă doar TLS 1.2** — `fetch` din Node (TLS 1.3) primește ECONNRESET, deși `curl` merge. Folosește `https.get` cu `minVersion/maxVersion: "TLSv1.2"` (vezi `lib/fx.ts`).
