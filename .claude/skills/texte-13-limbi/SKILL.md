---
name: texte-13-limbi
description: Adaugă texte noi în interfața platformei No.1 & Best Pigeons, în toate cele 13 limbi — română și engleză scrise de tine, restul prin agenți, apoi verificarea cheilor. Folosește ori de câte ori apare un text nou pe ecran sau într-un e-mail.
---

# Texte noi, în 13 limbi

Trei pași, în ordinea asta. Nu sări peste al treilea: o cheie lipsă într-o limbă
se vede în pagină ca `sales.boxDays`, scris cu majuscule, exact pe ecranul
clientului.

## 1. Română și engleză, scrise de tine

Script Node în scratchpad (nu în proiect), care face merge, nu rescrie fișierul:

```js
const fs = require("fs");
const baza = "C:/Users/daniel/Downloads/Pagina licitatii porumbei/platform/messages/";
const T = {
  ro: { auction: { cheieNoua: "Textul românesc" } },
  en: { auction: { cheieNoua: "English text" } },
};
for (const [limba, grupuri] of Object.entries(T)) {
  const p = baza + limba + ".json";
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  for (const [grup, chei] of Object.entries(grupuri)) j[grup] = { ...j[grup], ...chei };
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
}
```

`JSON.stringify(j, null, 2) + "\n"` reproduce fișierele existente octet cu octet,
deci diff-ul rămâne doar adăugirea.

Regulile textelor: fără ghilimele drepte (`"`, `'`) — în ICU, apostroful e
caracter de evadare; ghilimele tipografice („…" / “…” / « … »). Sumele și datele
vin gata formatate din cod, ca parametri.

## 2. Celelalte 11 limbi, cu agenți

Un agent la 4–6 limbi, în fundal, în paralel. Prompt-ul care funcționează:

> Adaugă cheile `<lista>` în `messages/{zh,ja,nl,…}.json`. Sursa: obiectul
> `<grup>` din `messages/en.json` (româna din `ro.json`, pentru nuanță).
> Context: `<ce e pe ecran, cine citește>`.
> Reguli: aceleași chei, în aceeași poziție ca în `en.json`; aceiași parametri
> ICU, scriși identic (`{amount}`, `{count}`…); formele de plural ale limbii
> (`=0` păstrat); fără ghilimele sau apostrofi drepți; terminologia deja
> folosită în fișier (verifică cheile vecine). Scrie cu un script node din
> scratchpad: JSON.parse → modificare → `JSON.stringify(j, null, 2) + "\n"`;
> verifică întâi că re-stringify-ul reproduce fișierul existent octet cu octet.
> La final rulează `node scripts/check-locale.cjs --all` și raportează.

## 3. Verificarea

```bash
node scripts/check-locale.cjs --all     # aceleași chei și aceiași parametri ICU
npx tsc --noEmit                        # next-intl tipizează cheile din en.json
```

## Capcane

- Cheia nouă trebuie pusă în **grupul din care o citește pagina**: `t` din
  `useTranslations("sales")` nu vede `auction.boxDays`. Dacă pagina are doi
  traducători (`t`, `ta`), verifică pe care îl folosești.
- O cheie rămasă nefolosită în cod nu strică nimic; `check-locale` compară doar
  limbile între ele.
- Textele de e-mail se compun în module pure (`lib/outbid-email.ts`,
  `lib/breeder-emails.ts`), cu `emailTranslator(limba)` — nu în rute.
