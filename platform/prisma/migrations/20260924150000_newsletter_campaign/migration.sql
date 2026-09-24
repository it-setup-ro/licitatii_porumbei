-- Newsletter trimis in reprize, ca sa nu cada trimiterea a 300 de mesaje intr-o cerere.
CREATE TABLE "NewsletterCampaign" (
    "id" TEXT NOT NULL,
    "subjectRo" TEXT NOT NULL,
    "subjectEn" TEXT NOT NULL,
    "bodyRo" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENDING',
    "total" INTEGER NOT NULL DEFAULT 0,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "cursor" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "NewsletterCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NewsletterCampaign_status_createdAt_idx" ON "NewsletterCampaign"("status", "createdAt");
