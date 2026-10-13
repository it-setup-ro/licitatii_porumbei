---
name: proba-live
description: Probă pe serverul viu al platformei No.1 & Best Pigeons, cu conturile de test — porumbel de probă, licitare din două conturi, verificare în pagină, apoi curățenie. Folosește când clientul reclamă ceva ce nu se vede în teste (actualizare live, mesaje, e-mailuri).
---

# Probă pe server, cu două conturi

Când clientul spune „la mine nu merge", testele verzi nu sunt un răspuns. Se
face proba pe server, pe un porumbel de probă, și se strânge după.

**Nu atinge niciodată licitațiile reale.** Fiecare probă își face crescătorul,
licitația, lotul și porumbelul ei.

## Conturile de test (există pe server)

`admin@nbp.test` / `admin1234`, `buyer1@nbp.test` (MihaiP), `buyer2@nbp.test`
(JohnC), parola `buyer1234`. Vezi `credentiale-acces.md`.

## 1. Porumbelul de probă

Script `.cjs` în scratchpad, cu `fetch` și cookie păstrat între cereri (serverul
e `http://207.180.241.165:3000`). Pașii, ca admin: `POST /api/admin/breeders` →
`/api/admin/sales` → `/api/admin/sales/<id>/lots` →
`/api/admin/sale-lots/<id>/pigeons` → `POST /api/lots/<auctionId>` cu `media`
(fără poză, „Start lot" refuză) → `/api/admin/sale-lots/<id>/start`.

Lotul: `startsAt` acum − 1 min, `endsAt` acum + 60 min.

## 2. Licitarea din două părți

- Dintr-o sesiune (sau din browser-ul intern, logat prin `fetch` pe
  `/api/auth/login`): `POST /api/auctions/<id>/bid` cu `{ maxCents }`.
- Răspunsul spune tot ce trebuie verificat: `priceCents`, `leading`,
  `minNextCents` (minimul **celui care a licitat**), `extended`.

## 3. Ce se vede în pagină

Browser-ul intern, pe pagina porumbelului, cu `javascript_tool`:

```js
const q = (s) => document.querySelector(s)?.innerText?.replace(/\s+/g, " ")?.trim() ?? null;
({ pret: q('[data-testid="current-price"]'), lider: q('[data-testid="leading-badge"]'),
   depasit: q('[data-testid="outbid-badge"]'), mesaj: q('[data-testid="bid-message"]') })
```

Pentru actualizarea live: citește starea, licitează din cealaltă sesiune, apoi
citește din nou **fără reîncărcare**.

**Nu căuta texte în HTML-ul brut** al paginii: catalogul de traduceri e trimis
întreg browserului, deci „Rezultate importante" apare și pe o pagină 404. Caută
`data-testid`-uri sau folosește DOM-ul.

## 4. Curățenia (obligatorie)

```
POST /api/admin/auctions/<auctionId>/withdraw   { reason: "probă tehnică" }
POST /api/admin/auctions/<auctionId>/hide       { hidden: true }
POST /api/admin/sales/<saleId>/archive          { archived: true }
POST /api/admin/breeders/<breederId>/hide       { hidden: true }
```

Apoi verifică pe server că nu se mai vede nicăieri:

```bash
curl -s http://127.0.0.1:3000/ro/auctions | grep -c 'TEST'
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/ro/auctions/<id>   # 404
```

E-mailurile plecate către `@nbp.test` rămân în jurnal; spune-i lui Daniel că
sunt de la probă, nu le șterge fără motiv.
