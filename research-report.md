# Research Report — Platformă de licitații de porumbei „No.1 & Best Pigeons"
**Versiune:** Runda 2 (corecții după review Runda 1 — vezi review-log.md) | **Data:** 2026-08-09 | **Autor:** Research Agent
**Bază documentară:** brief-research-no1-best-pigeons.md + note de research (research-notes/pipa.md, pigeonboss.md, date-porumbei.md, business-legal.md, design-tehnic.md) + verificări web suplimentare din această sesiune.

> **ADDENDUM 2026-08-09 — decizii client:** toate cele 25 de întrebări din open-questions.md au primit răspuns de la Daniel. Parametrii comerciali, de plăți, livrare, scope și brand sunt acum fixați în **`client-decisions.md`**, care completează și, unde diferă, **prevalează** asupra recomandărilor din acest raport. Cerință nouă majoră adăugată acolo: Panoul de setări platformă (admin) — aproape toți parametrii comerciali sunt configurabili, nu hard-codați.

> **Regulă de trasabilitate:** fiecare cerință poartă marcaj [sursă: …]. Sursele posibile: PIPA (auctions.pipa.be — observație directă pe HTML descărcat cu curl la 2026-08-08 sau FAQ oficial), PigeonBoss (pigeonboss.com — WebFetch direct), URL extern, sau „propunere proprie".
> **Limitare de acces documentată:** WebFetch primește HTTP 403 de la auctions.pipa.be (antibot Drupal); conținutul PIPA a fost obținut prin curl (HTML complet) și WebSearch, conform research-notes/pipa.md. La data research-ului nu existau licitații PIPA active, deci **pagina de lot individual PIPA nu a putut fi observată live** — golul este marcat explicit în §2 și §9.

---

## 1. Rezumat executiv

**Ce este platforma.** „No.1 & Best Pigeons" este o platformă web custom, full-stack, **bilingvă RO/EN**, de licitații online pentru porumbei voiajori: conturi de utilizator (cumpărător / vânzător / admin), licitații live în timp real cu proxy-bidding și anti-sniping, plăți cu comision, notificări și rating de vânzători. [sursă: constrângeri fixe, brief secțiunea 5]

**Pentru cine.** Crescători (columbofili) care vând porumbei de rasă/performanță și cumpărători din România și internațional (interfața EN deschide piața externă; PIPA operează în 10 limbi, inclusiv RO, dovadă că cererea e globală). [sursă: PIPA — selector de limbă homepage, research-notes/pipa.md §1]

**Reperele analizate.**
- **PIPA Auctions** (auctions.pipa.be) — standardul de aur al domeniului: KYC manual cu buget de licitare, buying orders (proxy-bid), anti-sniping 5 minute per lot, licitații hibride sală+online, logistică proprie și garanții aftersales. [sursă: PIPA FAQ — https://auctions.pipa.be/en/frequently-asked-questions, descărcat integral 2026-08-08]
- **PigeonBoss** (pigeonboss.com) — **constatare critică:** NU este platformă de licitații, ci portal editorial + shop + servicii de promovare (pachete €49,95–€195,95), care direcționează licitațiile spre platforma parteneră Amazing-Wings. Modelul lui relevant pentru noi este **stratul de marketing/conținut care alimentează licitațiile** și monetizarea paginilor de crescător (€195/an). [sursă: https://pigeonboss.com/our-services/, https://pigeonboss.com/famous-fanciers/, research-notes/pigeonboss.md §1, §5]

**Peisajul concurențial românesc (corectat în Runda 2).** Piața RO NU este goală: există un ecosistem activ de platforme locale de licitații de porumbei. Verificate direct prin sondaj (WebFetch 2026-08-09): **BestPigeons.ro** („Licitații Online cu Porumbei de Performanță din România" — același brand ca „BestPigeons 25%" din tabelul de comisioane §5.1, deci concurent direct activ, cu risc de confuzie de nume față de „No.1 & Best Pigeons" → open-questions #23, #25), **piatadeporumbei.ro** („Romanian Auction House for Racing Pigeons": licitații + preț fix + conturi + coș, RO cu Google Translate), **goldpigeon.ro** (licitații + arhivă + „lista neagră" la neplată, doar RO), **licitatie-porumbei.ro** (licitații + preț fix + editorial, activitate aparent stagnantă din ~2016). Identificate suplimentar prin WebSearch, neverificate direct: licitatiiporumbei.ro, topvoiajor.ro, porumbei360.ro, magicpigeons.com, onlyolr.com. La sondaj, concurența locală apare monolingvă, fără plăți online integrate vizibile și fără mecanici moderne de licitare (proxy-bid/anti-sniping) documentate public. [sursă: research-notes/concurenta-ro.md, WebFetch/WebSearch 2026-08-09]

**Diferențiatori propuși pentru No.1 & Best Pigeons** (toate: propunere proprie, fundamentate pe golurile observate la referințe și la concurența RO):
1. **Bilingv RO/EN nativ** cu glosar columbofil corect în ambele limbi — PIPA are RO ca traducere secundară, iar platformele RO existente sunt monolingve sau folosesc Google Translate (sondaj concurenta-ro.md §4); combinația „conținut columbofil RO nativ + deschidere internațională EN + mecanici de licitare de nivel PIPA" nu a fost observată la niciun concurent verificat. [sursă: research-notes/concurenta-ro.md §4]
2. **Plăți online integrate de tip marketplace** (Stripe Connect / wallet cu escrow) — PIPA lucrează cu factură + transfer bancar manual; automatizarea payout-ului e un avans real.
3. **Experiență vizuală premium pe brandul propriu** — paleta caldă din logo + animația-semnătură „stol de porumbei la câștig" (brief secțiunea 6.4, element obligatoriu).
4. **Transparența datelor de palmares în format românesc FCPR** (coeficient, categorii Viteză/Demifond/Fond/Maraton) alături de terminologia internațională. [sursă model: https://www.columba.ro/regulamentul-national-columbofil/]

---

## 2. Harta funcțională

Legenda priorității: **M** = must-have (MVP), **N** = nice-to-have (faza 2), **O** = opțional (faza 3+). Sursa: R = observat la referință, C = cercetare externă, P = propunere proprie. Detaliul comparativ complet este în `feature-matrix.md`.

### 2.1. Public / catalog
| Funcție | Prior. | Sursă |
|---|---|---|
| Homepage cu secțiuni „Licitații live" / „Licitații viitoare" / „Licitații închise" | M | R — PIPA are Online + Upcoming pe homepage; arhiva „closed" nu are link vizibil în footer-ul PIPA, dar e cerută de brief §6.1 [sursă: research-notes/pipa.md §2–3] |
| Pagină de licitație (colecție de loturi) cu titlu, breadcrumb, text editorial de prezentare (istoric crescător, palmares, statistici) | M | R — PIPA, pagina Victoria Falls [research-notes/pipa.md §4] |
| La licitații viitoare, loturile ascunse până la start („All pigeons will be visible when bidding starts") | N | R — PIPA [research-notes/pipa.md §3] |
| Pagină de lot/porumbel: poze, nume, inel, sex, an, pedigree, palmares, video, documente, preț curent, istoric oferte, cronometru, buton BID | M | R (parțial) — structura de lot observată direct pe iPigeon (https://www.newipigeon.com/product/view/54009); pagina de lot PIPA neobservabilă (fără licitații active) — **gol documentat**, de închis în runda următoare prin arhivă/cache [sursă: research-notes/date-porumbei.md §1.1, §0] |
| Căutare + filtrare (sex, an, categorie distanță, crescător, preț, timp rămas) + sortare | M | R (Amazing-Wings are „Erweiterte Suche"; brief §6.1 o cere explicit) + P pentru criteriile concrete [research-notes/pigeonboss.md §7] |
| Pagini de crescător (profil public: bio, palmares, porumbei listați, rating) | M | R — PIPA are secțiunea Fanciers pe portal; PigeonBoss monetizează „Famous Fanciers" (€195/an) [research-notes/pipa.md §2; pigeonboss.md §6] |
| Selector fus orar (ora închiderii afișată în fusul utilizatorului) | N | R — PIPA header: „Time zone: Login to change your time zone" [research-notes/pipa.md §1] |
| Comutator limbă RO/EN persistent | M | R — PIPA 10 limbi cu prefix URL /en /ro (hreflang: en, zh-hans, ja, nl, fr, de, es, pl, ar, ro); constrângere fixă brief §5 |
| Secțiune editorială (știri, articole despre licitații) | N | R — modelul PigeonBoss: conținutul editorial alimentează licitațiile [research-notes/pigeonboss.md §1, §3] |
| FAQ structurat pe categorii (la PIPA: 7 categorii cu link în footer — Registration & approval, Bidding, Alerts & communication, My Auctions, Payment, Transport, Aftersales — și 10 categorii în total pe pagina FAQ) | M | R — taxonomia FAQ PIPA [research-notes/pipa.md §6.10; curl homepage 2026-08-09 — 7 linkuri pill_id în footer] |

### 2.2. Cont & licitare
| Funcție | Prior. | Sursă |
|---|---|---|
| Vizualizare licitații FĂRĂ cont; licitare DOAR cu cont aprobat | M | R — PIPA FAQ [research-notes/pipa.md §6.1] |
| Înregistrare + verificare cont (e-mail; telefon validat prin cod SMS) | M | R — PIPA validează telefonul prin SMS [research-notes/pipa.md §6.5] |
| Aprobare vânzători cu verificare manuală (KYC); opțional buget de licitare / depozit pentru cumpărători din zone fără istoric | M (aprobarea) / N (bugetul) | R — PIPA: telefon de verificare + buget de licitare atribuit + depozit pentru țări noi [research-notes/pipa.md §6.1] |
| Nickname public de licitare („bidding name"), cu moderare admin | N | R — PIPA [research-notes/pipa.md §6.1] |
| Plasare ofertă cu dublu pas de confirmare („Place your bid" → „Confirm your bid") | M | R — PIPA [research-notes/pipa.md §6.2] |
| **Proxy-bidding** („buying order"): sumă maximă secretă, supralicitare automată, prioritate b.o. > bid egal, primul-venit câștigă la b.o. egale, modificabil („Change b.o.") | M | R — PIPA FAQ Bidding [research-notes/pipa.md §6.3]; constrângere fixă brief §5 |
| **Anti-sniping**: ofertă în ultimele 5 min → prelungire 5 min, **per lot** (nu per licitație) | M | R — PIPA FAQ, cu exemplu oficial 16:57→17:05 [research-notes/pipa.md §6.4] |
| Istoric oferte pe lot (listă publică cu nickname + sumă + timestamp) | M | P — practică standard de licitație; de re-verificat pe pagina de lot PIPA în runda 2 |
| My bids (ofertele mele active), My favourites (watchlist cu clopoțel/alertă), My purchases (istoric + download poză/pedigree/certificat ADN) | M | R — PIPA [research-notes/pipa.md §6.6] |
| Adrese multiple de facturare/livrare, alese la plasarea ofertei (afectează TVA afișat) | N | R — PIPA [research-notes/pipa.md §6.2, §6.6] |
| Rating vânzători | M | P + constrângere fixă brief §5 (la PIPA ratingul nu apare în FAQ/harta site-ului — deducem că încrederea vine din curatoriere; paginile de cont nu au fost văzute din interior, deci absența e deducție, nu verificare — vezi nota din feature-matrix §4; la noi marketplace-ul deschis o cere) |
| Message center (centru de mesaje in-app) | N | R — PIPA /en/message-center [research-notes/pipa.md §2] |

### 2.3. Vânzător
| Funcție | Prior. | Sursă |
|---|---|---|
| Flux de listare porumbel: formular cu câmpurile din §4 + upload media + pedigree | M | P — PIPA nu are self-listing public (vânzările sunt curate de PIPA, „Request a non-binding estimation… Contact sales"); modelul self-service e propunerea noastră de diferențiere [research-notes/pipa.md §2] |
| Moderare/aprobare listări de către admin înainte de publicare | M | P — derivat din poziționarea pe calitate a PIPA („selection procedure and quality control") și PigeonBoss („strict selection and reliability") [research-notes/pipa.md §5; pigeonboss.md §3] |
| Dashboard vânzător: licitații active, oferte primite, sume, statusuri | M | P |
| Listare la preț fix („Buy Now") pe lângă licitație | O | R — Amazing-Wings are secțiune „Fixed Price Pigeons" / „Jetzt kaufen" [research-notes/pigeonboss.md §7] |
| Promovare plătită (featured listing) și pagini de crescător premium | O | R — modelul de venit PigeonBoss (Single Boost €49,95 / Power Pack €99,95 / VIP Spotlight €195,95; pagină dedicată €195/an) [research-notes/pigeonboss.md §5] |

### 2.4. Notificări
| Funcție | Prior. | Sursă |
|---|---|---|
| Outbid: e-mail + in-app (SMS opțional, opt-in) | M (email/in-app) / N (SMS) | R — PIPA trimite outbid pe email și/sau SMS opt-in, cu disclaimer „livrarea nu e garantată" [research-notes/pipa.md §6.5] |
| Alertă de start licitație (clopoțel pe licitațiile planificate) | N | R — PIPA [research-notes/pipa.md §6.5] |
| Licitație aproape de închidere (watchlist) | M | P — extensie firească a watchlist-ului; brief §6.1 o cere |
| Notificare de câștig (+ pași următori: plată, livrare) — declanșatorul animației „stol" | M | P + brief §6.4 |
| Push notifications (web push) | O | brief §7 „opțional push" |

### 2.5. Admin
| Funcție | Prior. | Sursă |
|---|---|---|
| Aprobare conturi, aprobare bidding names, aprobare adrese | M | R — la PIPA adminii validează adresele și numele [research-notes/pipa.md §6.1–6.2] |
| Creare/programare licitații, gestionare loturi, moderare conținut | M | P (necesar operațional evident) |
| Gestionare neplată: anulare vânzare + relicitare + blocare cont | M | R — PIPA: neplata la platform auctions în 3 zile → relicitare automată + blocarea contului [research-notes/pipa.md §6.7] |
| Rapoarte DAC7 pentru ANAF (export anual vânzători) | M | C — obligație legală OG 16/2023 [research-notes/business-legal.md §3.2, surse KPMG/startupcafe/avocatnet] |

---

## 3. Fluxuri cheie (pas cu pas)

### 3.1. Onboarding cumpărător
1. Înregistrare cu e-mail + parolă (sau OAuth — propunere proprie); un singur profil per persoană [sursă regulă: PIPA FAQ, research-notes/pipa.md §6.1].
2. Confirmare e-mail; completare profil; validare telefon prin cod SMS [sursă: PIPA, §6.5].
3. Vizualizarea licitațiilor e liberă; la prima încercare de licitare se cere finalizarea verificării [sursă: PIPA, §6.1].
4. (Opțional, config admin) Pentru sume mari sau țări fără istoric: pre-autorizare card / depozit înainte de deblocarea licitării [sursă model: PIPA cere depozit pentru țări noi, §6.1; implementarea prin pre-autorizare Stripe = propunere proprie, research-notes/business-legal.md §2.3].

### 3.2. Licitare (bid manual)
1. Utilizatorul apasă „Plasează ofertă" pe lot; introduce suma (≥ prețul de pornire; PIPA pornește standard la 200 EUR — la noi pragul e configurabil per lot, propunere proprie) [sursă: PIPA §6.2].
2. Selectează/confirmă adresa de facturare + livrare (dacă e activată funcția de adrese multiple) → sistemul afișează TVA/taxele estimate [sursă: PIPA §6.2].
3. Pas dublu: „Plasează oferta" → ecran de confirmare → „Confirmă oferta" [sursă: PIPA §6.2].
4. Serverul validează atomic (sumă > preț curent + increment; licitația deschisă; cont aprobat) și difuzează noul preț prin WebSocket tuturor privitorilor [propunere proprie, detalii §7].
5. Ofertantul precedent primește notificare outbid (in-app + email; SMS opt-in) [sursă: PIPA §6.5].

### 3.3. Proxy-bid (ofertă maximă automată)
1. Utilizatorul setează „oferta maximă" (echivalent „buying order" PIPA) — invizibilă pentru ceilalți [sursă: PIPA §6.3].
2. Când altcineva licitează sub maximul lui, sistemul supralicitează automat cu incrementul minim.
3. Reguli de precedență (modelul PIPA, preluat integral): (a) proxy-bid bate bid manual de valoare egală; (b) la două proxy-biduri egale câștigă cel plasat primul; (c) proxy-bidul poate fi modificat/șters din pagina lotului [sursă: PIPA §6.3].
4. Comunicare către utilizator (propunere proprie): explicație inline la setare + badge „Ofertă maximă activă" + notificare când maximul e depășit.

### 3.4. Închidere, anti-sniping și câștig
1. Fiecare lot are ora lui de închidere; cronometrul e sincronizat cu ora serverului [propunere proprie, research-notes/design-tehnic.md A.2].
2. Orice ofertă în ultimele 5 minute prelungește închiderea **acelui lot** cu 5 minute (repetabil) — celelalte loturi rămân pe ora inițială [sursă: PIPA §6.4].
3. La expirare fără oferte noi: lotul se închide; câștigător = cea mai mare ofertă validă.
4. Câștigătorul primește evenimentul `auction:won` → **animația „stol de porumbei"** (§6.2) + e-mail cu pașii următori; ceilalți privitori văd banner „Adjudecat" + prețul final [propunere proprie + brief §6.4].
5. Vânzătorul e notificat; se generează comanda și factura (§5).
6. Variantă fază ulterioară — licitație hibridă (sală+online) cu countdown 30s resetat de fiecare bid, după modelul PIPA Tom Van Gaver [sursă: PIPA §6.4; marcată O în feature-matrix].

### 3.5. Listare de către vânzător
1. Cont vânzător aprobat (KYC procesator de plăți + date DAC7: nume, adresă, CNP/CUI, IBAN) [sursă obligație: OG 16/2023, research-notes/business-legal.md §3.2].
2. Formular de listare: câmpurile porumbelului (§4.1), pedigree (upload PDF/imagine + opțional arbore structurat), palmares (rânduri structurate), media (min. 3 poze recomandat; iPigeon afișa 6 poze + video + pedigree PDF) [sursă: iPigeon, research-notes/date-porumbei.md §4.1].
3. Alegere: licitație (preț pornire, durată — PIPA rulează licitațiile ~2 săptămâni) sau preț fix (fază ulterioară) [sursă durată: PIPA §6.2; preț fix: Amazing-Wings].
4. Moderare admin (verificare inel, pedigree, poze) → publicare programată [propunere proprie].
5. Pe durata licitației: dashboard cu oferte în timp real; vânzătorul NU poate licita la propriul lot (regulă antifraudă — propunere proprie, standard de piață).

### 3.6. Plată și livrare
1. La adjudecare se emite factura/borderoul către cumpărător; model de referință PIPA: factura luni după închidere, **termen 7 zile calendaristice**, livrare doar după încasarea integrală [sursă: PIPA §6.7 + T&C via WebSearch, research-notes/business-legal.md §2.2].
2. Plata online: card prin procesator marketplace (Stripe Connect — comisionul platformei reținut la split prin `application_fee_amount`; alternativ wallet Mangopay/Lemonway pentru escrow real) sau transfer bancar (fallback tip PIPA) [surse: https://docs.stripe.com/connect/charges; research-notes/business-legal.md §2.2].
3. Fondurile către vânzător se eliberează după confirmarea livrării sau după X zile fără dispută [propunere proprie aliniată practicii marketplace, research-notes/business-legal.md §2.4].
4. Livrare: opțiuni per țară — curier specializat / ridicare personală / terț împuternicit (modelul PIPA cu ~60 de țări, inclusiv România) [sursă: PIPA §6.9]. Detalii legale la §5.4.
5. Neplată: anulare vânzare, relicitare, penalizare/blocare cont [sursă model: PIPA §6.7].

### 3.7. Aftersales (garanții) — modelul PIPA, propus spre preluare adaptată
- Porumbel infertil: raportare în max. 2 luni de la primire; bolnav la sosire: 24h; mort la sosire: poze + retur inel/documente în 24h [sursă: PIPA FAQ Aftersales, research-notes/pipa.md §6.9].
- Garanție de sex prin test ADN la pui vânduți de crescătorul care i-a produs [sursă: PIPA §6.9].
- Politica exactă No.1 & Best Pigeons: decizie client → open-questions.md.

---

## 4. Model de date porumbel

### 4.1. Câmpuri de identificare (sinteză din observații directe)
| Câmp | RO | EN | Obligatoriu | Sursă |
|---|---|---|---|---|
| Inel | Serie inel | Ring number | DA, unic | iPigeon: format `Belg.4184867-2019` = țară+serie+an [date-porumbei.md §1.1]; RO: inele emise anual de federație (FCPR/FRSC), format „RO + an + număr" [sursă: https://www.porumbei.ro/federatii-si-inele/ via WebSearch 2026-08-09 — formatul exact RO de confirmat cu federația → open-questions] |
| An naștere | An | Year | DA | derivabil din inel, stocat separat [propunere proprie] |
| Sex | Mascul/Femelă/Nesexat | Cock/Hen/Unsexed | DA | iPigeon afișează „Hen"; PIPA sexează puii prin ADN [date-porumbei.md §1.1–1.2] |
| Culoare penaj | Culoare | Colour | DA | vocabular controlat bilingv [propunere proprie; listă de valori → open-questions] |
| Linie/origine | Linie (strain) | Strain/bloodline | recomandat | marketingul pe linii de sânge e central (PigeonBoss: Kittel, White Man, Olympic 003) [pigeonboss.md §3] |
| Crescător | Crescător | Breeder | DA | iPigeon distinge breeder de seller [date-porumbei.md §1.1] |
| Vânzător | Vânzător | Seller | DA (relație cont) | idem |
| Nume | Nume porumbel | Pigeon name | opțional | iPigeon („Porsche 911"), Amazing-Wings („New Olympic Lady") [date-porumbei.md §1.1; pigeonboss.md §7] |
| Culoare ochi | Ochi | Eye colour | opțional | folosit în standarde/expoziții [date-porumbei.md §1.3, propunere proprie] |
| Descriere | Descriere liberă | Description | opțional | text editorial bogat = practica PIPA și iPigeon [pipa.md §4] |

### 4.2. Pedigree
- **Afișare:** arbore pe **4–5 generații**, tată sus / mamă jos, fiecare căsuță cu inel, nume, culoare, rezultate-cheie [sursă: convenție de domeniu în curs de confirmare cu sursă suplimentară — marcat parțial nesusținut în date-porumbei.md §2.3; de închis în runda 2].
- **Minim MVP:** documentul de pedigree ca PDF/imagine atașat lotului (observat direct pe iPigeon) + părinți/bunici ca text structurat [sursă: date-porumbei.md §2.1].
- **Garanție:** „pedigree-ul afișat în licitație este pedigree-ul livrat" — regulă PIPA de preluat în T&C [sursă: PIPA via WebSearch, date-porumbei.md §2.2].
- **Fază 2 (propunere proprie):** pedigree interactiv generat din entități „porumbel" legate relațional (permite navigare în arbore și reutilizarea strămoșilor între loturi).

### 4.3. Rezultate / palmares
Model de rând de rezultat (propunere proprie, derivată din Regulamentul Național Columbofil — https://www.columba.ro/regulamentul-national-columbofil/, observație directă):
`{concurs/etapă, dată, distanță km, loc obținut, nr. porumbei angajați, coeficient = loc×1000/nr. porumbei, categorie, nivel clasament (club/județean/zonal/național/internațional)}`
- Categorii RO (FCPR): Viteză 100–400 km, Demifond 300–600 km, Fond >500 km, Maraton >700 km, Extrem >900 km, General, As [sursă: columba.ro, date-porumbei.md §3.1bis].
- Categorii internaționale FCI: A–J olimpice; „World Best Pigeon": Speed, Middle distance, Long distance, All-round, Marathon, Super Marathon [sursă: pigeonsfci.net + dutchpigeons.nl via WebSearch, date-porumbei.md §3.2].
- Afișare pe lot: listă de mențiuni-cheie (ex. „1st National Ace") + tabel complet expandabil [sursă model: iPigeon, date-porumbei.md §3.1; structura tabelară = propunere proprie].

### 4.4. Media & documente
- Poze: minim 2 (profil întreg + aripă desfăcută — propunere proprie), recomandat 6+ (observat pe iPigeon); poze high-res ca substitut al inspecției fizice (practica PIPA PPQC) [surse: date-porumbei.md §4.1; pipa.md §6.9].
- Video opțional [sursă: iPigeon are secțiune video].
- Documente: pedigree PDF, certificat ADN (sexare/filiație — PigeonBoss promovează „delivered with DNA certification"; PIPA oferă download certificat ADN la My purchases), certificat sanitar-veterinar la livrare [surse: pigeonboss.md §3; pipa.md §6.6; cert. veterinar → §5.4].

### 4.5. Glosar bilingv RO/EN (nucleu — de extins în runda 2)
| RO | EN | Notă / sursă |
|---|---|---|
| porumbel voiajor | racing pigeon / homing pigeon | [columba.ro; uz general de domeniu] |
| columbofil / crescător | pigeon fancier / breeder | PIPA folosește „fanciers" [pipa.md §2] |
| serie inel | ring number / band number | iPigeon: „band" (US), PIPA: „ring" (EU) [date-porumbei.md §1.1] |
| mascul / femelă | cock / hen | [iPigeon] |
| pui (tineret) | young bird / youngster | PIPA: „young birds" [pipa.md §6.9] |
| viteză | speed / sprint (100–400 km) | [columba.ro + FCI] |
| demifond | middle distance (300–600 km) | [columba.ro + FCI] |
| fond | long distance (>500 km) | [columba.ro + FCI] |
| mare fond / maraton | marathon (>700 km) | [columba.ro + FCI] |
| as (porumbel as) | ace pigeon | PIPA: „Ace Pigeons" [pipa.md §4] |
| olimpic | Olympiad pigeon (FCI cat. A–J) | [dutchpigeons.nl via WebSearch] |
| ofertă maximă automată | buying order / proxy bid / max bid | terminologia PIPA: „buying order (b.o.)" [pipa.md §6.3] |
| licitație pe crescătorie completă | total auction | [pigeonboss.md §3] |
| cursă cu crescătorie comună | one loft race (OLR) | [pipa.md §4; pigeonboss.md §2] |
| adjudecat | knocked down / sold | PIPA: „knock down" la licitații hibride [pipa.md §6.4] |
| coeficient | coefficient (place×1000/birds) | [columba.ro] |
| matcă / crescătorie | loft / breeding loft | [uz de domeniu; de verificat nuanțe în runda 2] |
| ornament (porumbel de ornament) | fancy pigeon | platforma vinde voiajori; ornament = categorie separată, decizie de scope → open-questions [propunere proprie] |

---

## 5. Business & legal

### 5.1. Model de venit
- **Piața:** comisioanele observate variază 7%–25% pe seller's commission, corelate cu nivelul de serviciu: PigeonAuctions 30 USD/lot doar la vânzare; Elimar 17–22%; Pigeon Partners 7–10,5%; BestPigeons 25% all-inclusive (**atenție: brand activ și pe piața RO ca bestpigeons.ro — concurent direct, vezi §1 și research-notes/concurenta-ro.md**); PIPA — comision de intermediere third-party (procent nepublicat); la licitațiile hibride PIPA există **buyer's premium 20%** [surse: tabelul din research-notes/business-legal.md §1.1, toate via WebSearch, + pipa.md §6.8].
- PIPA percepe suplimentar o **taxă administrativă de 80 EUR/porumbel** plătită de cumpărător [sursă: PIPA FAQ Payment, pipa.md §6.7].
- **Recomandare (propunere proprie):** comision vânzător 10–15%, trepte self-service/assisted; fără buyer's premium la lansare; fază 2: featured listings + abonament „Pro breeder" (model validat de PigeonBoss cu pachetele €49,95–€195,95 și pagina de crescător €195/an) [business-legal.md §1.2; pigeonboss.md §5].

### 5.2. Plăți
- **Marketplace payments:** Stripe Connect (disponibil RO; KYC vânzători preluat de Stripe; holding max ~90 zile — nu e escrow real) vs. Mangopay/Lemonway (wallet = escrow natural, potrivit pentru animale vii) vs. Adyen (overkill MVP) [surse: docs.stripe.com/connect; business-legal.md §2.2 cu URL-uri].
- **Fallback tip PIPA:** factură + transfer bancar 7 zile + livrare după încasare; card cu +3% service fee; toate prețurile în EUR pentru a evita pierderile valutare [sursă: PIPA FAQ Payment, pipa.md §6.7]. Moneda platformei noastre (EUR vs RON vs dual) → open-questions.
- **Garanții de licitare:** PIPA condiționează licitarea de garanție/depozit și buget aprobat; implementarea noastră propusă: pre-autorizare card peste un prag (ex. 500 EUR) sau depozit în wallet [surse: PIPA T&C via WebSearch + propunere proprie, business-legal.md §2.3].
- **Payout:** după confirmarea livrării sau X zile fără dispută; comisionul reținut automat la split [propunere proprie, business-legal.md §2.4].

### 5.3. Fiscal & facturare
- Platforma NU devine proprietarul porumbeilor (model PIPA „Third-Party Sale"); facturează serviciul de intermediere [sursă: PIPA T&C via WebSearch, business-legal.md §3.1].
- TVA comision: B2B intra-UE taxare inversă; B2C — regim servicii electronice, prag OSS 10.000 EUR/an (declarare centralizată RO) [surse: contabilitatedigitala.ro, contapp.ro, static.anaf.ro — business-legal.md §3.1].
- Vânzător persoană fizică neplătitoare TVA → tranzacție fără TVA; firmă → factură proprie; platforma suportă ambele fluxuri [sinteză proprie; validare contabil → open-questions].
- **DAC7 / OG 16/2023 — obligație directă:** raportare anuală la ANAF (până la 31 ianuarie) a vânzătorilor: identitate, CNP/CUI, IBAN, sume, comisioane; praguri de excludere ~<30 tranzacții și <2.000 EUR/an (de verificat exact); onboarding-ul vânzătorului colectează datele DAC7 de la început [surse: kpmg.com/ro, startupcafe.ro, avocatnet.ro, portalpfa.ro — business-legal.md §3.2].
- e-Factura RO obligatorie pentru facturile platformei ca firmă românească (2024+); sfera exactă B2C de confirmat [business-legal.md §3.3; → open-questions].

### 5.4. GDPR, T&C, transport, antifraudă
- **GDPR** (platforma procesează conturi, CNP-uri DAC7, telefoane, adrese): temei legal per scop, minimizare, drepturi persoanei vizate (acces/ștergere/portabilitate), DPA cu procesatorii (Stripe, e-mail, SMS), politică de retenție, cookie consent. PIPA publică Privacy policy + General terms + Disclaimer în footer — același set minim pentru noi [sursă structură: pipa.md §5; detaliile GDPR = cercetare de completat cu surse în runda 2 — secțiunea 4 din business-legal.md e încă nescrisă, **gol documentat**].
- **T&C licitații:** oferta e angajament ferm de cumpărare (modelul PIPA: neplată → anulare + relicitare + blocare cont); dreptul de retragere de 14 zile la distanță are excepții pentru licitații publice conform OUG 34/2014 — **încadrarea exactă a licitațiilor online necesită aviz juridic → open-questions** [surse: PIPA §6.7; OUG 34/2014 = referință legislativă generală de verificat cu avocat].
- **Transport porumbei vii:** modelul operațional PIPA: livrare per țară (carrier specializat / pick-up / terț), transport facturat separat, timpi 1–6 luni la platform auctions internaționale [sursă: PIPA §6.8–6.9]. Cadru legal UE: Regulamentul (CE) nr. 1/2005 privind protecția animalelor în timpul transportului + TRACES pentru mișcări transfrontaliere intra-UE [surse: https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=celex%3A32005R0001; https://www.europarl.europa.eu/doceo/document/A-8-2019-0057_EN.html — via WebSearch 2026-08-09; aplicabilitatea exactă la porumbei de sport (necomercial vs comercial) de clarificat cu DSVSA → open-questions].
- **Antifraudă:** KYC manual la vânzători (model PIPA: telefon + aprobare 48h) [pipa.md §6.1]; interdicția self-bidding / shill bidding, un profil per persoană [PIPA §6.1], detecție pattern-uri (același IP/dispozitiv pe vânzător+ofertant — propunere proprie), garanții/pre-autorizări la sume mari (§5.2), protecție cumpărător prin escrow + garanții aftersales (§3.7), retragerea ofertei interzisă după confirmare (dublul pas de confirmare PIPA reduce erorile) [PIPA §6.2].

---

## 6. Design & estetică

### 6.1. Design system (rezumat; detaliu în research-notes/design-tehnic.md secțiunea A)
- **Paleta = paleta logo-ului** (brief §2, element obligatoriu), rafinată cu tokens: `--ink #1B1B1B`, `--ivory #F3EEE1`, `--ivory-2 #EAE3D2`, `--blue #2E6E9E`, `--gold #F2B417`, `--orange #E8720C`, `--red #C0341D` + `--green-ok #3E7C4F` adăugat funcțional pentru stări de succes (logo-ul nu conține verde) [sursă: logo.jpeg + brief §2; tokens = propunere proprie, design-tehnic.md A.1].
- Contrast WCAG: ink/ivory >14:1 OK; galbenul NU se folosește ca text pe ivory (sub 4.5:1) — doar fundal de badge cu text ink [sursă: prag WCAG AA — w3.org/WAI/WCAG21/Understanding/contrast-minimum; calcul propriu].
- **Tipografie:** Fraunces (display, serif cald, ecou al lettering-ului logo) + Inter (UI) cu `tabular-nums` pe cronometru/prețuri; ambele acoperă diacriticele RO [propunere proprie, design-tehnic.md A.2].
- **Componente cheie:** card de licitație (foto 4:3, badge-uri, preț, cronometru, BID; stări default/hover/ending-soon/closed), cronometru (formate pe praguri; roșu+puls sub 60s; sincronizat cu ora serverului), buton BID (roșu brand, 48px touch target, stări complete incl. „Ești cel mai mare ofertant") [propunere proprie, design-tehnic.md A.2; tiparul card foto+preț+timer observabil la referințe].

### 6.2. Animația-semnătură „stol de porumbei la câștig" (element obligatoriu, brief §6.4)
- **Trigger:** eveniment WebSocket `auction:won` la câștigător; privitorii văd varianta redusă (banner „Adjudecat").
- **Scenă:** 9–15 siluete SVG derivate din logo (aripa în degradeul brandului) decolează din zona prețului final în arc spre dreapta-sus, stagger 60–90ms, 4–6 pene cad lent; overlay ivory 40%; durată 2,5–3s, o singură rulare, `pointer-events: none`.
- **Mobil:** max 7 păsări, fără blur/umbre, doar transform/opacity (GPU).
- **`prefers-reduced-motion`:** fără zbor — ilustrație statică + același mesaj text (WCAG 2.3.3) [sursă: w3.org/WAI/WCAG21/Understanding/animation-from-interactions].
- **Implementare:** Lottie (JSON ~100–200KB) sau SVG + Framer Motion; mesajul „Felicitări!" ca HTML real (traductibil RO/EN).
[sursă întreg blocul: design-tehnic.md A.3.1 — propunere proprie conform cerinței obligatorii din brief]

### 6.3. Micro-interacțiuni & loading (inventar complet în design-tehnic.md A.3.2–A.3.4)
12 micro-interacțiuni definite, fiecare cu fallback reduced-motion: hover card, count-up preț live + flash gold, intrare rând ofertă, puls cronometru, „outbid" shake, pene-confetti, BID success morph, watchlist pop, flash anti-sniping + toast „+X min", tab-uri underline, galerie crossfade, toast-uri. Loader de brand: silueta logo cu aripa care se umple cu degradeul. Reguli globale: 150–400ms, ease-out-quint, doar transform/opacity, hook global `useReducedMotion` + setare manuală din profil [surse: motion.dev/docs/react-use-reduced-motion; developer.mozilla.org prefers-reduced-motion; restul propunere proprie].

---

## 7. Arhitectură tehnică

> Notă de stadiu: secțiunea B din design-tehnic.md este în lucru; cele de mai jos sunt recomandările Rundei 1, marcate integral ca **propunere proprie** fundamentată pe constrângerile din brief §5 și §7 și pe observațiile de platformă (PIPA folosește Drupal + Vue pentru componentele dinamice — dovadă că stratul real-time separat de CMS e un tipar validat [sursă: pipa.md §0]).

- **Front-end:** Next.js (React) — SSR/SSG pentru SEO bilingv, rutare i18n nativă (`/ro/...`, `/en/...`, tiparul de prefix folosit chiar de PIPA), App Router + React Server Components pentru cataloage rapide.
- **Back-end:** Node.js (NestJS sau API routes + servicii dedicate) — un singur limbaj pe stack, ecosistem WebSocket matur.
- **Real-time:** WebSockets (Socket.IO sau ws) cu canale per licitație/lot; evenimente: `bid:new`, `price:update`, `timer:extend`, `auction:won`, `outbid`.
- **Integritatea licitării (anti race-condition):** toate ofertele trec printr-o tranzacție serializată per lot (row-level lock `SELECT … FOR UPDATE` în PostgreSQL sau coadă unică per lot); validare server-side sumă/increment/stare; timestamp-ul serverului e autoritatea unică; extinderea anti-sniping se decide atomic în aceeași tranzacție cu inserarea ofertei.
- **Bază de date:** PostgreSQL (relațional: porumbei, pedigree ca relații părinte-copil, oferte, utilizatori, facturi) + Redis (cache, pub/sub pentru fan-out WebSocket, rate limiting).
- **Cronometre:** clientul afișează countdown calculat din offset-ul față de ora serverului (sincronizat la conectare); închiderea efectivă o face DOAR serverul (job scheduler + verificare la fiecare bid).
- **Autentificare & roluri:** sesiuni/JWT + roluri cumpărător/vânzător/admin-moderator; verificare e-mail; validare telefon prin SMS (Twilio/Vonage) după modelul PIPA [sursă model: pipa.md §6.5]; 2FA opțional.
- **Plăți:** Stripe Connect destination charges + `application_fee_amount` (comisionul platformei), pre-autorizări pentru garanții; alternativă escrow: Mangopay/Lemonway [surse: docs.stripe.com/connect/charges; business-legal.md §2].
- **Notificări:** in-app (WebSocket + inbox persistent), e-mail tranzacțional (Resend/Postmark/SES), SMS opt-in, web push opțional [prioritizare conform brief §7].
- **i18n:** next-intl/next-i18next; conținut UGC (descrieri loturi) în limba vânzătorului cu câmpuri duale opționale RO/EN; formate dată/monedă per locale; hreflang + sitemap bilingv pentru SEO.
- **Scalare & securitate:** CDN pe media (poze high-res), rate limiting pe bid endpoints, audit log complet al ofertelor (probă în dispute), backup PITR pe PostgreSQL, moderare conținut prin coadă de aprobare admin (§2.5).
- **Fus orar:** afișare în fusul utilizatorului (funcție validată de PIPA) [sursă: pipa.md §1].

---

## 8. Roadmap sugerat (propunere proprie)

**MVP (faza 1):**
Catalog public + pagini licitație/lot complete (§4), conturi cu verificare e-mail/SMS, licitare live cu WebSocket, proxy-bidding, anti-sniping 5 min/lot, my bids/watchlist/purchases, listare vânzător cu moderare admin, notificări e-mail+in-app (outbid, câștig), plăți Stripe Connect + fallback transfer bancar, comision vânzător, facturare de bază + colectare date DAC7, bilingv RO/EN complet, design system + animația „stol la câștig" + micro-interacțiunile de bază (1, 2, 4, 5, 7 din inventar), rating vânzători simplu (post-tranzacție), FAQ + pagini legale (T&C, Privacy, GDPR).

**Faza 2:**
SMS opt-in outbid, alerte de start licitație (clopoțel), adrese multiple + TVA dinamic la bid, selector fus orar, pagini crescător îmbogățite + featured listings (monetizare tip PigeonBoss), pedigree interactiv structurat, secțiune editorială/știri, depozite/pre-autorizări configurabile, dashboard vânzător avansat, dark mode.

**Faza 3+:**
Preț fix „Buy Now" (model Amazing-Wings), licitații hibride sală+online (model PIPA 30s), abonament „Pro breeder", aplicație mobilă / push, extindere limbi (modelul PIPA cu 10 limbi arată direcția), integrare e-Factura automatizată completă, one-loft-race partnerships (myloft.ro există deja în RO — potențial partener [sursă: pigeonboss.md §4]).

---

## 9. Riscuri & întrebări deschise

**Riscuri principale:**
1. **Golul de observație PIPA la nivel de lot:** fără licitații active, pagina de lot individual + filtrele/sortarea + arhiva „closed" nu au fost văzute direct; cerințele aferente se sprijină pe FAQ + iPigeon. Mitigare: runda 2 — arhivă web/cache + revizită când apare o licitație activă. [gol documentat, pipa.md §7–8]
2. **Încadrare juridică:** dreptul de retragere OUG 34/2014 la licitații online, modelul de facturare (în numele cui se emite factura de adjudecare), aplicabilitatea Reg. 1/2005 la porumbei de sport — toate necesită aviz juridic/contabil, nu research. [→ open-questions.md]
3. **Escrow real vs Stripe:** holding-ul Stripe max ~90 zile poate fi insuficient pentru livrări internaționale de 1–6 luni (observate la PIPA platform auctions) — alegerea procesatorului depinde de politica de livrare. [pipa.md §6.8; business-legal.md §2.2]
4. **Lichiditate de marketplace la lansare** (puțini vânzători → puțini cumpărători), **agravată de concurența locală existentă**: vânzătorii RO au deja alternative funcționale (BestPigeons.ro, piatadeporumbei.ro, goldpigeon.ro — vezi §1 și research-notes/concurenta-ro.md), deci onboarding-ul primilor crescători trebuie să ofere avantaje concrete (comision promoțional, listare asistată, vizibilitate internațională EN). Mitigare suplimentară: curatoriere inițială și parteneriate cu crescători RO cunoscuți (există precedent: Alexandru Huzu listat pe PigeonBoss) [concurenta-ro.md §4; pigeonboss.md §6; strategie = propunere proprie].
5. **Bunăstarea animală ca risc reputațional:** garanțiile aftersales și criteriile de sănătate (modelul PIPA) trebuie definite de la început, nu adăugate ulterior. [pipa.md §6.9]

**Întrebările care cer decizia clientului sunt centralizate în `open-questions.md`** (comision exact, monedă, politică aftersales, scope ornament vs voiajori, KYC manual vs automat, buget SMS, procesator de plăți, entitate juridică/TVA).
