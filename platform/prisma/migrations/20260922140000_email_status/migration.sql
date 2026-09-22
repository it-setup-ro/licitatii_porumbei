-- Starea unui e-mail: dacă a plecat, ce eroare a dat, câte încercări.
ALTER TABLE "EmailLog" ADD COLUMN "sentAt" TIMESTAMP(3);
ALTER TABLE "EmailLog" ADD COLUMN "error" TEXT;
ALTER TABLE "EmailLog" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 1;
