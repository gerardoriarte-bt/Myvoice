-- F0 (docs/plan-plataforma-por-procesos.md, «Convivencia con producción»): el interruptor que elige el
-- marco. Aditiva: apagado por defecto, con el workspace como hoy.
ALTER TABLE "Workspace" ADD COLUMN "plataformaPorProcesos" BOOLEAN NOT NULL DEFAULT false;
