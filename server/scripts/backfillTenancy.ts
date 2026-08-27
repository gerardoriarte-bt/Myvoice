/**
 * Backfill de tenancy: reparte la data existente en el modelo
 * "un workspace por empresa + membresías".
 *
 *   npm run backfill:tenancy            → dry-run, no escribe nada
 *   npm run backfill:tenancy -- --apply → escribe, en una sola transacción
 *
 * Reglas (deliberadamente conservadoras — el script no adivina a qué empresa
 * pertenece una marca que no tiene usuarios propios):
 *
 *   1. Toda marca que HOY tiene usuarios propios (User.clientId apuntando a
 *      ella) es una empresa: se le crea su workspace y sus usuarios entran ahí
 *      como MEMBER. Esto es lo que evita que un usuario de Terpel termine
 *      viendo las marcas de otro cliente.
 *   2. Las marcas sin usuarios propios son marcas gestionadas por la agencia:
 *      se quedan en su workspace actual, o en el de fallback si estaban
 *      huérfanas.
 *   3. Quien hoy tiene User.workspaceId (el equipo interno) recibe membresía
 *      ADMIN en ese workspace, y también en cada workspace de empresa que se
 *      haya recortado de él — así la agencia no pierde el acceso que ya tenía.
 *   4. El miembro ADMIN más antiguo de cada workspace queda como OWNER.
 *   5. Usuarios sin workspace y sin marca no reciben nada: quedan reportados
 *      para invitarlos a mano. Es preferible a meterlos en un workspace al azar.
 *
 * Correr ANTES de la migración 20260826000001_workspace_required.
 */

import { PrismaClient, WorkspaceRole } from '@prisma/client';
import { Reporte } from './lib/reporte.js';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const reporte = new Reporte('backfill-tenancy', APPLY);

const slugify = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'workspace';

type Plan = {
  createWorkspaces: { id: string; name: string; slug: string; fromClientId: string }[];
  moveClients: { clientId: string; clientName: string; from: string | null; to: string }[];
  memberships: { userId: string; email: string; workspaceId: string; role: WorkspaceRole }[];
  orphans: { table: string; id: string; to: string }[];
  activeWorkspace: { userId: string; email: string; workspaceId: string }[];
  unassignedUsers: { id: string; email: string; role: string }[];
};

async function main() {
  const [workspaces, users, clients, projects, reviewSessions, presets] = await Promise.all([
    prisma.workspace.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.client.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.project.findMany(),
    prisma.reviewSession.findMany(),
    prisma.generationPreset.findMany(),
  ]);

  const existingMemberships = await prisma.membership.findMany();
  const hasMembership = new Set(existingMemberships.map(m => `${m.userId}:${m.workspaceId}`));

  // ---- workspace de fallback para la data huérfana ----------------------
  let fallback = workspaces.find(w => w.slug === 'lobueno') ?? workspaces[0] ?? null;
  const createdFallback = !fallback;
  if (!fallback) {
    fallback = {
      id: 'new-legacy-workspace',
      name: 'Legacy',
      slug: 'legacy',
      plan: 'agency',
      aiProvider: null,
      aiApiKey: null,
      aiModel: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as (typeof workspaces)[number];
  }

  const plan: Plan = {
    createWorkspaces: [],
    moveClients: [],
    memberships: [],
    orphans: [],
    activeWorkspace: [],
    unassignedUsers: [],
  };

  const takenSlugs = new Set(workspaces.map(w => w.slug));
  const uniqueSlug = (base: string) => {
    let slug = base;
    let n = 2;
    while (takenSlugs.has(slug)) slug = `${base}-${n++}`;
    takenSlugs.add(slug);
    return slug;
  };

  // Regla 1 — cada marca con usuarios propios se vuelve su propia empresa.
  const usersByClient = new Map<string, typeof users>();
  for (const u of users) {
    if (!u.clientId) continue;
    const list = usersByClient.get(u.clientId) ?? [];
    list.push(u);
    usersByClient.set(u.clientId, list);
  }

  // workspace final de cada marca, para resolver el resto de la data
  const clientWorkspace = new Map<string, string>();
  // workspaces de empresa recortados de un workspace de agencia
  const carvedFrom = new Map<string, string[]>();

  for (const client of clients) {
    const ownUsers = usersByClient.get(client.id) ?? [];

    if (ownUsers.length > 0) {
      const wsId = `ws-${client.id}`;
      const slug = uniqueSlug(slugify(client.name));
      plan.createWorkspaces.push({ id: wsId, name: client.name, slug, fromClientId: client.id });
      plan.moveClients.push({
        clientId: client.id,
        clientName: client.name,
        from: client.workspaceId,
        to: wsId,
      });
      clientWorkspace.set(client.id, wsId);

      const origin = client.workspaceId ?? fallback.id;
      carvedFrom.set(origin, [...(carvedFrom.get(origin) ?? []), wsId]);

      for (const u of ownUsers) {
        plan.memberships.push({
          userId: u.id,
          email: u.email,
          workspaceId: wsId,
          role: WorkspaceRole.MEMBER,
        });
      }
    } else {
      const target = client.workspaceId ?? fallback.id;
      clientWorkspace.set(client.id, target);
      if (!client.workspaceId) {
        plan.orphans.push({ table: 'Client', id: client.id, to: target });
        plan.moveClients.push({
          clientId: client.id,
          clientName: client.name,
          from: null,
          to: target,
        });
      }
    }
  }

  // Regla 3 — el equipo interno conserva su acceso, más los workspaces recortados.
  for (const u of users) {
    if (!u.workspaceId) continue;
    const targets = [u.workspaceId, ...(carvedFrom.get(u.workspaceId) ?? [])];
    for (const wsId of targets) {
      if (hasMembership.has(`${u.id}:${wsId}`)) continue;
      if (plan.memberships.some(m => m.userId === u.id && m.workspaceId === wsId)) continue;
      plan.memberships.push({
        userId: u.id,
        email: u.email,
        workspaceId: wsId,
        role: WorkspaceRole.ADMIN,
      });
    }
  }

  // Regla 5 — quien queda sin nada se reporta, no se inventa.
  for (const u of users) {
    const mine = plan.memberships.filter(m => m.userId === u.id);
    const already = existingMemberships.filter(m => m.userId === u.id);
    if (mine.length === 0 && already.length === 0) {
      plan.unassignedUsers.push({ id: u.id, email: u.email, role: u.role });
      continue;
    }
    const valid = [...already.map(m => m.workspaceId), ...mine.map(m => m.workspaceId)];
    if (!u.workspaceId || !valid.includes(u.workspaceId)) {
      plan.activeWorkspace.push({ userId: u.id, email: u.email, workspaceId: valid[0] });
    }
  }

  // Regla 4 — OWNER por workspace.
  const owners = new Map<string, string>();
  for (const m of plan.memberships) {
    if (m.role !== WorkspaceRole.ADMIN) continue;
    if (!owners.has(m.workspaceId)) owners.set(m.workspaceId, m.userId);
  }
  for (const m of plan.memberships) {
    if (owners.get(m.workspaceId) === m.userId && m.role === WorkspaceRole.ADMIN) {
      m.role = WorkspaceRole.OWNER;
    }
  }

  // Resto de la data huérfana.
  for (const p of projects) {
    if (!p.workspaceId) plan.orphans.push({ table: 'Project', id: p.id, to: fallback.id });
  }
  for (const r of reviewSessions) {
    if (!r.workspaceId) plan.orphans.push({ table: 'ReviewSession', id: r.id, to: fallback.id });
  }
  for (const g of presets) {
    if (!g.workspaceId) plan.orphans.push({ table: 'GenerationPreset', id: g.id, to: fallback.id });
  }

  // ---- reporte ---------------------------------------------------------
  const wsName = (id: string) =>
    plan.createWorkspaces.find(w => w.id === id)?.name ??
    workspaces.find(w => w.id === id)?.name ??
    (id === fallback.id ? fallback.name : id);

  console.log(`\n${APPLY ? '=== APLICANDO ===' : '=== DRY-RUN (nada se escribe) ==='}\n`);
  console.log(`Estado actual: ${workspaces.length} workspaces, ${users.length} usuarios, ${clients.length} marcas`);
  console.log(`Workspace de fallback: ${fallback.name} (${fallback.slug})${createdFallback ? ' — se va a crear' : ''}\n`);

  console.log(`Workspaces de empresa a crear (${plan.createWorkspaces.length}):`);
  for (const w of plan.createWorkspaces) console.log(`  + ${w.name}  [${w.slug}]`);

  console.log(`\nMarcas a mover (${plan.moveClients.length}):`);
  for (const c of plan.moveClients) {
    console.log(`  · ${c.clientName}: ${c.from ? wsName(c.from) : '(huérfana)'} → ${wsName(c.to)}`);
  }

  console.log(`\nMembresías a crear (${plan.memberships.length}):`);
  for (const m of plan.memberships) console.log(`  · ${m.email} → ${wsName(m.workspaceId)} [${m.role}]`);

  console.log(`\nRegistros huérfanos a reasignar (${plan.orphans.length}):`);
  const byTable = plan.orphans.reduce<Record<string, number>>((acc, o) => {
    acc[o.table] = (acc[o.table] ?? 0) + 1;
    return acc;
  }, {});
  for (const [table, count] of Object.entries(byTable)) console.log(`  · ${table}: ${count}`);

  reporte
    .leidas('Workspace', workspaces.length)
    .leidas('User', users.length)
    .leidas('Client', clients.length)
    .leidas('Project', projects.length)
    .leidas('ReviewSession', reviewSessions.length)
    .leidas('GenerationPreset', presets.length)
    .planea('Workspace creados', plan.createWorkspaces.length + (createdFallback ? 1 : 0))
    .planea('Client movidos', plan.moveClients.length)
    .planea('Membership', plan.memberships.length)
    .planea('huérfanos reasignados', plan.orphans.filter(o => o.table !== 'Client').length)
    .planea('User.workspaceId activo', plan.activeWorkspace.length)
    .saltea('usuarios sin workspace ni marca (hay que invitarlos a mano)', plan.unassignedUsers.length);

  if (plan.unassignedUsers.length > 0) {
    reporte.advierte(
      `${plan.unassignedUsers.length} usuarios quedan sin acceso a ningún workspace: ` +
      plan.unassignedUsers.map(u => u.email).join(', ')
    );
  }

  if (plan.unassignedUsers.length > 0) {
    console.log(`\n⚠  Usuarios que quedan SIN acceso (${plan.unassignedUsers.length}) — hay que invitarlos a mano:`);
    for (const u of plan.unassignedUsers) console.log(`  · ${u.email} (rol legacy: ${u.role})`);
  }

  if (!APPLY) {
    console.log('\nNada se escribió. Volvé a correr con --apply para aplicarlo.');
    reporte.cierra();
    return;
  }

  // ---- aplicar ---------------------------------------------------------
  const realId = new Map<string, string>();
  const escrito = {
    workspaces: 0, clients: 0, memberships: 0, huerfanos: 0, activos: 0,
  };

  await prisma.$transaction(async tx => {
    if (createdFallback) {
      const created = await tx.workspace.create({
        data: { name: fallback.name, slug: fallback.slug, plan: 'agency' },
      });
      realId.set(fallback.id, created.id);
      escrito.workspaces++;
    }

    for (const w of plan.createWorkspaces) {
      const created = await tx.workspace.create({
        data: { name: w.name, slug: w.slug, plan: 'company' },
      });
      realId.set(w.id, created.id);
      escrito.workspaces++;
    }

    const resolve = (id: string) => realId.get(id) ?? id;

    for (const c of plan.moveClients) {
      await tx.client.update({ where: { id: c.clientId }, data: { workspaceId: resolve(c.to) } });
      escrito.clients++;
    }

    for (const m of plan.memberships) {
      await tx.membership.upsert({
        where: { userId_workspaceId: { userId: m.userId, workspaceId: resolve(m.workspaceId) } },
        create: { userId: m.userId, workspaceId: resolve(m.workspaceId), role: m.role },
        update: { role: m.role },
      });
      escrito.memberships++;
    }

    for (const o of plan.orphans) {
      if (o.table === 'Client') continue; // ya movido arriba
      const target = { workspaceId: resolve(o.to) };
      if (o.table === 'Project') await tx.project.update({ where: { id: o.id }, data: target });
      if (o.table === 'ReviewSession') await tx.reviewSession.update({ where: { id: o.id }, data: target });
      if (o.table === 'GenerationPreset') await tx.generationPreset.update({ where: { id: o.id }, data: target });
      escrito.huerfanos++;
    }

    for (const a of plan.activeWorkspace) {
      await tx.user.update({ where: { id: a.userId }, data: { workspaceId: resolve(a.workspaceId) } });
      escrito.activos++;
    }
  }, { timeout: 120_000 });

  reporte
    .escribio('Workspace creados', escrito.workspaces)
    .escribio('Client movidos', escrito.clients)
    .escribio('Membership', escrito.memberships)
    .escribio('huérfanos reasignados', escrito.huerfanos)
    .escribio('User.workspaceId activo', escrito.activos);

  console.log('\n✓ Backfill aplicado. Ahora sí podés correr la migración 20260826000001_workspace_required.');
  reporte.cierra();
}

main()
  .catch(err => {
    console.error('\nBackfill abortado — no se escribió nada:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
