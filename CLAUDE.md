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
   Suita completă (~24 min, 306 teste) doar înainte de publicare. Caută și
   **interferențele**: ce alte pagini folosesc ce-ai atins (`grep` după numele
   componentei, al cheii de text, al funcției) și treci cu testele peste ele.
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
| Pagina unei licitații (macheta clientului) | `app/[locale]/sales/[slug]/page.tsx`: cap de pagină cu fundal din Setări (`saleHeroUrl`), poza crescătorului (128 px pe telefon, 176 pe tabletă, **320 pe calculator** — cât banda, cerut de Daniel; casetele cu cifre au scăzut la 240), cifre, `components/CountdownBoxes.tsx`; pe ecran lat capul paginii stă pe două coloane (crescătorul în stânga, cifrele și ceasul în dreapta, `lg:min-h-[22rem]`) — altfel pe 1900 px tot scrisul stătea îngrămădit în stânga unei fâșii de 280 px; „Despre crescător" scurt cu `ExpandableText`; „Rezultate importante" din `lib/breeder-results.ts` (`Loc 1 \| Maraton – Berlin \| 2025`); loturile cu insignă aurie. **Până la primul start** pagina e doar un afiș: crescătorul și perioada (`Urmează: 1 – 10 ianuarie 2027`, din `formatRange`), fără cifre, fără loturi, fără porumbei; un lot nepornit dintr-o licitație în curs își ascunde doar porumbeii. Filtrul public stă în `lib/queries.ts` (`LOTURI_PORNITE`), folosit și de căutare și de pagina vânzătorului; pagina porumbelului dă 404 până la start (adminul și crescătorul o văd). Sub perioadă scrie și ora exactă (`upcomingWhen`), iar cardul licitației viitoare arată perioada întreagă și **nu** câți porumbei sunt — ca pe voiajor.net |
| Pagina porumbelului | `app/[locale]/auctions/[id]/page.tsx` (fișa: serie, reprodus de, **vândut de**), `components/LiveAuctionPanel.tsx`, `BuyNowPanel.tsx`, `SellForm.tsx`, `LotEditForm.tsx`, `AuctionCard.tsx` |
| Actualizare live | `lib/events.ts`, `app/api/auctions/[id]/stream` (SSE: `sync` la conectare, keepalive, se închide curat la oprirea serviciului), `lib/live-auction.ts` (o legătură pe pagină; se reface la revenirea în pagină sau a internetului), `lib/live-streams.ts` (registrul fluxurilor + oprirea), `lib/mask-name.ts`. **Pagina unei licitații** (lotul întreg) are firul ei: `app/api/sales/[slug]/stream` + `components/SaleLive.tsx` — un singur fir pe pagină (browserul ține 6 conexiuni pe gazdă pe http, un lot de 5 ar bloca pagina), iar la orice mișcare cere pagina din nou (`router.refresh`, cel mult o dată la 2,5 s), că totul e randat pe server; test: `tests/e2e/sales-public.spec.ts` |
| Setări (cheie → JSON, cache 5 s) | `lib/settings.ts` + `app/api/admin/settings/route.ts` (schema zod) + `components/admin/SettingsForm.tsx` (câmpuri `image` și **`money`** — sumele se scriu în lei/euro, în bază rămân în bani) |
| Scrisul în textele lungi | `lib/rich-marks.ts` (pur: taie textul în noduri — **îngroșat**, *înclinat*, `[text](adresă)`, `{albastru\|text}`, liste `- `, titluri `## `) + `components/RichText.tsx` (randează; **niciodată HTML brut**, altfel e cale de XSS din administrare și din propunerile crescătorilor) + `components/admin/RichEditor.tsx` (caseta cu butoane și „Vezi cum arată”, aceeași componentă ca pagina publică). Culorile: patru, `CULORI` din `rich-marks.ts`. Se folosește prin `type: "rich"` în `RecordEditor` (conținut, crescători, licitații, concursuri), plus `ArticleComposer`, `BreederProfileForm`, `ProposeArticleForm`. **Rezultatele crescătorului rămân textarea simplu** — se citesc cu `lib/breeder-results.ts`. Teste: `tests/unit/rich-marks.test.ts`, `tests/e2e/article-composer.spec.ts` |
| Bani și curs lei / € | `lib/money.ts` (`formatMoney`, RON → „lei"), `lib/fx-math.ts` (pur), `lib/fx.ts` (BNR), `components/PriceInput.tsx` |
| Orele de pe site | `lib/platform-time.ts` (`platformFormat`, `PLATFORM_TZ` = Europe/Bucharest) — **orice dată arătată omului trece pe aici**; serviciul are și `TZ=Europe/Bucharest`. Cronometrul: `components/Countdown.tsx` (`zeroLabel` = „se închide acum", `refreshOnZero` pentru carduri) |
| Carduri mari, un rând pe ecran | Prop `mare` pe `AuctionCard`/`SaleCard`: două pe rând, card de ~72vh, poza se întinde (`sm:flex-1`) — dar **numai până la `lg`**: pe calculator (`lg:min-h-0`, `lg:aspect-[4/3]` / `lg:aspect-[16/9]`, `lg:flex-none`) cardul se întoarce la forma lui, altfel 550 px lățime pe 780 înălțime făcea un turn cu poza plutind într-o ramă goală (clientul: „pe calculator parcă totul este mai întins”). Folosit în `/auctions` și în loturile unei licitații. **Articolele au rămas la cardurile mici** (`app/[locale]/articles/page.tsx`: pătrat 1:1, patru pe rând) — cu poze de proporții diferite, cardurile mari arătau urât. **Prinderea la derulare (`scroll-snap`) a fost încercată și scoasă**: pe `html` trăgea pagina înapoi și butonul din bara de sus devenea de neapăsat (a picat `media-and-admin`). Distribuirea unei licitații: `components/ShareButton.tsx` |
| Poze la încărcare | `lib/image-size.ts` (2560 px pe latura lungă, prag de recomprimare) e adevărul comun: browserul micșorează întâi (`MediaPicker.prepareImage`), iar serverul are ultimul cuvânt — `lib/image-resize.ts` (sharp: rotire EXIF, JPEG calitate 82 pentru fotografii, PNG doar când e transparență), chemat din `api/upload`. Plafon 15 MB pe poză. Teste: `tests/unit/image-resize.test.ts`, `tests/e2e/upload.spec.ts` |
| Porumbelul | `lib/pigeon.ts`, `lib/pigeon-traits.ts`, `lib/lot-editing.ts` |
| Conturi, aprobare, admini | **Limita de licitare**: `User.bidLimitOverride` (câmp pe cont, din Administrare → Utilizatori: `components/admin/BidLimitField.tsx` + `api/admin/users/[id]/bid-limit`) bate `settings.newAccountBidLimitCents`; **0 = fără limită**, iar limita nu se mai aplică după prima comandă plătită (`completedOrders`). Test: `tests/e2e/limita-licitare.spec.ts`. `lib/registration.ts`, `lib/company.ts`, `lib/regions.ts`, `components/RegisterForm.tsx`, `app/api/auth/**`, `app/[locale]/admin/accounts`, `lib/nickname.ts` |
| Contul de crescător | `lib/breeder-access.ts` (`Breeder.userId`), `lib/breeder-view.ts` (cumpărătorul: alias până la plată, nume + localitate după), `app/[locale]/breeder/**`, `api/breeder/profile`; admin: `components/admin/BreederAccountForm.tsx` + `api/admin/breeders/[id]/account` |
| Avizele crescătorului | `lib/breeder-notices.ts` (nu aruncă niciodată; bifa `Breeder.notifyByEmail`), `lib/lot-summary.ts`, `lib/breeder-emails.ts` (pure) |
| E-mail și notificări | `lib/mailer.ts`, `lib/notify.ts` (tipuri, subiecte, textul), `lib/notif-text.ts` (pur: suma scrisă din `...Cents`, link întreg), `lib/outbid-email.ts` + `lib/outbid-notice.ts` („ai fost depășit": porumbel, lot, preț, plafonul lui, ora închiderii) |
| E-mail: configurare | din Administrare → E-mailuri: `components/admin/EmailSetupCard.tsx` + `api/admin/email-config`, parola criptată (`lib/secret-box.ts`); `.env` are întâietate (`scripts/set-smtp.sh`); jurnal: `app/[locale]/admin/emails` |
| Comenzi, plată, decont | `lib/orders.ts`, `lib/settlement-math.ts`, `lib/payment-instructions.ts` (pure); admin: `app/[locale]/admin/orders`, `admin/settlements`; cumpărător: `app/[locale]/orders/[id]` |
| Anunțuri pentru administrator | `lib/alerts.ts`, `lib/telegram.ts`, `lib/telegram-link.ts`, `app/[locale]/admin/alerts`; pe server: `scripts/set-telegram.sh` |
| Prima pagină, concursuri, meniu | Capul paginii: titlul **e numele site-ului** din Setări, deviza `home.motto`, cele două butoane cu aceeași lățime minimă; fundalul și **cât de tare se întunecă** vin tot din Setări (`homeHeroUrl`, `homeHeroDarkness` 0–60%, implicit 15; voal plin pe telefon, degrade apasat în stânga pe calculator — `data-testid="hero-veil"`); pe calculator cadrul are `lg:min-h-[70vh]`, ca să aibă aproape forma fotografiei (2,5 lat pe înalt) și să nu se mai taie un sfert din ea; banda cu insigne e deschisă (`bg-sky-soft`, insigne pe carton alb). Banda de concurs: `lib/contests.ts` ține stările la zi din sweeper (UPCOMING→ACTIVE la start, →FINISHED la final), iar prima pagină ia doar concursurile publicate cu `endsAt` în viitor — se anunță dinainte, pleacă singură la final, pagina concursului rămâne; test: `tests/e2e/banda-concurs.spec.ts`. `app/[locale]/page.tsx` (live, **Ultimele oferte** din `lib/latest-bids.ts` + `components/LatestBids.tsx`, **Licitații viitoare** din `getSaleCards("SCHEDULED")`), `components/ContestCarousel.tsx`, `ContestBanner.tsx`, `SiteHeader.tsx` (`linkGroups`), `AccountMenu.tsx` |
| Ajutor, articole, magazin | `lib/faq.ts` + `app/[locale]/help`; articole: `app/[locale]/articles/**`, propuneri: `api/articles/propose`; magazin: `admin/shop-orders`, `admin/products` |
| Ascundere / arhivare / ștergere | `Auction.hiddenAt`, `Sale.archivedAt`, `Breeder.hiddenAt`; rute `/hide`, `/withdraw`, `/archive`, DELETE; butoane: `AuctionVisibility.tsx`, `SaleAdminActions.tsx`, `RowActions.tsx` |
| Formularele de administrare | `components/admin/RecordEditor.tsx` (câmpurile se descriu o dată, în pagină: `text`, `textarea`, `rich`, `image`, `money`, `select`, `boolean`, `datetime`). Formularul stă **sub** listă în majoritatea paginilor, deci linkurile „Editează” și „+ nou” se scriu cu `#editor` — fără ancoră, pagina se redeschidea sus și clientul credea că butonul nu face nimic. Ancora: `id="editor"` + `scroll-mt-24` pe formular (și pe `ArticleComposer`). Test: `tests/e2e/butoane-admin.spec.ts` → „Editarea dintr-o listă lungă” |
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

- **Nu strica ce merge.** Orice cerere e „repar” sau „adaug”, niciodată „refac”.
  Ce funcționează deja — pagini, fluxuri, texte, butoane — nu se schimbă dacă
  clientul n-a cerut-o. Când o schimbare atinge o bucată folosită și în alte
  părți (componentă, cheie de text, câmp, interogare), caută **toate** locurile
  care o folosesc (`grep` după nume) și verifică-le pe rând, cu e2e pe paginile
  acelea. Dacă un test vechi cere exact ce clientul vrea schimbat, rescrie-l și
  spune-i lui Daniel ce-ai rescris și de ce.
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
- **Cursorul într-o casetă controlată de React**: după ce un buton schimbă textul, selecția
  nu se poate pune pe loc — textul nou ajunge în casetă abia la randarea următoare, iar
  `requestAnimationFrame` e prea devreme: omul ajungea să scrie la începutul articolului.
  Se ține în `useRef` și se aplică în `useLayoutEffect` (vezi `RichEditor`).
- **Rama cu proporție fixă într-un card `flex flex-col`**: `h-full` pe poză nu se rezolvă în
  Chrome (în Firefox, da), poza se desenează la mărimea ei adevărată și umflă rama —
  `aspect-square` de 234 px devenea 520. Rama primește `relative`, poza `absolute inset-0
  h-full w-full`. Se vede cu: caută elementele cu `aspect-ratio` calculat și compară
  înălțimea reală cu lățime × raport.
- Baza e2e e comună: testele nu se bazează pe ce apare „primul" într-o listă.
- Screenshot-urile din Browser pane ies des goale → `get_page_text` sau JS.
- **Cronometrul și ora**: SSR și browserul nu pot afișa aceeași secundă →
  `suppressHydrationWarning` pe elementul cu textul, nu pe părinte.
- „Nu sunt robot" (ALTCHA) cere HTTPS sau localhost; pe `http://IP` e oprit din
  `.env` (`CAPTCHA_DISABLED=1`). **După domeniu + HTTPS: scoate linia.**
- BNR: `https://curs.bnr.ro/nbrfxrates.xml`, numai TLS 1.2 — `https.get` cu
  `minVersion/maxVersion` (vezi `lib/fx.ts`).
