-- Intrebarile de la Ajutor, editabile din administrare.
CREATE TABLE "FaqItem" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "questionRo" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "answerRo" TEXT NOT NULL,
    "answerEn" TEXT NOT NULL,
    "sortIdx" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FaqItem_category_sortIdx_idx" ON "FaqItem"("category", "sortIdx");

-- Propunerile de articole: cine l-a scris si ce a raspuns adminul.
ALTER TABLE "Article" ADD COLUMN "proposedById" TEXT;
ALTER TABLE "Article" ADD COLUMN "proposedAt" TIMESTAMP(3);
ALTER TABLE "Article" ADD COLUMN "reviewNote" TEXT;

CREATE INDEX "Article_proposedAt_idx" ON "Article"("proposedAt");

ALTER TABLE "Article" ADD CONSTRAINT "Article_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
