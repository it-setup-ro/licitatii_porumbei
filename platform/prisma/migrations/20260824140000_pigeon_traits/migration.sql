-- Caracteristicile detaliate ale porumbelului (ochi, constitutie, aripa),
-- dupa modelul fisei de pe pipa.be. Un singur camp JSON, cu chei si valori
-- dintr-o lista fixa validata in cod (src/lib/pigeon-traits.ts).

ALTER TABLE "Pigeon" ADD COLUMN "traitsJson" TEXT;
