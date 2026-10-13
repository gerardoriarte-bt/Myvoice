-- Marcas relacionadas, entrega 1 (docs/plan-marcas-relacionadas.md).
--
-- Aditiva: una columna nullable. No se rellena nada: en producción nadie
-- declaró todavía qué marca es parte de cuál.

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "marcaMadreId" TEXT;

-- CreateIndex
CREATE INDEX "Client_marcaMadreId_idx" ON "Client"("marcaMadreId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_marcaMadreId_fkey" FOREIGN KEY ("marcaMadreId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

