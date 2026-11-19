-- F2 (spec-plataforma § 3): qué módulos tiene prendidos cada marca. Aditiva.
-- CreateEnum
CREATE TYPE "ModuloPlataforma" AS ENUM ('CDM', 'IMPLEMENTACION');

-- CreateTable
CREATE TABLE "ModuloDeMarca" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "modulo" "ModuloPlataforma" NOT NULL,
    "encendidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encendidoPorId" TEXT,

    CONSTRAINT "ModuloDeMarca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModuloDeMarca_clientId_modulo_key" ON "ModuloDeMarca"("clientId", "modulo");

-- AddForeignKey
ALTER TABLE "ModuloDeMarca" ADD CONSTRAINT "ModuloDeMarca_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
