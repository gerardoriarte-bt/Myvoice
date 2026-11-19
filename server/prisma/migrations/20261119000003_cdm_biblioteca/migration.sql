-- F2 (decisión 18 y 28): la biblioteca de medios de CDM. Aditiva: tablas y enums nuevos, nada existente cambia.
-- CreateEnum
CREATE TYPE "EstadoMedio" AS ENUM ('BORRADOR', 'ACTIVO', 'OCULTO');

-- CreateEnum
CREATE TYPE "TipoDeArchivo" AS ENUM ('IMAGEN', 'VIDEO', 'AUDIO', 'TEXTO', 'HTML');

-- CreateEnum
CREATE TYPE "ZonaDeCampo" AS ENUM ('PIEZA', 'PLATAFORMA');

-- CreateTable
CREATE TABLE "Medio" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" "EstadoMedio" NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formato" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "medioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipoArchivo" "TipoDeArchivo" NOT NULL,
    "proporcion" TEXT,
    "canal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Formato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormatoVersion" (
    "id" TEXT NOT NULL,
    "formatoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "anchoPx" INTEGER,
    "altoPx" INTEGER,
    "archivos" TEXT,
    "pesoMaximo" TEXT,
    "guia" JSONB,
    "fuente" TEXT,
    "fuenteFecha" TIMESTAMP(3),
    "cargaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormatoVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ubicacion" (
    "id" TEXT NOT NULL,
    "formatoVersionId" TEXT NOT NULL,
    "plataforma" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "proporcion" TEXT NOT NULL,
    "resolucion" TEXT,
    "detalles" JSONB,
    "zonaSegura" JSONB,
    "urlFuente" TEXT,
    "alerta" INTEGER,
    "alertaTexto" TEXT,
    "porConfirmar" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Ubicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampoDeTexto" (
    "id" TEXT NOT NULL,
    "formatoVersionId" TEXT NOT NULL,
    "ubicacionId" TEXT,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "zona" "ZonaDeCampo" NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT 'caracteres',
    "minimo" INTEGER,
    "maximo" INTEGER,
    "repeticiones" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CampoDeTexto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargaDePlanilla" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "archivo" TEXT NOT NULL,
    "medio" TEXT NOT NULL,
    "resumen" JSONB NOT NULL,
    "autorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CargaDePlanilla_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Medio_workspaceId_nombre_key" ON "Medio"("workspaceId", "nombre");

-- CreateIndex
CREATE INDEX "Formato_workspaceId_idx" ON "Formato"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Formato_medioId_nombre_key" ON "Formato"("medioId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "FormatoVersion_formatoId_numero_key" ON "FormatoVersion"("formatoId", "numero");

-- CreateIndex
CREATE INDEX "Ubicacion_formatoVersionId_idx" ON "Ubicacion"("formatoVersionId");

-- CreateIndex
CREATE INDEX "CampoDeTexto_formatoVersionId_idx" ON "CampoDeTexto"("formatoVersionId");

-- CreateIndex
CREATE INDEX "CargaDePlanilla_workspaceId_idx" ON "CargaDePlanilla"("workspaceId");

-- AddForeignKey
ALTER TABLE "Medio" ADD CONSTRAINT "Medio_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formato" ADD CONSTRAINT "Formato_medioId_fkey" FOREIGN KEY ("medioId") REFERENCES "Medio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormatoVersion" ADD CONSTRAINT "FormatoVersion_formatoId_fkey" FOREIGN KEY ("formatoId") REFERENCES "Formato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormatoVersion" ADD CONSTRAINT "FormatoVersion_cargaId_fkey" FOREIGN KEY ("cargaId") REFERENCES "CargaDePlanilla"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ubicacion" ADD CONSTRAINT "Ubicacion_formatoVersionId_fkey" FOREIGN KEY ("formatoVersionId") REFERENCES "FormatoVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampoDeTexto" ADD CONSTRAINT "CampoDeTexto_formatoVersionId_fkey" FOREIGN KEY ("formatoVersionId") REFERENCES "FormatoVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampoDeTexto" ADD CONSTRAINT "CampoDeTexto_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "Ubicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargaDePlanilla" ADD CONSTRAINT "CargaDePlanilla_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
