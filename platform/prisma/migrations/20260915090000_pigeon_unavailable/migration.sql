-- Porumbel indisponibil după licitație (clientul, Punctul 5): doar coloane noi.
ALTER TABLE "Auction" ADD COLUMN "unavailableAt" TIMESTAMP(3),
ADD COLUMN "unavailableReason" TEXT;
