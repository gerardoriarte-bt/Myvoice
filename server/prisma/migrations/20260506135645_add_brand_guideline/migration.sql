-- AlterTable
ALTER TABLE "Client" ADD COLUMN "brandGuidelinePdfUrl" TEXT,
ADD COLUMN "brandGuidelineFileName" TEXT,
ADD COLUMN "brandGuidelineExtractedAt" TIMESTAMP(3),
ADD COLUMN "brandKeywords" TEXT,
ADD COLUMN "brandProhibitions" TEXT;
