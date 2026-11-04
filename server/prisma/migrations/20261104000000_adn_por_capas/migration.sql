-- ADN por capas (decisión 16, docs/ecosistema/tecnico/spec-plataforma.md § 5b).
--
-- Aditiva: un enum, dos tablas y dos columnas nullable. No rellena nada: las secciones salen de
-- las columnas del ADN de Client con `npm run backfill:adn -- --apply`, y mientras tanto el motor
-- resuelve desde esas columnas, como hoy.

-- CreateEnum
CREATE TYPE "ModoSeccionAdn" AS ENUM ('HEREDA', 'PROPIA', 'SUMA');

-- AlterTable
ALTER TABLE "GenerationLog" ADD COLUMN     "adnVersion" INTEGER;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "adnVersion" INTEGER;

-- CreateTable
CREATE TABLE "SeccionAdn" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "contenido" JSONB NOT NULL,
    "modo" "ModoSeccionAdn" NOT NULL DEFAULT 'PROPIA',
    "autorId" TEXT,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeccionAdn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdnVersion" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "madreId" TEXT,
    "versionMadre" INTEGER,
    "secciones" JSONB NOT NULL,
    "motivo" TEXT NOT NULL,
    "autorId" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdnVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeccionAdn_clientId_clave_key" ON "SeccionAdn"("clientId", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "AdnVersion_clientId_version_key" ON "AdnVersion"("clientId", "version");

-- AddForeignKey
ALTER TABLE "SeccionAdn" ADD CONSTRAINT "SeccionAdn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdnVersion" ADD CONSTRAINT "AdnVersion_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

