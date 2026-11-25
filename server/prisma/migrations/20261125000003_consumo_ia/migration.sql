-- CreateTable
CREATE TABLE "ConsumoIa" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT,
    "etapa" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(12,6) NOT NULL,
    "autorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumoIa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsumoIa_workspaceId_createdAt_idx" ON "ConsumoIa"("workspaceId", "createdAt");

