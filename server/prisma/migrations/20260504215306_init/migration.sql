-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "brandVoiceGuidelines" TEXT,
ADD COLUMN     "quotaLimit" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "quotaUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "valueProposition" TEXT,
ADD COLUMN     "voice" TEXT;

-- CreateTable
CREATE TABLE "GenerationLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dnaProfileId" TEXT NOT NULL,
    "platforms" TEXT[],
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GenerationLog" ADD CONSTRAINT "GenerationLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
