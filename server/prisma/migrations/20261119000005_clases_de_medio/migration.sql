-- Decisión 29: clases de medio y la función Community manager. Aditiva; los medios existentes quedan en PAGOS.
-- CreateEnum
CREATE TYPE "ClaseDeMedio" AS ENUM ('PAGOS', 'REDES_SOCIALES', 'PROPIOS', 'TRADICIONAL');

-- AlterEnum
ALTER TYPE "FuncionEquipo" ADD VALUE 'COMMUNITY';

-- AlterTable
ALTER TABLE "Medio" ADD COLUMN     "clase" "ClaseDeMedio" NOT NULL DEFAULT 'PAGOS';
