# Note research — Design (6.4 Estetică & animații) + Tehnic (7)
# Platforma „No.1 & Best Pigeons"

> Status: DRAFT ÎN LUCRU — scris incremental pe măsură ce se verifică sursele.
> Autor: Research Agent (sesiune 2026-08-08). Fiecare afirmație are sursă (URL) sau marcaj „propunere proprie".

---

## A. DESIGN — Secțiunea 6.4 din brief

### A.1. Confirmarea și rafinarea paletei (pornind de la logo)

Observație directă pe fișierul `logo.jpeg` (verificat vizual în această sesiune): siluetă neagră de porumbel
cu aripa în degrade albastru → galben → portocaliu → roșu, fundal ivory, lettering serif bold negru
(„No.1° & BEST PIGEONS"). Paleta din brief (secțiunea 2) corespunde logo-ului. [sursă: logo.jpeg local + brief secț. 2]

Paletă rafinată propusă (propunere proprie, derivată din brief):

| Token | Hex | Rol |
|---|---|---|
| `--ink` | `#1B1B1B` | Text principal, siluete, fundal footer |
| `--ivory` | `#F3EEE1` | Fundal principal (light) |
| `--ivory-2` | `#EAE3D2` | Fundal secundar / carduri hover (propunere: derivat cu ~5% mai închis) |
| `--blue` | `#2E6E9E` | Link-uri, elemente informative, badge „verificat" |
| `--gold` | `#F2B417` | Accente premium, stele rating, highlight preț curent |
| `--orange` | `#E8720C` | CTA secundar, stări „atenție" (licitație aproape de final) |
| `--red` | `#C0341D` | CTA principal BID, stări urgente (ultimele secunde), outbid |
| `--green-ok` | `#3E7C4F` | Adăugat: confirmări (ofertă plasată, plată reușită) — propunere proprie; paleta logo nu conține verde, necesar funcțional pentru stări de succes |
| `--ink-60` | `rgba(27,27,27,.6)` | Text secundar |

Note de accesibilitate (contrast):
- `#1B1B1B` pe `#F3EEE1` ≈ contrast foarte ridicat (>14:1) — OK pentru text. [calcul propriu după formula WCAG]
- `#F2B417` (galben) NU se folosește pentru text pe ivory (contrast insuficient) — doar ca fundal de badge cu text `--ink` sau ca accent grafic. [propunere proprie, conform pragului WCAG AA 4.5:1 — https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html]
- Dark mode (opțional, fază 2): fundal `#141210` cald, ivory devine culoare de text; degradeul aripii rămâne identic. [propunere proprie]

### A.2. Mini design-system

#### Tipografie (propunere proprie, aliniată la lettering-ul serif al logo-ului)
- **Display / titluri:** „Fraunces" (variable, Google Fonts) — serif cald, cu personalitate, ton premium apropiat de logo. Alternativă: „Playfair Display".
- **Text curent / UI:** „Inter" (variable) — lizibilitate excelentă la dimensiuni mici (prețuri, tabele pedigree).
- **Numeric / cronometru:** Inter cu `font-variant-numeric: tabular-nums` — cifrele au lățime fixă, cronometrul și prețurile nu „sar" la actualizare. [bună practică CSS standard — MDN font-variant-numeric]
- Scară tipografică: 12 / 14 / 16 (bază) / 20 / 24 / 32 / 40 / 56 px (ratio ~1.25). Titluri Fraunces 600–700, text Inter 400–500.
- Diacritice RO obligatorii: ambele fonturi acoperă ș/ț cu virgulă (verificat: subset latin-ext pe Google Fonts).

#### Spațiere & layout (propunere proprie)
- Grid de spațiere pe **bază 4px**: 4/8/12/16/24/32/48/64.
- Container max 1280px; grid 12 coloane desktop, 4 coloane mobil.
- Colțuri rotunjite: 12px carduri, 8px butoane, 999px pill-uri (badge-uri, cronometru compact).
- Umbre calde, nu gri-albastre: `box-shadow: 0 4px 16px rgba(27,27,27,.08)` — pe fundal ivory umbrele reci par murdare. [propunere proprie]

#### Componenta: Card de licitație (propunere proprie, tipar observabil pe PIPA — foto mare + nume + preț + timer)
- Structură: foto porumbel (ratio 4:3, `object-fit: cover`) → badge-uri suprapuse (nr. oferte, „Top pedigree") → nume + inel (ring number) → crescător (link) → preț curent (Fraunces, mare, `--ink`) → cronometru → buton BID.
- Stări: default / hover (lift −4px + umbră mărită) / „ending soon" (<5 min: bordură `--orange`, cronometru pulsează) / „closed" (desaturat, overlay „Vândut / Sold" + preț final).
- Prețul curent se actualizează live (WebSocket) cu o animație de „flash" scurt pe fundal `--gold` la 20% opacitate, 600ms.

#### Componenta: Cronometru (propunere proprie)
- Format: `2z 14h 05m` peste 24h; `HH:MM:SS` sub 24h; `MM:SS` mare + roșu sub 5 min.
- Sub 60s: cifrele trec pe `--red`, puls subtil (scale 1→1.03, 1s loop). Sub 10s: fundal pill roșu, text ivory.
- Sincronizare cu ora serverului (offset calculat la conectare), NU cu ceasul clientului — previne cronometre divergente între utilizatori. [practică standard sisteme real-time; detaliu în secțiunea B]
- La extindere anti-sniping: cronometrul „sare" înapoi cu o animație de highlight + mesaj „Timp extins +X min" (toast).

#### Componenta: Buton BID (propunere proprie)
- Fundal `--red`, text ivory, Fraunces/Inter 600, înălțime 48px (touch target ≥44px conform Apple HIG / WCAG 2.5.8).
- Stări: hover (luminozitate +6%), active (scale .97), loading (spinner + „Se trimite..."), success (fundal `--green-ok` 1.5s + checkmark), disabled (ofertă proprie e cea mai mare: „Ești cel mai mare ofertant").
- Lângă buton: input sumă cu incremente rapide (+50€, +100€) și link „Setează ofertă maximă (proxy-bid)".

### A.3. Inventar de animații (bibliotecă recomandată: Framer Motion + Lottie pentru scene complexe + CSS pt. micro-interacțiuni)

> Justificare bibliotecă: Framer Motion (acum „Motion") oferă hook-ul `useReducedMotion` care returnează
> preferința utilizatorului și o urmărește reactiv, plus `MotionConfig reducedMotion="user"` care dezactivează
> automat animațiile de transform/layout dar păstrează opacity/culoare — exact politica de fallback dorită.
> [sursă: https://motion.dev/docs/react-use-reduced-motion și https://motion.dev/docs/react-accessibility]
> Lottie redă animații vectoriale JSON exportate din After Effects — potrivit pentru scena „stolului". [https://airbnb.io/lottie/]

#### A.3.1. OBLIGATORIU — „Stolul de porumbei care își ia zborul" la câștig (propunere proprie, cerință brief 6.4)
- **Trigger:** evenimentul `auction:won` primit pe WebSocket de clientul câștigător (și pe pagina licitației la închidere, variantă redusă pentru ceilalți privitori: doar banner „Adjudecat").
- **Compoziție:** 9–15 siluete de porumbei (SVG derivate din silueta logo-ului, cu aripa în degradeul brandului) care decolează din zona cardului/prețului final, în arc ascendent spre colțul dreapta-sus, cu ușoară dispersie (stagger 60–90ms între păsări), lăsând în urmă 4–6 „pene" care cad lent. Fundal: overlay ivory 40% care se estompează.
- **Implementare:** Lottie (un singur fișier JSON, export din After Effects, ~100–200KB) SAU sprite-uri SVG animate cu Framer Motion pe path-uri Bezier. Recomandare: Lottie pentru scena mare + text „Felicitări! Ai câștigat [nume porumbel]" animat separat (fade+rise) ca HTML real (accesibil, traductibil RO/EN).
- **Durată:** 2.5–3s total; nu blochează interacțiunea (pointer-events: none pe layerul de animație); rulează O SINGURĂ dată, nu în buclă.
- **Mobil:** aceeași scenă, max 7 păsări, fără blur/umbre pe particule (performanță); animația pe GPU (transform/opacity only, 60fps).
- **`prefers-reduced-motion`:** animația de zbor NU rulează; se afișează o ilustrație statică (stol în poziție finală + confetti static discret) cu același mesaj text și un ecran de confirmare identic informațional. [conform WCAG 2.3.3 Animation from Interactions — https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html]
- **Sunet:** implicit FĂRĂ sunet (fâlfâit opțional, opt-in din setări) — autoplay audio e intruziv.

#### A.3.2. Micro-interacțiuni (toate: propunere proprie; note reduced-motion la fiecare)
| # | Animație | Detalii | Reduced-motion |
|---|---|---|---|
| 1 | Hover card licitație | lift -4px, umbră mărită, foto scale 1.03, 200ms ease-out | doar schimbare umbră/bordură, fără translate/scale |
| 2 | Actualizare live preț | count-up al cifrei vechi→nouă (300ms) + flash fundal gold 600ms | schimbare instant + flash de fundal păstrat (nu e mișcare) |
| 3 | Ofertă nouă în listă | rândul nou intră cu fade + slide 8px, restul se împing lin | doar fade |
| 4 | Puls cronometru ultimele 60s | scale 1→1.03 loop 1s + culoare roșie | doar schimbarea de culoare, fără puls |
| 5 | „Outbid" shake | input/cardul ofertei tale: shake orizontal ±6px, 400ms + banner roșu | doar banner + schimbare culoare |
| 6 | Confetti/pene la câștig (alternativă lightweight) | 20–30 pene SVG cad 2s cu rotație | static: badge de câștig |
| 7 | Buton BID success | morph în checkmark + verde 1.5s | schimbare culoare + checkmark fără morph |
| 8 | Watchlist (inimă) | inimă „pop" scale 1→1.3→1 + micro-particule | schimbare instantă plin/gol |
| 9 | Extindere anti-sniping | cronometrul face flash orange + toast „+X min" | toast simplu |
| 10 | Tab-uri pagină porumbel (pedigree/rezultate/media) | underline glisant 250ms | comutare instant |
| 11 | Galerie foto | crossfade 300ms între imagini, zoom lent Ken Burns pe hero (opțional) | crossfade scurt permis / fără Ken Burns |
| 12 | Toast notificări | slide-in din dreapta-sus 250ms | fade simplu |

#### A.3.3. Loading states & tranziții de pagină (propunere proprie)
- **Loader de brand:** silueta porumbelului din logo cu aripa care „se umple" progresiv cu degradeul (SVG stroke/mask, loop 1.2s). Reduced-motion: logo static + bară de progres liniară.
- **Skeleton screens** pe carduri (fundal ivory-2, shimmer diagonal discret; reduced-motion: fără shimmer, doar blocuri statice).
- **Tranziții de pagină:** fade + rise 12px, 250ms (View Transitions API sau Framer Motion `AnimatePresence`); reduced-motion: fără tranziție.
- **Empty states:** ilustrație-linie cu un porumbel (static), text prietenos RO/EN.

#### A.3.4. Reguli globale de mișcare (propunere proprie)
- Durate: 150–250ms micro, 300–400ms componente, max 3s scene celebration.
- Easing standard: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint) pentru intrări; ease-in scurt pentru ieșiri.
- Doar proprietăți compozitate (transform, opacity) — nu se animează layout (width/top) pe elemente live.
- Un singur hook global `useReducedMotion()` + clasă CSS `.reduce-motion` din media query — TOATE animațiile trec prin el; setare suplimentară din profil („Reduce animațiile") care suprascrie manual. MDN: media query-ul `prefers-reduced-motion` detectează setarea de sistem a utilizatorului; recomandarea e să se folosească pentru ORICE animație non-esențială, înlocuind scaling/panning cu opacitate/culoare; suport în toate browserele moderne din ianuarie 2020. [sursă: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion — verificat în această sesiune]
- Regula anti-flash: nicio animație nu clipește mai mult de 3 ori/secundă (WCAG 2.3.1) și animațiile declanșate de interacțiune pot fi dezactivate (WCAG 2.3.3, nivel AAA — țintit ca best-effort). [https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html]

---

## B. TEHNIC — Secțiunea 7 din brief

(se completează în continuare — vezi versiunile următoare ale acestui fișier)
