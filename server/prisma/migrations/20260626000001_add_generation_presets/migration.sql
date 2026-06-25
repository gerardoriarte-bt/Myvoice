-- CreateTable
CREATE TABLE "GenerationPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workspaceId" TEXT,
    "clientId" TEXT,
    "parameters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationPreset_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GenerationPreset" ADD CONSTRAINT "GenerationPreset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
