-- CreateEnum
CREATE TYPE "ReviewSessionStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ReviewSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ReviewSessionStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "ReviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewSession_token_key" ON "ReviewSession"("token");

-- CreateTable
CREATE TABLE "ReviewSessionItem" (
    "id" TEXT NOT NULL,
    "reviewSessionId" TEXT NOT NULL,
    "savedVariationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ReviewSessionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSubmission" (
    "id" TEXT NOT NULL,
    "reviewSessionId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewerName" TEXT,
    CONSTRAINT "ReviewSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewSubmission_reviewSessionId_key" ON "ReviewSubmission"("reviewSessionId");

-- CreateTable
CREATE TABLE "ReviewItemFeedback" (
    "id" TEXT NOT NULL,
    "reviewSubmissionId" TEXT NOT NULL,
    "savedVariationId" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "comment" TEXT,
    CONSTRAINT "ReviewItemFeedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReviewSession" ADD CONSTRAINT "ReviewSession_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReviewSession" ADD CONSTRAINT "ReviewSession_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReviewSessionItem" ADD CONSTRAINT "ReviewSessionItem_reviewSessionId_fkey"
  FOREIGN KEY ("reviewSessionId") REFERENCES "ReviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewSessionItem" ADD CONSTRAINT "ReviewSessionItem_savedVariationId_fkey"
  FOREIGN KEY ("savedVariationId") REFERENCES "SavedVariation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewSubmission" ADD CONSTRAINT "ReviewSubmission_reviewSessionId_fkey"
  FOREIGN KEY ("reviewSessionId") REFERENCES "ReviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewItemFeedback" ADD CONSTRAINT "ReviewItemFeedback_reviewSubmissionId_fkey"
  FOREIGN KEY ("reviewSubmissionId") REFERENCES "ReviewSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
