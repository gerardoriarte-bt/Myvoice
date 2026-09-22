-- H2 fase 2 · La pieza: del copy aprobado al trabajo de diseño.
--
-- Migración puramente ADITIVA: tres tablas nuevas y dos enums. No toca ninguna
-- columna existente, así que un contenedor viejo sigue funcionando contra la
-- base migrada y el despliegue no necesita ventana.
--
-- Las decisiones detrás del modelo están en docs/plan-h2-produccion-auditoria.md
-- (D1, D5, D7 y los cinco estados límite). Tres que se leen mal en el SQL:
--
--   * PiezaSlot.savedVariationId es SET NULL, no CASCADE: borrar un copy de la
--     Biblioteca no puede borrar una pieza que está en producción.
--   * Lo único en Pieza es (workspaceId, huella): la huella resume el formato
--     más los aprobados que la componen, así que impide la pieza repetida sin
--     impedir el A/B, donde dos piezas comparten el cuerpo y cambia el hook.
--   * PiezaEvento es append-only; nada en el código la actualiza ni la borra.

-- CreateEnum
CREATE TYPE "PiezaEstado" AS ENUM ('POR_ASIGNAR', 'EN_DISENO', 'POR_REVISAR', 'LISTA');

-- CreateEnum
CREATE TYPE "PiezaTipo" AS ENUM ('GRAFICA', 'VIDEO', 'AUDIO');

-- CreateTable
CREATE TABLE "Pieza" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "platform" TEXT NOT NULL,
    "tipo" "PiezaTipo" NOT NULL,
    "formato" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "huella" TEXT NOT NULL,
    "estado" "PiezaEstado" NOT NULL DEFAULT 'POR_ASIGNAR',
    "asignadaAId" TEXT,
    "grupoId" TEXT,
    "enlace" TEXT,
    "creadaPorId" TEXT NOT NULL,
    "estadoDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pieza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PiezaSlot" (
    "id" TEXT NOT NULL,
    "piezaId" TEXT NOT NULL,
    "savedVariationId" TEXT,
    "slot" TEXT NOT NULL,
    "slotLabel" TEXT NOT NULL,
    "textoCongelado" TEXT NOT NULL,
    "esInstruccion" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PiezaSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PiezaEvento" (
    "id" TEXT NOT NULL,
    "piezaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "deEstado" "PiezaEstado",
    "aEstado" "PiezaEstado",
    "autorId" TEXT NOT NULL,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PiezaEvento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pieza_workspaceId_clientId_estado_idx" ON "Pieza"("workspaceId", "clientId", "estado");

-- CreateIndex
CREATE INDEX "Pieza_asignadaAId_estado_idx" ON "Pieza"("asignadaAId", "estado");

-- CreateIndex
CREATE INDEX "Pieza_grupoId_idx" ON "Pieza"("grupoId");

-- CreateIndex
CREATE UNIQUE INDEX "Pieza_workspaceId_huella_key" ON "Pieza"("workspaceId", "huella");

-- CreateIndex
CREATE INDEX "PiezaSlot_piezaId_idx" ON "PiezaSlot"("piezaId");

-- CreateIndex
CREATE INDEX "PiezaSlot_savedVariationId_idx" ON "PiezaSlot"("savedVariationId");

-- CreateIndex
CREATE INDEX "PiezaEvento_piezaId_createdAt_idx" ON "PiezaEvento"("piezaId", "createdAt");

-- AddForeignKey
ALTER TABLE "Pieza" ADD CONSTRAINT "Pieza_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pieza" ADD CONSTRAINT "Pieza_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pieza" ADD CONSTRAINT "Pieza_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pieza" ADD CONSTRAINT "Pieza_asignadaAId_fkey" FOREIGN KEY ("asignadaAId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pieza" ADD CONSTRAINT "Pieza_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiezaSlot" ADD CONSTRAINT "PiezaSlot_piezaId_fkey" FOREIGN KEY ("piezaId") REFERENCES "Pieza"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiezaSlot" ADD CONSTRAINT "PiezaSlot_savedVariationId_fkey" FOREIGN KEY ("savedVariationId") REFERENCES "SavedVariation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiezaEvento" ADD CONSTRAINT "PiezaEvento_piezaId_fkey" FOREIGN KEY ("piezaId") REFERENCES "Pieza"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiezaEvento" ADD CONSTRAINT "PiezaEvento_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
