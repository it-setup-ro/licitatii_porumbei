-- Nickname public, pret de rezerva ascuns si urma anuntului de final.

ALTER TABLE "User" ADD COLUMN "nickname" TEXT;
ALTER TABLE "Auction" ADD COLUMN "reservePriceCents" INTEGER;
ALTER TABLE "Auction" ADD COLUMN "endingNotifiedAt" TIMESTAMP(3);

-- Conturile existente primesc un nickname pornind de la nume: „Ion Campeanu”
-- devine „IonC”. Fara diacritice si fara spatii, ca sa arate a poreclă, nu a
-- nume real. Daca se repeta, se adauga cifre din id.
UPDATE "User" SET "nickname" =
  REGEXP_REPLACE(
    TRANSLATE(
      SPLIT_PART("name", ' ', 1) ||
      COALESCE(LEFT(NULLIF(SPLIT_PART("name", ' ', 2), ''), 1), ''),
      'ăâîșşțţĂÂÎȘŞȚŢ',
      'aaissttAAISSTT'
    ),
    '[^A-Za-z0-9]', '', 'g'
  );

UPDATE "User" SET "nickname" = 'Ofertant' WHERE "nickname" IS NULL OR "nickname" = '';

-- unicitate: cine s-a ciocnit primeste un sufix din propriul id
UPDATE "User" u SET "nickname" = u."nickname" || RIGHT(u."id", 4)
WHERE EXISTS (
  SELECT 1 FROM "User" v WHERE v."nickname" = u."nickname" AND v."id" <> u."id"
);

CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");
