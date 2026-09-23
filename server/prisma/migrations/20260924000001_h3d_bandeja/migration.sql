-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "clientId" TEXT,
    "piezaId" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "titulo" TEXT NOT NULL,
    "detalle" TEXT,
    "leidaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notificacion_userId_leidaAt_updatedAt_idx" ON "Notificacion"("userId", "leidaAt", "updatedAt");

-- CreateIndex
CREATE INDEX "Notificacion_workspaceId_tipo_updatedAt_idx" ON "Notificacion"("workspaceId", "tipo", "updatedAt");

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_piezaId_fkey" FOREIGN KEY ("piezaId") REFERENCES "Pieza"("id") ON DELETE SET NULL ON UPDATE CASCADE;
