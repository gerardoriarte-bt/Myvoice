-- H3.D fase 1 · Qué hace cada persona, además de cuánto administra.
--
-- Aditiva: una tabla y un enum. `Membership.role` no se toca — son dos ejes, y
-- fusionarlos parece más simple hasta el primer «un ADMIN que además diseña».
--
-- Dos cosas que el SQL no dice (docs/plan-h3d-funciones-notificaciones.md):
--
--   * `clientId` NULL significa "todas las marcas del workspace", que es el
--     caso normal. Postgres admite varios NULL en un unique, así que esa fila
--     convive con las acotadas y sigue siendo única por función.
--   * La función NO restringe nada. Sin la de Aprobación igual se puede aceptar
--     una pieza: lo que cambia es a quién se le avisa y quién aparece primero
--     al asignar.

-- CreateEnum
CREATE TYPE "FuncionEquipo" AS ENUM ('COPY', 'DISENO', 'APROBACION');

-- CreateTable
CREATE TABLE "MiembroFuncion" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "funcion" "FuncionEquipo" NOT NULL,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MiembroFuncion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MiembroFuncion_workspaceId_funcion_idx" ON "MiembroFuncion"("workspaceId", "funcion");

-- CreateIndex
CREATE UNIQUE INDEX "MiembroFuncion_workspaceId_userId_funcion_clientId_key" ON "MiembroFuncion"("workspaceId", "userId", "funcion", "clientId");

-- AddForeignKey
ALTER TABLE "MiembroFuncion" ADD CONSTRAINT "MiembroFuncion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiembroFuncion" ADD CONSTRAINT "MiembroFuncion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiembroFuncion" ADD CONSTRAINT "MiembroFuncion_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
