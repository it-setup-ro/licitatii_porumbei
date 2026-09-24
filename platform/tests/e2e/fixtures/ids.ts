/**
 * Câteva adrese reale din baza de test (un porumbel, un articol, un produs…),
 * ca harta de acces să poată deschide și paginile care cer un identificator.
 * Scrie un singur rând de JSON la ieșire.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

(async () => {
  const [auction, article, product, sale, contest, breeder, info, faq] = await Promise.all([
    prisma.auction.findFirst({ where: { status: "LIVE" }, select: { id: true } }),
    prisma.article.findFirst({ where: { publishedAt: { not: null } }, select: { slug: true } }),
    prisma.product.findFirst({ select: { slug: true } }),
    // o licitație care chiar se vede public: nearhivată, cu un lot pornit
    prisma.sale.findFirst({
      where: { archivedAt: null, lots: { some: { status: { not: "DRAFT" } } } },
      select: { id: true, slug: true },
    }),
    prisma.contest.findFirst({ select: { slug: true } }),
    // pagina „crescătorului" din meniu e a unui cont de vânzător aprobat
    prisma.user.findFirst({ where: { sellerStatus: "APPROVED" }, select: { id: true } }),
    // doar paginile care chiar se deschid la /info/… („Transport și Agenți"
    // și „Contact" au adresele lor)
    prisma.contentPage.findFirst({
      where: { slug: { in: ["termeni-si-conditii", "politica-de-confidentialitate", "regulament", "alte-info"] } },
      select: { slug: true },
    }),
    prisma.faqItem.findFirst({ select: { id: true } }),
  ]);

  console.log(
    JSON.stringify({
      auctionId: auction?.id ?? null,
      articleSlug: article?.slug ?? null,
      productSlug: product?.slug ?? null,
      saleId: sale?.id ?? null,
      saleSlug: sale?.slug ?? null,
      contestSlug: contest?.slug ?? null,
      sellerUserId: breeder?.id ?? null,
      infoSlug: info?.slug ?? null,
      faqId: faq?.id ?? null,
    })
  );
  await prisma.$disconnect();
})();
