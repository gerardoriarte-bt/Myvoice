-- ADN 2.0, F1 (docs/plan-adn-2.md): diez secciones en tres grupos y la lista de audiencias.
--
-- Aditiva: un enum, cuatro columnas con default o nullable y una tabla. El único paso de datos: las
-- «guías de voz» pasan a ser las notas de «reglas de estilo» (misma columna espejo,
-- `brandVoiceGuidelines`). Las versiones guardadas conservan la clave `guias`; el resolver la lee
-- como `reglasDeEstilo`.

-- CreateEnum
CREATE TYPE "OrigenSeccion" AS ENUM ('PERSONA', 'IA_PROPUESTA', 'IA_CONFIRMADA');

-- AlterTable
ALTER TABLE "SeccionAdn" ADD COLUMN     "origen" "OrigenSeccion" NOT NULL DEFAULT 'PERSONA',
ADD COLUMN     "propuesta" JSONB,
ADD COLUMN     "propuestaEn" TIMESTAMP(3),
ADD COLUMN     "propuestaFuente" TEXT;

-- CreateTable
CREATE TABLE "AudienciaDeMarca" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descriptores" JSONB NOT NULL,
    "origen" "OrigenSeccion" NOT NULL DEFAULT 'PERSONA',
    "fuente" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "archivada" BOOLEAN NOT NULL DEFAULT false,
    "autorId" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudienciaDeMarca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AudienciaDeMarca_clientId_idx" ON "AudienciaDeMarca"("clientId");

-- AddForeignKey
ALTER TABLE "AudienciaDeMarca" ADD CONSTRAINT "AudienciaDeMarca_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Las guías pasan a reglas de estilo
UPDATE "SeccionAdn" SET "clave" = 'reglasDeEstilo' WHERE "clave" = 'guias';
