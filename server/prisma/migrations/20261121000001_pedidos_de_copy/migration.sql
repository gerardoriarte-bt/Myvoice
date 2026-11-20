-- F4: el copy guardado recuerda la línea de la sábana que lo pidió. Solo agrega una columna y su índice.
-- AlterTable
ALTER TABLE "SavedVariation" ADD COLUMN     "lineaDePlanningId" TEXT;

-- CreateIndex
CREATE INDEX "SavedVariation_lineaDePlanningId_idx" ON "SavedVariation"("lineaDePlanningId");
