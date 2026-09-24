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
    prisma.sale.findFirst({ select: { id: true, slug: true } }),
    prisma.contest.findFirst({ select: { slug: true } }),
    prisma.breeder.findFirst({ select: { id: true } }),
    prisma.contentPage.findFirst({ select: { slug: true } }),
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
      breederId: breeder?.id ?? null,
      infoSlug: info?.slug ?? null,
      faqId: faq?.id ?? null,
    })
  );
  await prisma.$disconnect();
})();
