import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedSections } from "./seed-sections";

const prisma = new PrismaClient();

const H = 3_600_000;
const D = 24 * H;

async function main() {
  console.log("Seeding...");
  await prisma.$transaction([
    prisma.shopOrderItem.deleteMany(),
    prisma.shopOrder.deleteMany(),
    prisma.product.deleteMany(),
    prisma.article.deleteMany(),
    prisma.contentPage.deleteMany(),
    prisma.externalLink.deleteMany(),
    prisma.contactMessage.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.emailLog.deleteMany(),
    prisma.review.deleteMany(),
    prisma.order.deleteMany(),
    prisma.watchItem.deleteMany(),
    prisma.bid.deleteMany(),
    prisma.auction.deleteMany(),
    prisma.contest.deleteMany(),
    prisma.pigeonResult.deleteMany(),
    prisma.mediaAsset.deleteMany(),
    prisma.pigeon.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.user.deleteMany(),
    // setarile schimbate din admin se sterg si ele: altfel „readu datele demo"
    // lasa in urma un comision sau o durata modificate la rularea anterioara
    prisma.platformSetting.deleteMany(),
  ]);

  const pass = (p: string) => bcrypt.hashSync(p, 10);
  const now = Date.now();

  const admin = await prisma.user.create({
    data: {
      email: "admin@nbp.test",
      passwordHash: pass("admin1234"),
      name: "Daniel Admin",
      role: "ADMIN",
      locale: "ro",
      emailVerifiedAt: new Date(),
    },
  });

  const seller = await prisma.user.create({
    data: {
      email: "seller@nbp.test",
      passwordHash: pass("seller1234"),
      name: "Ion Câmpeanu",
      role: "SELLER",
      sellerStatus: "APPROVED",
      sellerCompany: "Columbodromul Câmpeanu",
      sellerCui: "RO12345678",
      sellerIban: "RO49AAAA1B31007593840000",
      sellerBio:
        "Crescător de fond și mare fond din Ardeal, cu linii Janssen și Van Loon de peste 20 de ani. Peste 40 de premii naționale.",
      locale: "ro",
      completedOrders: 5,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.user.create({
    data: {
      email: "pending-seller@nbp.test",
      passwordHash: pass("seller1234"),
      name: "Vasile Porumbaru",
      role: "SELLER",
      sellerStatus: "PENDING",
      sellerCompany: "Loft Porumbaru",
      sellerIban: "RO12BBBB1B31007593840111",
      locale: "ro",
    },
  });

  const buyer1 = await prisma.user.create({
    data: {
      email: "buyer1@nbp.test",
      passwordHash: pass("buyer1234"),
      name: "Mihai Popescu",
      locale: "ro",
      completedOrders: 2,
      emailVerifiedAt: new Date(),
    },
  });

  const buyer2 = await prisma.user.create({
    data: {
      email: "buyer2@nbp.test",
      passwordHash: pass("buyer1234"),
      name: "John Carter",
      locale: "en",
      completedOrders: 0, // cont nou -> limita de licitare activa
    },
  });

  const pedigree = (prefix: string) =>
    JSON.stringify({
      sire: {
        ring: `${prefix}-S`,
        name: "Blue Thunder",
        note: "As al zonei, 1° Național Fond",
        sire: { ring: `${prefix}-SS`, name: "Old Thunder" },
        dam: { ring: `${prefix}-SD`, name: "Storm Lady" },
      },
      dam: {
        ring: `${prefix}-D`,
        name: "Golden Wing",
        note: "Mamă de campioni",
        sire: { ring: `${prefix}-DS`, name: "Goldfinger" },
        dam: { ring: `${prefix}-DD`, name: "Silver Queen" },
      },
    });

  // 1) Licitatie LIVE cu oferte (se inchide in 3 zile)
  const p1 = await prisma.pigeon.create({
    data: {
      sellerId: seller.id,
      ringNumber: "RO 2023 445566",
      birthYear: 2023,
      sex: "M",
      color: "Vânăt",
      strain: "Janssen",
      name: "Fulger Albastru",
      taglineRo: "3. Fond Arad 2024 — 2.140 porumbei · frate de cuib cu 1° Arad",
      taglineEn: "3rd Long Distance Arad 2024 — 2,140 birds · nest brother to 1st Arad",
      bredBy: "Janssen Bros. — import 2019",
      offeredBy: "Columbodromul Câmpeanu",
      pedigreeUrl: "/pigeons/pedigree-fulger-albastru.svg",
      descRo:
        "Mascul excepțional din linia Janssen, frate de cuib cu 1° Ararad Fond 2024. Ochi de vultur, penaj impecabil, construcție perfectă pentru fond.",
      descEn:
        "Exceptional Janssen cock, nest brother to 1st Arad Long Distance 2024. Eagle eye, impeccable feathering, perfect long-distance build.",
      pedigreeJson: pedigree("RO-445566"),
      // fisa detaliata, ca pe pipa (vezi src/lib/pigeon-traits.ts)
      traitsJson: JSON.stringify({
        eyeColor: "orange",
        disciplines: ["middle", "long"],
        size: "medium",
        thickness: "normal",
        vitality: "strong",
        colorDensity: "strong",
        length: "long",
        strength: "strong",
        ventboneStrength: "strong",
        ventbonePosition: "veryClosed",
        muscles: "supple",
        balance: "balanced",
        back: "strong",
        breedingFeathers: "squareLong",
        feather: "long",
        plumage: "thick",
        feathersTexture: "soft",
        secondaries: "regular",
        suppleness: "supple",
      }),
      dnaCertified: true,
      media: {
        create: [
          { type: "IMAGE", url: "/pigeons/voiajor-vanat-bara.jpg", title: "Profil", sortIdx: 0 },
        ],
      },
      results: {
        create: [
          { raceName: "Arad — Fond", year: 2024, distanceKm: 520, place: 3, participants: 2140 },
          { raceName: "Oradea — Demifond", year: 2024, distanceKm: 380, place: 7, participants: 3200 },
          { raceName: "Satu Mare", year: 2025, distanceKm: 410, place: 1, participants: 1875 },
        ],
      },
    },
  });

  const a1 = await prisma.auction.create({
    data: {
      pigeonId: p1.id,
      sellerId: seller.id,
      status: "LIVE",
      startPriceCents: 20_000,
      currentPriceCents: 32_000,
      startsAt: new Date(now - 4 * D),
      endsAt: new Date(now + 3 * D),
      originalEndsAt: new Date(now + 3 * D),
      dnaSexGuaranteed: true,
      shippingMode: "SELLER",
      approvedAt: new Date(now - 5 * D),
      approvedById: admin.id,
    },
  });
  await prisma.bid.createMany({
    data: [
      {
        auctionId: a1.id,
        bidderId: buyer2.id,
        amountCents: 20_000,
        maxAmountCents: 30_000,
        isLeading: false,
        createdAt: new Date(now - 3 * D),
      },
      {
        auctionId: a1.id,
        bidderId: buyer1.id,
        amountCents: 22_000,
        maxAmountCents: 22_000,
        isLeading: false,
        createdAt: new Date(now - 3 * D + 2 * 3_600_000),
      },
      {
        auctionId: a1.id,
        bidderId: buyer2.id,
        amountCents: 25_000,
        maxAmountCents: 25_000,
        isLeading: false,
        createdAt: new Date(now - 3 * D + 5 * 3_600_000),
      },
      {
        auctionId: a1.id,
        bidderId: buyer1.id,
        amountCents: 28_000,
        maxAmountCents: 28_000,
        isLeading: false,
        createdAt: new Date(now - 2 * D - 3_600_000),
      },
      {
        auctionId: a1.id,
        bidderId: buyer1.id,
        amountCents: 32_000,
        maxAmountCents: 50_000,
        isLeading: true,
        createdAt: new Date(now - 2 * D),
      },
    ],
  });

  // 2) Licitatie LIVE care se inchide curand (2 ore)
  const p2 = await prisma.pigeon.create({
    data: {
      sellerId: seller.id,
      ringNumber: "RO 2022 118822",
      birthYear: 2022,
      sex: "F",
      color: "Albastru deschis",
      strain: "Van Loon",
      name: "Regina Nordului",
      taglineRo: "1. As demifond județean 2024 · linie Van Loon pură",
      taglineEn: "1st county middle-distance ace 2024 · pure Van Loon line",
      bredBy: "Van Loon (import 2022)",
      offeredBy: "Columbodromul Câmpeanu",
      pedigreeUrl: "/pigeons/pedigree-regina-nordului.svg",
      descRo:
        "Femelă de excepție, dublu As Demifond regional. Mamă a doi pui clasați în top 10 național.",
      descEn:
        "Outstanding hen, twice regional Middle Distance Ace. Dam of two youngsters placed top 10 national.",
      pedigreeJson: pedigree("RO-118822"),
      media: {
        create: [{ type: "IMAGE", url: "/pigeons/voiajor-vanat-pestrit.jpg", title: "Profil", sortIdx: 0 }],
      },
      results: {
        create: [
          { raceName: "As Demifond Regional", year: 2023, place: 1, participants: 5400 },
          { raceName: "As Demifond Regional", year: 2024, place: 1, participants: 4900 },
        ],
      },
    },
  });
  await prisma.auction.create({
    data: {
      pigeonId: p2.id,
      sellerId: seller.id,
      status: "LIVE",
      startPriceCents: 15_000,
      currentPriceCents: 0,
      startsAt: new Date(now - 13 * D),
      endsAt: new Date(now + 2 * H),
      originalEndsAt: new Date(now + 2 * H),
      shippingMode: "SELLER",
      approvedAt: new Date(now - 14 * D),
      approvedById: admin.id,
    },
  });

  // 3) Licitatie programata (incepe in 2 zile)
  const p3 = await prisma.pigeon.create({
    data: {
      sellerId: seller.id,
      ringNumber: "RO 2024 990011",
      birthYear: 2024,
      sex: "M",
      color: "Roșcat",
      strain: "Van den Bulck",
      name: "Vânt de Vest",
      taglineRo: "Yearling de viteză, din cuplul care a dat 2 ași",
      taglineEn: "Speed yearling, out of the pair that produced 2 aces",
      bredBy: "Columbodromul Câmpeanu",
      offeredBy: "Columbodromul Câmpeanu",
      pedigreeUrl: "/pigeons/pedigree-vant-de-vest.svg",
      descRo: "Yearling promițător din linia Van den Bulck, pregătit pentru sezonul de viteză.",
      descEn: "Promising Van den Bulck yearling, ready for the sprint season.",
      pedigreeJson: pedigree("RO-990011"),
      media: {
        create: [{ type: "IMAGE", url: "/pigeons/voiajor-deschis.jpg", title: "Profil", sortIdx: 0 }],
      },
    },
  });
  await prisma.auction.create({
    data: {
      pigeonId: p3.id,
      sellerId: seller.id,
      status: "SCHEDULED",
      startPriceCents: 10_000,
      currentPriceCents: 0,
      startsAt: new Date(now + 2 * D),
      endsAt: new Date(now + 16 * D),
      originalEndsAt: new Date(now + 16 * D),
      shippingMode: "PICKUP",
      approvedAt: new Date(now - 1 * D),
      approvedById: admin.id,
    },
  });

  // 4) Licitatie inchisa, cu comanda platita si recenzie
  const p4 = await prisma.pigeon.create({
    data: {
      sellerId: seller.id,
      ringNumber: "RO 2021 337788",
      birthYear: 2021,
      sex: "M",
      color: "Negru",
      strain: "Aarden",
      name: "As de Fond",
      taglineRo: "Mascul Aarden pentru mare fond · 5 clasări naționale",
      taglineEn: "Aarden marathon cock · 5 national placings",
      bredBy: "Aarden — linia originală",
      offeredBy: "Columbodromul Câmpeanu",
      pedigreeUrl: "/pigeons/pedigree-as-de-fond.svg",
      descRo: "Mascul de mare fond cu clasări constante peste 700 km.",
      descEn: "Marathon cock with consistent placings beyond 700 km.",
      pedigreeJson: pedigree("RO-337788"),
      media: {
        create: [{ type: "IMAGE", url: "/pigeons/voiajor-robust.jpg", title: "Profil", sortIdx: 0 }],
      },
      results: {
        create: [
          { raceName: "Bratislava — Mare Fond", year: 2023, distanceKm: 720, place: 12, participants: 6100 },
        ],
      },
    },
  });
  const a4 = await prisma.auction.create({
    data: {
      pigeonId: p4.id,
      sellerId: seller.id,
      status: "CLOSED",
      startPriceCents: 25_000,
      currentPriceCents: 61_000,
      startsAt: new Date(now - 20 * D),
      endsAt: new Date(now - 5 * D),
      originalEndsAt: new Date(now - 5 * D),
      closedAt: new Date(now - 5 * D),
      winnerId: buyer1.id,
      approvedAt: new Date(now - 21 * D),
      approvedById: admin.id,
    },
  });
  const winBid = await prisma.bid.create({
    data: {
      auctionId: a4.id,
      bidderId: buyer1.id,
      amountCents: 61_000,
      maxAmountCents: 80_000,
      isLeading: true,
      createdAt: new Date(now - 6 * D),
    },
  });
  await prisma.auction.update({ where: { id: a4.id }, data: { winningBidId: winBid.id } });
  const order4 = await prisma.order.create({
    data: {
      auctionId: a4.id,
      buyerId: buyer1.id,
      sellerId: seller.id,
      amountCents: 61_000,
      commissionCents: 7_320,
      status: "DELIVERED",
      paymentRef: "mock_seed_order4",
      paidAt: new Date(now - 4 * D),
      payoutStatus: "RELEASED",
      payoutAt: new Date(now - 4 * D),
    },
  });
  await prisma.review.create({
    data: {
      orderId: order4.id,
      sellerId: seller.id,
      authorId: buyer1.id,
      rating: 5,
      comment: "Porumbel superb, exact ca în descriere. Livrare rapidă și comunicare excelentă!",
      status: "VISIBLE",
      editableUntil: new Date(now + 25 * D),
    },
  });

  // 5) Lot in asteptarea aprobarii (pentru fluxul de moderare admin)
  const p5 = await prisma.pigeon.create({
    data: {
      sellerId: seller.id,
      ringNumber: "RO 2024 220044",
      birthYear: 2024,
      sex: "F",
      color: "Pestriț",
      strain: "Janssen x Van Loon",
      name: "Perla",
      taglineRo: "Femelă tânără din cuplul de aur al crescătoriei",
      taglineEn: "Young hen from the loft's golden pair",
      bredBy: "Columbodromul Câmpeanu",
      offeredBy: "Columbodromul Câmpeanu",
      pedigreeUrl: "/pigeons/pedigree-perla.svg",
      descRo: "Femelă tânără din cuplul de bază al crescătoriei.",
      descEn: "Young hen from the loft's foundation pair.",
      pedigreeJson: pedigree("RO-220044"),
      media: {
        create: [{ type: "IMAGE", url: "/pigeons/voiajor-alb-bara.jpg", title: "Profil", sortIdx: 0 }],
      },
    },
  });
  await prisma.auction.create({
    data: {
      pigeonId: p5.id,
      sellerId: seller.id,
      status: "PENDING_APPROVAL",
      startPriceCents: 12_000,
      currentPriceCents: 0,
      startsAt: new Date(now + 3 * D),
      endsAt: new Date(now + 17 * D),
      originalEndsAt: new Date(now + 17 * D),
    },
  });

  await seedSections(prisma, {
    now,
    adminId: admin.id,
    sellerId: seller.id,
    mainAuctionId: a1.id,
    pedigree,
  });

  console.log("Seed complet: admin@nbp.test/admin1234, seller@nbp.test/seller1234, buyer1@nbp.test/buyer1234, buyer2@nbp.test/buyer1234");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
