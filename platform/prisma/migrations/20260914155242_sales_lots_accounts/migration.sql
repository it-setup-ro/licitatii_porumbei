-- AlterTable
ALTER TABLE "Auction" ADD COLUMN     "lotId" TEXT,
ADD COLUMN     "lotPosition" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountRejectReason" TEXT,
ADD COLUMN     "accountReviewedAt" TIMESTAMP(3),
ADD COLUMN     "accountReviewedById" TEXT,
ADD COLUMN     "accountStatus" TEXT NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "addressCity" TEXT,
ADD COLUMN     "addressCountry" TEXT,
ADD COLUMN     "addressCounty" TEXT,
ADD COLUMN     "addressPostalCode" TEXT,
ADD COLUMN     "addressStreet" TEXT,
ADD COLUMN     "notifyAuctionEnding" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Breeder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "photoUrl" TEXT,
    "storyRo" TEXT,
    "storyEn" TEXT,
    "resultsRo" TEXT,
    "resultsEn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Breeder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "breederId" TEXT NOT NULL,
    "titleRo" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descRo" TEXT,
    "descEn" TEXT,
    "coverUrl" TEXT,
    "commissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "snipeWindowMinutes" INTEGER,
    "extensionMinutes" INTEGER,
    "maxExtensions" INTEGER,
    "startedAt" TIMESTAMP(3),
    "startedById" TEXT,
    "endingNotifiedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sale_slug_key" ON "Sale"("slug");

-- CreateIndex
CREATE INDEX "Lot_status_endsAt_idx" ON "Lot"("status", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_saleId_number_key" ON "Lot"("saleId", "number");

-- CreateIndex
CREATE INDEX "Auction_lotId_idx" ON "Auction"("lotId");

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_breederId_fkey" FOREIGN KEY ("breederId") REFERENCES "Breeder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
