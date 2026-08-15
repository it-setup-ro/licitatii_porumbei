# Cerințe de hosting — No.1 & Best Pigeons

**Data:** 2026-08-15
**Scop:** document de trimis către un potențial furnizor de hosting, ca să confirmi înainte de contract că platforma va rula corect.

> Deploy-ul actual (207.180.241.165:3000) e doar pentru dezvoltare și testare. Documentul de față descrie ce e nevoie pentru găzduirea finală.

---

## 1. Rezumat pentru furnizor (o singură frază)

Aplicație web Node.js care rulează ca **proces permanent** (nu serverless), cu bază de date PostgreSQL, care ține **conexiuni HTTP deschise** timp îndelungat pentru licitațiile în timp real și scrie fișiere pe **disc persistent**.

---

## 2. Cerințe obligatorii

Dacă furnizorul nu bifează una dintre acestea, platforma **nu va funcționa corect** — sunt din arhitectura aplicației, nu preferințe.

| # | Cerință | De ce e obligatorie |
|---|---|---|
| 1 | **Node.js 22 sau mai nou** | Aplicația e construită pe Next.js 16, care cere Node 20+. Rulează acum pe Node 22. |
| 2 | **Proces care rulează permanent** (nu „function"/serverless) | Un proces de fundal verifică la fiecare 15 secunde ce licitații trebuie închise și desemnează câștigătorii. Pe hosting serverless, acest proces nu există între cereri, deci **licitațiile nu s-ar mai închide singure**. |
| 3 | **Conexiuni HTTP de lungă durată, fără buffering** (SSE) | Prețul se actualizează live pe ecranul tuturor licitanților printr-o conexiune ținută deschisă. Dacă furnizorul taie conexiunile la 30-60 de secunde sau pune un proxy care „adună" răspunsul înainte de a-l trimite, **actualizările live se opresc**. De cerut explicit: fără `proxy_buffering`, timeout de citire ≥ 10 minute. |
| 4 | **PostgreSQL 16+** | Baza de date. Poate fi pe același server sau serviciu separat (managed). |
| 5 | **Disc persistent** (fișierele supraviețuiesc restartului) | Pozele porumbeilor urcate de crescători se scriu pe disc. Pe un sistem cu disc temporar, **pozele dispar la fiecare repornire**. Alternativă acceptabilă: stocare compatibilă S3 (necesită o mică modificare de cod). |
| 6 | **Acces SSH cu drepturi de administrator** (root/sudo) sau deploy prin container | Pentru instalare, migrări de bază de date și actualizări. |
| 7 | **HTTPS cu certificat gratuit** (Let's Encrypt) + domeniu propriu | Obligatoriu: fără el, parolele și sesiunile circulă necriptat. La activare se setează `COOKIE_SECURE=true`. |
| 8 | **Localizare server în UE** | Platforma prelucrează date personale ale unor cetățeni UE (GDPR): nume, e-mail, telefon, IBAN, CUI. Recomandat și pentru viteză (public din România). |

## 3. Cerințe recomandate (nu blochează lansarea)

- **Backup automat zilnic** al bazei de date, cu posibilitate de restaurare. Baza conține licitații, oferte și comenzi — pierderea ei înseamnă pierderea tranzacțiilor.
- **SMTP pentru e-mail** (notificări: „ai fost depășit", „ai câștigat"). Poate fi și serviciu extern (Resend, Brevo, Amazon SES).
- **Monitorizare / repornire automată** dacă aplicația se oprește.
- **Posibilitatea de a deschide porturi** sau reverse proxy configurabil.

## 4. Resurse — măsurate pe instalarea reală, nu estimate

| Ce | Valoare măsurată acum | Recomandat pentru producție |
|---|---|---|
| Memorie folosită de aplicație (în repaus) | **102 MB** | — |
| Memorie la construirea aplicației (build) | **vârf 763 MB** (măsurat, cu aplicația pornită în paralel) | **minim 2 GB, confortabil 4 GB** |
| Spațiu pe disc (cod + dependențe + build) | **940 MB** | **minim 10 GB**, ideal 20 GB (crește cu pozele urcate) |
| Dimensiune bază de date (cu date demo) | **8,4 MB** | crește lent; 5 GB acoperă ani de zile |
| Procesor | 1 vCPU suficient la trafic mic | **2 vCPU** (build-ul e mai rapid, vârfurile la închiderea licitațiilor sunt mai sigure) |

**Configurație minimă rezonabilă: 2 vCPU, 4 GB RAM, 40 GB SSD.**

Aplicația în sine e foarte ușoară (100 MB memorie); consumul de vârf apare la *construirea* ei după fiecare actualizare de cod — 763 MB măsurat. Un server cu 2 GB ar funcționa, dar 4 GB lasă loc și pentru baza de date pe aceeași mașină, plus marjă de siguranță. Sub 1 GB, build-ul pe server devine riscant (alternativa e să construiești local și să urci rezultatul, dar complică actualizările).

## 5. Ce NU este necesar

Ca să nu plătești pentru lucruri inutile:

- Nu are nevoie de Windows Server, cPanel, Plesk sau altă interfață de administrare.
- Nu are nevoie de PHP, MySQL, Apache.
- Nu are nevoie de load balancer, Kubernetes sau mai multe servere. **O singură instanță e suficientă** pentru trafic mic-mediu (vezi secțiunea 7 pentru ce presupune scalarea).
- Nu are nevoie de licențe plătite (tot stack-ul e open-source).

## 6. Atenție la hostingul partajat (shared / cPanel)

Cea mai frecventă capcană: multe firme din România vând „găzduire cu suport Node.js" care e de fapt **hosting partajat cu cPanel**. Acolo:

- procesul aplicației e oprit când nu are trafic → **licitațiile nu se mai închid la timp**;
- serverul web (LiteSpeed/Apache) adună răspunsurile înainte de a le trimite → **actualizările live nu funcționează**;
- de obicei nu ai PostgreSQL, ci doar MySQL.

**Întrebarea de pus furnizorului, exact așa:** *„Aplicația mea Node.js rulează un proces permanent care trebuie să funcționeze non-stop, chiar și fără trafic, și ține conexiuni HTTP deschise câteva minute (Server-Sent Events). Suportați asta, fără oprirea procesului la inactivitate și fără buffering pe proxy?"* Dacă răspunsul e evaziv, nu e potrivit.

## 7. Când vei avea nevoie de mai mult (mai târziu)

Aplicația ține momentan în memoria unui singur proces: mesajele live, contoarele anti-bruteforce și setările platformei. Asta înseamnă că **rulează corect pe o singură instanță**. Dacă vreodată traficul cere două sau mai multe servere în paralel, e nevoie de:

- **Redis** — pentru mesajele live și contoare (schimbare mică de cod, interfața e deja pregătită);
- **stocare S3** pentru poze (în loc de disc local);
- un load balancer cu „sticky sessions" sau Redis, altfel utilizatorii ar vedea prețuri diferite.

Nu e nevoie acum și nu recomand să plătești pentru asta din start.

---

# Partea a II-a — Propuneri de furnizori

**Prețuri verificate pe site-urile oficiale la 15 august 2026.** Sunt fără TVA dacă nu se specifică altfel; verifică-le înainte de comandă, se schimbă des.

## 8. Concluzia scurtă

Aplicația se potrivește cel mai bine și cel mai ieftin pe un **VPS obișnuit** (server virtual cu acces root). Costul real: **5–10 € pe lună**, tot inclus. Serviciile moderne de tip „deploy automat" (Railway, Render, Vercel) costă de 5–15 ori mai mult pentru aceeași aplicație și, în unele cazuri, o și limitează tehnic.

Motivul e simplu: platforma are nevoie exact de lucrurile pe care un VPS le oferă din start — un proces care rulează non-stop, conexiuni deschise cât e nevoie, și un disc care nu se șterge.

## 9. Recomandarea principală — VPS european

| Furnizor | Plan | Preț/lună | Disc | Locație | Observații |
|---|---|---|---|---|---|
| **Hetzner** ⭐ | CX23 (2 vCPU / 4 GB) | **5,49 €** + 0,50 € IPv4 | 40 GB NVMe | Germania, Finlanda | Cel mai bun raport preț/calitate din Europa. Backup +20%. |
| **OVHcloud** | VPS-1 | **3,81 €** (angajament 12 luni) | 40 GB NVMe | Franța, Germania, Polonia | Cel mai ieftin, backup zilnic inclus. **De confirmat la comandă că planul are 2 vCPU / 4 GB** — variantele de bază OVH sunt uneori mai mici. |
| **Contabo** | Cloud VPS 4 (4 vCPU / 8 GB) | **5,50 €** (tarif 24 luni, TVA inclus) | 100 GB SSD | Germania | Cele mai multe resurse pe bani. Este furnizorul pe care rulează deja versiunea de test. |
| Vultr | vc2-2c-4gb | ~20 USD | 80 GB | Amsterdam, Frankfurt ș.a. | Mai scump, fără avantaj clar. |
| DigitalOcean | s-2vcpu-4gb | ~24 USD | 80 GB | Amsterdam, Frankfurt | Documentație excelentă, dar de 4× prețul Hetzner. |

**Recomandarea mea: Hetzner CX23.** Preț mic, hardware bun, datacentere în UE, reputație solidă. Dacă vrei backup automat, adaugă ~20% (≈1,10 €/lună) — merită.

## 10. Alternativa „românească" (facturare în RON, suport în română)

Utilă dacă firma are nevoie de factură de la furnizor român sau vrei suport telefonic în română. Toate cele de mai jos oferă **VPS cu acces root** — niciunul nu te obligă la hosting partajat.

| Furnizor | Preț/lună | ≈ RON cu TVA | Datacenter | Backup inclus |
|---|---|---|---|---|
| **ROMARG** ⭐ | 10 € („preț fix pentru totdeauna") | ~63 lei | Brașov, Tier 3, ISO 27001 | nu |
| THC.ro | 9,13 € | ~58 lei | nespecificat | nu |
| HZone.ro | 9,99 € | ~63 lei | România | nu |
| HostX.ro | 9,99 € (promo; atenție la prețul de reînnoire) | ~65 lei | Târgu Mureș | nu |
| Zooku | 12,56–15,90 € | ~80 lei | București | **da** |
| Hostico | 19,99 € | ~129 lei | GTS București | **da** |

Dintre acestea, **ROMARG** pare cea mai echilibrată opțiune (datacenter certificat, preț blocat). **Zooku** dacă vrei backup inclus fără bătaie de cap.

Costă cam dublu față de Hetzner, pentru aceleași resurse — plătești suportul în română și factura locală.

> **Capcană de evitat:** hostingul partajat de la aceleași firme (planurile ieftine, de 3–5 €/lună, cu cPanel). Chiar dacă scrie „suport Node.js", acolo procesul se oprește la inactivitate și de obicei **nu există PostgreSQL, ci doar MySQL** — aplicația nu ar merge. Ia întotdeauna **VPS**, nu shared.

## 11. Opțiuni „deploy automat" (mai simple, dar mai scumpe)

Dacă vrei să nu administrezi deloc serverul (fără SSH, fără actualizări de sistem):

| Serviciu | Cost lunar realist | Verdict pentru această aplicație |
|---|---|---|
| **Coolify pe VPS** ⭐ | costul VPS-ului (5–10 €) | Cel mai bun compromis: panou de administrare cu deploy automat din GitHub, dar pe serverul tău. Software gratuit. |
| Render | ~85 USD (Pro) + 6–19 USD baza de date | Funcționează, dar scump. Discul persistent blochează actualizările fără întrerupere. |
| Fly.io | ~64 USD + 38 USD baza de date | Atenție: implicit **oprește** aplicația când nu are trafic — trebuie forțat `min_machines_running=1`, altfel licitațiile nu se mai închid. |
| Railway | ~80 USD la utilizare continuă | **Taie orice conexiune HTTP la 15 minute.** Actualizările live s-ar reconecta automat, dar cu întreruperi repetate. Nu oferă PostgreSQL administrat. |

## 12. Vercel — nu este potrivit (explicație)

Vercel e alegerea firească pentru site-uri Next.js, așa că merită spus clar de ce **nu** merge aici. Sunt trei blocaje, toate confirmate în documentația lor oficială:

1. **Nu poate închide licitațiile la timp.** Nu există proces permanent, iar sarcinile programate rulează cel mult o dată pe minut (pe planul gratuit: **o dată pe zi**). Platforma verifică la 15 secunde.
2. **Nu poate ține actualizările live.** Streaming-ul e limitat la 5 minute (gratuit) / ~13 minute (Pro) — „nu se poate transmite la nesfârșit", scriu ei explicit.
3. **Nu poate stoca pozele.** Sistemul de fișiere e doar-citire, iar cererile sunt limitate la 4,5 MB — sub limita de 5 MB per poză din aplicație.

Ar fi posibil cu rescrieri semnificative (Redis, stocare S3, alt mecanism live) — efort de zile, plus costuri lunare mai mari decât un VPS. Nu-l recomand.

## 13. Baza de date — pe același server sau separat?

**Recomandare: pe același server**, ca acum. E mai simplu, mai rapid (fără latență de rețea) și gratuit. Baza are 8 MB; va rămâne mică ani de zile.

Serviciu separat administrat are sens doar dacă vrei backup-uri și actualizări gestionate de altcineva. Cele mai ieftine cu regiune UE, verificate azi: **Aiven** de la 12 USD/lună, **Scaleway** de la 11,37 €/lună, **Neon** ~19 USD/lună la funcționare continuă. Atenție la variantele gratuite (Neon, Supabase): **își pun baza în pauză** la inactivitate — pentru o platformă de licitații care trebuie să închidă loturi non-stop, e exclus.

## 14. Costul total estimat

| Element | Cost lunar |
|---|---|
| VPS (Hetzner CX23) | 5,49 € |
| IPv4 | 0,50 € |
| Backup automat | ~1,10 € |
| Domeniu .ro (~15 €/an) | ~1,25 € |
| Certificat SSL (Let's Encrypt) | 0 € |
| Bază de date (pe același server) | 0 € |
| **Total** | **~8,30 €/lună** (~44 lei) |

De adăugat mai târziu, când platforma devine reală: serviciu de e-mail (gratuit până la ~3.000 mesaje/lună la Resend sau Brevo), comisioanele Stripe (procent din tranzacții, fără abonament) și eventual SMS (per mesaj).

## 15. Ce să ceri furnizorului înainte să semnezi

Copiază lista asta în discuția cu ei:

1. VPS cu acces root, minim 2 vCPU / 4 GB RAM / 40 GB SSD, datacenter în UE.
2. Confirmarea că pot rula un proces Node.js permanent, care nu se oprește la inactivitate.
3. Confirmarea că pot instala PostgreSQL 16+ sau că oferă o bază administrată.
4. Confirmarea că nu există limită de durată impusă pe conexiunile HTTP (Server-Sent Events) și că nu se face buffering pe proxy.
5. Posibilitatea de a instala certificat Let's Encrypt gratuit.
6. Politica de backup: ce se salvează, cât de des, cât timp se păstrează, cum se restaurează.
7. Trafic inclus și ce se întâmplă la depășire (unii facturează suplimentar).

---

*Notă de transparență: cifrele din tabele au fost verificate pe paginile oficiale la 15 august 2026. Câteva nu au putut fi confirmate direct (traficul inclus la Hetzner, prețul de backup la Contabo — paginile lor oficiale se contrazic, configurația exactă a planului OVH VPS-1) și sunt marcate ca atare. Confirmă-le la comandă.*
