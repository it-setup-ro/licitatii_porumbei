# Stare proiect — No.1 & Best Pigeons

**Ultima actualizare:** 16 septembrie 2026
**Site live (test):** http://207.180.241.165:3000
**Cod:** https://github.com/it-setup-ro/licitatii_porumbei (public, branch `main`)
**Credențiale:** `credentiale-acces.md` (local, exclus din git)

> Acest fișier e „unde am rămas". Pentru cerințe și decizii: `research-report.md`, `client-decisions.md`. Pentru securitate: `audit-securitate.md`. Pentru hosting: `cerinte-hosting.md`. Pentru testare manuală: `scenariu-testare.md`.

---

## 1. Ce este, pe scurt

Platformă de licitații de porumbei, în 13 limbi (română, engleză, chineză, japoneză, olandeză, franceză, germană, spaniolă, poloneză, arabă, hindi, gujarati, swahili), construită de la zero: Next.js 16 + PostgreSQL, rulează ca serviciu pe VPS-ul Contabo existent (același server cu Cleanware, complet izolate).

**Stare: funcțională cap-coadă pentru testare.** 151 teste unitare + 245 teste end-to-end, toate verzi (16 sept 2026).

---

## 2. Ce funcționează acum

### Public
- **13 limbi**, alese dintr-o listă în bara de sus (fiecare limbă scrisă în limba ei). Textele site-ului sunt traduse în toate; ce scrie administratorul (titluri, descrieri, articole) apare în română pentru română și în engleză pentru restul. Araba se afișează de la dreapta la stânga, în oglindă. E-mailurile (plată, avizul de 30 min, resetarea parolei, notificări) pleacă în limba contului. Traducerile noi sunt de verificat de vorbitori nativi — termenii de columbofilie sunt cei mai nesiguri
- **Pagina unui lot, în formatul pipa.be**: serie inel · nume · rând scurt de descriere; galerie foto+video; fișa cu serie/an/sex, reprodus de, oferit de; descrierea lungă; pedigree scanat (poză sau PDF); restul informațiilor sub butonul „Toate detaliile"; ofertele — ultimele 3 și „Vezi toate ofertele"
- **Modificarea unui lot** de către crescător (`/account/lots` → Editează): tot, până la prima ofertă; după, doar adăugiri — poze, clipuri și o completare datată la descriere. Schimbarea seriei/anului/sexului/prețului pe un lot public îl trimite înapoi la aprobare. Adminul poate corecta orice, cu urmă în audit
- **Zona de licitație** după brief-ul clientului: „licitație live", preț mare, câți ofertanți și câte oferte, cronometru, stepper − / +, buton pe toată lățimea, preț de rezervă (sumă ascunsă), semne de încredere, bară fixă jos pe telefon
- **Nickname public** în istoricul ofertelor (numele real nu apare niciodată acolo)
- **Porumbei asemănători** la finalul paginii lotului
- **Bară de progres** la încărcarea fișierelor, cu procent și cât s-a trimis din cât
- **Mai multe poze deodată**: pe telefon se deschide galeria (selecție multiplă); pozele mari se micșorează în browser la 2560 px (JPEG) înainte de urcare, iar fiecare fișier urcă separat — unul greșit sau prea mare nu le mai oprește pe celelalte, iar mesajul spune care n-a mers
- **Mărirea pozelor** la clic, inclusiv pedigree-ul (unde scrisul e mărunt)
- **Fișa detaliată a porumbelului** (ca pe pipa): ochi, specializare, constituție (11 rânduri), aripă și penaj (6 rânduri) — toate opționale, afișate sub „Toate detaliile". Lista e în `src/lib/pigeon-traits.ts`
- **Licitații** cu proxy-bidding (plafon secret), anti-sniping (+5 min), actualizare live pe ecranul tuturor fără refresh, închidere automată cu desemnarea câștigătorului și animația stolului de porumbei
- **Preț fix** — cumpărare directă, fără licitație, cu rezervare atomică (al doilea cumpărător primește „Vândut")
- **Produse** — magazin cu categorii, coș (merge și nelogat), checkout cu scădere de stoc
- **Articole** — blog bilingv, cu poze și clipuri
- **Concursuri** — submeniu cu 6 linkuri către site-uri externe (clasamente, UNCR, FRSC, UCP)
- **Meniu de sus scurt** (cerut de client): Acasă, Articole, Curse & Rezultate, Crescători, Licitații, Preț fix, Produse. Articole și Crescători duc direct la pagina lor, fără submeniu; singurul meniu care se desface a rămas Curse & Rezultate (linkuri externe). Informații, Transport și agenți, Despre noi și Contact au rămas doar în subsol
- **Prima pagină**: cardul „Vreau să organizez o licitație" (nume, telefon, e-mail, țară/localitate) — cererea se salvează în Administrare → Cereri licitație și pleacă și pe e-mail la adresa de contact; lângă el, cardul „Urmărește-ne", care apare cu rețelele completate în Setări
- **Subsol, la Contact**: e-mail, telefon, adresa completă și programul de funcționare (toate din Setări; cele goale nu apar)
- **Pagina principală după macheta clientului**: hero cu fotografie și deviza scrisă de mână, bandă cu ce oferă platforma, **toți crescătorii cu loturi live** (câte un card pe crescător, cu poza lui, câți porumbei are la licitație și link la licitația lui), licitații live, banda concursului, ultimele articole, cifre reale din baza de date
- **Banda concursului** în forma cerută de client: trofeu, destinația scrisă mare, distanța cu țara, slogan, rubricile Îmbarcare / Lansare / Meteo pe traseu / Primul sosit și butonul auriu. Rubricile se completează din Administrare → Concursuri; cele goale nu apar
- **Pedigree ca filă în galerie** — Foto / Video / Pedigree în același cadru, cu mărire la clic
- **Căutare în antet** (nume, serie, crescător); pe telefon stă în meniul hamburger
- **Pagina Crescători** — lista crescătoriilor, cu poza unui lot al lor, localitate, rating și câte loturi au în licitație
- **Subsol bogat**: despre + rețele sociale, contact, link-uri utile, informații, abonare la noutăți, bandă de jos cu deviza
- **Noutăți pe e-mail** — abonare cu acord GDPR (se păstrează data și textul bifat), dezabonare dintr-un link cu token, listă și export CSV în Administrare
- **Pagini de conținut** — Regulament, Info licitații, Alte info, Transport, Despre noi, Contact (cu formular)
- Bară de sus cu **ora oficială a platformei** (ora serverului — reper comun la închiderea licitațiilor)

### Licitații pe loturi (faza 1 din `CERINTE-LICITATII-PE-PARTI.md` v4)
- **Structura clientului**: licitația unui crescător → până la 5 loturi → până la 20 de porumbei, numerotați „Lotul 1.01". Crescătorul e un profil (nume, localitate, poveste, rezultate), fără cont
- **Doar administratorii pun porumbei** (Administrare → Licitații pe loturi). Varianta cu crescătorul care își pune singur porumbeii există, dar e oprită din Setări („breederSelfServiceEnabled")
- **Fiecare lot are ora lui de start și de final și butonul „Start lot"**. Un lot pornit rămâne pornit: orele, prețul și porumbeii nu se mai schimbă. Un lot cu ora de start în viitor devine „Programat" și pornește singur
- **Prelungirea 10 / 10, nelimitată**, setabilă din Setări și înghețată pe lot în momentul pornirii
- **Comisionul se stabilește pe fiecare licitație** (5, 10, 15, 23 %…); plata se face în afara site-ului
- **În lista de licitații, câte un card pe lot**, cu zilele și orele lui („Burca Ionuț – Lotul 1 · 15.09 14:00 → 20.09 21:00"); cardul duce la lotul lui pe pagina licitației
- **Preț fix postat de admin**: în formularul „+ Vinde", comutatorul „Licitație / Preț fix"; cu preț fix rămâne o singură căsuță de preț, iar „Salvează și postează" îl pune imediat la Preț fix, până se vinde. Porumbeii cu preț fix nu mai apar în lista de licitații. Butonul „+ Vinde" rămâne vizibil pentru admini și când crescătorii nu pot lista
- **Lei cu € alături**: moneda platformei pe server e RON; lângă fiecare preț apare echivalentul în euro (card, pagina porumbelului, preț fix, licitația crescătorului, e-mailul de 30 de minute). În formulare, căsuțele de lei și de euro se completează una din cealaltă. Cursul BNR (`curs.bnr.ro`) se ia automat, o dată pe oră; adminul poate pune un curs manual din Setări → „Curs valutar", până apasă „Revino la cursul BNR"
- **Anul porumbelului nu se mai cere și nu se mai afișează** — ajunge seria inelului; anul se deduce din serie pentru uz intern
- **Sexul cu semn**: ♂ Mascul, ♀ Femelă, Pui / nedeterminat
- **Porumbel indisponibil după licitație** (bolnav / mort): licitația merge până la capăt; adminul apasă „Porumbel indisponibil" pe pagina porumbelului, câștigătorul e anunțat, comanda se anulează, pe pagină apare anunțul
- **Bifa de informare la înregistrare** („anunțuri de licitații, notificări, articole și noutăți"): abonează și la noutăți, cu data și textul acordului
- **E-mail pe planul gratuit Brevo (300 / zi)**: avizul de 30 de minute pleacă doar la cei care au licitat; avizul general se poate porni din Setări. Datele SMTP le pune Daniel cu `platform/scripts/set-smtp.sh`
- **Pagina publică a licitației** `/sales/<slug>`: copertă, crescător, câți porumbei, media curentă, loturile pliabile cu cronometru, comutator Grilă / Listă. Loturile în ciornă nu se văd. Pe pagina porumbelului: calea „Licitația › Lotul 1.01" și crescătorul în locul contului de admin
- **Avizul de 30 de minute**: un singur e-mail pe om, oricâte loturi s-ar închide. Cine a licitat primește lista porumbeilor lui și dacă e pe primul loc; cine a bifat avizele primește un aviz general, cu link de dezabonare semnat
- **Conturile noi se aprobă de admin** (Administrare → Conturi de aprobat). Înregistrarea cere nume, telefon, adresă, e-mail și nickname; până la aprobare contul vede tot, dar nu licitează
- **Administratori** se adaugă și se retrag din Administrare → Administratori (nu te poți retrage singur, nici pe ultimul)

### Plata în afara site-ului (faza 2 din `CERINTE-LICITATII-PE-PARTI.md`, capitolul 6)
- **Nu se mai plătește pe site**: butonul „Plătește" și plata simulată au fost scoase
- **Câștigătorul** (și cumpărătorul la preț fix) primește pe site și pe e-mail: porumbelul (Lotul 1.04, nume, serie), suma în lei cu echivalentul în €, datele de plată ale firmei din Setări (denumire, IBAN, bancă), mențiunea că se poate plăti și numerar, regula „porumbeii se predau după plată" și telefonul. Fără IBAN completat, i se spune că datele îi vin de la administrator
- **Administrare → Vânzări și plăți**: toți porumbeii vânduți, pe file (așteaptă plata / plătite / predate / anulate), cu căutare. Butoane: **Plătit** (transfer sau numerar, cu data), **Predat** (cu transportatorul), **Anulează – nu a plătit** (cumpărătorul e anunțat) și retragerea ultimului marcaj, cât porumbelul nu e decontat. Numărul vânzărilor neplătite apare în meniu
- **Decontul**: pe pagina fiecărei licitații de crescător și în Administrare → Deconturi (acolo și prețul fix, pe „Oferit de"). Arată total vândut (doar plătiți), comisionul și suma de plătit crescătorului; neplătiții apar separat. „Marchează decontat" închide suma, iar porumbeii plătiți mai târziu intră în decontul următor. **Descarcă Excel** (.xlsx)
- Fiecare marcaj (plătit, predat, anulat, decont) rămâne în Jurnal

### Cont
- **Înregistrare completă** (după voiajor.net și columbofil.net, cerută de client): persoană fizică sau juridică; nume și prenume, nume de utilizator, e-mail, telefon, parolă; țară și județ din listă, localitate, cod poștal, adresă; la juridică denumirea firmei, CUI (verificat cu cifra de control), Nr. Reg. Com., sediu, plus banca și IBAN opționale. Steluța apare doar pe câmpurile obligatorii
- **Bifa obligatorie „Accept Termenii și condițiile și Politica de confidențialitate"** (se păstrează data și versiunea) și bifa opțională „Doresc să primesc noutăți despre licitații pe email"
- **„Nu sunt robot" fără cont extern**: ALTCHA, verificat pe serverul nostru (fără Google/Cloudflare, fără cookie-uri); cheile se derivă din AUTH_SECRET
- **Autentificare cu e-mailul sau cu numele de utilizator**
- **Termeni și condiții / Politica de confidențialitate** (`/info/termeni-si-conditii`, `/info/politica-de-confidentialitate`), RO + EN, cu legături în subsol. Datele firmei și termenele de garanție se iau automat din Setări ({{firma}}, {{cui}}…); textul se editează din Administrare → Pagini. Forma finală trebuie văzută de un avocat
- Înregistrare, autentificare, cerere de cont crescător (aprobată manual de admin)
- **Datele crescătoriei** (denumire, localitate, prezentare) se corectează din Contul meu. IBAN-ul și CUI-ul nu — o schimbare tăcută de cont bancar e tiparul unei fraude; acelea rămân la admin
- **Parola**: buton de arătat/ascuns la autentificare, înregistrare și resetare; „Am uitat parola" cu link valabil o oră, de unică folosință; schimbarea parolei din Contul meu (cu parola veche)
- Ofertele mele, favorite, cumpărături, vânzări, loturile mele, comenzi magazin, notificări
- **Caseta de cont** (iconița din antet): autentificare/înregistrare când ești delogat; cont + ieșire când ești logat — totul într-un singur loc

### Admin
- Buton **Administrare** în bara de sus, pe orice pagină (doar pentru admini)
- **Utilizatori** (căutare + buton „Link de resetare" pentru cine nu primește e-mailul) și **E-mailuri trimise** (jurnalul din care se citesc linkurile cât timp e-mailul nu e conectat)
- **Navigație grupată** în administrare (Moderare / Conținut / Platformă), cu numărul de așteptări lângă fiecare secțiune de moderat: coloană pe calculator, un rând + panoul „Secțiuni" pe telefon
- Setări platformă (~40 de parametri, cu audit trail), aprobare vânzători, moderare loturi și recenzii
- Produse, Articole, Concursuri, Pagini, Linkuri, Mesaje de contact, Newsletter (cu export CSV)
- **Contact & rețele** în Setări (e-mail, telefon, localitate, Facebook, YouTube, Instagram) — apar în subsol doar dacă sunt completate
- **Compozitor de articole** stil rețea socială: titlu + text + foto/video; slug, rezumat și versiunea EN se generează automat
- **Selector de fișiere identic peste tot** (articole, listare porumbel, produse): pe telefon „Fă o poză" / „Filmează" deschid camera; pe calculator doar alegerea din fișiere
- **Formularul de listare** în ordinea cerută: serie/an/sex → nume → descriere → pedigree → foto → video → reprodus de → oferit de → preț; restul pliat sub „Alte detalii"

---

## 3. Ce NU e gata (în ordinea priorității)

| # | Ce | De ce contează | Cine decide |
|---|---|---|---|
| 1 | **Domeniu + HTTPS** | Acum parolele circulă necriptat. După: `COOKIE_SECURE=true` în `.env` de pe server și **scoaterea liniei `CAPTCHA_DISABLED=1`** (bifa „Nu sunt robot" merge doar pe HTTPS) | Daniel (cumpără domeniul) |
| 2 | **Datele de plată ale firmei** | Plata se face în contul firmei sau numerar (faza 2); fără IBAN în Setări → Facturare (denumire, IBAN, bancă) și telefon în Contact, câștigătorul nu primește contul. Stripe nu mai e necesar | Daniel / clientul |
| 3 | **Schimbă parola PostgreSQL locală** | A fost publică pe GitHub și rămâne în istoricul git | Daniel |
| 4 | **Șterge conturile demo** înainte de public | `admin@nbp.test/admin1234` e scris în README | Daniel |
| 5 | **E-mail real** | Codul e gata: orice e-mail se scrie în Administrare → E-mailuri și, dacă în `.env` există `SMTP_URL` (+ `SMTP_FROM`), pleacă și prin SMTP (`src/lib/mailer.ts`). Merge cu orice furnizor: Brevo, SES, Mailgun, contul firmei. **Resetarea parolei, aprobarea conturilor și avizul de 30 de minute depind de asta** | Daniel (alege furnizorul, pune datele în `.env`) |
| 6 | Avocat (T&C, GDPR) și contabil (TVA, e-Factura, DAC7) | Vezi `client-decisions.md` secțiunea E | Daniel |
| 7 | Upload imagini pe stocare externă (S3) | Doar dacă se trece pe mai multe servere | mai târziu |
| 8 | Redis pentru actualizările live | Doar la scalare pe mai multe instanțe | mai târziu |
| 9 | SMS | Pregătit, dezactivat (decizia D16) | mai târziu |
| 10 | **Oprește uneltele de test** înainte de public | Setări → 🧪 Unelte de test → oprește „Închide în 1 minut". Butonul dispare din Loturi, iar ruta refuză cererile | Daniel |

**La finalul dezvoltării (cerut de Daniel, 15 sept):** după ce se încheie dezvoltarea și toate testele, platforma se împachetează pentru livrare, cu instrucțiuni complete: necesarul tehnic (server, Node, PostgreSQL, domeniu, HTTPS), instalare și actualizare, copii de siguranță, configurarea e-mailului în Brevo (expeditor, cheie SMTP, `scripts/set-smtp.sh`), setările de pornire și conturile de administrator.

**Așteptăm de la client:** fotografia de hero trimisă pe chat (`assets-client/`), datele de contact și linkurile de rețele sociale (se pun în Setări), adresa pentru codul QR din subsol (are sens după ce avem domeniul).

**Rămase deschise din `open-questions.md`:** verificare marcă OSIM/EUIPO (există deja BestPigeons.ro), achiziția domeniului, bugetul SMS.

---

## 4. Comenzi

```bash
# local
cd platform
npm run dev              # http://localhost:3000
npm run db:seed          # readuce datele demo
npm test                 # 54 teste unitare
npm run test:e2e         # 180 teste end-to-end
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
10. **`PUBLIC_BASE_URL`** din `.env` intră în linkurile de resetare a parolei. După ce site-ul are domeniu, trebuie schimbat acolo — altfel linkurile trimit oamenii la vechea adresă IP.
11. **Clipurile nu trec prin memorie.** `/api/upload` are două căi: multipart (poze, PDF) și corpul brut al cererii, pentru clipuri. A doua scrie direct pe disc — la 300 MB, citirea în memorie ar fi pus în pericol și celelalte aplicații de pe server.
12. **Pe fluxul live trebuie trimis și minimul următor, nu doar prețul.** Altfel un ecran deschis în altă parte arată prețul nou, dar propune suma veche, iar cine o trimite primește „ofertă prea mică". Liderul are alt minim decât ceilalți: el trebuie să treacă peste propriul plafon secret.
13. **`reset-demo.sh` șterge date reale.** A fost rulat de două ori pe 29 august fără să fie întrebat Daniel, care testa cu poze reale — loturile lui s-au pierdut, pentru că serverul nu avea niciun backup și nici arhivare WAL. Acum comanda cere confirmare scrisă și face o copie înainte. **Nu o rula niciodată fără să întrebi.** Fișierele urcate nu sunt afectate: resetul atinge doar baza de date.

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
| 24 aug | Fișa detaliată de tip pipa (ochi, constituție, aripă) + buton de test „Închide în 1 minut" în Loturi |
| 24 aug | Pedigree imediat sub poze; meniuri strânse (Articole/Concursuri/Informații); „Crescător" → „Vânzător" pe lot |
| 29 aug | Copie de siguranță zilnică a bazei (03:00, 30 de zile) și confirmare obligatorie la `reset-demo.sh` |
| 29 aug | Poze reale de porumbei (CC0) și pedigree-uri demonstrative generate pe loturile demo |
| 29 aug | Navigația din administrare: din 12 pastile pe 5 rânduri → coloană grupată / panou „Secțiuni" |
| 29 aug | Arătarea parolei, resetare prin link (e-mail sau generat din admin) și schimbarea parolei din cont |
| 10 sep | Paletă nouă (alb / bleu cer / auriu / bleumarin), zona de licitație refăcută, preț de rezervă, nickname-uri, porumbei similari, bară fixă pe telefon |
| 10 sep | Bară de progres la încărcare; reparat: suma minimă nu se actualiza pe al doilea ecran |
| 29 aug | Editarea loturilor de către crescător; clipuri până la 5 min (300 MB, scrise direct pe disc); an+sex în antetul lotului; mărirea pozelor |
| 11 sep | Pagina principală după macheta clientului, banda concursului, newsletter GDPR, căutare fără diacritice, transportatori și agenți ca listă de carduri |
| 15 sep | Lei cu € alături (curs BNR + manual), fără an, semne de sex, porumbel indisponibil, acord la înregistrare, Brevo gratuit; porumbeii de test mutați în „Licitație de test"; faza 2: plata în afara site-ului, Vânzări și plăți, deconturi cu Excel |
| 16 sep | Meniu de sus scurt (fără submeniuri, fără Informații/Transport/Despre/Contact), articole în casete mici pe rânduri, carduri „Vreau să organizez o licitație" și „Urmărește-ne" pe prima pagină, adresa și programul în subsol |
| 16 sep | Site în 13 limbi (listă de alegere, arabă în oglindă, e-mailuri în limba contului); pe prima pagină toți crescătorii cu licitații active |
| 14 sep | Faza 1 a licitațiilor pe loturi: crescător → licitație → loturi cu „Start lot", prelungire 10/10 înghețată, comision pe licitație, conturi aprobate de admin, pagina publică a licitației, avizul de 30 de minute, trimitere SMTP |
