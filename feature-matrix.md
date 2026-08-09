# Feature Matrix — PIPA vs PigeonBoss(+Amazing-Wings) vs No.1 & Best Pigeons
**Versiune:** Runda 2 (corecții după review Runda 1) | **Data:** 2026-08-09

> Legendă: ✅ = prezent (observat), ❌ = absent (verificat), ❓ = neobservabil la data research-ului (documentat ca gol, nu presupus), ⚙️ = prezent parțial/indirect.
> Coloana „Noi" = propunerea pentru No.1 & Best Pigeons: **M** must-have (MVP) / **N** nice-to-have (faza 2) / **O** opțional (faza 3+) / — nu se preia.
> Notă context: PigeonBoss NU e platformă de licitații (portal editorial + shop + servicii promovare); unde e relevant, coloana lui include platforma parteneră Amazing-Wings, marcată (AW). [sursă: research-notes/pigeonboss.md §1, §7]

## 1. Catalog & descoperire
| Funcție | PIPA | PigeonBoss (+AW) | Noi | Sursă |
|---|---|---|---|---|
| Licitații live pe homepage | ✅ (secțiune „Online auctions") | ❌ PB / ⚙️ AW (doar preț fix la data fetch) | **M** | pipa.md §2–3; pigeonboss.md §7 |
| Licitații viitoare (upcoming) cu pagini de prezentare | ✅ | ⚙️ AW „Auktionstermine" (calendar, gol la fetch) | **M** | pipa.md §3; pigeonboss.md §7 |
| Arhivă licitații închise cu prețuri finale | ❓ (fără link în footer; de verificat runda 2) | ❓ | **M** (cerut de brief §6.1; valoare de piață: istoric prețuri) | pipa.md §3; propunere proprie |
| Loturi ascunse până la startul licitației | ✅ („visible when bidding starts") | ❓ | **N** | pipa.md §3 |
| Căutare avansată + filtre + sortare | ❓ (neobservabil fără licitații active) | ⚙️ AW „Erweiterte Suche" | **M** (filtre: sex, an, categorie km, crescător, preț, timp rămas) | pipa.md §8; pigeonboss.md §7; criterii = propunere proprie |
| Pagini de crescător publice | ⚙️ (pe portalul www.pipa.be „Fanciers") | ✅ director „Famous Fanciers" (monetizat €195/an) | **M** (gratuit de bază; premium N) | pipa.md §2; pigeonboss.md §6 |
| Listare preț fix „Buy Now" | ❌ (doar licitații) | ✅ AW („Jetzt kaufen", €250–1.200) | **O** | pigeonboss.md §7 |
| Secțiune editorială / știri care promovează licitațiile | ⚙️ (articole pe www.pipa.be) | ✅ (nucleul modelului PigeonBoss) | **N** | pipa.md §2; pigeonboss.md §1, §3 |
| Multi-limbă | ✅ 10 limbi (incl. RO; hreflang: en, zh-hans, ja, nl, fr, de, es, pl, ar, ro) | ⚙️ AW: DE/EN/ZH; PB: EN | **M** RO/EN (constrângere fixă) | pipa.md §1; curl homepage 2026-08-09; pigeonboss.md §7; brief §5 |
| Selector fus orar pentru orele de închidere | ✅ | ❓ | **N** | pipa.md §1 |
| Shop de produse conexe (suplimente etc.) | ✅ (pe portal, „Shop") | ✅ (WooCommerce) | — (în afara scope-ului) | pipa.md §2; pigeonboss.md §2 |

## 2. Pagina de lot & date porumbel
| Funcție | PIPA | PigeonBoss (+AW) | Noi | Sursă |
|---|---|---|---|---|
| Inel, sex, an, crescător pe lot | ✅ (FAQ confirmă ring+sex; lot live neobservabil) | ⚙️ AW: nume + preț vizibile; câmpuri detaliate ❓ | **M** (model complet §4.1 raport) | pipa.md §6; date-porumbei.md §1 |
| Pedigree afișat + garanția „pedigree-ul afișat = cel livrat" | ✅ (garanție în FAQ/T&C) | ⚙️ (AW: „DNA certification" la livrare) | **M** (PDF la MVP; arbore interactiv N) | date-porumbei.md §2; pigeonboss.md §3 |
| Palmares structurat (concursuri, locuri, distanțe) | ⚙️ (text editorial bogat pe pagina licitației; format pe lot ❓) | ❓ | **M** (model FCPR cu coeficient) | pipa.md §4; date-porumbei.md §3 |
| Poze multiple high-res + video | ✅ (PPQC: poze high-res + uneori video) | ❓ AW (thumbnail observat) | **M** poze / **N** video | pipa.md §6.9 |
| Certificat ADN descărcabil | ✅ (My purchases: poză+ADN+pedigree) | ✅ (revendicat la livrare) | **M** | pipa.md §6.6; pigeonboss.md §3 |
| Control de calitate al platformei (tip PPQC) | ✅ | ⚙️ („strict selection" revendicat) | **N** (moderare admin la MVP; QC fizic O) | pipa.md §6.9; pigeonboss.md §3 |

## 3. Licitare
| Funcție | PIPA | PigeonBoss (+AW) | Noi | Sursă |
|---|---|---|---|---|
| Vizualizare fără cont, licitare cu cont aprobat | ✅ | ⚙️ AW: cont necesar pentru participare | **M** | pipa.md §6.1; pigeonboss.md §7 |
| Preț de pornire standard | ✅ 200 EUR | ❓ | **M** (configurabil per lot) | pipa.md §6.2; propunere proprie |
| Dublu pas de confirmare a ofertei | ✅ | ❓ | **M** | pipa.md §6.2 |
| Proxy-bidding („buying order") cu prioritate față de bid egal + first-come la egalitate | ✅ | ❓ | **M** (regulile PIPA preluate integral) | pipa.md §6.3 |
| Anti-sniping: +5 min per lot la bid în ultimele 5 min | ✅ | ❓ | **M** | pipa.md §6.4 |
| Licitație hibridă sală+online (countdown 30s) | ✅ | ❌ | **O** | pipa.md §6.4 |
| Istoric public al ofertelor pe lot | ❓ | ❓ | **M** (transparență; propunere proprie) | propunere proprie |
| Bidding asistat prin telefon | ✅ | ❓ | — (nu la lansare) | pipa.md §6.1 |
| Buget de licitare per cont + depozit pentru țări noi | ✅ | ❓ | **N** (praguri + pre-autorizare card) | pipa.md §6.1; business-legal.md §2.3 |
| Nickname public moderat | ✅ | ❓ | **N** | pipa.md §6.1 |

## 4. Cont & notificări
| Funcție | PIPA | PigeonBoss (+AW) | Noi | Sursă |
|---|---|---|---|---|
| My bids / My favourites / My purchases | ✅ toate trei | ⚙️ PB: My Account (shop, nu licitații) | **M** | pipa.md §6.6; pigeonboss.md §2 |
| Notificare outbid e-mail | ✅ | ❓ | **M** | pipa.md §6.5 |
| Notificare outbid SMS (opt-in) | ✅ | ❌ | **N** | pipa.md §6.5 |
| Alertă start licitație (clopoțel) | ✅ | ❌ | **N** | pipa.md §6.5 |
| Message center in-app | ✅ | ❌ | **N** | pipa.md §2 |
| Validare telefon prin SMS | ✅ | ❓ | **M** | pipa.md §6.5 |
| Adrese multiple facturare/livrare validate de admin | ✅ | ❓ | **N** | pipa.md §6.2, §6.6 |
| KYC manual (apel telefonic, aprobare 48h) | ✅ | ❓ | **N** (la vânzători M prin procesator plăți; apel manual = decizie client) | pipa.md §6.1; open-questions |
| Rating vânzători | ❌* (curatoriere în loc de rating) | ❌ | **M** (constrângere fixă brief §5) | pipa.md; brief §5 |
| Newsletter | ⚙️ (social + articole) | ✅ | **N** | pigeonboss.md §2 |

\* Notă (Runda 2): ❌ la „Rating vânzători" PIPA este o **deducție**, nu o verificare pozitivă — ratingul nu apare nicăieri în FAQ (10 categorii, citit integral) și nici în harta site-ului/footer, dar paginile de cont PIPA nu au fost văzute din interior (fără cont, fără licitații active). [bază: pipa.md §2, §6; limită documentată]

## 5. Vânzare & monetizare
| Funcție | PIPA | PigeonBoss (+AW) | Noi | Sursă |
|---|---|---|---|---|
| Self-listing vânzător | ❌ (vânzări curate: „Contact sales") | ❓ AW (Registrierung există; flux nepublicat) | **M** (diferențiator, cu moderare) | pipa.md §2; pigeonboss.md §7 |
| Comision de vânzare | ✅ (procent nepublicat; hibrid: buyer's premium 20%) | ❌ PB (venit din promovare) | **M** 10–15% vânzător (propunere) | business-legal.md §1; pipa.md §6.8 |
| Taxă administrativă per porumbel (cumpărător) | ✅ 80 EUR | ❌ | — (evităm frecarea; decizie client) | pipa.md §6.7; open-questions |
| Pachete de promovare a licitațiilor | ❌ | ✅ (€49,95/€99,95/€195,95) | **O** (faza 2–3) | pigeonboss.md §5 |
| Pagină de crescător premium plătită | ❌ | ✅ (€195/an) | **O** | pigeonboss.md §5–6 |
| Model marketplace (platform seller/customer/owner) | ✅ (platform auctions cu FAQ dedicat per licitație) | ⚙️ (AW e platforma; PB doar marketing) | **M** (suntem marketplace by design) | pipa.md §6.8 |

## 6. Plăți, livrare, aftersales
| Funcție | PIPA | PigeonBoss (+AW) | Noi | Sursă |
|---|---|---|---|---|
| Plată card online integrată | ⚙️ (card VISA/MC +3% fee, la factură) | ✅ AW: PayPal | **M** Stripe Connect (split automat) | pipa.md §6.7; pigeonboss.md §7; business-legal.md §2 |
| Transfer bancar + factură (7 zile) | ✅ | ❓ | **M** (fallback) | pipa.md §6.7 |
| Escrow / payout după livrare | ❌ (plata înainte de livrare, fără escrow declarat) | ❓ | **N** (wallet Mangopay/Lemonway sau delayed transfer) | business-legal.md §2.2–2.4 |
| Prețuri exclusiv EUR | ✅ | ✅ AW (EUR) | ❓ decizie client (EUR/RON/dual) | pipa.md §6.7; open-questions |
| Livrare organizată de platformă (curier specializat, ~60 țări) | ✅ | ❓ | **N** (MVP: vânzătorul organizează, platforma ghidează) | pipa.md §6.9 |
| Pick-up personal programat | ✅ | ❓ | **N** | pipa.md §6.9 |
| Garanții aftersales (infertil 2 luni / bolnav 24h / mort la sosire 24h) | ✅ | ❌ | **M** (politică proprie de definit — open-questions) | pipa.md §6.9 |
| Garanție sex prin ADN la pui | ✅ | ⚙️ (ADN generic) | **N** | pipa.md §6.9; pigeonboss.md §3 |
| Relicitare automată + blocare cont la neplată | ✅ | ❓ | **M** | pipa.md §6.7 |
| Raportare DAC7 la ANAF | n/a (BE) | n/a (NL) | **M** (obligație legală RO) | business-legal.md §3.2 |

## 7. Estetică & tehnic
| Funcție | PIPA | PigeonBoss (+AW) | Noi | Sursă |
|---|---|---|---|---|
| Design system pe brand propriu | ⚙️ (funcțional, Drupal) | ⚙️ (WooCommerce standard) | **M** (paleta logo + Fraunces/Inter) | design-tehnic.md A |
| Animație-semnătură la câștig („stol") | ❌ | ❌ | **M** (element obligatoriu brief, diferențiator unic) | brief §6.4; design-tehnic.md A.3.1 |
| Micro-interacțiuni cu reduced-motion | ❓ | ❓ | **M** (inventar de 12, toate cu fallback) | design-tehnic.md A.3 |
| Real-time bidding (WebSocket/Vue dinamic) | ✅ (strat Vue peste Drupal) | ❓ | **M** (WebSocket nativ) | pipa.md §0; raport §7 |
| FAQ pe categorii | ✅ (7 categorii cu link în footer; 10 în total pe pagina FAQ) | ❌ | **M** | pipa.md §6.10; curl homepage 2026-08-09 |
| Responsive mobil | ❓ (nespecificat în note; de verificat runda 2) | ❓ | **M** (brief §6.1) | brief; gol documentat |
