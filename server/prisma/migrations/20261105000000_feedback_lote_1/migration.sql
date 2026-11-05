-- Feedback de pruebas, lote 1 (2026-11-05): el tratamiento de la marca y cancelar una pieza.
--
-- Aditiva: un enum y tres columnas nullable. Ninguna marca queda con tratamiento: hasta elegirlo
-- rige el default del país, sin el voseo que antes se deducía del ADN.

-- CreateEnum
CREATE TYPE "Tratamiento" AS ENUM ('TU', 'VOS', 'USTED');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "tratamiento" "Tratamiento";

-- AlterTable
ALTER TABLE "Pieza" ADD COLUMN     "canceladaEn" TIMESTAMP(3),
ADD COLUMN     "canceladaPorId" TEXT;

