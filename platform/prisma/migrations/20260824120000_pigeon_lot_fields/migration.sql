-- Campurile cerute pe pagina de lot, in formatul pipa.be:
-- nume porumbel, rand scurt de descriere (rubrica), reprodus de, oferit de,
-- si scanul pedigree-ului.
--
-- Titlurile vechi ("Fulger Albastru — mascul Janssen de fond") se despica in
-- nume + rubrica dupa liniuta lunga; daca nu exista liniuta, tot titlul devine
-- nume, iar rubrica ramane goala.

ALTER TABLE "Pigeon" ADD COLUMN "name" TEXT;
ALTER TABLE "Pigeon" ADD COLUMN "taglineRo" TEXT;
ALTER TABLE "Pigeon" ADD COLUMN "taglineEn" TEXT;
ALTER TABLE "Pigeon" ADD COLUMN "bredBy" TEXT;
ALTER TABLE "Pigeon" ADD COLUMN "offeredBy" TEXT;
ALTER TABLE "Pigeon" ADD COLUMN "pedigreeUrl" TEXT;

UPDATE "Pigeon" SET
  "name" = CASE
    WHEN POSITION('—' IN "titleRo") > 0 THEN BTRIM(LEFT("titleRo", POSITION('—' IN "titleRo") - 1))
    ELSE BTRIM("titleRo")
  END,
  "taglineRo" = CASE
    WHEN POSITION('—' IN "titleRo") > 0
      THEN NULLIF(BTRIM(SUBSTRING("titleRo" FROM POSITION('—' IN "titleRo") + 1)), '')
    ELSE NULL
  END,
  "taglineEn" = CASE
    WHEN POSITION('—' IN "titleEn") > 0
      THEN NULLIF(BTRIM(SUBSTRING("titleEn" FROM POSITION('—' IN "titleEn") + 1)), '')
    ELSE NULL
  END;

-- plasa de siguranta: un lot fara nume ar rupe afisarea
UPDATE "Pigeon" SET "name" = "ringNumber" WHERE "name" IS NULL OR "name" = '';

ALTER TABLE "Pigeon" ALTER COLUMN "name" SET NOT NULL;

ALTER TABLE "Pigeon" DROP COLUMN "titleRo";
ALTER TABLE "Pigeon" DROP COLUMN "titleEn";
