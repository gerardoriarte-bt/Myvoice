-- Un medio por vez y cuántas piezas (docs/plan-piezas-por-medio.md).
--
-- Aditiva: dos columnas nullable y un índice. Lo guardado antes queda con NULL: se sigue mostrando y
-- produciendo como hasta hoy.

-- AlterTable
ALTER TABLE "SavedVariation" ADD COLUMN     "conjuntoId" TEXT,
ADD COLUMN     "piezaIndex" INTEGER;

-- CreateIndex
CREATE INDEX "SavedVariation_conjuntoId_idx" ON "SavedVariation"("conjuntoId");

