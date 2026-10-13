-- Aprobación por campaña (docs/plan-aprobacion-por-campana.md).
--
-- Aditiva: columnas nuevas nullable o con default. Nada existente cambia de
-- significado salvo que, desde el código de esta versión, `isApproved` solo se
-- escribe a través de las reglas de la campaña.

-- CreateEnum
CREATE TYPE "ModoAprobacion" AS ENUM ('INTERNA', 'CLIENTE');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "dnaProfileId" TEXT,
ADD COLUMN     "modoAprobacion" "ModoAprobacion" NOT NULL DEFAULT 'INTERNA',
ADD COLUMN     "responsableId" TEXT;

-- AlterTable
ALTER TABLE "SavedVariation" ADD COLUMN     "aprobadoEn" TIMESTAMP(3),
ADD COLUMN     "aprobadoPorId" TEXT,
ADD COLUMN     "aprobadoPorNombre" TEXT,
ADD COLUMN     "aprobadoVia" "ModoAprobacion";

-- CreateIndex
CREATE UNIQUE INDEX "Project_dnaProfileId_key" ON "Project"("dnaProfileId");

-- CreateIndex
CREATE INDEX "Project_clientId_idx" ON "Project"("clientId");

-- AddForeignKey
ALTER TABLE "SavedVariation" ADD CONSTRAINT "SavedVariation_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_dnaProfileId_fkey" FOREIGN KEY ("dnaProfileId") REFERENCES "ContentDNAProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- La marca de las campañas existentes, cuando no hay duda: todo su copy es de
-- una sola marca. Las que mezclan quedan en NULL — elegir una sería inventar.
UPDATE "Project" p
SET "clientId" = sub."clientId"
FROM (
  SELECT "projectId", MIN("clientId") AS "clientId"
  FROM "SavedVariation"
  WHERE "projectId" IS NOT NULL
  GROUP BY "projectId"
  HAVING COUNT(DISTINCT "clientId") = 1
) sub
WHERE p."id" = sub."projectId";
