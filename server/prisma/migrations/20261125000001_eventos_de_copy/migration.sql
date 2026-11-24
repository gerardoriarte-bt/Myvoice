-- CreateEnum
CREATE TYPE "TipoEventoCopy" AS ENUM ('APROBADO', 'DESAPROBADO', 'VUELTO_A_PENDIENTE');

-- CreateTable
CREATE TABLE "EventoDeCopy" (
    "id" TEXT NOT NULL,
    "savedVariationId" TEXT NOT NULL,
    "tipo" "TipoEventoCopy" NOT NULL,
    "autorId" TEXT,
    "autorNombre" TEXT,
    "detalle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoDeCopy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventoDeCopy_savedVariationId_idx" ON "EventoDeCopy"("savedVariationId");

-- AddForeignKey
ALTER TABLE "EventoDeCopy" ADD CONSTRAINT "EventoDeCopy_savedVariationId_fkey" FOREIGN KEY ("savedVariationId") REFERENCES "SavedVariation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

