-- F5 (2026-11-24), aprobación final, primera parte: los valores nuevos de los enums. Van solos porque Postgres no
-- deja usar un valor de enum en la misma transacción en que se agrega (el default de la segunda parte lo usa).
ALTER TYPE "EstadoAnuncio" ADD VALUE 'POR_APROBAR';
ALTER TYPE "EstadoAnuncio" ADD VALUE 'CON_EL_CLIENTE';
ALTER TYPE "RondaRevision" ADD VALUE 'IMPLEMENTACION';
ALTER TYPE "TipoEventoAnuncio" ADD VALUE 'AUTORIZADO';
ALTER TYPE "TipoEventoAnuncio" ADD VALUE 'ENVIADO_AL_CLIENTE';
ALTER TYPE "TipoEventoAnuncio" ADD VALUE 'APROBADO_CLIENTE';
ALTER TYPE "TipoEventoAnuncio" ADD VALUE 'CAMBIOS_CLIENTE';
