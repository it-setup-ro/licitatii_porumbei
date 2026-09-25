-- Contul de crescator: legatura dintre fisa crescatorului si un cont de pe site.
-- Aditiv: crescatorii de pana acum ramin fara cont (userId NULL).
ALTER TABLE "Breeder" ADD COLUMN "userId" TEXT;
CREATE UNIQUE INDEX "Breeder_userId_key" ON "Breeder"("userId");
ALTER TABLE "Breeder" ADD CONSTRAINT "Breeder_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
