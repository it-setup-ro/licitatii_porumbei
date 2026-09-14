-- AlterTable
ALTER TABLE "Contest" ADD COLUMN     "distanceMaxKm" INTEGER;

-- CreateTable
CREATE TABLE "ShippingAgent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'TRANSPORT',
    "name" TEXT NOT NULL,
    "zone" TEXT,
    "descRo" TEXT,
    "descEn" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "sortIdx" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingAgent_pkey" PRIMARY KEY ("id")
);
