-- F3 (decisiones 19, 20 y 24): el planning de una campaña, sus líneas y su historial. Aditiva.
-- CreateEnum
CREATE TYPE "EtapaDeFunnel" AS ENUM ('RECONOCIMIENTO', 'CONSIDERACION', 'CONVERSION', 'RETENCION');

-- CreateEnum
CREATE TYPE "EstadoPlanning" AS ENUM ('EN_ARMADO', 'POR_APROBAR', 'DEVUELTO', 'APROBADO');

-- CreateEnum
CREATE TYPE "TipoEventoPlanning" AS ENUM ('CREADO', 'ENVIADO', 'APROBADO', 'DEVUELTO', 'REABIERTO');

-- CreateTable
CREATE TABLE "Planning" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "campanaId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "estado" "EstadoPlanning" NOT NULL DEFAULT 'EN_ARMADO',
    "desde" TIMESTAMP(3),
    "hasta" TIMESTAMP(3),
    "etapas" "EtapaDeFunnel"[],
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Planning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineaDePlanning" (
    "id" TEXT NOT NULL,
    "planningId" TEXT NOT NULL,
    "formatoId" TEXT NOT NULL,
    "formatoVersionId" TEXT NOT NULL,
    "etapa" "EtapaDeFunnel" NOT NULL,
    "piezas" INTEGER NOT NULL,
    "desde" TIMESTAMP(3),
    "hasta" TIMESTAMP(3),
    "ubicacionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LineaDePlanning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoDePlanning" (
    "id" TEXT NOT NULL,
    "planningId" TEXT NOT NULL,
    "tipo" "TipoEventoPlanning" NOT NULL,
    "version" INTEGER NOT NULL,
    "autorId" TEXT NOT NULL,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoDePlanning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Planning_campanaId_key" ON "Planning"("campanaId");

-- CreateIndex
CREATE INDEX "Planning_workspaceId_clientId_idx" ON "Planning"("workspaceId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "LineaDePlanning_planningId_formatoId_etapa_key" ON "LineaDePlanning"("planningId", "formatoId", "etapa");

-- CreateIndex
CREATE INDEX "EventoDePlanning_planningId_idx" ON "EventoDePlanning"("planningId");

-- AddForeignKey
ALTER TABLE "Planning" ADD CONSTRAINT "Planning_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaDePlanning" ADD CONSTRAINT "LineaDePlanning_planningId_fkey" FOREIGN KEY ("planningId") REFERENCES "Planning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaDePlanning" ADD CONSTRAINT "LineaDePlanning_formatoId_fkey" FOREIGN KEY ("formatoId") REFERENCES "Formato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaDePlanning" ADD CONSTRAINT "LineaDePlanning_formatoVersionId_fkey" FOREIGN KEY ("formatoVersionId") REFERENCES "FormatoVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoDePlanning" ADD CONSTRAINT "EventoDePlanning_planningId_fkey" FOREIGN KEY ("planningId") REFERENCES "Planning"("id") ON DELETE CASCADE ON UPDATE CASCADE;
