-- Lote B0 + B1 + B3: telemetría de costo, cuota por periodo y procedencia del
-- copy guardado. Van en una sola migración porque se despliegan juntos y los
-- tres son aditivos; separarlos solo multiplicaría los pasos del runbook.
--
-- APLICAR DESPUÉS de 20260826000001_workspace_required: el relleno de
-- GenerationLog."workspaceId" se apoya en que Client."workspaceId" ya sea NOT
-- NULL, o quedarían filas de log sin workspace y sin forma de deducirlo.
--
-- Esta migración es ESTRICTAMENTE ADITIVA: columnas nuevas nullable o con
-- default, tablas nuevas, índices nuevos. No hay DROP ni SET NOT NULL sobre
-- datos existentes, así que se puede aplicar con contenedores de la versión
-- anterior todavía sirviendo tráfico.

-- ---------------------------------------------------------------------------
-- B0 · Telemetría de costo consultable en GenerationLog
-- ---------------------------------------------------------------------------
-- Hasta hoy el costo exacto que calcula services/pricing.ts viajaba al frontend
-- y quedaba enterrado dentro de GenerationLog."outputJson": responder "cuánto
-- gastó el workspace X este mes" exigía abrir un JSON fila por fila.
--
-- "costUsd" va en NUMERIC y no en double precision porque estos montos se suman
-- en reportes de facturación y el error de punto flotante se acumula.

ALTER TABLE "GenerationLog"
    ADD COLUMN "workspaceId"      TEXT,
    ADD COLUMN "costUsd"          DECIMAL(12,6),
    ADD COLUMN "cachedTokens"     INTEGER,
    ADD COLUMN "cacheWriteTokens" INTEGER,
    ADD COLUMN "model"            TEXT,
    ADD COLUMN "provider"         TEXT,
    ADD COLUMN "costEstimated"    BOOLEAN,
    ADD COLUMN "durationMs"       INTEGER,
    ADD COLUMN "stageBreakdown"   JSONB;

-- "workspaceId" sale entero de Client, que tiene FK obligatoria desde
-- "clientId": no hay fila que pueda quedar huérfana, así que se rellena acá
-- mismo y ninguna fila histórica queda en NULL.
UPDATE "GenerationLog" g
   SET "workspaceId" = c."workspaceId"
  FROM "Client" c
 WHERE c."id" = g."clientId";

-- La columna queda NULLABLE en esta migración a propósito: el SET NOT NULL es
-- una escritura bloqueante sobre datos existentes y se aplica en una migración
-- posterior, una vez verificado que
--   SELECT count(*) FROM "GenerationLog" WHERE "workspaceId" IS NULL;
-- sigue en 0 con la versión nueva escribiendo. Hasta entonces, un NULL en esta
-- columna significa "fila escrita por código viejo", no "sin workspace".

ALTER TABLE "GenerationLog" ADD CONSTRAINT "GenerationLog_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Los dos ejes de consulta del reporte: gasto de un workspace en un periodo y
-- gasto de una marca en un periodo.
CREATE INDEX "GenerationLog_workspaceId_createdAt_idx" ON "GenerationLog"("workspaceId", "createdAt");
CREATE INDEX "GenerationLog_clientId_createdAt_idx"    ON "GenerationLog"("clientId", "createdAt");

-- Las columnas de costo quedan en NULL para las filas históricas: las rellena
--   npm run backfill:telemetria -- --apply
-- leyendo "outputJson"->'usage' donde exista. NULL acá significa "no se sabe",
-- no "costó cero".

-- ---------------------------------------------------------------------------
-- B1 · Cuota real por periodo
-- ---------------------------------------------------------------------------
-- Client."quotaUsed" era un contador de por vida que nunca se reiniciaba
-- mientras el error decía "límite de generaciones mensuales". Esta tabla lo
-- reemplaza por una fila por (marca, periodo). No hace falta cron ni job de
-- reinicio: la fila del periodo vigente se crea con un upsert en el primer uso,
-- y un periodo sin consumo simplemente no tiene fila (consumo = 0).
--
-- "quotaLimit" y "quotaUsed" NO se eliminan acá. Durante el despliegue rodante
-- conviven contenedores de la versión anterior que las seleccionan (Prisma
-- selecciona todos los escalares por defecto), y dropearlas les rompe todo
-- findUnique sobre Client. Se dropean en una migración posterior.

CREATE TABLE "UsagePeriod" (
    "id"          TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId"    TEXT NOT NULL,
    -- TIMESTAMP y no DATE: el cast de timestamp a date en Postgres usa el
    -- TimeZone de la sesión, así que el día 1 a medianoche UTC podría caer en
    -- el periodo anterior si el contenedor no corre en UTC.
    "periodStart" TIMESTAMP(3) NOT NULL,
    "generations" INTEGER NOT NULL DEFAULT 0,
    "costUsd"     DECIMAL(12,6) NOT NULL DEFAULT 0,
    "tokens"      INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsagePeriod_pkey" PRIMARY KEY ("id")
);

-- El unique es lo que hace atómico el upsert (ON CONFLICT DO UPDATE): dos
-- generaciones simultáneas de la misma marca en un periodo nuevo no pueden
-- crear dos filas ni perder un incremento.
CREATE UNIQUE INDEX "UsagePeriod_clientId_periodStart_key"
    ON "UsagePeriod"("clientId", "periodStart");

-- Techo por plan: suma del consumo de todas las marcas del workspace en el
-- periodo, una agregación por generación.
CREATE INDEX "UsagePeriod_workspaceId_periodStart_idx"
    ON "UsagePeriod"("workspaceId", "periodStart");

ALTER TABLE "UsagePeriod" ADD CONSTRAINT "UsagePeriod_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsagePeriod" ADD CONSTRAINT "UsagePeriod_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Override por marca. NULL = se aplica el límite del plan del workspace.
-- Quedan en NULL para todas las marcas existentes: "quotaLimit" cuenta
-- generaciones, no dólares, y backfillearlo sería inventar una tarifa.
ALTER TABLE "Client"
    ADD COLUMN "quotaCostUsdOverride" DECIMAL(12,6),
    ADD COLUMN "quotaTokensOverride"  INTEGER;

-- ---------------------------------------------------------------------------
-- B3 · Procedencia del copy guardado
-- ---------------------------------------------------------------------------
-- El writer emitía "slot" y "variationIndex", el frontend los mandaba y
-- saveVariation los descartaba al desestructurar el body. En la biblioteca, el
-- hook y el cuerpo de un mismo Instagram Post solo se distinguían contando
-- caracteres contra los presupuestos del spec del canal. Es el prerrequisito
-- duro de H2.A.
--
-- Las tres columnas de procedencia son NULLABLE a propósito: NULL significa
-- "no sabemos", que es la verdad para las filas anteriores a esta migración.
-- Un default '' o 0 las haría indistinguibles de un dato real.
--
-- "slotInferred" marca las filas que el backfill heurístico dedujo por conteo
-- de unidades. Es una columna aparte y no un sufijo en "slotLabel" porque tiene
-- que sobrevivir a cualquier edición del texto y ser consultable desde SQL.

ALTER TABLE "SavedVariation"
    ADD COLUMN "slot"           TEXT,
    ADD COLUMN "slotLabel"      TEXT,
    ADD COLUMN "variationIndex" INTEGER,
    ADD COLUMN "slotInferred"   BOOLEAN NOT NULL DEFAULT false;

-- La consulta de H2.A: todos los slots de un canal para una marca.
-- "SavedVariation" no tenía ningún índice hasta ahora.
CREATE INDEX "SavedVariation_clientId_platform_slot_idx"
    ON "SavedVariation"("clientId", "platform", "slot");

-- El backfill heurístico de slots (npm run backfill:slots -- --apply) corre
-- DESPUÉS de esta migración y solo toca filas con "slot" IS NULL.
