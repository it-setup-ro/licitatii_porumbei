import { PrismaClient } from "@prisma/client";

/**
 * Date demo pentru secțiunile noi: preț fix, concursuri, produse, articole,
 * pagini de conținut. Ținute separat de seed.ts ca fișierul principal să
 * rămână lizibil.
 */

const H = 3_600_000;
const D = 24 * H;

export async function seedSections(
  prisma: PrismaClient,
  ctx: {
    now: number;
    adminId: string;
    sellerId: string;
    mainAuctionId: string;
    pedigree: (prefix: string) => string;
  }
) {
  const { now, adminId, sellerId, mainAuctionId, pedigree } = ctx;

  // ── Loturi la PREȚ FIX (fără licitație) ────────────────────────────────
  const fixed1 = await prisma.pigeon.create({
    data: {
      sellerId,
      ringNumber: "RO 2024 550077",
      birthYear: 2024,
      sex: "M",
      color: "Alb",
      strain: "Janssen",
      name: "Săgeata Albă",
      taglineRo: "Pui Janssen 2026, disponibil la preț fix",
      taglineEn: "Janssen youngster 2026, available at a fixed price",
      bredBy: "Columbodromul Câmpeanu",
      offeredBy: "Columbodromul Câmpeanu",
      descRo:
        "Pui din cuplul de bază al crescătoriei, disponibil imediat la preț fix. Fără licitație — primul cumpărător îl ia.",
      descEn:
        "Youngster from the loft's foundation pair, available immediately at a fixed price. No bidding — the first buyer takes it.",
      pedigreeJson: pedigree("RO-550077"),
      media: { create: [{ type: "IMAGE", url: "/pigeons/p3.svg", sortIdx: 0 }] },
    },
  });
  await prisma.auction.create({
    data: {
      pigeonId: fixed1.id,
      sellerId,
      status: "LIVE",
      saleMode: "FIXED",
      startPriceCents: 45_000,
      currentPriceCents: 45_000,
      startsAt: new Date(now - 2 * D),
      endsAt: new Date(now + 30 * D),
      originalEndsAt: new Date(now + 30 * D),
      approvedAt: new Date(now - 2 * D),
      approvedById: adminId,
    },
  });

  const fixed2 = await prisma.pigeon.create({
    data: {
      sellerId,
      ringNumber: "RO 2023 660088",
      birthYear: 2023,
      sex: "F",
      color: "Vânăt pestriț",
      strain: "Van Loon",
      name: "Perla Nordului",
      taglineRo: "Femelă de prăsilă cu origini verificate, preț fix",
      taglineEn: "Breeding hen with proven origins, fixed price",
      bredBy: "Columbodromul Câmpeanu",
      offeredBy: "Columbodromul Câmpeanu",
      descRo: "Femelă de prăsilă din linie testată, disponibilă imediat, fără licitație.",
      descEn: "Breeding hen from a proven line, available immediately, no bidding.",
      media: { create: [{ type: "IMAGE", url: "/pigeons/p5.svg", sortIdx: 0 }] },
    },
  });
  await prisma.auction.create({
    data: {
      pigeonId: fixed2.id,
      sellerId,
      status: "LIVE",
      saleMode: "FIXED",
      startPriceCents: 28_000,
      currentPriceCents: 28_000,
      startsAt: new Date(now - 1 * D),
      endsAt: new Date(now + 30 * D),
      originalEndsAt: new Date(now + 30 * D),
      approvedAt: new Date(now - 1 * D),
      approvedById: adminId,
    },
  });

  // ── Concursuri / campionate ────────────────────────────────────────────
  const contest = await prisma.contest.create({
    data: {
      slug: "campionatul-national-fond-2026",
      titleRo: "Campionatul Național de Fond 2026",
      titleEn: "National Long Distance Championship 2026",
      descRo:
        "Ediția 2026 a campionatului de fond organizat de No.1 & Best Pigeons. Crescătorii înscriși prezintă cei mai buni porumbei de fond, iar loturile de campionat se licitează separat.",
      descEn:
        "The 2026 edition of the long-distance championship organised by No.1 & Best Pigeons. Registered fanciers present their best long-distance pigeons, and championship lots are auctioned separately.",
      rulesRo:
        "Înscrierea se face până la 1 septembrie 2026.\n\nFiecare crescător poate înscrie maximum 5 porumbei.\n\nPorumbeii trebuie să aibă inel oficial și pedigree complet.\n\nClasamentul se face după media primelor 3 rezultate.",
      rulesEn:
        "Registration closes on 1 September 2026.\n\nEach fancier may enter a maximum of 5 pigeons.\n\nPigeons must have an official ring and a complete pedigree.\n\nRanking is based on the average of the best 3 results.",
      startsAt: new Date(now + 5 * D),
      endsAt: new Date(now + 60 * D),
      status: "UPCOMING",
      published: true,
    },
  });

  await prisma.contest.create({
    data: {
      slug: "cupa-de-primavara-2026",
      titleRo: "Cupa de Primăvară 2026",
      titleEn: "Spring Cup 2026",
      descRo: "Concurs de viteză pentru yearlingi, cu premii pentru primii trei clasați.",
      descEn: "Speed contest for yearlings, with prizes for the top three.",
      rulesRo: "Concurs încheiat. Clasamentul final este disponibil la cerere.",
      rulesEn: "Contest finished. The final ranking is available on request.",
      startsAt: new Date(now - 40 * D),
      endsAt: new Date(now - 5 * D),
      status: "FINISHED",
      published: true,
    },
  });

  // licitația principală face parte din campionat
  await prisma.auction.update({
    where: { id: mainAuctionId },
    data: { contestId: contest.id },
  });

  // ── Produse pentru columbofili ─────────────────────────────────────────
  await prisma.product.createMany({
    data: [
      {
        slug: "amestec-fond-premium-25kg",
        nameRo: "Amestec Fond Premium 25 kg",
        nameEn: "Premium Long Distance Mix 25 kg",
        descRo:
          "Amestec echilibrat pentru sezonul de fond: porumb, mazăre și semințe oleaginoase, cerință mare de energie.",
        descEn:
          "Balanced mix for the long-distance season: maize, peas and oil seeds, for high energy demand.",
        category: "FEED",
        priceCents: 4_500,
        stock: 40,
        imageUrl: "/products/feed.svg",
        sortIdx: 1,
      },
      {
        slug: "vitamine-electroliti-1l",
        nameRo: "Vitamine + Electroliți 1 L",
        nameEn: "Vitamins + Electrolytes 1 L",
        descRo: "Refacere rapidă după concurs. Se administrează în apa de băut, 2 zile după zbor.",
        descEn: "Fast recovery after a race. Administered in drinking water for 2 days after flying.",
        category: "SUPPLEMENTS",
        priceCents: 8_900,
        stock: 25,
        imageUrl: "/products/supplement.svg",
        sortIdx: 2,
      },
      {
        slug: "inele-oficiale-2027-set-25",
        nameRo: "Inele oficiale 2027 — set 25 buc.",
        nameEn: "Official 2027 rings — set of 25",
        descRo: "Inele numerotate pentru puii din 2027, livrate cu certificat de proveniență.",
        descEn: "Numbered rings for 2027 youngsters, delivered with a certificate of origin.",
        category: "RINGS",
        priceCents: 12_000,
        stock: 60,
        imageUrl: "/products/rings.svg",
        sortIdx: 3,
      },
      {
        slug: "cusca-transport-4-compartimente",
        nameRo: "Cușcă transport, 4 compartimente",
        nameEn: "Transport crate, 4 compartments",
        descRo: "Cușcă din plastic rezistent, ventilație pe toate laturile, ușor de dezinfectat.",
        descEn: "Sturdy plastic crate, ventilation on all sides, easy to disinfect.",
        category: "ACCESSORIES",
        priceCents: 21_500,
        stock: 8,
        imageUrl: "/products/crate.svg",
        sortIdx: 4,
      },
      {
        slug: "adapatoare-3l",
        nameRo: "Adăpătoare 3 L",
        nameEn: "Drinker 3 L",
        descRo: "Adăpătoare cu bază antirăsturnare, ușor de curățat.",
        descEn: "Drinker with anti-tip base, easy to clean.",
        category: "ACCESSORIES",
        priceCents: 3_200,
        stock: 0, // arata cum apare un produs epuizat
        imageUrl: "/products/drinker.svg",
        sortIdx: 5,
      },
    ],
  });

  // ── Articole ───────────────────────────────────────────────────────────
  await prisma.article.createMany({
    data: [
      {
        slug: "cum-alegi-un-porumbel-de-fond",
        titleRo: "Cum alegi un porumbel de fond",
        titleEn: "How to choose a long-distance pigeon",
        excerptRo:
          "La ce te uiți înainte să licitezi: consistența liniei, conformația și originea maternală.",
        excerptEn:
          "What to look at before you bid: consistency of the line, conformation and maternal origin.",
        bodyRo:
          "Alegerea unui porumbel de fond începe cu pedigree-ul, dar nu se termină acolo.\n\nPrimul lucru pe care îl verifici este consistența liniei: nu un singur rezultat spectaculos, ci rezultate repetate pe distanțe lungi, în ani diferiți și în condiții meteo variate. Un porumbel cu un singur premiu mare poate fi produsul unei zile norocoase; unul cu cinci clasări bune în trei ani este produsul unei genetici solide.\n\nAl doilea criteriu este conformația. Un porumbel de fond bun are musculatura fermă dar elastică, penajul mătăsos și aripa cu pene de zbor bine distanțate. Ține-l în mână: trebuie să pară mai ușor decât arată.\n\nAl treilea criteriu, adesea ignorat, este originea maternală. Multe crescătorii de top își construiesc rezultatele pe câteva femele de bază, iar o femelă bună transmite mai constant decât un mascul spectaculos.",
        bodyEn:
          "Choosing a long-distance pigeon starts with the pedigree, but it does not end there.\n\nThe first thing to check is the consistency of the line: not a single spectacular result, but repeated results over long distances, in different years and in varied weather. A pigeon with one big prize may be the product of a lucky day; one with five good placings over three years is the product of solid genetics.\n\nThe second criterion is conformation. A good long-distance pigeon has firm but elastic muscling, silky feathering and a wing with well-spaced flight feathers. Hold it in your hand: it should feel lighter than it looks.\n\nThe third criterion, often overlooked, is maternal origin. Many top lofts build their results on a few foundation hens, and a good hen passes on her qualities more consistently than a spectacular cock.",
        coverUrl: "/pigeons/p1b.svg",
        publishedAt: new Date(now - 6 * D),
      },
      {
        slug: "pregatirea-sezonului-de-concurs",
        titleRo: "Pregătirea sezonului de concurs",
        titleEn: "Preparing for the racing season",
        excerptRo: "Antrenament progresiv, alimentație adaptată efortului și control sanitar preventiv.",
        excerptEn: "Progressive training, effort-matched feeding and preventive health control.",
        bodyRo:
          "Sezonul se câștigă iarna, nu în ziua concursului.\n\nAntrenamentul progresiv începe cu zboruri scurte în jurul crescătoriei și crește gradual, cu atenție la recuperare între etape. Greșeala clasică este să mărești distanța prea repede: porumbeii ajung la primul concurs deja obosiți.\n\nAlimentația se ajustează după efort — amestec bogat în carbohidrați înainte de zbor, proteine pentru refacere după. Apa curată, schimbată zilnic, contează mai mult decât orice supliment.\n\nControlul sanitar preventiv, în special pentru trichomonoză și coccidioză, face diferența între o colonie care rezistă tot sezonul și una care cedează în iulie.",
        bodyEn:
          "The season is won in winter, not on race day.\n\nProgressive training starts with short flights around the loft and increases gradually, with attention to recovery between stages. The classic mistake is increasing distance too fast: the pigeons arrive at the first race already tired.\n\nFeeding is adjusted to effort — a carbohydrate-rich mix before flying, protein for recovery afterwards. Clean water, changed daily, matters more than any supplement.\n\nPreventive health control, especially for trichomoniasis and coccidiosis, makes the difference between a colony that lasts the whole season and one that collapses in July.",
        coverUrl: "/pigeons/p2.svg",
        publishedAt: new Date(now - 2 * D),
      },
      {
        slug: "ghid-transport-porumbei",
        titleRo: "Ghid: transportul porumbeilor cumpărați",
        titleEn: "Guide: transporting purchased pigeons",
        excerptRo: "Ce trebuie să știi despre transportul în siguranță după adjudecare.",
        excerptEn: "What you need to know about safe transport after winning a lot.",
        bodyRo:
          "După adjudecare, transportul este responsabilitatea comună a vânzătorului și a cumpărătorului.\n\nPorumbeii se transportă în cuști individuale sau cu maximum patru exemplare, cu apă disponibilă la drumuri de peste patru ore. Cuștile trebuie ventilate pe toate laturile și ferite de curent direct.\n\nPentru livrări interne recomandăm curieri specializați în animale vii — un curier obișnuit nu are voie și nici condiții pentru transport de păsări.\n\nPentru livrări internaționale se adaugă documentația sanitar-veterinară. Verifică cerințele înainte de a licita, nu după.",
        bodyEn:
          "After winning a lot, transport is the shared responsibility of the seller and the buyer.\n\nPigeons travel in individual crates or with a maximum of four birds, with water available on journeys over four hours. Crates must be ventilated on all sides and protected from direct draught.\n\nFor domestic deliveries we recommend couriers specialised in live animals — an ordinary courier is neither allowed nor equipped to transport birds.\n\nInternational deliveries additionally require veterinary documentation. Check the requirements before bidding, not after.",
        coverUrl: "/pigeons/p4.svg",
        publishedAt: new Date(now - 12 * H),
      },
    ],
  });

  // ── Pagini de conținut (editabile din admin) ───────────────────────────
  await prisma.contentPage.createMany({
    data: [
      {
        slug: "regulament",
        titleRo: "Regulamentul platformei",
        titleEn: "Platform rules",
        bodyRo:
          "## Reguli generale\n\nParticiparea la licitații presupune acceptarea acestui regulament.\n\n## Oferta este angajantă\n\nO ofertă plasată nu poate fi retrasă. Dacă ești lider la închiderea licitației, ești obligat să finalizezi plata în termenul afișat pe pagina comenzii.\n\n## Prelungirea automată (anti-sniping)\n\nOfertele plasate în ultimele minute prelungesc automat licitația, ca toți participanții să aibă șansa de a răspunde.\n\n## Plata\n\nPlata se face în termenul indicat pe pagina comenzii. Neplata repetată poate duce la suspendarea contului.\n\n## Garanții\n\nGaranțiile după vânzare — porumbel infertil, bolnav sau mort la sosire — sunt afișate pe fiecare lot în parte.\n\n*Text provizoriu, de validat cu un avocat înainte de lansarea publică.*",
        bodyEn:
          "## General rules\n\nParticipating in auctions implies acceptance of these rules.\n\n## Bids are binding\n\nA placed bid cannot be withdrawn. If you are the leading bidder at closing, you must complete payment within the deadline shown on the order page.\n\n## Automatic extension (anti-sniping)\n\nBids placed in the final minutes automatically extend the auction so that all participants have a chance to respond.\n\n## Payment\n\nPayment is due within the period indicated on the order page. Repeated non-payment may lead to account suspension.\n\n## Guarantees\n\nAftersales guarantees — infertile, sick or dead on arrival — are displayed on each individual lot.\n\n*Provisional text, to be validated by a lawyer before public launch.*",
      },
      {
        slug: "info-licitatii",
        titleRo: "Cum funcționează licitațiile",
        titleEn: "How the auctions work",
        bodyRo:
          "## Licitare automată (proxy-bidding)\n\nSetezi suma maximă pe care ești dispus să o plătești. Sistemul licitează automat pentru tine, cu pasul minim, doar cât e nevoie ca să rămâi lider. Plafonul tău rămâne secret față de ceilalți participanți.\n\n## Pașii de licitare\n\nPasul minim crește odată cu prețul lotului: 5 € sub 100 €, 10 € până la 500 €, 25 € până la 1.000 €, 50 € până la 5.000 € și 100 € peste această valoare.\n\n## Prelungirea automată\n\nO ofertă plasată în ultimele 5 minute prelungește licitația cu încă 5 minute, ca nimeni să nu câștige doar pentru că a licitat în ultima secundă.\n\n## Ora oficială\n\nToate termenele se raportează la ora afișată în bara de sus a site-ului, nu la ceasul calculatorului tău.\n\n## Preț fix\n\nUnele loturi se vând direct, fără licitație, la un preț afișat. Primul cumpărător care apasă „Cumpără acum” îl ia.",
        bodyEn:
          "## Automatic bidding (proxy bidding)\n\nYou set the maximum you are willing to pay. The system bids automatically for you, by the minimum increment, only as much as needed to keep you in the lead. Your ceiling stays secret from other participants.\n\n## Bid increments\n\nThe minimum step grows with the lot price: €5 below €100, €10 up to €500, €25 up to €1,000, €50 up to €5,000 and €100 above that.\n\n## Automatic extension\n\nA bid placed in the last 5 minutes extends the auction by another 5 minutes, so nobody wins simply by bidding in the final second.\n\n## Official time\n\nAll deadlines refer to the time shown in the top bar of the site, not to your computer's clock.\n\n## Fixed price\n\nSome lots are sold directly, without bidding, at a displayed price. The first buyer to press \"Buy now\" takes it.",
      },
      {
        slug: "alte-info",
        titleRo: "Alte informații despre site",
        titleEn: "Other information about the site",
        bodyRo:
          "## Conturi\n\nÎnregistrarea este gratuită. Conturile noi au o limită de licitare până la prima tranzacție finalizată — o măsură împotriva ofertelor false.\n\n## Conturi de crescător\n\nPentru a vinde, soliciți un cont de crescător din pagina de profil. Cererea este verificată manual de echipa noastră, cu date de identificare și IBAN.\n\n## Confidențialitate\n\nNumele ofertanților apar mascate public (de exemplu „M. P***”). Datele personale sunt prelucrate conform GDPR.\n\n## Limbi\n\nSite-ul este disponibil în română și engleză, cu comutator în bara de sus.\n\n## Notificări\n\nPrimești notificări în cont și pe e-mail când ești depășit la o licitație, când câștigi un lot sau când o comandă își schimbă starea.",
        bodyEn:
          "## Accounts\n\nRegistration is free. New accounts have a bidding limit until the first completed transaction — a measure against fake bids.\n\n## Fancier accounts\n\nTo sell, you request a fancier account from your profile page. The request is checked manually by our team, with identification details and IBAN.\n\n## Privacy\n\nBidder names are masked in public (for example \"M. P***\"). Personal data is processed in accordance with GDPR.\n\n## Languages\n\nThe site is available in Romanian and English, with a switcher in the top bar.\n\n## Notifications\n\nYou receive notifications in your account and by e-mail when you are outbid, when you win a lot, or when an order changes state.",
      },
      {
        slug: "transport-agenti",
        titleRo: "Transport și agenți",
        titleEn: "Shipping and agents",
        bodyRo:
          "## Cum ajunge porumbelul la tine\n\nTransportul este organizat de vânzător, dacă nu se specifică altfel pe pagina lotului. Costul este suportat de cumpărător și se achită separat de prețul de adjudecare.\n\n## Ridicare personală\n\nUnele loturi permit ridicarea directă de la crescătorie. Acest lucru apare menționat pe pagina lotului, la secțiunea Livrare.\n\n## Livrări în România\n\nRecomandăm curieri specializați în transportul animalelor vii. Porumbeii călătoresc în cuști ventilate, cu apă disponibilă la drumurile lungi.\n\n## Livrări internaționale\n\nNecesită documentație sanitar-veterinară. Dacă ești din afara României, contactează-ne înainte de a licita, ca să confirmăm ce documente sunt necesare pentru țara ta.\n\n## Agenți\n\n*Rețeaua de agenți pe țări urmează să fie completată. Până atunci, ne poți contacta direct prin formularul din pagina Contact.*",
        bodyEn:
          "## How the pigeon reaches you\n\nTransport is arranged by the seller unless stated otherwise on the lot page. The cost is borne by the buyer and paid separately from the hammer price.\n\n## Personal pickup\n\nSome lots allow direct pickup from the loft. This is stated on the lot page, under Shipping.\n\n## Deliveries within Romania\n\nWe recommend couriers specialised in live animal transport. Pigeons travel in ventilated crates, with water available on long journeys.\n\n## International deliveries\n\nRequire veterinary documentation. If you are outside Romania, contact us before bidding so we can confirm which documents are needed for your country.\n\n## Agents\n\n*The country agent network is yet to be completed. Until then, you can contact us directly through the form on the Contact page.*",
      },
      {
        slug: "despre-noi",
        titleRo: "Despre noi",
        titleEn: "About us",
        bodyRo:
          "## No.1 & Best Pigeons\n\nSuntem o platformă de licitații dedicată porumbeilor voiajori de performanță, construită de columbofili pentru columbofili.\n\n## Ce ne diferențiază\n\nPedigree verificat pe fiecare lot, licitare live transparentă cu prelungire automată în ultimele minute, și crescători verificați manual înainte de a putea vinde.\n\n## Misiunea noastră\n\nSă aducem piața românească de porumbei de performanță la standardul platformelor internaționale, păstrând corectitudinea și transparența în fiecare tranzacție.\n\n*Text provizoriu — de completat cu povestea și datele reale ale firmei.*",
        bodyEn:
          "## No.1 & Best Pigeons\n\nWe are an auction platform dedicated to performance racing pigeons, built by fanciers for fanciers.\n\n## What sets us apart\n\nVerified pedigree on every lot, transparent live bidding with automatic extension in the final minutes, and fanciers manually vetted before they are allowed to sell.\n\n## Our mission\n\nTo bring the Romanian performance pigeon market up to the standard of international platforms, while keeping fairness and transparency in every transaction.\n\n*Provisional text — to be completed with the company's real story and details.*",
      },
      {
        slug: "contact",
        titleRo: "Contact",
        titleEn: "Contact",
        bodyRo:
          "Ai o întrebare despre o licitație, un lot sau contul tău? Scrie-ne folosind formularul de mai jos și îți răspundem în cel mai scurt timp.\n\n*Datele de contact — adresă, telefon, program — urmează să fie completate.*",
        bodyEn:
          "Do you have a question about an auction, a lot or your account? Write to us using the form below and we will reply as soon as possible.\n\n*Contact details — address, phone, opening hours — are yet to be completed.*",
      },
    ],
  });

  // ── Linkuri externe pentru submeniul „Concursuri" ──────────────────────
  // Sunt editabile din admin: cand apar clasamentele 2027, se schimba doar URL-ul.
  await prisma.externalLink.createMany({
    data: [
      {
        group: "CONTESTS",
        labelRo: "Clasamente 2026",
        labelEn: "2026 Rankings",
        url: "https://anunturi-porumbei.ro/clasamente_2026.php?tipic=fm",
        sortIdx: 1,
      },
      {
        group: "CONTESTS",
        labelRo: "Asociații 2026",
        labelEn: "2026 Associations",
        url: "https://columba.ro/competitie/asociatii-2026.html",
        sortIdx: 2,
      },
      {
        group: "CONTESTS",
        labelRo: "One loft races",
        labelEn: "One loft races",
        url: null, // inca fara adresa -> apare ca „in curand"
        sortIdx: 3,
      },
      {
        group: "CONTESTS",
        labelRo: "UNCR — COLUMBA",
        labelEn: "UNCR — COLUMBA",
        url: "https://columba.ro",
        sortIdx: 4,
      },
      {
        group: "CONTESTS",
        labelRo: "F.R.S.C.",
        labelEn: "F.R.S.C.",
        url: "https://federatiaromanasportivcolumbofila.ro",
        sortIdx: 5,
      },
      {
        group: "CONTESTS",
        labelRo: "U.C.P.",
        labelEn: "U.C.P.",
        url: "https://ucpt.ro",
        sortIdx: 6,
      },
    ],
  });

  console.log("  + preț fix (2), concursuri (2), produse (5), articole (3), pagini (6), linkuri externe (6)");
}
