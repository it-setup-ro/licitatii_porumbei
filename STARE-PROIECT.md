# Stare proiect — No.1 & Best Pigeons

**Ultima actualizare:** 24 august 2026
**Site live (test):** http://207.180.241.165:3000
**Cod:** https://github.com/it-setup-ro/licitatii_porumbei (public, branch `main`)
**Credențiale:** `credentiale-acces.md` (local, exclus din git)

> Acest fișier e „unde am rămas". Pentru cerințe și decizii: `research-report.md`, `client-decisions.md`. Pentru securitate: `audit-securitate.md`. Pentru hosting: `cerinte-hosting.md`. Pentru testare manuală: `scenariu-testare.md`.

---

## 1. Ce este, pe scurt

Platformă de licitații de porumbei, bilingvă RO/EN, construită de la zero: Next.js 16 + PostgreSQL, rulează ca serviciu pe VPS-ul Contabo existent (același server cu Cleanware, complet izolate).

**Stare: funcțională cap-coadă pentru testare.** 30 teste unitare + 94 teste end-to-end, toate verzi.

---

## 2. Ce funcționează acum

### Public
- **Pagina unui lot, în formatul pipa.be**: serie inel · nume · rând scurt de descriere; galerie foto+video; fișa cu serie/an/sex, reprodus de, oferit de; descrierea lungă; pedigree scanat (poză sau PDF); restul informațiilor sub butonul „Toate detaliile"; ofertele — ultimele 3 și „Vezi toate ofertele"
- **Licitații** cu proxy-bidding (plafon secret), anti-sniping (+5 min), actualizare live pe ecranul tuturor fără refresh, închidere automată cu desemnarea câștigătorului și animația stolului de porumbei
- **Preț fix** — cumpărare directă, fără licitație, cu rezervare atomică (al doilea cumpărător primește „Vândut")
- **Produse** — magazin cu categorii, coș (merge și nelogat), checkout cu scădere de stoc
- **Articole** — blog bilingv, cu poze și clipuri
- **Concursuri** — submeniu cu 6 linkuri către site-uri externe (clasamente, UNCR, FRSC, UCP)
- **Pagini de conținut** — Regulament, Info licitații, Alte info, Transport, Despre noi, Contact (cu formular)
- Bară de sus cu **ora oficială a platformei** (ora serverului — reper comun la închiderea licitațiilor)

### Cont
- Înregistrare, autentificare, cerere de cont crescător (aprobată manual de admin)
- Ofertele mele, favorite, cumpărături, vânzări, loturile mele, comenzi magazin, notificări
- **Caseta de cont** (iconița din antet): autentificare/înregistrare când ești delogat; cont + ieșire când ești logat — totul într-un singur loc

### Admin
- Buton **Administrare** în bara de sus, pe orice pagină (doar pentru admini)
- Setări platformă (~40 de parametri, cu audit trail), aprobare vânzători, moderare loturi și recenzii
- Produse, Articole, Concursuri, Pagini, Linkuri, Mesaje de contact
- **Compozitor de articole** stil rețea socială: titlu + text + foto/video; slug, rezumat și versiunea EN se generează automat
- **Selector de fișiere identic peste tot** (articole, listare porumbel, produse): pe telefon „Fă o poză" / „Filmează" deschid camera; pe calculator doar alegerea din fișiere
- **Formularul de listare** în ordinea cerută: serie/an/sex → nume → descriere → pedigree → foto → video → reprodus de → oferit de → preț; restul pliat sub „Alte detalii"

---

## 3. Ce NU e gata (în ordinea priorității)

| # | Ce | De ce contează | Cine decide |
|---|---|---|---|
| 1 | **Domeniu + HTTPS** | Acum parolele circulă necriptat. După: `COOKIE_SECURE=true` în `.env` de pe server | Daniel (cumpără domeniul) |
| 2 | **Plăți reale (Stripe)** | Acum sunt simulate — oricine poate marca o comandă „plătită" fără să plătească. Abstracția există în `src/lib/payments.ts` | Daniel (cont Stripe) |
| 3 | **Schimbă parola PostgreSQL locală** | A fost publică pe GitHub și rămâne în istoricul git | Daniel |
| 4 | **Șterge conturile demo** înainte de public | `admin@nbp.test/admin1234` e scris în README | Daniel |
| 5 | **E-mail real** | Acum notificările se scriu doar în tabelul `EmailLog`. De ales: Resend / Brevo / SES | Daniel |
| 6 | Avocat (T&C, GDPR) și contabil (TVA, e-Factura, DAC7) | Vezi `client-decisions.md` secțiunea E | Daniel |
| 7 | Upload imagini pe stocare externă (S3) | Doar dacă se trece pe mai multe servere | mai târziu |
| 8 | Redis pentru actualizările live | Doar la scalare pe mai multe instanțe | mai târziu |
| 9 | SMS | Pregătit, dezactivat (decizia D16) | mai târziu |

**Rămase deschise din `open-questions.md`:** verificare marcă OSIM/EUIPO (există deja BestPigeons.ro), achiziția domeniului, bugetul SMS.

---

## 4. Comenzi

```bash
# local
cd platform
npm run dev              # http://localhost:3000
npm run db:seed          # readuce datele demo
npm test                 # 30 teste unitare
npm run test:e2e         # 85 teste end-to-end
node scripts/mobile-audit.mjs   # audit de layout pe telefon
```

```bash
# server: publică o schimbare
ssh root@207.180.241.165 "sudo -u nbp -H bash -c 'cd /opt/licitatii-porumbei && git pull origin main && cd platform && npm install --no-audit --no-fund && npx prisma migrate deploy && npx prisma generate && npm run build'"
ssh root@207.180.241.165 "systemctl restart licitatii-porumbei"

# server: readu datele demo
ssh root@207.180.241.165 "bash /opt/licitatii-porumbei/reset-demo.sh"

# server: vezi ce se întâmplă
ssh root@207.180.241.165 "journalctl -u licitatii-porumbei -f"
```

---

## 5. Hartă a codului

```
platform/src/
  app/[locale]/          paginile publice și de cont (toate bilingve)
  app/[locale]/admin/    panoul de administrare
  app/api/               API-ul (auth, bid, buy, cart, upload, admin/*)
  components/            componente partajate
    MediaPicker.tsx      selectorul de fișiere cu cameră — folosit în 3 locuri
    AccountMenu.tsx      caseta de cont (login + logout la un loc)
    TopBar.tsx           bara neagră: limbă, ceas, Administrare
    SiteHeader.tsx       logo, coș, notificări, meniu + hamburger
  lib/
    bidding.ts           logica pură de licitare (testabilă fără bază de date)
    auction-service.ts   tranzacții, race-conditions, închidere automată
    settings.ts          cei ~40 de parametri configurabili din admin
    limits.ts            plafoane și liste de adrese permise
    rate-limit.ts        anti-bruteforce (în memorie; Redis la scalare)
```

---

## 6. Capcane de reținut (lucruri care au mușcat deja)

1. **După `prisma migrate dev`, repornește serverul de dev** — procesul care rulează ține în memorie clientul Prisma vechi și dă erori pe câmpurile noi.
2. **Nu lega cookie-ul `secure` de `NODE_ENV`** — pe HTTP fără SSL, browserul refuză cookie-ul și login-ul pare că „nu ține minte". Există flag separat `COOKIE_SECURE`.
3. **Layout-ul trebuie să fie `force-dynamic`** — altfel modificările făcute în admin (ex. linkuri) nu apar până la următorul build.
4. **Verifică linkurile primite înainte să le pui în cod** — adresa FRSC dată inițial nu exista (`combofila` în loc de `columbofila`).
5. **Agenții de fundal mor dacă aplicația Claude se închide** — scrie pe disc des și fă commit-uri de checkpoint.
6. **Pe Windows, SSH cu parolă nu merge prin OpenSSH standard** — folosește `plink -ssh -batch -pw`.
7. **Testele e2e împart o bază de date** — nu te baza pe numărul exact de înregistrări; testele care creează date pot rula înaintea celor care numără.
8. **CSP `sandbox` pe un PDF îl transformă în descărcare** — Chrome nu-și poate folosi vizualizatorul propriu pe un document sandboxat. Fișierele urcate se servesc cu `default-src 'none'; frame-ancestors 'self'`, nu cu `sandbox`.
9. **`object-src 'none'` din CSP blochează `<object>`** — pentru încadrarea unui PDF folosește `<iframe>`.

---

## 7. Istoric pe scurt

| Etapă | Ce s-a făcut |
|---|---|
| 9 aug | Research aprobat, 25 decizii client, MVP construit, migrare pe PostgreSQL |
| 10 aug | Deploy pe Contabo, logo real, favicon |
| 11 aug | Upload poze la listare |
| 15 aug | Audit de securitate: 18 probleme, 15 reparate; meniu hamburger; clopoțel |
| 21 aug | Preț fix, magazin, articole, concursuri, pagini de conținut, bară cu ceas; apoi Concursuri → linkuri externe |
| 24 aug | Compozitor de articole cu video; audit mobil; caseta de cont; cameră + Administrare în bara de sus |
| 24 aug | Câmpurile cerute pe lot (nume, rubrică, reprodus de, oferit de, pedigree scanat, video) și pagina lotului în formatul pipa.be |
