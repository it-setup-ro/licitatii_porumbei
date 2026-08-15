# Audit de securitate — No.1 & Best Pigeons
**Data:** 2026-08-15 · **Acoperire:** tot codul platformei (21 rute API, componente, configurare server)
**Metodă:** patru analize independente (autorizare/IDOR · injecție/XSS · sesiuni/secrete · logică de business), fiecare urmată de verificare manuală înainte de reparație.

---

## Rezumat

| Găsit | Reparat acum | Rămâne de făcut de tine |
|---|---|---|
| 18 probleme reale | 15 | 3 (necesită decizii/acțiuni din partea ta) |

**Verificate și găsite curate:** injecție SQL (zero raw queries — tot prin Prisma parametrizat), XSS (zero `dangerouslySetInnerHTML`; React escapează tot), path traversal la fișiere, escaladare de privilegii la înregistrare (nu poți deveni admin trimițând `role` în cerere), expunerea hash-urilor de parole către browser (nu se întâmplă), autorizarea pe rutele de admin și pe comenzi.

---

## Reparat în această sesiune

### Critice
1. **Secretul de sesiune avea „plasă de siguranță" periculoasă.** Codul folosea `dev-secret` dacă variabila lipsea, iar pe server era o valoare de tip placeholder. Cine ghicea secretul își putea semna singur un token de administrator și prelua tot site-ul, fără parolă.
   → Fără fallback: aplicația refuză să pornească dacă secretul lipsește sau e sub 32 de caractere. **Am generat un secret aleator nou pe server.**

2. **Parola PostgreSQL era în repo-ul public** (`playwright.config.ts`). Repo-ul e public pe GitHub, iar scanerele automate găsesc astfel de parole în minute.
   → Mutată în variabilă de mediu (`.env.test`, ignorat de git). Vezi „Ce rămâne" mai jos — parola tot trebuie schimbată.

3. **Oferte fără plafon.** O ofertă de 20 de miliarde crea o comandă reală de 200 milioane EUR (cu comision de milioane facturat vânzătorului); una și mai mare depășea limita coloanei din baza de date și dădea eroare.
   → Plafon de 1.000.000 EUR pe orice sumă, validat înainte de a atinge baza de date.

4. **Două oferte simultane puteau produce doi „lideri".** Tranzacțiile rulau la izolarea implicită, deci două cereri în aceeași fracțiune de secundă citeau aceeași stare și scriau amândouă. Rezultat posibil: câștigător greșit, preț greșit.
   → Tranzacții serializabile + reîncercare automată, ca ofertantul onest să nu vadă eroare când altcineva licitează simultan.

### Importante
5. **Orice utilizator putea face să dispară orice recenzie.** Raportarea ascundea recenzia instant — un vânzător își ștergea toate recenziile de 1 stea, cu câte o cerere fiecare, umflându-și nota.
   → Raportarea trimite recenzia în coada de moderare, dar **nu o mai ascunde**. Doar adminul decide vizibilitatea. În plus: nu-ți poți raporta propriile recenzii primite, iar raportările repetate nu redeschid o decizie deja luată.

6. **Zero protecție împotriva încercărilor repetate de parolă.** Se putea încerca la nesfârșit.
   → Limite: 10 încercări/15 min pe IP și 5 pe adresă de e-mail (oprește și atacul distribuit pe mai multe IP-uri către un cont). Contorul se șterge la autentificare reușită. Similar: 5 conturi noi/oră pe IP, 40 de încărcări de poze/oră pe vânzător (anti-umplere disc).

7. **Site-ul putea fi pus în iframe pe alt domeniu** (clickjacking) — cineva suprapunea butoane invizibile ca să te păcălească să licitezi sau să plătești.
   → Headere de securitate complete: `X-Frame-Options: DENY`, politică CSP strictă, `nosniff`, `Referrer-Policy`.

8. **Setările de platformă acceptau valori absurde.** Comision −50% sau 10.000%, durată 0 zile, monedă inexistentă. Cel mai grav: o valoare de formă greșită la „trepte de licitare" arunca eroare la *fiecare* ofertă — blocând licitarea pe tot site-ul.
   → Validare per câmp, cu intervale reale.

9. **Dublă plată posibilă.** Două cereri simultane treceau amândouă de verificare și incrementau de două ori istoricul cumpărătorului.
   → Actualizare condiționată: doar prima cerere prinde comanda.

10. **Fluxul live trimitea ID-urile utilizatorilor** oricui asculta, deși numele sunt mascate în pagină — se putea urmări în timp real cine licitează pe ce.
    → Serverul trimite acum doar „conduci / nu conduci", calculat individual.

### Medii
11. Parole prea slabe acceptate (minim 8 caractere) → minim 10 + blocarea celor uzuale.
12. `pedigree` accepta orice, de orice dimensiune (20 MB de JSON, re-parsați la fiecare afișare) → structură validată, maxim 8 KB.
13. Linkuri externe de poze → doar poze urcate pe platformă. Un URL extern funcționa ca pixel de urmărire care afla IP-ul fiecărui vizitator, inclusiv al tău în timpul moderării.
14. `/api/sweep` putea fi apelat la nesfârșit de oricine → limitat la 20/minut per IP.
15. Baza de date SQLite veche (`dev.db`, cu hash-uri de parole demo) era comisă în repo → scoasă din urmărirea git.

---

## Ce rămâne de făcut — necesită decizia sau acțiunea ta

1. **Schimbă parola PostgreSQL locală** (utilizatorul `postgres` de pe calculatorul tău — parola e în `credentiale-acces.md`, fișierul local care nu ajunge niciodată în git). A fost publică pe GitHub și, deși am scos-o din cod, **rămâne în istoricul git** — oricine a clonat repo-ul o are. Ștergerea din istoric cere rescrierea lui (`git filter-repo`), operațiune care schimbă toate commit-urile: spune-mi dacă vrei s-o fac.

2. **HTTPS.** Site-ul rulează pe HTTP simplu, deci parolele și sesiunile circulă necriptat — oricine e pe aceeași rețea le poate citi. E singurul risc pe care nu-l pot repara din cod. Se rezolvă cu domeniu + certificat Let's Encrypt, apoi `COOKIE_SECURE=true` în `.env` de pe server.

3. **Conturile demo sunt active pe site-ul public**, cu parole scrise în README (`admin@nbp.test` / `admin1234`). Pentru testare e în regulă; înainte de a arăta site-ul unor persoane din afară, șterge-le sau schimbă-le parolele.

**De reținut și pentru mai târziu:** plățile sunt încă simulate (mock) — oricine poate marca o comandă drept plătită fără să plătească. Corect pentru testare, dar înainte de clienți reali trebuie activat Stripe. Legat de asta: limita de licitare a conturilor noi dispare după prima „tranzacție", care acum e gratuită — deci limita se poate ocoli până la activarea plăților reale.

---

## Teste de regresie

Fiecare problemă reparată are un test automat care reproduce atacul și verifică faptul că nu mai trece: `platform/tests/e2e/security.spec.ts`. Rulare: `npm run test:e2e` (36 de teste, toate verzi).
