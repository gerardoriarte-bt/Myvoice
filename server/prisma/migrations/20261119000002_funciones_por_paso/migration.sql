-- F1 (decisión 22): las funciones de los pasos ① Marca, ② CDM y ⑤ Implementación. Aditiva: un valor por
-- sentencia, y ninguno se usa en esta misma migración.
ALTER TYPE "FuncionEquipo" ADD VALUE IF NOT EXISTS 'ESTRATEGIA';
ALTER TYPE "FuncionEquipo" ADD VALUE IF NOT EXISTS 'PLANNING';
ALTER TYPE "FuncionEquipo" ADD VALUE IF NOT EXISTS 'TRAFFICKER';
