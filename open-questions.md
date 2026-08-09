# Open Questions — decizii care aparțin clientului (Daniel)
**Versiune:** Runda 1 | **Data:** 2026-08-09

> **ACTUALIZARE 2026-08-09:** Daniel a răspuns la toate cele 25 de întrebări. Deciziile și propunerile acceptate sunt consemnate în **`client-decisions.md`** — acela este documentul de referință de acum. Rămân deschise doar: validarea contabilă a facturării (A5), avizul juridic T&C (19), verificarea de marcă OSIM/EUIPO (25), achiziția domeniului (23) și bugetul SMS la activare (16). Conținutul de mai jos se păstrează ca istoric.
> Research-ul NU a presupus răspunsuri la niciuna dintre acestea. Fiecare întrebare are context + opțiunile identificate + recomandarea research-ului (unde există), dar decizia e a clientului.

## A. Business & monetizare
1. **Comisionul exact al platformei.** Piața: 7–25% seller's commission (Elimar 17–22%, Pigeon Partners 7–10,5%, BestPigeons 25%, PigeonAuctions 30 USD/lot la vânzare; PIPA nepublicat + taxă admin 80 EUR/porumbel la cumpărător + 20% buyer's premium la hibride). Recomandarea research-ului: 10–15% vânzător, fără buyer's premium la lansare. **Ce procent alegem și cine îl suportă?**
2. **Moneda platformei.** PIPA: exclusiv EUR (evită pierderi valutare). Opțiuni: doar EUR / doar RON / dual cu afișare în ambele. **Care?**
3. **Taxă administrativă fixă per porumbel (model PIPA 80 EUR)?** Recomandare: nu la lansare. **Confirmați?**
4. **Trepte de serviciu la listare** (self-service cu comision mic vs „assisted listing" cu comision mai mare, model Elimar/Pigeon Partners)? **Lansăm cu ambele sau doar self-service?**
5. **Entitatea juridică** care operează platforma (SRL existent IT Setup Solutions vs firmă nouă), statut TVA, și cine emite factura de adjudecare către cumpărător (platforma în numele vânzătorului vs vânzătorul direct). **Necesită și aviz contabil/avocat.**

## B. Plăți & risc
6. **Procesatorul de plăți.** Stripe Connect (simplu, KYC preluat, dar holding max ~90 zile — problematic la livrări internaționale de 1–6 luni) vs Mangopay/Lemonway (wallet = escrow real, integrare mai grea). Depinde de politica de livrare (întrebarea 10). **Care?**
7. **Garanții de licitare:** cerem pre-autorizare card / depozit peste un prag de ofertă? La ce prag (research a propus exemplul 500 EUR)? **Da/nu + prag.**
8. **KYC manual la cumpărători** (modelul PIPA: apel telefonic + buget de licitare atribuit) — premium ca încredere, scump operațional. **Adoptăm apelul manual, doar verificare automată, sau hibrid (manual doar la vânzători)?**
9. **Când se eliberează banii către vânzător:** la confirmarea livrării, după X zile fără dispută (câte?), sau imediat la plată (model PIPA — fără escrow)?

## C. Livrare & aftersales
10. **Cine organizează transportul la lansare:** vânzătorul (platforma doar ghidează — MVP simplu) sau platforma (model PIPA cu curieri specializați — operațional greu)? **Și cine plătește transportul** (la PIPA: cumpărătorul, separat)?
11. **Politica de garanții aftersales.** PIPA: infertil raportabil în 2 luni, bolnav la sosire 24h, mort la sosire 24h cu retur inel+documente. **Preluăm identic, adaptăm termenele, sau lăsăm garanțiile în sarcina vânzătorului cu platforma ca mediator?**
12. **Garanția de sex prin test ADN la pui** (obligatorie la PIPA pentru puii vânduți de crescătorul-producător) — o impunem vânzătorilor noștri? Cine suportă costul testului?

## D. Scope produs
13. **Doar porumbei voiajori sau și ornament/fancy?** Glosarul și categoriile de palmares diferă. Recomandarea research-ului: voiajori la lansare.
14. **Prețul de pornire minim al licitațiilor** (PIPA: standard 200 EUR). Configurabil per lot cu un minim de platformă? **Ce minim?**
15. **Durata standard a unei licitații** (PIPA: ~2 săptămâni). **Fixă sau la alegerea vânzătorului într-un interval?**
16. **Bugetul pentru SMS** (validare telefon obligatorie + outbid opt-in): SMS-urile au cost per mesaj. **Includem SMS de la MVP sau doar e-mail la lansare?**
17. **Licitații hibride (sală + online)** — plan concret de evenimente fizice sau exclusiv online? (Afectează arhitectura doar dacă e dorit devreme.)
18. **Rating vânzători:** vizibil public de la prima recenzie sau după un minim de tranzacții? Se pot șterge/contesta recenziile?

## E. Legal (necesită specialiști, nu research)
19. **Aviz juridic:** încadrarea licitației online față de dreptul de retragere de 14 zile (OUG 34/2014) — excepția pentru „licitații publice" se aplică sau nu modelului nostru? Caracterul obligatoriu al ofertei în T&C.
20. **Aviz contabil/fiscal:** regim TVA comision (OSS), e-Factura B2C, pragurile exacte DAC7 (OG 16/2023) pentru vânzători ocazionali.
21. **Aviz veterinar (DSVSA):** cerințele exacte pentru transportul comercial transfrontalier de porumbei vii (Reg. CE 1/2005, TRACES, certificate sanitar-veterinare) — ce documente cerem obligatoriu vânzătorilor la livrări internaționale?

## F. Brand & conținut
22. **Cine produce conținutul editorial bilingv** (articole, prezentări de licitații — modelul PigeonBoss arată că editorialul vinde)? Intern, extern, sau se lansează fără blog?
23. **Numele de domeniu și varianta scurtă a brandului** („No.1 & Best Pigeons" e lung pentru URL; ex. no1bestpigeons.com / no1pigeons.ro — de verificat disponibilitatea). Atenție: **bestpigeons.ro NU e disponibil** — e o platformă românească de licitații de porumbei deja activă (https://www.bestpigeons.ro/, identificată de Review Agent la 2026-08-09). **Ce domeniu?**
24. **Sunetul la animația de câștig** (fâlfâit de aripi opt-in): îl vrem deloc?
25. **Diferențierea față de „BestPigeons.ro" și verificarea de marcă.** [adăugat de Review Agent, Runda 1] Există deja pe piața RO platforme de licitații de porumbei, iar una folosește un nume foarte apropiat de al nostru: **BestPigeons.ro** („Licitații Online cu Porumbei de Performanță din România"); alte exemple: licitatie-porumbei.ro, piatadeporumbei.ro, goldpigeon.ro, topvoiajor.ro, magicpigeons.com [sursă: WebSearch 2026-08-09]. Decizii ale clientului: (a) mergem înainte cu numele „No.1 & Best Pigeons" în ciuda riscului de confuzie cu BestPigeons.ro? (b) facem o verificare de marcă OSIM/EUIPO înainte de lansare? (c) cum ne poziționăm explicit față de concurența locală existentă?
