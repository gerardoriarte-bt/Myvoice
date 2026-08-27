-- Cierra el agujero de `workspaceId IS NULL`: un nulo no aísla, agrupa. Con el
-- filtro `where: { workspaceId }`, un usuario sin workspace veía TODOS los
-- registros huérfanos de la base.
--
-- APLICAR SOLO DESPUÉS de correr `npm run backfill:tenancy -- --apply`.
-- Si quedan filas huérfanas, estos ALTER fallan a propósito: es la señal de que
-- el backfill no terminó, no un error que haya que forzar.

ALTER TABLE "Client"           ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Project"          ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "ReviewSession"    ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "GenerationPreset" ALTER COLUMN "workspaceId" SET NOT NULL;

-- Las cuatro FK venían de cuando la columna era nullable y quedaron en
-- ON DELETE SET NULL. Sobre una columna NOT NULL eso ya no puede ejecutarse:
-- borrar un workspace con marcas intentaría escribir NULL y reventaría con una
-- violación de not-null en vez de con un error de integridad legible. Además
-- es drift contra schema.prisma, donde la relación pasó a ser obligatoria y
-- Prisma asume RESTRICT: `prisma migrate diff` marcaba las cuatro tablas.
ALTER TABLE "Client"           DROP CONSTRAINT "Client_workspaceId_fkey";
ALTER TABLE "Client"           ADD CONSTRAINT "Client_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Project"          DROP CONSTRAINT "Project_workspaceId_fkey";
ALTER TABLE "Project"          ADD CONSTRAINT "Project_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReviewSession"    DROP CONSTRAINT "ReviewSession_workspaceId_fkey";
ALTER TABLE "ReviewSession"    ADD CONSTRAINT "ReviewSession_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GenerationPreset" DROP CONSTRAINT "GenerationPreset_workspaceId_fkey";
ALTER TABLE "GenerationPreset" ADD CONSTRAINT "GenerationPreset_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
