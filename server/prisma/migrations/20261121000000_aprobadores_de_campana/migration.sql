-- Decisión 30: una campaña puede sumar aprobadores además de su responsable (urgencia). Solo agrega una tabla.
-- CreateTable
CREATE TABLE "AprobadorDeCampana" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agregadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AprobadorDeCampana_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AprobadorDeCampana_userId_idx" ON "AprobadorDeCampana"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AprobadorDeCampana_projectId_userId_key" ON "AprobadorDeCampana"("projectId", "userId");

-- AddForeignKey
ALTER TABLE "AprobadorDeCampana" ADD CONSTRAINT "AprobadorDeCampana_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AprobadorDeCampana" ADD CONSTRAINT "AprobadorDeCampana_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
