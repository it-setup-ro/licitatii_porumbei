-- CreateTable
CREATE TABLE "ArticleMedia" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortIdx" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArticleMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticleMedia_articleId_sortIdx_idx" ON "ArticleMedia"("articleId", "sortIdx");

-- AddForeignKey
ALTER TABLE "ArticleMedia" ADD CONSTRAINT "ArticleMedia_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
