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
