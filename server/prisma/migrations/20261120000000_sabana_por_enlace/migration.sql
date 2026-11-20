-- F3b (decisión 24): el cliente aprueba la sábana por enlace. Valores de enum y columnas nuevas, y el CHECK
-- del portal pasa de XOR a «exactamente uno».
-- AlterEnum
ALTER TYPE "EstadoPlanning" ADD VALUE 'CON_EL_CLIENTE';

-- AlterEnum
ALTER TYPE "RondaRevision" ADD VALUE 'SABANA';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoEventoPlanning" ADD VALUE 'ENVIADO_AL_CLIENTE';
ALTER TYPE "TipoEventoPlanning" ADD VALUE 'APROBADO_POR_CLIENTE';
ALTER TYPE "TipoEventoPlanning" ADD VALUE 'DEVUELTO_POR_CLIENTE';

-- AlterTable
ALTER TABLE "ReviewItemFeedback" ADD COLUMN     "planningId" TEXT;

-- AlterTable
ALTER TABLE "ReviewSessionItem" ADD COLUMN     "planningId" TEXT;

-- AddForeignKey
ALTER TABLE "ReviewSessionItem" ADD CONSTRAINT "ReviewSessionItem_planningId_fkey" FOREIGN KEY ("planningId") REFERENCES "Planning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- El portal publica lo que cada item lleva detrás de un token sin cuenta: un item lleva exactamente UNA cosa
-- (un copy, una pieza o, desde F3b, un planning). Antes era un XOR entre copy y pieza; ahora es «exactamente
-- uno» entre los tres. Las filas de hoy lo cumplen: tienen uno de los dos primeros y el tercero en NULL.
ALTER TABLE "ReviewSessionItem" DROP CONSTRAINT "ReviewSessionItem_copy_o_pieza";
ALTER TABLE "ReviewSessionItem"
  ADD CONSTRAINT "ReviewSessionItem_exactamente_uno"
  CHECK (num_nonnulls("savedVariationId", "piezaId", "planningId") = 1);

ALTER TABLE "ReviewItemFeedback" DROP CONSTRAINT "ReviewItemFeedback_copy_o_pieza";
ALTER TABLE "ReviewItemFeedback"
  ADD CONSTRAINT "ReviewItemFeedback_exactamente_uno"
  CHECK (num_nonnulls("savedVariationId", "piezaId", "planningId") = 1);
