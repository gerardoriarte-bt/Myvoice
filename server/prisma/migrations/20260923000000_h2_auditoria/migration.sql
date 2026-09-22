-- H2 fase 3 · La pieza subida y su auditoría.
--
-- Aditiva otra vez: dos tablas y tres enums, sin tocar nada existente. La fase
-- 2 sigue funcionando tal cual contra esta base — una pieza entregada con
-- enlace no tiene versiones, y eso es un estado válido, no un dato faltante.
--
-- Lo que no se lee en el SQL (docs/plan-h2-produccion-auditoria.md, D2 y D6):
--
--   * PiezaVersion.claveOriginal es NULLABLE a propósito: la regla de ciclo de
--     vida del bucket borra `piezas/originales/` a los 90 días. Cuando eso pasa
--     la fila no miente, solo deja de tener original. El snapshot es permanente.
--   * AuditoriaEstado.NO_DISPONIBLE no es "sin hallazgos": el proveedor falló y
--     no miró nada. Se cuenta aparte de los aciertos.
--   * Hallazgo.decision arranca en PENDIENTE y es el dato con el que D2 decide
--     algún día si la auditoría se gana la autoridad de bloquear. Sin él nunca
--     se sabría si acierta.

-- CreateEnum
CREATE TYPE "AuditoriaEstado" AS ENUM ('PENDIENTE', 'COMPLETA', 'NO_DISPONIBLE');

-- CreateEnum
CREATE TYPE "HallazgoTipo" AS ENUM ('HECHO', 'JUICIO', 'MEDIDAS', 'ILEGIBLE');

-- CreateEnum
CREATE TYPE "HallazgoDecision" AS ENUM ('PENDIENTE', 'ACEPTADO', 'CORREGIDO');

-- CreateTable
CREATE TABLE "PiezaVersion" (
    "id" TEXT NOT NULL,
    "piezaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "claveOriginal" TEXT,
    "claveSnapshot" TEXT,
    "anchoPx" INTEGER,
    "altoPx" INTEGER,
    "pesoBytes" INTEGER,
    "contentType" TEXT,
    "estadoAuditoria" "AuditoriaEstado" NOT NULL DEFAULT 'PENDIENTE',
    "motivoNoDisponible" TEXT,
    "auditadaAt" TIMESTAMP(3),
    "costoUsd" DECIMAL(12,6),
    "modelo" TEXT,
    "subidaPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PiezaVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hallazgo" (
    "id" TEXT NOT NULL,
    "piezaVersionId" TEXT NOT NULL,
    "tipo" "HallazgoTipo" NOT NULL,
    "slot" TEXT,
    "slotLabel" TEXT,
    "esperado" TEXT,
    "encontrado" TEXT,
    "detalle" TEXT NOT NULL,
    "decision" "HallazgoDecision" NOT NULL DEFAULT 'PENDIENTE',
    "notaDecision" TEXT,
    "decididoPorId" TEXT,
    "decididoAt" TIMESTAMP(3),

    CONSTRAINT "Hallazgo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PiezaVersion_piezaId_createdAt_idx" ON "PiezaVersion"("piezaId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PiezaVersion_piezaId_numero_key" ON "PiezaVersion"("piezaId", "numero");

-- CreateIndex
CREATE INDEX "Hallazgo_piezaVersionId_idx" ON "Hallazgo"("piezaVersionId");

-- AddForeignKey
ALTER TABLE "PiezaVersion" ADD CONSTRAINT "PiezaVersion_piezaId_fkey" FOREIGN KEY ("piezaId") REFERENCES "Pieza"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiezaVersion" ADD CONSTRAINT "PiezaVersion_subidaPorId_fkey" FOREIGN KEY ("subidaPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hallazgo" ADD CONSTRAINT "Hallazgo_piezaVersionId_fkey" FOREIGN KEY ("piezaVersionId") REFERENCES "PiezaVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hallazgo" ADD CONSTRAINT "Hallazgo_decididoPorId_fkey" FOREIGN KEY ("decididoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
