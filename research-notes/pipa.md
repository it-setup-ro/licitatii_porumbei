# Research: PIPA Auctions (https://auctions.pipa.be/en)

> Status: ÎN LUCRU — notele se completează incremental pe măsură ce paginile sunt analizate.
> Data research: 2026-08-08. Metodă: descărcare HTML cu curl (WebFetch a primit 403 de la antibot-ul Drupal; curl returnează totuși conținutul complet — observație verificată direct pe HTML descărcat).
> Notă de context: la data research-ului NU există licitații online active ("There are currently no online auctions" — homepage), deci analiza paginilor de lot live se bazează pe FAQ, arhivă/cache și WebSearch, marcate ca atare.

## 0. Observații tehnice despre platforma PIPA
- CMS: **Drupal 10** (meta Generator în HTML) + strat front-end **Vue.js** (`<div id="vue-wrap">`) pentru componentele dinamice (listă licitații, bidding). [sursă: HTML homepage]
- Analytics: Plausible (self-hosted pe același domeniu). [sursă: HTML homepage]
- Protecție antibot Drupal ("form.antibot") — răspunde 403 la fetch-uri simple dar servește conținutul. [observație directă]
- Site-ul de licitații e un subdomeniu separat (`auctions.pipa.be`) față de portalul de conținut (`www.pipa.be` — articole, rezultate curse, fanciers, clubs, shop). Cele două sunt inter-linkate din meniul principal. [sursă: HTML homepage]

## 1. Limbi și internaționalizare
- 10 limbi: EN, 中文 (zh-hans), 日本語 (ja), NL, FR, DE, ES, PL, العربية (ar), **Română (/ro)** [număr corectat de la „9" la „10" în Runda 2 — lista enumera deja 10 valori hreflang] — deci PIPA are deja versiune RO; relevant pentru glosar RO/EN. [sursă: selector limbă homepage, prefixe URL /en /ro /nl etc.]
- **Selector de fus orar** în header: "Time zone: Login to change your time zone" — ora închiderii licitațiilor se afișează în fusul orar al utilizatorului logat. Funcție importantă pentru licitații internaționale. [sursă: header homepage]

## 2. Harta site-ului (auctions.pipa.be) — extrasă din homepage + footer
- `/en` — Homepage licitații: secțiune "Online auctions" (licitații live) + "Upcoming auctions" + pitch vânzători ("Request a non-binding estimation… Contact sales").
- `/en/upcoming-auctions` — listă licitații viitoare (card cu steag țară + nume licitație, ex. "ZW Victoria Falls one loft race").
- `/en/auction/<slug>` — pagină de licitație (colecție de loturi); slug cu dată: ex. `2026-08-victoria-falls-one-loft-race`.
- `/en/frequently-asked-questions` — FAQ cu categorii (pill_id): **Registration & approval, Bidding, Alerts & communication, My Auctions, Payment, Transport, Aftersales**.
- `/en/user/login`, `/en/user/register`, `/en/user/password` — flux cont.
- `/en/my-favourites` — watchlist/favorite.
- `/en/message-center` — centru de mesaje/notificări.
- `/en/general-terms`, `/en/pipa-privacy-policy`, disclaimer — legal.
- `/en/who-is-pipa`, `/en/contact`, `/en/contact?category=sales` — despre + contact vânzări.
- Meniu global (spre www.pipa.be): Home, Auctions, Articles, Fanciers, Races (One loft races, PIPA rankings, Championships, Results), Clubs, Shop.
[sursă: linkuri extrase din HTML homepage + footer, 2026-08-08]

## 3. Structura secțiunilor de licitații
- **Online auctions** (curente/live) — pe homepage; mesaj gol: "There are currently no online auctions."
- **Upcoming auctions** — pagină dedicată; cardul licitației afișează steagul țării + numele; pagina licitației viitoare afișează text de prezentare (poveste, palmares, statistici curse) și mesajul: **"This is an upcoming auction. All pigeons will be visible when bidding starts."** — deci loturile sunt ascunse până la start. [sursă: /en/auction/2026-08-victoria-falls-one-loft-race]
- Secțiune "closed/archive" — de verificat (nu apare link direct în footer; se investighează sitemap + cache).

## 4. Pagina de licitație (nivel colecție)
- Titlu licitație + breadcrumb (Home > Auctions > <nume>).
- Text editorial bogat de prezentare: istoric, context (ex. one loft race cu premii de $1M+), statistici de concurs pe etape (distanțe km, nr. porumbei, viteze m/min), evidențierea porumbeilor vedetă cu nr. inel (ex. DV07564-25-329 "Mittwoch").
- Terminologie observată: "one loft race", "Hot Spot race", "Final", "Enduro Final", "Ace Pigeons", "Super Ace Competition", "Grand Average", "m/min", "clocked", "prize pool". [sursă: pagina Victoria Falls]

## 5. Footer — arhitectura suportului
Footer organizat pe coloane: Auctions (Online/Upcoming/FAQ) | FAQ pe categorii (Registration & approval, Bidding, Alerts & communication, My Auctions, Payment, Transport, Aftersales) | My account (Login, Register, Reset password) | About PIPA (milestones, selection procedure and quality control, who is PIPA, contact) + date firmă completă (PIPA Trading BV, adresă Belgia, tel, nr. înregistrare ON) + social (Instagram, Facebook, LinkedIn, YouTube) + legal (General terms, Disclaimer, Privacy policy). [sursă: HTML homepage]

## 6. Sistemul de bidding (din FAQ oficial — https://auctions.pipa.be/en/frequently-asked-questions, descărcat integral 2026-08-08)

### 6.1. Înregistrare & aprobare cont (KYC manual)
- Bidding necesită profil aprobat; **vizualizarea licitațiilor NU necesită cont**. "Only one profile can be made per person."
- După înregistrare, un angajat PIPA **sună personal utilizatorul** (background check telefonic) și îi **atribuie un buget de licitare** (sumă totală EUR pe weekend de licitații, stabilită de comun acord). Aprobare în max. 48h (mai mult în vacanțe); PIPA contactează utilizatorii noi înainte de finalul fiecărei licitații.
- Pentru țări cu care PIPA nu are experiență: se poate cere **depozit (deposit)** înainte de aprobare.
- Bugetul e vizibil în "Auction profile". Bidding-ul se poate face și **prin telefon** (asistat).
- **Bidding name (nickname)** public: schimbabil din Auction profile, dar noul nume trebuie aprobat de admin; nu se poate schimba cât timp ai bid-uri în licitații active; interzise nume provocatoare, numele altor persoane, cuvântul "PIPA".

### 6.2. Plasarea ofertelor
- Flux: buton **"Place a bid"** → introduci bid și/sau buying order → **"Place your bid"** → confirmare explicită **"Confirm your bid"** (pas dublu de confirmare).
- **Bidding starts at 200 euro** (preț de pornire standard).
- Suma bid = fără TVA; la afișare, TVA-ul apare pe ecranul de bid dacă utilizatorul are selectată adresa de facturare + metoda de livrare corecte.
- La plasarea bid-ului alegi **adresa de facturare** și **adresa de livrare** (suport adrese multiple, fiecare validată de admini).
- Durata unei licitații online: de regulă **2 săptămâni**.

### 6.3. Proxy bidding — terminologie PIPA: **"buying order" (b.o.)**
- Definiție: suma maximă până la care sistemul licitează automat în numele tău; dacă vine un bid mai mare decât bid-ul tău curent dar ≤ buying order, sistemul supralicitează automat.
- **Prioritate**: buying order bate un bid normal de aceeași valoare (b.o. 2.000 EUR câștigă contra bid normal 2.000 EUR).
- La buying orders egale câștigă **cel plasat primul** (first-come priority).
- Buying order-ul e **invizibil pentru ceilalți** — vizibil doar proprietarului.
- Modificare/ștergere: buton **"Change b.o."** lângă porumbel.

### 6.4. Anti-sniping (extindere de timp) — regula PIPA
- **Bid în ultimele 5 minute → închiderea acelui porumbel se prelungește cu 5 minute.** Prelungirea e **per lot**, nu per licitație: "the auction for all other pigeons that did not receive a bid in the last 5 minutes will still end at 17:00."
- Exemplu oficial: închidere 17:00, bid la 16:57 → lotul se închide la 17:05.
- La **licitații hibride** (sală + online, ex. Tom Van Gaver): loturile se vând secvențial, porumbel cu porumbel; în ultimele **30 secunde** fiecare bid (online sau din sală) resetează cronometrul online la 30s; dacă expiră, platforma online îngheață, sala primește o ultimă șansă; dacă sala licitează, countdown-ul online de 30s repornește; lotul e vândut doar când licitatorul "îl bate" (knock down).

### 6.5. Notificări & alerte
- **Outbid**: notificare prin **email și/sau SMS** (opt-in din Auction profile); gratuite oriunde în lume; disclaimer: livrarea nu e garantată — "always check your profile".
- **Alerte de start licitație**: iconiță **clopoțel (bell)** pe fiecare licitație din lista "planned auctions" → notificare când începe.
- Număr de telefon mobil **validat prin cod SMS** (revalidare la schimbare).
- Există **Message center** (/en/message-center) în header.

### 6.6. Paginile de cont ("My…")
- **Auction profile** — date cont, buget, bidding name, setări notificări, telefon.
- **My bids** — toate bid-urile din licitațiile curente.
- **My favourites** (header) — watchlist.
- **My purchases** — istoric cumpărături + **download poză, certificat ADN (dacă există) și pedigree** pentru fiecare porumbel cumpărat.
- Adrese multiple de facturare și livrare (uz privat vs. firmă; TVA aplicabil diferit).

### 6.7. Plăți & prețuri (FAQ Payment)
- **Preț de cumpărare = bid câștigător + taxă administrativă 80 EUR/porumbel + TVA** (dacă e cazul). TVA nu se aplică pentru non-UE cu livrare în afara UE + declarație de export validă.
- Neincluse: taxe de import, costuri bancare, **transportul** (facturat separat).
- Toate prețurile în **EUR** ("we have chosen payments in euros to avoid losses through valuta transactions"); link la convertor x-rates pentru alte valute.
- Factura se trimite pe email **în prima luni după închiderea licitației**; termen de plată **7 zile calendaristice**; porumbelul se expediază doar după încasarea integrală.
- Metode: **transfer bancar** (costuri bancare la cumpărător) sau **card VISA/Mastercard cu +3% service fee**.
- Neplată: PIPA/vânzătorul poate **anula vânzarea și republica porumbelul**; la platform auctions, neplata în 3 zile → **relicitare automată + blocarea contului**.

### 6.8. Model "Platform auction" (marketplace) vs. licitație proprie
- PIPA distinge: **platform seller** (terț, ex. organizator One Loft Race), **platform customer** (bidder/cumpărător), **platform owner** (PIPA — furnizează doar platforma).
- La platform auctions plata și transportul se fac direct cu terțul; fiecare platform auction are **secțiune FAQ dedicată** cu instrucțiuni specifice (ex. Derby Bursa 2025, AFRIKAPRO 2025, Dubai 2026, Victoria Falls 2024 — cu detalii bancare, termene 3 zile, costuri transport pe regiuni, timpi de livrare de 1–6 luni, avertismente TVA).
- La licitații hibride: **buyer's premium de 20%** peste bid-ul final (total 120%, fără TVA) — model de comision vizibil public.

### 6.9. Transport & aftersales (FAQ Transport/Aftersales)
- Metode de livrare pe țară (dropdown cu ~60 țări, inclusiv **România**): (1) **PIPA shipment via carrier** (departament logistic propriu contactează cumpărătorul), (2) **pick-up personal** (programare cu min. 2 zile lucrătoare înainte, L–V 9–17), (3) **pick-up prin terț**.
- Dacă țara nu e în listă = PIPA nu are experiență de livrare acolo → contact manual.
- **Aftersales / garanții**: porumbel **infertil** — raportare în max. 2 luni de la primire; porumbel **bolnav la sosire** — raportare în 24h; porumbel **mort la sosire** — poze + retur inel original, ownership card și pedigree în 24h prin sales agent. FAQ include criteriile unui porumbel sănătos (carunculi albi, mușchi pectorali, gât roz pal, penaj lucios, impresie vitală).
- **Garanție sex**: puii ("young birds") vânduți de crescătorul care i-a produs au **test ADN de sexare** (excepție: pui vânduți de altcineva decât crescătorul).
- **PPQC (PIPA Quality Control)** — control de calitate intern + poze high-res + uneori video, ca substitut pentru inspecția fizică; posibilitate de vizită la sediu pentru a ține porumbelul în mână.

### 6.10. Categoriile FAQ (taxonomia suportului)
Welcome to PIPA | Registration & approval | Bidding | Alerts & communication | My auction | Payment | Transport | Aftersales | Platform auctions | Hybrid auctions.

## (urmează) 7. Pagina de lot/porumbel individual
## (urmează) 8. Pagini crescător, filtre/sortare, arhivă licitații închise, terminologie extinsă
