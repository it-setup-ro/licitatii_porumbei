-- CreateTable
CREATE TABLE "ExternalLink" (
    "id" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'CONTESTS',
    "labelRo" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "url" TEXT,
    "sortIdx" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalLink_group_active_sortIdx_idx" ON "ExternalLink"("group", "active", "sortIdx");
