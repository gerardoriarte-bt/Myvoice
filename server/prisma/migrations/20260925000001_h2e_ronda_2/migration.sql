-- CreateEnum
CREATE TYPE "RondaRevision" AS ENUM ('COPY', 'PIEZA');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "pideAprobacionDeCliente" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ReviewItemFeedback" ADD COLUMN     "piezaId" TEXT,
ALTER COLUMN "savedVariationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ReviewSession" ADD COLUMN     "ronda" "RondaRevision" NOT NULL DEFAULT 'COPY';

-- AlterTable
ALTER TABLE "ReviewSessionItem" ADD COLUMN     "piezaId" TEXT,
ALTER COLUMN "savedVariationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ReviewSessionItem" ADD CONSTRAINT "ReviewSessionItem_piezaId_fkey" FOREIGN KEY ("piezaId") REFERENCES "Pieza"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- El XOR que el esquema no puede declarar: un item lleva un copy O una pieza,
-- nunca los dos ni ninguno. El servicio ya lo garantiza, pero esto es lo que
-- lo sostiene el día que alguien escriba por otro camino — y una sesión de
-- revisión se publica detrás de un token sin autenticación, así que su
-- contenido es lo último que conviene dejar librado a una validación de
-- aplicación.
ALTER TABLE "ReviewSessionItem"
  ADD CONSTRAINT "ReviewSessionItem_copy_o_pieza"
  CHECK (("savedVariationId" IS NULL) <> ("piezaId" IS NULL));

ALTER TABLE "ReviewItemFeedback"
  ADD CONSTRAINT "ReviewItemFeedback_copy_o_pieza"
  CHECK (("savedVariationId" IS NULL) <> ("piezaId" IS NULL));
