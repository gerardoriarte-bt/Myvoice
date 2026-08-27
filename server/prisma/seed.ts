/**
 * Seed base: un workspace con su OWNER y unas marcas de ejemplo.
 *
 * Ya no hay password maestro embebido: la contraseña del admin sale de
 * SEED_ADMIN_PASSWORD y el script falla si no está definida.
 *
 *   SEED_ADMIN_EMAIL=admin@empresa.com SEED_ADMIN_PASSWORD=... npm run seed
 */

import { PrismaClient, WorkspaceRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@lobueno.co').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const workspaceName = process.env.SEED_WORKSPACE_NAME || 'LoBueno';
  const workspaceSlug = process.env.SEED_WORKSPACE_SLUG || 'lobueno';

  if (!password) {
    console.error('[seed] Falta SEED_ADMIN_PASSWORD. Abortado para no crear un usuario con contraseña conocida.');
    process.exit(1);
  }

  const workspace = await prisma.workspace.upsert({
    where: { slug: workspaceSlug },
    update: {},
    create: { name: workspaceName, slug: workspaceSlug, plan: 'agency' },
  });

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: 'Admin', workspaceId: workspace.id },
  });

  await prisma.membership.upsert({
    where: { userId_workspaceId: { userId: admin.id, workspaceId: workspace.id } },
    create: { userId: admin.id, workspaceId: workspace.id, role: WorkspaceRole.OWNER },
    update: { role: WorkspaceRole.OWNER },
  });

  console.log(`[seed] Workspace "${workspace.name}" con OWNER ${admin.email}`);

  const brands = [
    { name: 'Terpel', industry: 'Energía y Combustibles' },
    { name: 'Huggies', industry: 'Cuidado Infantil' },
    { name: 'Volkswagen', industry: 'Automotriz' },
    { name: 'Colmédica', industry: 'Salud' },
  ];

  for (const brand of brands) {
    const existing = await prisma.client.findFirst({
      where: { name: brand.name, workspaceId: workspace.id },
    });
    if (existing) {
      console.log(`[seed] Marca ya existía: ${existing.name}`);
      continue;
    }
    const created = await prisma.client.create({
      data: { name: brand.name, industry: brand.industry, workspaceId: workspace.id },
    });
    console.log(`[seed] Marca creada: ${created.name}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
