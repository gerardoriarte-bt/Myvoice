-- Implementación, solo texto (2026-11-24): los canales sin pieza de diseño (búsqueda de Google Ads, WhatsApp, push)
-- también llegan a «Por montar». El anuncio apunta a una pieza o a un conjunto de copy aprobado. Solo agrega.
-- AlterTable
ALTER TABLE "Anuncio" ADD COLUMN     "conjuntoId" TEXT,
ALTER COLUMN "piezaId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Anuncio_conjuntoId_key" ON "Anuncio"("conjuntoId");


-- Un anuncio es de una pieza o de un copy aprobado sin pieza: exactamente uno de los dos.
ALTER TABLE "Anuncio" ADD CONSTRAINT "Anuncio_pieza_o_copy" CHECK (num_nonnulls("piezaId", "conjuntoId") = 1);
