-- Medición detallada (Gerardo, 2026-11-26: la línea base). Todo aditivo:
-- 1. Un workspace puede quedar fuera de las métricas de Control (los de prueba y capacitación).
-- 2. El gasto de IA fuera del motor puede cargarse a una campaña (refinar, una generación que falló).
-- 3. El uso diario por persona y área, para medir la adopción.

-- AlterTable
ALTER TABLE "ConsumoIa" ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "cuentaEnMetricas" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "UsoDiario" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dia" DATE NOT NULL,
    "area" TEXT NOT NULL,
    "lecturas" INTEGER NOT NULL DEFAULT 0,
    "acciones" INTEGER NOT NULL DEFAULT 0,
    "primeraVez" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaVez" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsoDiario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsoDiario_dia_idx" ON "UsoDiario"("dia");

-- CreateIndex
CREATE UNIQUE INDEX "UsoDiario_workspaceId_userId_dia_area_key" ON "UsoDiario"("workspaceId", "userId", "dia", "area");

-- CreateIndex
CREATE INDEX "ConsumoIa_projectId_idx" ON "ConsumoIa"("projectId");


-- Capacitación se reinicia con datos de muestra: nunca es trabajo real.
UPDATE "Workspace" SET "cuentaEnMetricas" = false WHERE "slug" = 'lobueno-capacitacion';
