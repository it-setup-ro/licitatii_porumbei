# Brief de Research — Platformă de licitații de porumbei „No.1 & Best Pigeons"

> **Cum se folosește acest document:** îi dai acest fișier lui Claude Code ca *context complet* pentru o sesiune de research. Claude Code va instanția doi agenți (un **Research Agent** și un **Review Agent**) care lucrează într-o buclă iterativă până când cerințele platformei sunt culese, verificate și validate față de site-urile de referință. Rezultatul acestei sesiuni **NU este site-ul**, ci un **dosar de cerințe** (research report) pe baza căruia se va construi ulterior platforma.

---

## 1. Scop și rezultat așteptat

**Scopul research-ului:** să producă un dosar de cerințe complet, corect și verificat pentru o platformă web de licitații de porumbei, folosind ca reper două site-uri de referință consacrate din domeniu, plus cercetare proprie pe funcții, date specifice, aspecte de business/legal și estetică.

**Rezultatul final al sesiunii de research (livrabilul):**
1. `research-report.md` — dosarul de cerințe (structură detaliată în secțiunea 8).
2. `feature-matrix.md` — matrice comparativă a funcțiilor observate pe cele 2 site-uri de referință, cu marcaj „must-have / nice-to-have / opțional".
3. `review-log.md` — jurnalul buclei de verificare: ce discrepanțe a găsit Review Agent, ce a corectat Research Agent, și decizia finală.
4. `open-questions.md` — lista întrebărilor rămase deschise pentru client (Daniel), acolo unde research-ul nu poate decide singur.

**Ce se construiește ulterior (context, NU parte din research):** o platformă web **custom, full-stack**, **bilingvă RO/EN**, cu sistem **complet** de licitații (conturi, licitații live în timp real, plăți/comision, notificări, proxy-bidding).

---

## 2. Context de brand

**Nume brand:** No.1 & Best Pigeons

**Logo:** furnizat de client (fișier `logo`). Reprezintă o siluetă neagră de porumbel în zbor, cu aripa colorată într-un degrade cald (albastru → galben → portocaliu → roșu), pe fundal ivory/cream, cu textul „No.1° & BEST PIGEONS" sub siluetă. Logo-ul se folosește ca element central de brand (redimensionat corespunzător pentru header, favicon, footer, loading state).

**Paletă de culori derivată din logo** (de folosit ca punct de plecare pentru design system; Research Agent o poate rafina):
- Negru profund (siluetă / text): `#1B1B1B`
- Ivory / cream (fundal): `#F3EEE1`
- Albastru aripă: `#2E6E9E`
- Galben: `#F2B417`
- Portocaliu: `#E8720C`
- Roșu cărămiziu: `#C0341D`

**Ton vizual dorit:** premium, cald, curat, cu accent pe fotografia porumbeilor. Estetic, cu animații rafinate (nu kitsch). Paleta caldă + negrul oferă un aer de prestigiu.

---

## 3. Site-uri de referință

Research Agent trebuie să analizeze în detaliu ambele site-uri și să extragă structură, funcții, fluxuri, terminologie și elemente de UX. Nu se copiază conținut sau design 1:1 — se extrag **tipare funcționale** și **bune practici** de domeniu.

1. **PIPA Auctions** — https://auctions.pipa.be/en
   Platformă de referință internațională pentru licitații de porumbei (voiajori). De studiat: structura paginii de licitație, prezentarea porumbelului (pedigree, rezultate, poze), sistemul de bidding, paginile de crescător, filtrele/căutarea, secțiunile de „current / upcoming / closed auctions".

2. **PigeonBoss** — https://pigeonboss.com/
   Al doilea reper de domeniu. De studiat: modelul de listare, fluxul de înregistrare/vânzare, funcțiile de cont, orice elemente pe care PIPA nu le are (pentru a completa matricea de funcții).

> **Regulă pentru Review Agent:** orice cerință inclusă în `research-report.md` trebuie să fie *fie* observabilă pe cel puțin unul dintre site-urile de referință, *fie* justificată explicit dintr-o sursă externă credibilă (documentație, standard, articol), *fie* marcată clar ca „propunere proprie / diferențiator". Nu se acceptă cerințe „inventate" fără trasabilitate.

---

## 4. Arhitectura celor doi agenți

### 4.1. Research Agent — rol
Culege și structurează cerințele platformei. Responsabilități:
- Analizează cele 2 site-uri de referință (navighează, extrage funcții, fluxuri, terminologie, structură de pagini).
- Cercetează dimensiunile din secțiunea 6 (funcții & UX, date specifice porumbei, business & legal, estetică & animații).
- Produce și actualizează `research-report.md`, `feature-matrix.md`, `open-questions.md`.
- La fiecare rundă, integrează feedback-ul primit de la Review Agent și rafinează.

**Input:** acest brief + site-urile de referință + feedback-ul din runda anterioară (dacă există).
**Output:** versiune actualizată a dosarului de cerințe.

### 4.2. Review Agent — rol
Verifică *corectitudinea și corelarea* dintre ce a cules Research Agent și realitatea site-urilor de referință / surselor. Responsabilități:
- Recheck: fiecare cerință/afirmație din `research-report.md` este verificată față de site-urile de referință și sursele citate.
- Semnalează **inadvertențe**: afirmații nesusținute, funcții descrise greșit, omisiuni importante (funcție prezentă pe site dar lipsă din raport), contradicții interne, cerințe nerealiste tehnic.
- Scrie feedback structured (vezi 4.4) și îl trimite înapoi la Research Agent.
- **NU** rescrie el raportul — doar evaluează și cere corecții.

**Input:** dosarul curent produs de Research Agent + site-urile de referință.
**Output:** listă de discrepanțe + verdict (`APPROVED` / `NEEDS_REVISION`) în `review-log.md`.

### 4.3. Bucla de feedback (orchestrare)
1. Research Agent produce runda *n* a dosarului.
2. Review Agent evaluează runda *n* → emite discrepanțe + verdict.
3. Dacă verdict = `NEEDS_REVISION`: Research Agent primește lista, rafinează, produce runda *n+1*. Se revine la pasul 2.
4. Dacă verdict = `APPROVED`: bucla se oprește, dosarul e considerat final.

### 4.4. Format feedback Review → Research
Fiecare discrepanță se notează astfel:
```
[SEVERITATE: blocker | major | minor]
[SECȚIUNE: <secțiunea din raport>]
[TIP: nesusținut | greșit | omisiune | contradicție | nerealist]
Descriere: <ce e în neregulă>
Dovadă/Referință: <URL / sursă / observație pe site>
Acțiune cerută: <ce trebuie corectat>
```

### 4.5. Criterii de oprire (stop conditions)
Bucla se oprește când **oricare** e adevărat:
- Review Agent emite `APPROVED` (zero discrepanțe `blocker` și zero `major`; discrepanțele `minor` rămase sunt listate ca acceptate cu justificare).
- S-au atins **max. 5 runde** — în acest caz se oprește oricum și se documentează în `review-log.md` ce a rămas nerezolvat + de ce.
- Discrepanțele rămase depind de o decizie a clientului (nu pot fi rezolvate prin research) — se mută în `open-questions.md` și nu blochează aprobarea.

---

## 5. Decizii deja luate de client (constrângeri fixe)

Acestea NU se re-cercetează ca opțiuni deschise; research-ul lucrează *în interiorul* lor:
- **Limbă:** bilingv **RO / EN**, cu comutator de limbă. Research-ul acoperă implicații i18n (conținut, formatare date/monedă, SEO pe două limbi).
- **Complexitate:** **platformă completă** — conturi utilizatori, licitații live în timp real, plăți/comision, notificări, proxy-bidding, istoric, rating vânzători.
- **Tehnologie:** **cod custom, full-stack** (nu WordPress/plugin). Direcție de plecare recomandată: front-end React/Next.js, back-end cu suport real-time (WebSockets) pentru licitații live. Research-ul confirmă/rafinează stack-ul și justifică alegerile.

---

## 6. Scope-ul research-ului — cele 4 dimensiuni

Pentru fiecare dimensiune sunt listate întrebările la care dosarul trebuie să răspundă.

### 6.1. Funcții & UX
- Ce pagini/secțiuni au site-urile de referință și cum sunt organizate (harta site-ului)?
- Fluxul complet de licitație: cum arată o pagină de licitație, cum se pun oferte, cum funcționează cronometrul, ce se întâmplă la extindere de timp („anti-sniping"), cum se anunță câștigătorul.
- **Proxy-bidding** (ofertă maximă automată) — cum funcționează, cum se comunică utilizatorului.
- Căutare, filtrare, sortare (după rasă, crescător, preț, timp rămas, palmares etc.).
- Fluxuri de cont: înregistrare, verificare, profil crescător, „my bids", „watchlist / favorite", istoric.
- Fluxul de vânzător: cum listezi un porumbel, ce câmpuri, aprobare/moderare, gestionare licitații active.
- Notificări: outbid, licitație pe cale să se închidă, câștig, mesaje.
- Responsive / mobil vs desktop; accesibilitate de bază.

### 6.2. Date specifice porumbei
- Cum se descrie un porumbel: inel (ring number), an, sex, culoare, rasă/linie (strain), crescător/origine.
- **Pedigree**: cum se afișează arborele genealogic, câte generații, ce date pe fiecare strămoș.
- **Rezultate/palmares**: concursuri, clasamente, distanțe, premii — cum se prezintă.
- Media: câte poze, video, certificate ADN/health, documente de proveniență.
- Terminologie corectă de domeniu (RO și EN): voiajori, ornament, „fond", „mare fond", „ași", olimpici etc. — glosar bilingv.

### 6.3. Business & legal
- Modele de venit în domeniu: comision din vânzare (buyer's/seller's premium), abonament, listare cu taxă, promovare.
- Plăți: metode uzuale, gestionarea depozitelor/garanțiilor, plată către vânzător, facturare, TVA.
- Aspecte legale RO/UE: **GDPR** (conturi, date personale), termeni și condiții pentru licitații (caracter obligatoriu al ofertei), politici de retur/dispute.
- Livrare/transport porumbei: cum se organizează, cine plătește, curieri specializați, aspecte de bunăstare animală și transport transfrontalier.
- Antifraudă: verificare identitate vânzător, protecție cumpărător, gestionarea ofertelor false / retragerilor.

### 6.4. Estetică & animații
- Confirmă/rafinează paleta de culori (secțiunea 2) și propune un mic **design system** (tipografie, spațiere, componente cheie: card de licitație, cronometru, buton de bid).
- Inventar de **animații** potrivite temei și culorilor, cu note de implementare (bibliotecă sugerată: ex. Framer Motion / Lottie / CSS). Idei obligatorii de acoperit:
  - **Câștig de licitație:** la câștigător se afișează o animație cu **un stol de porumbei care își ia zborul prin pagină** (moment „celebration"). De descris: trigger, durată, comportament pe mobil, opțiune reduce-motion.
  - Micro-interacțiuni: hover pe card, actualizarea live a prețului/ofertei, pulsul cronometrului în ultimele secunde, „outbid" shake, confetti/pene în cădere ca alternativă.
  - Loading states / tranziții de pagină în ton cu brandul.
- Respectă **accesibilitatea**: toate animațiile trebuie să aibă variantă `prefers-reduced-motion` și să nu împiedice utilizarea.

---

## 7. Cerințe tehnice de acoperit în research
- Stack full-stack custom, cu justificare (front-end, back-end, bază de date, real-time layer pentru bidding live).
- Arhitectura licitației live: cum se sincronizează ofertele în timp real între mulți utilizatori, cum se previne race-condition la ultima ofertă, „anti-sniping"/extindere de timp.
- Autentificare & roluri (cumpărător, vânzător, admin/moderator).
- Integrare plăți (ce procesatoare sunt fezabile pentru RO/UE, comision, payout).
- i18n RO/EN (conținut, rute, SEO, formate).
- Notificări (in-app, email, opțional push).
- Considerații de scalare, securitate și moderare de conținut.
> Nivelul de detaliu tehnic: suficient pentru a fundamenta deciziile de arhitectură, nu implementare completă. Implementarea vine în faza următoare.

---

## 8. Structura obligatorie a `research-report.md`
1. **Rezumat executiv** — ce este platforma, pentru cine, diferențiatori.
2. **Harta funcțională** — toate funcțiile, grupate, cu prioritate (must / nice / opțional) și sursă (referință / cercetare / propunere).
3. **Fluxuri cheie** — descrise pas cu pas: licitare, proxy-bid, câștig, listare vânzător, plată, onboarding.
4. **Model de date porumbel** — câmpuri, pedigree, rezultate, media, glosar bilingv RO/EN.
5. **Business & legal** — model de venit, plăți, GDPR/T&C, transport, antifraudă.
6. **Design & estetică** — design system pe scurt + inventarul de animații (inclusiv „stolul la câștig").
7. **Arhitectură tehnică** — stack recomandat + justificare + arhitectura real-time.
8. **Roadmap sugerat** — MVP vs faze ulterioare.
9. **Riscuri & întrebări deschise** — trimitere la `open-questions.md`.

---

## 9. Definition of Done (research finalizat)
Research-ul e considerat complet când:
- Cele 4 fișiere livrabile (secțiunea 1) există și sunt coerente între ele.
- Review Agent a emis verdict `APPROVED` (sau s-a atins limita de runde cu nerezolvatele documentate).
- Fiecare cerință din raport are **trasabilitate** (referință / sursă / marcaj „propunere proprie").
- Toate deciziile fixe din secțiunea 5 sunt respectate.
- Elementele obligatorii de estetică (paleta din logo, animația „stol de porumbei la câștig") sunt acoperite explicit.
- Întrebările care necesită decizia clientului sunt strânse în `open-questions.md`, nu presupuse.

---

## 10. Principii de lucru
- **Trasabilitate înainte de toate:** nicio cerință fără sursă.
- **Fără scope creep:** research-ul se oprește la cerințe; nu construiește site-ul.
- **Onestitate asupra incertitudinii:** ce nu se poate verifica se marchează ca atare, nu se prezintă drept fapt.
- **Respect pentru brand:** paleta și logo-ul „No.1 & Best Pigeons" ghidează toate propunerile estetice.
- **Bilingv nativ:** terminologia și glosarul se produc în RO și EN de la început.
