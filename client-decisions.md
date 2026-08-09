# Decizii client & propuneri acceptate — No.1 & Best Pigeons
**Data:** 2026-08-09 | **Sursa:** răspunsurile lui Daniel la `open-questions.md` (25 întrebări)
**Legendă:** `[DECIZIE]` = decizia explicită a clientului · `[PROPUNERE]` = clientul a delegat alegerea; propunerea de mai jos se consideră acceptată dacă nu e contestată · `[DESCHIS]` = rămâne de rezolvat

> **Cerință transversală nouă (derivată din răspunsuri):** aproape toate valorile comerciale sunt cerute „configurabile". Platforma primește un **Panou de setări (admin)** — vezi secțiunea G — care centralizează toți parametrii de mai jos. Nicio valoare comercială hard-codată.

---

## A. Business & monetizare

**A1. Comision** — `[DECIZIE]` configurabil, default ales de noi. `[PROPUNERE]` Default: **12% comision vânzător, fără buyer's premium**. Setări: procent global (0–30%), override per vânzător, override per lot. Justificare: mijlocul pieței (Elimar 17–22%, Pigeon Partners 7–10,5%, BestPigeons 25%); fără buyer's premium ca diferențiator la lansare.

**A2. Monedă** — `[DECIZIE]` selectabilă, **default EUR**. Implementare: moneda platformei se setează din admin (EUR/RON); opțional afișare informativă a conversiei în cealaltă monedă (curs BNR, doar informativ — tranzacția rămâne în moneda platformei).

**A3. Taxă administrativă per porumbel** — `[DECIZIE]` **0 la lansare**, configurabilă (sumă fixă, activare on/off).

**A4. Trepte de listare** — `[DECIZIE]` **ambele**: self-service (comision standard) și assisted listing (platforma redactează prezentarea; comision majorat — `[PROPUNERE]` +5 puncte procentuale, configurabil).

**A5. Entitate juridică & facturare** — `[DECIZIE]` configurabil, cu câmpuri obligatorii. `[PROPUNERE]` câmpuri obligatorii în setările de facturare: denumire firmă, CUI, nr. Reg. Com. (J...), sediu social, IBAN + banca, statut TVA (plătitor/neplătitor), serie + numerotare facturi, e-mail facturare. Opționale: capital social, logo pe factură, câmpuri e-Factura (se completează cu contabilul). Model facturare `[PROPUNERE]`: platforma facturează **comisionul** către vânzător; factura de adjudecare cumpărător–vânzător se emite **direct de vânzător** (platforma generează automat borderou de adjudecare + draft de factură). `[DESCHIS]` de validat cu contabilul.

## B. Plăți & risc

**B6. Procesator plăți** — `[PROPUNERE]` **Stripe Connect** la lansare: cel mai rapid de integrat în RO, KYC-ul vânzătorilor preluat de Stripe, payout automat. Se potrivește pentru că default-ul ales la B9 este „plată imediată" (fără escrow lung, deci limita de ~90 zile a Stripe nu ne afectează). Codul se scrie cu un **strat de abstractizare peste procesator**, ca Mangopay/Lemonway (escrow real) să poată fi adăugat ulterior fără rescriere, dacă activăm escrow la livrări lungi.

**B7. Garanții de licitare** — `[DECIZIE]` configurabile de admin: on/off, prag (ex. 500 EUR), tip (pre-autorizare card / depozit). Default `[PROPUNERE]`: dezactivat la lansare.

**B8. KYC** — `[PROPUNERE]` model **hibrid, cost operațional mic**:
- Cumpărători: verificare automată (e-mail + validare telefon prin SMS când modulul SMS e activ; la lansare doar e-mail) + limită de licitare pentru conturi noi (configurabilă, ex. 1.000 EUR) care crește după prima tranzacție finalizată.
- Vânzători: **aprobare manuală de către admin** (act identitate sau date firmă + IBAN) — aici e riscul real de fraudă.
- Opțional (toggle): apel telefonic manual doar pentru oferte peste un prag configurabil (modelul PIPA, dezactivat default).

**B9. Eliberarea banilor către vânzător** — `[DECIZIE]` configurabil (imediat / după X zile / la confirmarea livrării), **default imediat**. Notă importantă care confirmă default-ul: reținerea banilor în escrow propriu are implicații serioase (poate cere statut de instituție de plată / procesator cu wallet licențiat). Cu Stripe Connect + plată imediată, banii nu trec prin conturile noastre → fără licențiere suplimentară. Modul „după X zile" folosește transferuri amânate Stripe (max ~90 zile); modul „la livrare" rămâne în meniu dar se activează doar după migrarea pe procesator cu wallet (Mangopay).

## C. Livrare & aftersales

**C10. Transport** — `[DECIZIE]` configurabil. `[PROPUNERE]` set de opțiuni configurabile:
- Mod per lot: (a) **vânzătorul organizează** (default, MVP), (b) ridicare personală, (c) „asistat de platformă" (admin coordonează curier specializat; taxă configurabilă) — dezactivat la lansare, activabil din admin.
- Cine plătește: default **cumpărătorul**, separat de prețul de adjudecare (modelul PIPA); configurabil per lot (vânzătorul poate oferi transport gratuit).
- Platforma afișează ghid de transport + listă de curieri specializați (conținut editabil din admin).

**C11. Garanții aftersales** — `[DECIZIE]` identic PIPA: infertil raportabil în 2 luni, bolnav la sosire 24h, mort la sosire 24h (cu retur inel + documente). Termenele = câmpuri configurabile în admin.

**C12. Garanția de sex (test ADN) la pui** — `[DECIZIE]` configurabil, neobligatorie la lansare. `[PROPUNERE]` toggle global „garanție sex obligatorie pentru pui"; când e activ, costul testului îl suportă **vânzătorul**; per lot există badge „sex garantat ADN" pe care vânzătorul îl poate bifa voluntar și înainte de a fi obligatoriu.

## D. Scope produs

**D13. Voiajori vs ornament** — `[DECIZIE după explicație]` (vezi explicația din conversație): lansare cu **voiajori**; modelul de date se construiește de la început cu **categorii** (voiajori / ornament), fiecare cu schema proprie de palmares (curse vs premii expoziționale), astfel încât secțiunea „ornament" să fie activabilă ulterior dintr-un toggle, fără migrare. Secțiuni separate sunt viabile tehnic; nu se lansează ambele simultan ca să nu diluăm piața inițială.

**D14. Preț de pornire** — `[DECIZIE]` configurabil: minim de platformă setat de admin (`[PROPUNERE]` default 100 EUR) + preț de start per lot ≥ minim.

**D15. Durata licitației** — `[DECIZIE]` configurabilă de admin (`[PROPUNERE]` default 14 zile, ca PIPA); alegerea de către vânzător într-un interval = feature flag existent în cod, **dezactivat** la lansare.

**D16. SMS** — `[DECIZIE]` integrarea SMS se construiește (validare telefon + notificare outbid opt-in), dar la lansare canalul primar este **e-mail**; SMS dezactivat din admin până se decide bugetul. `[PROPUNERE]` furnizor: Twilio sau SMSLink (local, mai ieftin pentru RO) — abstractizat, decidem la activare.

**D17. Licitații hibride (sală + online)** — `[PROPUNERE]` exclusiv **online** la lansare și pe termen mediu; nu construim mod „sală". Singura pregătire: câmpul `type` pe licitație (online / eveniment), ca un eventual eveniment hibrid viitor să nu ceară migrare de date.

**D18. Rating vânzători** — `[DECIZIE]` vizibil de la prima recenzie + ștergere/contestare posibile. `[PROPUNERE]` regim complet: doar tranzacțiile finalizate pot lăsa recenzie; vânzătorul poate răspunde public; contestare = raport → admin decide (ascunde/șterge, cu motiv logat în audit); cumpărătorul își poate edita/șterge recenzia 30 de zile; nota agregată afișată cu numărul de tranzacții.

## E. Legal — plan pentru România întâi, UE ulterior

`[PROPUNERE]` (clientul a delegat):
1. **Lansare cu livrare doar în România** — elimină la start toată complexitatea transfrontalieră (TRACES, certificate sanitar-veterinare, Reg. CE 1/2005). Extinderea UE = faza 2, cu aviz DSVSA la momentul respectiv.
2. **Avocat (înainte de lansare):** T&C licitații (caracterul obligatoriu al ofertei; încadrarea față de dreptul de retragere 14 zile — OUG 34/2014), politică de confidențialitate GDPR, politică cookies, acorduri de prelucrare cu procesatorii (Stripe etc.).
3. **Contabil (înainte de lansare):** regimul TVA al comisionului, e-Factura, obligațiile **DAC7** (OG 16/2023) — platforma trebuie să colecteze CNP/CUI de la vânzătorii care depășesc pragurile de raportare; câmpurile există în modelul de date de la început.
4. La livrări interne: platforma cere vânzătorului o declarație privind starea de sănătate a păsării + recomandă carnetul de sănătate; fără certificate obligatorii în RO (de confirmat cu avocatul).

## F. Brand & conținut

**F22. Conținut editorial** — `[DECIZIE după explicație]` `[PROPUNERE]`: la lansare **fără blog activ**, dar: (a) fiecare licitație are o „prezentare editorială" (text scris de vânzător, verificat de admin — la assisted listing îl scrie platforma); (b) modulul de blog/CMS simplu există în platformă de la început, bilingv, activabil când există conținut. Draft-urile RO/EN pot fi generate cu AI și editate de Daniel.

**F23. Domeniu** — `[DECIZIE]` numele afișat pe site = cel din logo („No.1 & Best Pigeons"); domeniul se configurează ulterior. Implementare: numele, logo-ul și domeniul sunt **setări** (admin/env), schimbabile fără cod. Recomandare: domeniul să fie cumpărat cu câteva săptămâni înainte de lansare (reputație e-mail, SEO).

**F24. Animația + sunetul la câștig** — `[DECIZIE]` ambele se implementează; **activare controlată de admin** (toggle separat pentru sunet și pentru animație). Suplimentar, obligatoriu tehnic: `prefers-reduced-motion` respectat întotdeauna, iar sunetul pornește doar după interacțiunea utilizatorului (politica browserelor).

**F25. Numele vs BestPigeons.ro** — `[DECIZIE]` mergem înainte cu „No.1 & Best Pigeons". Notă de risc consemnată: schimbarea numelui este **ieftină tehnic** (nume/logo = setări, vezi F23), dar **scumpă comercial** după acumulare de clienți și reputație; recomandarea rămâne o verificare de marcă OSIM/EUIPO (cost mic) făcută în paralel, fără a bloca dezvoltarea. `[DESCHIS]` verificarea OSIM/EUIPO.

---

## G. Cerință nouă consolidată: Panoul de setări platformă (admin)

Toate valorile de mai sus într-un singur modul de administrare, grupat pe taburi:
- **Comercial:** comision global + override-uri, buyer's premium (off), taxă administrativă (off), monedă, preț minim de pornire, durata default a licitației, praguri garanții de licitare.
- **Plăți:** procesator (Stripe la lansare), momentul payout-ului (imediat / X zile / la livrare), praguri KYC și limite conturi noi.
- **Livrare & garanții:** moduri de transport active, cine plătește default, termene aftersales (2 luni / 24h / 24h), garanție ADN on/off.
- **Comunicare:** canale notificare (e-mail on, SMS off), furnizor SMS, template-uri.
- **Conținut & brand:** nume site, logo, domeniu, blog on/off, categorii active (voiajori on, ornament off), licitație-eveniment on/off.
- **Experiență:** animația de câștig on/off, sunet on/off, moderare recenzii.
- **Facturare:** datele firmei (obligatorii: denumire, CUI, Reg. Com., sediu, IBAN, banca, statut TVA, serie facturi).
Fiecare modificare de setare se loghează (audit trail: cine, când, ce valoare).

## Rămase deschise
1. Validarea modelului de facturare cu contabilul (A5) + regim TVA/DAC7 (E3).
2. Avizul avocatului pe T&C / drept de retragere (E2).
3. Verificarea de marcă OSIM/EUIPO (F25).
4. Achiziția domeniului (F23).
5. Bugetul SMS la activare (D16).
