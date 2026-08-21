# Scenariu de testare — No.1 & Best Pigeons (site live)

**Site:** http://207.180.241.165:3000
**Conturi:** vezi `credentiale-acces.md` (secțiunea 2) — nu le mai repet aici, sunt aceleași.

> **„Succes"** = ai parcurs toți pașii de mai jos, ai văzut **animația cu stolul de porumbei la câștig**, ai plătit comanda și ai lăsat o recenzie. Dacă te blochezi undeva, sări la secțiunea **„Dacă ceva nu merge"** de la final.

Bifează pe măsură ce avansezi. Durează ~15-20 minute prima dată.

---

## Pasul 0 — Reset la o stare curată (opțional, dar recomandat)

Dacă ai mai testat înainte și vrei să o iei de la capăt:
```
ssh root@207.180.241.165 "bash /opt/licitatii-porumbei/reset-demo.sh"
```

---

## Partea 1 — Ca vizitator (fără cont)

- [ ] Deschide http://207.180.241.165:3000 — vezi homepage-ul cu logo-ul real, secțiunile „Licitații live / În curând / Închise recent".
- [ ] Apasă **EN** din header — tot conținutul se traduce instant. Apasă înapoi pe **RO**.
- [ ] Intră pe licitația **„Fulger Albastru"** — verifică: poze, pedigree (3 generații), palmares, istoricul ofertelor (nume mascate, ex. „M. P***"), garanții de livrare.
- [ ] Observă că butonul de licitare cere autentificare — normal, nu ești logat.

**Rezultat așteptat:** navigare fluidă, fără erori, tot textul e în limba aleasă.

---

## Partea 2 — Cumpărător și proxy-bidding

- [ ] Loghează-te cu **buyer2@nbp.test** (contul „nou", cu limită de licitare).
- [ ] Pe „Fulger Albastru" (preț curent 320 EUR, liderul are un plafon secret de 500 EUR):
  - [ ] Oferă **2000 EUR** → trebuie respins, cu mesaj despre limita de 1.000 EUR pentru conturi noi.
  - [ ] Oferă **400 EUR** → ești depășit **instant**, prețul urcă la 410 EUR (plafonul automat al liderului te-a bătut).
  - [ ] Oferă **600 EUR** → acum **preiei conducerea** la 525 EUR (nu la 600 — sistemul licitează automat doar cât e nevoie).
- [ ] Apasă „☆ Adaugă la favorite" pe lot, apoi verifică-l în **Contul meu → Favorite**.

**Rezultat așteptat:** mesaje clare la fiecare ofertă, prețul se schimbă corect, favoritul apare în listă.

---

## Partea 3 — Efectul live, în două ferestre deodată

- [ ] Deschide același lot într-o **fereastră incognito** separată, logată cu **buyer1@nbp.test**.
- [ ] Licitează dintr-o fereastră → în cealaltă, **fără să dai refresh**, prețul se actualizează singur (flash galben), și dacă cineva te depășește, cardul se scutură ușor.

**Rezultat așteptat:** ambele ferestre se sincronizează live, fără reîncărcare de pagină.

---

## Partea 4 — Către „succes": câștigă o licitație

Licitația „Regina Nordului" se închide normal în ~2 ore — prea mult ca să aștepți. O scurtăm artificial doar pentru testare.

1. [ ] Loghează-te cu **buyer1@nbp.test**, deschide licitația **„Regina Nordului"** și dă o ofertă (ex. 200 EUR). Reține ID-ul din URL (partea de după `/auctions/`).
2. [ ] Din terminal, mută finalul licitației la 60 de secunde de acum:
   ```
   ssh root@207.180.241.165 "sudo -u nbp -H bash -c 'cd /opt/licitatii-porumbei/platform && npx tsx scripts/set-auction-end.ts <ID_LICITATIE> 60'"
   ```
   *(Nu știi să faci asta sau nu vrei să umbli în terminal — scrie-mi și o fac eu în câteva secunde.)*
3. [ ] **Bonus anti-sniping:** mai dă o ofertă în acele 60 de secunde → licitația trebuie să se prelungească automat cu 5 minute („Licitație prelungită!").
4. [ ] Stai pe pagina lotului și așteaptă închiderea (sau lasă pagina deschisă) → dacă ești lider, apare **animația cu stolul de porumbei** + „Felicitări!".

**Rezultat așteptat:** animația chiar apare, cu bara colorată și textul de felicitare. Ăsta e primul semn clar de succes.

---

## Partea 5 — Plată și recenzie

- [ ] Mergi la **Contul meu → Cumpărăturile mele** → deschide comanda nouă.
- [ ] Apasă **„Plătește acum"** (plată de test/mock, nu se cere card real) → statusul devine „Plătită".
- [ ] Lasă o **recenzie** (steluțe + comentariu) → verific-o pe profilul crescătorului (link din pagina licitației).

**Rezultat așteptat:** statusul comenzii se schimbă corect, recenzia apare public pe profilul vânzătorului.

---

## Partea 5b — Secțiunile noi din meniu

- [ ] **Bara de sus:** verifică ceasul — arată **ora serverului**, nu a calculatorului tău. Schimbă ora pe PC și reîncarcă: ceasul de pe site rămâne corect (asta elimină disputele la închiderea licitațiilor).
- [ ] **Preț fix:** intră pe „Preț fix" → alege un porumbel → „Cumpără acum" → confirmă. Se creează direct comanda, fără licitare. Dacă încerci același lot din alt cont, primești „Vândut".
- [ ] **Produse:** intră pe „Produse", filtrează pe categorii, adaugă 2-3 articole în coș (observă numărul din coșul din header), apoi „Coș" → completează datele de livrare → „Trimite comanda". Verifică apoi că stocul a scăzut.
- [ ] **Articole:** deschide un articol din listă și verifică-l și în engleză (comutatorul RO/EN din bara de sus).
- [ ] **Concursuri Campionat:** deschide „Campionatul Național de Fond 2026" — are regulament și lotul de campionat asociat.
- [ ] **Informații:** din meniu, submeniul are 3 intrări (Regulament / Informații licitații / Alte informații).
- [ ] **Contact:** trimite un mesaj din formular → apoi, ca admin, verifică-l în Administrare → Mesaje.

**Ca admin — editare fără cod:** Administrare → **Pagini** îți permite să rescrii Regulamentul, Despre noi, Transport etc. (RO și EN); **Produse**, **Articole** și **Concursuri** au fiecare listă + formular de adăugare/editare. Orice modificare apare imediat pe site.

---

## Partea 6 — Vânzător

- [ ] Loghează-te cu **seller@nbp.test**.
- [ ] Mergi la **„Vinde un porumbel"**, completează formularul (preț minim 100 EUR) și trimite.
- [ ] Verifică în **„Loturile mele"** — apare cu iconița ⏳ (în așteptare de aprobare).
- [ ] În **„Vânzările mele"** vezi comanda plătită de la Partea 5, cu comisionul platformei calculat corect (12%). Apasă „Marchează ca expediată".

**Rezultat așteptat:** lotul nou e vizibil doar pentru tine ca „în așteptare", comanda arată suma corectă minus comision.

---

## Partea 7 — Admin

- [ ] Loghează-te cu **admin@nbp.test** → `/ro/admin`.
- [ ] Aprobă vânzătorul în așteptare (**Vasile Porumbaru**) din „Aprobare vânzători".
- [ ] Aprobă lotul tău nou din Partea 6, din „Moderare loturi" → devine LIVE imediat.
- [ ] Intră în **„Setări platformă"** → schimbă comisionul (ex. 12% → 15%), salvează → verifică în **„Jurnal de audit"** că apare modificarea, cu ora și ce s-a schimbat.
- [ ] (Opțional) Activează sunetul la câștig din Setări → Experiență, ca să-l auzi la următorul test din Partea 4.

**Rezultat așteptat:** aprobările mută loturile/vânzătorii din „în așteptare" în activ; orice schimbare de setare se loghează în audit.

---

## ✅ Ai ajuns aici și toate bifele sunt puse?

Asta înseamnă că fluxul complet — licitare live, proxy-bidding, anti-sniping, câștig cu animație, plată, recenzie, aprobare vânzător/lot, panou de setări — funcționează cap-coadă pe serverul real. Site-ul e gata de folosit pentru testare continuă.

---

## Dacă ceva nu merge

| Simptom | Ce faci |
|---|---|
| Pagina nu se încarcă deloc | `ssh root@207.180.241.165 "systemctl status licitatii-porumbei"` — dacă nu e „active", repornește: `systemctl restart licitatii-porumbei` |
| Te loghezi dar pare că nu ține minte contul | Verifică dacă browserul blochează cookie-uri pe conexiune HTTP (unele extensii de securitate o fac) — încearcă fereastră incognito |
| Vrei să o iei de la capăt | Rulează scriptul de reset din Pasul 0 |
| Orice altceva | Scrie-mi exact ce ai făcut și ce ai văzut — verific logurile live cu `journalctl -u licitatii-porumbei -f` |
