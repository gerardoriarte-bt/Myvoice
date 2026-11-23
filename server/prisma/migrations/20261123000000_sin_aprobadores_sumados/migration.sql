-- Decisión 30, cambio del 2026-11-23: quién aprueba sale de la función Aprobación en Equipo. La tabla de aprobadores
-- sumados por campaña quedó sin uso (en producción tenía una fila: Gerardo en «Talento 2026», que ya aprueba por su
-- función). Gerardo pidió borrarla.
/*
  Warnings:

  - You are about to drop the `AprobadorDeCampana` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AprobadorDeCampana" DROP CONSTRAINT "AprobadorDeCampana_projectId_fkey";

-- DropForeignKey
ALTER TABLE "AprobadorDeCampana" DROP CONSTRAINT "AprobadorDeCampana_userId_fkey";

-- DropTable
DROP TABLE "AprobadorDeCampana";
