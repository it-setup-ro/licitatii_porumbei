-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountType" TEXT NOT NULL DEFAULT 'PERSON',
ADD COLUMN     "companyAddress" TEXT,
ADD COLUMN     "companyBank" TEXT,
ADD COLUMN     "companyCui" TEXT,
ADD COLUMN     "companyIban" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "companyRegCom" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT;
