# Research — Business & Legal (secțiunea 6.3 din brief)
# Platformă licitații porumbei „No.1 & Best Pigeons"

> Status: ÎN LUCRU — notele se scriu incremental, pe măsură ce sursele sunt verificate.
> Data research: 2026-08-08. Autor: Research Agent (dimensiunea business & legal).
> Regulă de trasabilitate: fiecare afirmație are sursă (URL) sau marcaj „propunere proprie".

## Cuprins
1. Modele de venit în domeniu
2. Plăți și procesatoare fezabile RO/UE
3. TVA și facturare
4. GDPR
5. Termeni & Condiții pentru licitații (caracterul obligatoriu al ofertei) + dispute
6. Livrare / transport porumbei vii (bunăstare animală, transfrontalier)
7. Antifraudă (verificare vânzător, protecție cumpărător, oferte false)
8. Surse consultate / URL-uri inaccesibile

---

## 1. Modele de venit în domeniu

### 1.1. Observații de pe piață (site-uri de licitații porumbei)

| Platformă | Model de venit | Detaliu | Sursă |
|---|---|---|---|
| PIPA (referință principală) | Comision de vânzare (third-party sales); PIPA nu devine proprietarul porumbeilor, vânzătorul terț rămâne vânzător | Procentul exact al comisionului NU este public în rezultatele accesibile; T&C confirmă modelul de „Third-Party Sale" cu platforma ca intermediar | https://auctions.pipa.be/en/general-terms-conditions-sale (conținut obținut via WebSearch; fetch direct blocat 403 — vezi §8) |
| PigeonAuctions.com | Taxă de inserare 30 USD/lot, percepută DOAR dacă lotul se vinde, dedusă din suma cuvenită vânzătorului | model „success fee" fix | https://pigeonauctions.com/program/user.cfm (via WebSearch) |
| Elimar Pigeon Services (UK) | Comision 17% din prețul de adjudecare dacă vânzătorul introduce singur datele; 22% dacă Elimar le introduce | comision variabil după nivelul de serviciu | https://www.elimarpigeons.com/auctions/section/site-fees/18 (via WebSearch) |
| Pigeon Partners Auctions | „Auction Service Fee" 7%–10,5% din prețul de adjudecare, în funcție de nivelul de serviciu ales de vânzător | comision pe trepte de serviciu | https://pigeonpartners.com/terms-conditions/ (via WebSearch) |
| BestPigeons.com | Comision 25% (vânzări „all inclusive" — platforma face tot: foto, pedigree, logistică) | comision mare = serviciu complet | https://bestpigeons.com/all-inclusive-sales (via WebSearch) |

**Concluzie de piață:** modelul dominant este **comisionul de vânzare suportat de vânzător (seller's commission), între ~7% și ~25%**, corelat cu nivelul de serviciu (self-service vs. full-service). Taxele fixe de listare sunt rare și, unde există, se percep doar la vânzare reușită. Buyer's premium este mai degrabă specific caselor de licitații clasice decât platformelor de porumbei. (Sinteză proprie pe baza surselor din tabel.)

### 1.2. Recomandare pentru No.1 & Best Pigeons (propunere proprie)
- **Venit principal:** comision vânzător 10–15% din prețul de adjudecare (competitiv față de Elimar 17–22% și BestPigeons 25%; peste pragul de sustenabilitate al Pigeon Partners 7%).
- **Trepte de serviciu:** self-service (comision minim) vs. „assisted listing" (platforma redactează anunțul, verifică pedigree-ul — comision mai mare) — tipar validat de Elimar și Pigeon Partners.
- **Opțional, fază 2:** promovare plătită a licitațiilor (featured listing pe homepage), abonament „Pro breeder" cu comision redus și pagini de crescător îmbogățite. (Propunere proprie; nu observat direct la referințe.)
- **De evitat la lansare:** buyer's premium — crește frecarea la cumpărare și nu e norma pieței de porumbei. (Propunere proprie.)

### 1.3. Notă despre PigeonBoss (site de referință #2)
PigeonBoss.com (operat de Jan de Wijs) este în prezent mai degrabă o platformă de conținut/comunitate + shop WooCommerce (are `/shop/`, `/checkout/`, `/my-account/`, pagini `privacy-policy` și `refund_returns`), NU o platformă de licitații cu structură de comisioane publică. Nu s-au găsit taxe/comisioane publicate. Sursă: https://pigeonboss.com/ (WebFetch reușit, 2026-08-08); căutarea „PigeonBoss auction terms" nu a returnat T&C de licitație.

---

## 2. Plăți și procesatoare fezabile RO/UE

### 2.1. Modelul de piață (marketplace cu vânzători terți)
Platforma este un **marketplace**: banii curg de la cumpărător către vânzător (crescător), iar platforma reține comisionul. Asta impune un procesator cu suport de „split payments"/conturi conectate și care preia obligațiile **KYC/AML** asupra vânzătorilor care primesc bani. (Sinteză pe baza surselor de mai jos.)

### 2.2. Opțiuni de procesatori (toate operează în RO/UE)
| Procesator | Model | Puncte forte pentru licitații | Sursă |
|---|---|---|---|
| **Stripe Connect** | Conturi conectate (Standard/Express/Custom); comisionul platformei prin `application_fee_amount`; „destination charges" recomandate pentru marketplace | Stripe preia obligațiile KYC asupra vânzătorilor; onboarding Express rapid; disponibil în România; reținerea fondurilor („holding funds") max ~90 zile — NU e escrow adevărat | https://docs.stripe.com/connect/charges ; https://docs.stripe.com/connect/marketplace ; https://www.sharetribe.com/academy/marketplace-payments/stripe-connect-overview/ |
| **Mangopay** | E-wallet: fondurile stau în portofele digitale până la distribuire → escrow natural | Potrivit când plata trebuie ținută până la confirmarea livrării (exact cazul animalelor vii); folosit de Vinted, Chrono24 | https://makerstack.co/reviews/mangopay-review/ ; https://www.ryftpay.com/blog/best-payment-gateway-for-marketplaces-2026 |
| **Lemonway** | Instituție de plată licențiată ACPR (FR), pasaport PSD2 în UE; wallet-uri per utilizator | Specializat marketplace/crowdfunding; €12B+ volum anual | https://euvetted.com/alternatives/stripe-connect ; https://www.ryftpay.com/blog/best-stripe-connect-alternatives-for-marketplaces-and-platforms-2026 |
| **Adyen for Platforms** | Split payments enterprise | Alternativă la scară mare; probabil overkill pentru MVP | https://www.ryftpay.com/blog/best-payment-gateway-for-marketplaces-2026 |
| **Transfer bancar clasic (modelul PIPA)** | Platforma facturează cumpărătorul; plata integrală în 7 zile calendaristice de la factură; porumbelul se expediază DOAR după încasarea integrală | Simplu, fără procesator de marketplace; PIPA funcționează așa (factură + plată înainte de livrare) | https://auctions.pipa.be/en/general-terms-conditions-sale (via WebSearch — fetch direct 403) |

### 2.3. Depozite / garanții pentru licitatori (observat la PIPA)
- PIPA condiționează dreptul de a licita de îndeplinirea cerințelor de **Garanție**: „atâta timp cât Garanția cerută nu a fost depusă, Consumatorul nu poate plasa oferte". Sursă: https://auctions.pipa.be/en/general-terms-conditions-sale (via WebSearch).
- FAQ PIPA: pentru cumpărători din țări cu istoric redus, PIPA poate cere un **depozit înainte de aprobarea contului**; suma exactă nu e publicată. Sursă: https://auctions.pipa.be/en/frequently-asked-questions (via WebSearch; fetch direct 403).
- **Propunere proprie pentru No.1 & Best Pigeons:** garanție implementată ca *pre-autorizare de card* (Stripe PaymentIntent cu capture manual) la depășirea unui prag de ofertă (ex. >500 EUR), sau depozit rambursabil în wallet (dacă se alege Mangopay/Lemonway). Praguri progresive pe baza istoricului contului.

### 2.4. Payout către vânzător (propunere proprie, aliniată la practica marketplace)
- Payout DOAR după confirmarea livrării/recepției porumbelului (sau după X zile fără dispută) — fezabil nativ cu Mangopay/Lemonway (wallet) sau cu Stripe „separate charges and transfers" + payout întârziat (max ~90 zile holding).
- Comisionul platformei se reține automat la split (Stripe `application_fee_amount` / echivalent wallet).
- Flux PIPA de referință: plata cumpărătorului în 7 zile de la factură; livrarea doar după încasare integrală (sursa §2.2, rândul PIPA).

## 3. TVA și facturare

### 3.1. Ce facturează platforma
- Platforma NU vinde porumbeii (model PIPA „Third-Party Sale": platforma nu devine niciodată proprietarul; vânzătorul terț rămâne vânzător — sursă: https://auctions.pipa.be/en/general-terms-conditions-sale, via WebSearch). Platforma facturează **serviciul de intermediere (comisionul)** către vânzător (și eventuale taxe de promovare).
- Comisionul este un serviciu; pentru B2B intra-UE se aplică regula generală a locului prestării (taxare inversă la beneficiar), pentru B2C se analizează regimul serviciilor prestate pe cale electronică + pragul de 10.000 EUR/an pentru OSS. Surse: https://www.contabilitatedigitala.ro/locul-prestarii-serviciilor-tva/ ; https://contapp.ro/blog/plata-tva-pentru-vanzari-online/ ; https://static.anaf.ro/static/10/Brasov/Brasov/tratament_TVA_electronice.pdf
- **OSS (One Stop Shop):** dacă platforma percepe comisioane/servicii electronice de la consumatori din alte state UE peste pragul de 10.000 EUR/an, TVA-ul se declară centralizat în RO prin formularul 398 (regim OSS). Sursă: https://contapp.ro/blog/plata-tva-pentru-vanzari-online/
- Vânzarea porumbelului în sine: dacă vânzătorul e persoană fizică neplătitoare de TVA (cazul tipic al crescătorilor), tranzacția nu poartă TVA; dacă vânzătorul e firmă plătitoare, el își emite propria factură. Platforma trebuie să suporte ambele cazuri în fluxul de facturare. (Sinteză proprie pe baza surselor de mai sus; de validat cu un contabil — trecut în open-questions.)

### 3.2. DAC7 — obligație legală directă pentru platformă (IMPORTANT)
- Operatorii de platforme digitale prin care se **vând bunuri** (porumbeii sunt bunuri) au obligația de raportare anuală către **ANAF** a vânzătorilor activi (persoane fizice și juridice): identitate, CNP/CUI, conturi, sume încasate, comisioane reținute. Implementat în RO prin **OG 16/2023**; raportare anuală până la **31 ianuarie** pentru anul precedent. Surse: https://kpmg.com/ro/ro/blogs/home/posts/2023/02/dac7-implementat-sanctiuni-obligatii.html ; https://startupcafe.ro/raportare-dac7-ghid-anaf-operatori-platforme-online-obligatii-sanctiuni-htm-28613 ; https://www.avocatnet.ro/articol_63904/
- **Implicație de produs:** onboarding-ul vânzătorului TREBUIE să colecteze datele DAC7 (nume, adresă, CNP/NIF, IBAN) de la început — se aliniază natural cu KYC-ul procesatorului de plăți. (Concluzie proprie derivată din obligația legală.)
- Există praguri de excludere pentru vânzători ocazionali (sub 30 tranzacții și sub 2.000 EUR/an la vânzări de bunuri — de verificat exact în OG 16/2023; marcat pentru validare). Sursă generală: https://www.portalpfa.ro/articole/legislatie-1/raportarea-dac7-ce-obligatii-aduce-pentru-operatorii-de-platforme-digitale-2666.html

### 3.3. Facturare — cerințe funcționale (propunere proprie, tipar PIPA)
- Platforma emite automat: (a) factură de comision către vânzător; (b) factura/borderoul de adjudecare către cumpărător (în numele vânzătorului sau al platformei, după modelul juridic ales — decizie de clarificat cu avocat/contabil → open-questions).
- Termen de plată tip PIPA: **7 zile calendaristice de la data facturii; livrarea doar după încasarea integrală.** Sursă: https://auctions.pipa.be/en/general-terms-conditions-sale (via WebSearch).
- e-Factura RO: pentru tranzacții B2B/B2C în România, sistemul RO e-Factura este obligatoriu (2024+) pentru facturile emise de platformă ca firmă românească — integrare ANAF necesară. (Afirmație generală de context legislativ RO; de confirmat sfera exactă B2C la implementare — open-questions.)

(secțiunile 4–8 se completează mai jos)
