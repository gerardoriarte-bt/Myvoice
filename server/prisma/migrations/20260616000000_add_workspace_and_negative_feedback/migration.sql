-- AlterTable: User — add workspaceId
ALTER TABLE "User" ADD COLUMN "workspaceId" TEXT;

-- AlterTable: Client — add workspaceId
ALTER TABLE "Client" ADD COLUMN "workspaceId" TEXT;

-- AlterTable: Project — add workspaceId
ALTER TABLE "Project" ADD COLUMN "workspaceId" TEXT;

-- CreateTable: NegativeFeedback
CREATE TABLE "NegativeFeedback" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NegativeFeedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: User → Workspace
ALTER TABLE "User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Client → Workspace
ALTER TABLE "Client" ADD CONSTRAINT "Client_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Project → Workspace
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: NegativeFeedback → Client
ALTER TABLE "NegativeFeedback" ADD CONSTRAINT "NegativeFeedback_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
