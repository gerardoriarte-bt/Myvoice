-- AlterTable
ALTER TABLE "GenerationLog" ADD COLUMN "funnelStage" TEXT,
ADD COLUMN "spineJson" JSONB,
ADD COLUMN "outputJson" JSONB;
