-- Revisar el ADN antes de heredar (docs/plan-revision-adn.md).
--
-- Aditiva: cuatro columnas nullable. Ninguna madre queda confirmada: ninguna submarca hereda hasta
-- que alguien confirme el ADN de su madre en la app.

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "adnConfirmadoEn" TIMESTAMP(3),
ADD COLUMN     "adnConfirmadoPorId" TEXT;

-- AlterTable
ALTER TABLE "SeccionAdn" ADD COLUMN     "revisadaEn" TIMESTAMP(3),
ADD COLUMN     "revisadaPorId" TEXT;

