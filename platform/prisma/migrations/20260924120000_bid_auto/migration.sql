-- Raspunsul automat al platformei in numele liderului, ca sa nu mai rescriem
-- randuri deja scrise in istoricul ofertelor.
ALTER TABLE "Bid" ADD COLUMN "auto" BOOLEAN NOT NULL DEFAULT false;
