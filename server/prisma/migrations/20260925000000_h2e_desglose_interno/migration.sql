-- H2.E fase 1 · el desglose del feedback en copy y diseño.
--
-- Prisma generó para esta migración un DROP COLUMN "comment" + ADD COLUMN
-- "feedbackCopy", que habría borrado todo el feedback de las revisiones ya
-- hechas. Es un RENAME: la columna no cambia de significado, cambia de nombre
-- para decir lo que siempre significó — en la ronda de copy, todo comentario
-- es sobre copy.

-- AlterTable
ALTER TABLE "PiezaEvento" ADD COLUMN "categoria" TEXT;

-- AlterTable
ALTER TABLE "ReviewItemFeedback" RENAME COLUMN "comment" TO "feedbackCopy";
ALTER TABLE "ReviewItemFeedback" ADD COLUMN "feedbackDiseno" TEXT;
