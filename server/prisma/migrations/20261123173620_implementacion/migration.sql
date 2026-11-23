-- F5 · Implementación: el anuncio que monta el trafficker y su historial, y el destino y la UTM en la línea de la
-- sábana. Solo agrega.
-- CreateEnum
CREATE TYPE "EstadoAnuncio" AS ENUM ('POR_MONTAR', 'MONTADO', 'CON_NOVEDAD');

-- CreateEnum
CREATE TYPE "TipoEventoAnuncio" AS ENUM ('MONTADO', 'DEVUELTO', 'DESTINO', 'REABIERTO');

-- AlterTable
ALTER TABLE "LineaDePlanning" ADD COLUMN     "destino" TEXT,
ADD COLUMN     "utm" TEXT;

-- CreateTable
CREATE TABLE "Anuncio" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "piezaId" TEXT NOT NULL,
    "destino" TEXT,
    "utm" TEXT,
    "estado" "EstadoAnuncio" NOT NULL DEFAULT 'POR_MONTAR',
    "plataforma" TEXT,
    "idEnPlataforma" TEXT,
    "montadoEn" TIMESTAMP(3),
    "montadoPorId" TEXT,
    "novedad" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anuncio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnuncioEvento" (
    "id" TEXT NOT NULL,
    "anuncioId" TEXT NOT NULL,
    "tipo" "TipoEventoAnuncio" NOT NULL,
    "autorId" TEXT NOT NULL,
    "detalle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnuncioEvento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Anuncio_piezaId_key" ON "Anuncio"("piezaId");

-- CreateIndex
CREATE INDEX "Anuncio_workspaceId_clientId_idx" ON "Anuncio"("workspaceId", "clientId");

-- CreateIndex
CREATE INDEX "AnuncioEvento_anuncioId_idx" ON "AnuncioEvento"("anuncioId");

-- AddForeignKey
ALTER TABLE "Anuncio" ADD CONSTRAINT "Anuncio_piezaId_fkey" FOREIGN KEY ("piezaId") REFERENCES "Pieza"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnuncioEvento" ADD CONSTRAINT "AnuncioEvento_anuncioId_fkey" FOREIGN KEY ("anuncioId") REFERENCES "Anuncio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
