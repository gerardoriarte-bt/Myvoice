-- Novedades vistas por persona (el modal al iniciar sesión y la página de
-- Novedades). Aditiva: una columna con default, nada existente cambia.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "novedadesVistas" TEXT[] DEFAULT ARRAY[]::TEXT[];
