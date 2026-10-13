-- Las piezas que hoy están en LISTA y en una revisión de piezas pendiente y
-- vigente esperan al cliente: pasan a CON_EL_CLIENTE. Las que están en LISTA
-- sin enviar se quedan: el equipo ya las había dado por terminadas.

UPDATE "Pieza" p
SET "estado" = 'CON_EL_CLIENTE', "estadoDesde" = NOW()
WHERE p."estado" = 'LISTA'
  AND EXISTS (
    SELECT 1
    FROM "ReviewSessionItem" i
    JOIN "ReviewSession" r ON r."id" = i."reviewSessionId"
    WHERE i."piezaId" = p."id"
      AND r."ronda" = 'PIEZA'
      AND r."status" <> 'COMPLETED'
      AND r."expiresAt" > NOW()
  );
