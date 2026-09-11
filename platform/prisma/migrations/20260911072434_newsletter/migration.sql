-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ro',
    "consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentText" TEXT NOT NULL,
    "unsubToken" TEXT NOT NULL,
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubToken_key" ON "NewsletterSubscriber"("unsubToken");
