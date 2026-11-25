-- El equipo valida cada ubicación de la biblioteca en la herramienta (2026-11-25). Aditiva.
CREATE TYPE "RevisionDeUbicacion" AS ENUM ('VALIDADA', 'CON_OBSERVACION');

ALTER TABLE "Ubicacion" ADD COLUMN "revision" "RevisionDeUbicacion",
ADD COLUMN "revisionNota" TEXT,
ADD COLUMN "revisadaPorId" TEXT,
ADD COLUMN "revisadaEn" TIMESTAMP(3);
