-- Numar de ordine pentru oferte: doua randuri scrise in aceeasi tranzactie
-- au aceeasi ora, deci ordonarea dupa timp nu le poate despartii.
ALTER TABLE "Bid" ADD COLUMN "seq" SERIAL;
