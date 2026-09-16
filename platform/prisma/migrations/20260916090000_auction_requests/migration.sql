-- Cererile „Vreau să organizez o licitație", de pe prima pagină.
CREATE TABLE "AuctionRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ro',
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuctionRequest_handledAt_createdAt_idx" ON "AuctionRequest"("handledAt", "createdAt");
