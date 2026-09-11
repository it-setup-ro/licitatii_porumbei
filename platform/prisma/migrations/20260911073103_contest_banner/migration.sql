-- AlterTable
ALTER TABLE "Contest" ADD COLUMN     "boardingAt" TIMESTAMP(3),
ADD COLUMN     "boardingPlace" TEXT,
ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "destination" TEXT,
ADD COLUMN     "distanceKm" INTEGER,
ADD COLUMN     "releaseAt" TIMESTAMP(3),
ADD COLUMN     "sloganEn" TEXT,
ADD COLUMN     "sloganRo" TEXT;
