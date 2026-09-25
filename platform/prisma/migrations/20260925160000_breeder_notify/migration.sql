-- Bifa din Fisa mea: vrea e-mail la inchiderea lotului si la decont.
-- Pornita pentru toti: cine nu vrea, o scoate singur.
ALTER TABLE "Breeder" ADD COLUMN "notifyByEmail" BOOLEAN NOT NULL DEFAULT true;
