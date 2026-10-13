-- Producción con responsable (docs/plan-produccion-con-responsable.md).
--
-- La columna «Con el cliente»: aceptada por el equipo, falta la aprobación del
-- cliente. BEFORE 'LISTA' para que ordenar por estado siga el proceso.
-- Va sola en su migración: Postgres no deja usar un valor de enum nuevo en la
-- misma transacción que lo crea, y la siguiente migración lo usa.

-- AlterEnum
ALTER TYPE "PiezaEstado" ADD VALUE 'CON_EL_CLIENTE' BEFORE 'LISTA';
