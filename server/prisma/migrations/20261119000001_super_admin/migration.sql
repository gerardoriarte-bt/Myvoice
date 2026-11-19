-- Decisión 27: el super admin, por encima de los workspaces. Aditiva: nadie lo es hasta que el script lo
-- asigna (`npm run superadmin`).
ALTER TABLE "User" ADD COLUMN "superAdmin" BOOLEAN NOT NULL DEFAULT false;
