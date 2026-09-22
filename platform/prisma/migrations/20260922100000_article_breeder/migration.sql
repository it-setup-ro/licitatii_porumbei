-- Articolele se pot lega de un crescător, ca să apară pe pagina lui.
ALTER TABLE "Article" ADD COLUMN "breederId" TEXT;
CREATE INDEX "Article_breederId_idx" ON "Article"("breederId");
ALTER TABLE "Article" ADD CONSTRAINT "Article_breederId_fkey" FOREIGN KEY ("breederId") REFERENCES "Breeder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
