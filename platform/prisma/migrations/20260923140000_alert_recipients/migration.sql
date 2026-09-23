-- Destinatarii anunturilor pentru administrator (e-mail si Telegram).
CREATE TABLE "AlertRecipient" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "email" TEXT,
    "chatId" TEXT,
    "code" TEXT,
    "codeAt" TIMESTAMP(3),
    "linkedAt" TIMESTAMP(3),
    "events" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AlertRecipient_code_key" ON "AlertRecipient"("code");

CREATE INDEX "AlertRecipient_kind_active_idx" ON "AlertRecipient"("kind", "active");
