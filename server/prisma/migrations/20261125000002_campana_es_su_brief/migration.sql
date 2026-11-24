-- Una campaña es su brief (Gerardo, 2026-11-24). Hasta hoy la campaña nacía la primera vez que alguien generaba copy
-- con el brief, así que Marca (que lista briefs), el selector del encabezado y «Nuevo planning» (que listan campañas)
-- no mostraban lo mismo. Desde ahora crear el brief crea la campaña; esta migración completa lo que ya existe.

-- 1. Cada brief sin campaña recibe la suya, con su nombre y su fecha.
INSERT INTO "Project" ("id", "name", "createdAt", "workspaceId", "clientId", "dnaProfileId")
SELECT gen_random_uuid()::text, d."name", d."createdAt", c."workspaceId", d."clientId", d."id"
FROM "ContentDNAProfile" d
JOIN "Client" c ON c."id" = d."clientId"
WHERE NOT EXISTS (SELECT 1 FROM "Project" p WHERE p."dnaProfileId" = d."id");

-- 2. Un solo nombre: donde el brief y su campaña se llaman distinto, el brief toma el de la campaña, que es el que ya
--    conocen la sábana, las aprobaciones, el portal del cliente y las notificaciones.
UPDATE "ContentDNAProfile" d
SET "name" = p."name"
FROM "Project" p
WHERE p."dnaProfileId" = d."id" AND p."name" <> d."name";
