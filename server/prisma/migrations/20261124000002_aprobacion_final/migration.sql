-- F5 (2026-11-24): la aprobación final antes de implementar. El anuncio nace «por aprobar» y solo se monta después de
-- la aprobación del cliente (ronda IMPLEMENTACION) o de un aprobador. La ronda de piezas de Producción se retira.







-- AlterTable
ALTER TABLE "Anuncio" ALTER COLUMN "estado" SET DEFAULT 'POR_APROBAR';
-- La campaña del anuncio: para encontrar su enlace abierto y avisar a su responsable.
ALTER TABLE "Anuncio" ADD COLUMN "projectId" TEXT;

-- AlterTable
ALTER TABLE "ReviewItemFeedback" ADD COLUMN     "anuncioId" TEXT;

-- AlterTable
ALTER TABLE "ReviewSessionItem" ADD COLUMN     "anuncioId" TEXT;

-- AddForeignKey
ALTER TABLE "ReviewSessionItem" ADD CONSTRAINT "ReviewSessionItem_anuncioId_fkey" FOREIGN KEY ("anuncioId") REFERENCES "Anuncio"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- El portal: un item lleva exactamente UNA cosa (copy, pieza, planning o, desde ahora, anuncio).
ALTER TABLE "ReviewSessionItem" DROP CONSTRAINT "ReviewSessionItem_exactamente_uno";
ALTER TABLE "ReviewSessionItem"
  ADD CONSTRAINT "ReviewSessionItem_exactamente_uno"
  CHECK (num_nonnulls("savedVariationId", "piezaId", "planningId", "anuncioId") = 1);
ALTER TABLE "ReviewItemFeedback" DROP CONSTRAINT "ReviewItemFeedback_exactamente_uno";
ALTER TABLE "ReviewItemFeedback"
  ADD CONSTRAINT "ReviewItemFeedback_exactamente_uno"
  CHECK (num_nonnulls("savedVariationId", "piezaId", "planningId", "anuncioId") = 1);

-- La ronda de piezas de Producción se retira: el cliente aprueba el arte, con su copy, en Implementación. Las piezas
-- que esperaban al cliente en Producción pasan a «Lista» y llegan a Implementación «por aprobar», donde el cliente
-- las aprueba por el enlace nuevo. En producción eran 4, sin ningún enlace abierto.
UPDATE "Pieza" SET "estado" = 'LISTA', "estadoDesde" = now() WHERE "estado" = 'CON_EL_CLIENTE' AND "canceladaEn" IS NULL;
