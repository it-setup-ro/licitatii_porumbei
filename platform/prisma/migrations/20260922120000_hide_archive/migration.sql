-- Ascunderea si arhivarea cerute de client: un porumbel scos de pe site, o
-- licitatie veche arhivata, un crescator ascuns. Nimic nu se sterge.
ALTER TABLE "Auction" ADD COLUMN "hiddenAt" TIMESTAMP(3);
ALTER TABLE "Sale" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Breeder" ADD COLUMN "hiddenAt" TIMESTAMP(3);
