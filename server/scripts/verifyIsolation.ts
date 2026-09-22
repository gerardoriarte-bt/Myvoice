/**
 * Verificación de aislamiento multi-tenant.
 *
 * Siembra dos empresas (workspace A y workspace B) con un usuario cada una y
 * después, como usuario de B, intenta tocar TODOS los recursos de A. Cada
 * intento debe fallar. Es la contraparte ejecutable de la tabla de 14 endpoints
 * que estaban abiertos.
 *
 *   1. Levantar la API contra una base de PRUEBAS (nunca producción):
 *        DATABASE_URL=postgres://…/myvoice_test npm run dev
 *   2. En otra terminal:
 *        API_URL=http://localhost:3001/api npm run verify:isolation
 *
 * El script limpia lo que crea al terminar.
 */

import { PrismaClient, WorkspaceRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const prisma = new PrismaClient();
const API_URL = process.env.API_URL || 'http://localhost:3001/api';
// Se genera en cada corrida en vez de vivir como literal en el fuente: los dos
// usuarios que siembra este script se borran al terminar, así que la contraseña
// no necesita ser estable — y un literal con forma de credencial en el repo es
// lo que después hace ignorar la alerta que sí importa.
const PASSWORD = `V-${randomBytes(18).toString('base64url')}`;

type Check = { name: string; ok: boolean; detail: string };
const checks: Check[] = [];

const record = (name: string, ok: boolean, detail: string) => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${ok ? '' : ` — ${detail}`}`);
};

const api = async (path: string, token: string, init: RequestInit = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* respuesta sin cuerpo */
  }
  return { status: res.status, body };
};

/** Un intento cross-tenant debe fallar con 403 o 404, nunca con 2xx. */
const expectDenied = async (name: string, path: string, token: string, init?: RequestInit) => {
  const { status, body } = await api(path, token, init);
  const denied = status === 403 || status === 404;
  record(name, denied, `respondió ${status} ${JSON.stringify(body)?.slice(0, 90)}`);
};

const expectAllowed = async (name: string, path: string, token: string, init?: RequestInit) => {
  const { status, body } = await api(path, token, init);
  const allowed = status >= 200 && status < 300;
  record(name, allowed, `respondió ${status} ${JSON.stringify(body)?.slice(0, 90)}`);
};

async function seedTenant(tag: string) {
  const workspace = await prisma.workspace.create({
    data: { name: `Verif ${tag}`, slug: `verif-${tag}-${Date.now()}`, plan: 'company' },
  });
  const user = await prisma.user.create({
    data: {
      email: `verif-${tag}-${Date.now()}@example.com`,
      name: `Verif ${tag}`,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      workspaceId: workspace.id,
    },
  });
  await prisma.membership.create({
    data: { userId: user.id, workspaceId: workspace.id, role: WorkspaceRole.OWNER },
  });
  const client = await prisma.client.create({
    data: { name: `Marca ${tag}`, industry: 'Test', workspaceId: workspace.id },
  });
  const dna = await prisma.contentDNAProfile.create({
    data: {
      clientId: client.id,
      name: `Brief ${tag}`,
      voice: 'Test',
      goal: 'Test',
      product: 'Test',
      targetAudience: 'Test',
      theme: 'Test',
      keywords: 'test',
      brandVoiceGuidelines: 'test',
      valueProposition: 'test',
      primaryCTA: 'test',
    },
  });
  const project = await prisma.project.create({
    data: { name: `Proyecto ${tag}`, workspaceId: workspace.id },
  });
  const variation = await prisma.savedVariation.create({
    data: {
      clientId: client.id,
      projectId: project.id,
      platform: 'Push Notification',
      type: 'Beneficio',
      content: `Contenido secreto de ${tag}`,
      charCount: 24,
      tags: [],
    },
  });
  const preset = await prisma.generationPreset.create({
    data: { name: `Preset ${tag}`, workspaceId: workspace.id, parameters: {} },
  });

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: PASSWORD }),
  });
  const session = await res.json();
  if (!session.token) throw new Error(`No se pudo loguear a ${tag}: ${JSON.stringify(session)}`);

  return { workspace, user, client, dna, project, variation, preset, token: session.token as string };
}

async function main() {
  console.log(`\nVerificando aislamiento contra ${API_URL}\n`);

  const A = await seedTenant('a');
  const B = await seedTenant('b');

  try {
    console.log('LECTURA — B no debe ver nada de A');
    const clients = await api('/clients', B.token);
    record(
      'GET /clients no incluye la marca de A',
      Array.isArray(clients.body) && !clients.body.some((c: any) => c.id === A.client.id),
      `devolvió ${JSON.stringify(clients.body)?.slice(0, 120)}`
    );
    const saved = await api('/saved', B.token);
    record(
      'GET /saved no incluye el contenido de A',
      Array.isArray(saved.body) && !saved.body.some((v: any) => v.id === A.variation.id),
      `devolvió ${saved.body?.length} filas`
    );
    const projects = await api('/projects', B.token);
    record(
      'GET /projects no incluye el proyecto de A',
      Array.isArray(projects.body) && !projects.body.some((p: any) => p.id === A.project.id),
      `devolvió ${projects.body?.length} filas`
    );
    const presets = await api('/presets', B.token);
    record(
      'GET /presets no incluye el preset de A',
      Array.isArray(presets.body) && !presets.body.some((p: any) => p.id === A.preset.id),
      `devolvió ${presets.body?.length} filas`
    );
    const members = await api('/users', B.token);
    record(
      'GET /users no incluye al usuario de A',
      Array.isArray(members.body) && !members.body.some((u: any) => u.id === A.user.id),
      `devolvió ${JSON.stringify(members.body)?.slice(0, 120)}`
    );

    console.log('\nESCRITURA — B no debe poder tocar los recursos de A');
    await expectDenied('PUT /clients/:id de A', `/clients/${A.client.id}`, B.token, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Secuestrada' }),
    });
    await expectDenied('DELETE /clients/:id de A', `/clients/${A.client.id}`, B.token, { method: 'DELETE' });
    await expectDenied('POST /dna-profiles en la marca de A', '/dna-profiles', B.token, {
      method: 'POST',
      body: JSON.stringify({ clientId: A.client.id, name: 'Intruso' }),
    });
    await expectDenied('PUT /dna-profiles/:id de A', `/dna-profiles/${A.dna.id}`, B.token, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Intruso' }),
    });
    await expectDenied('POST /dna-profiles/:id/duplicate de A', `/dna-profiles/${A.dna.id}/duplicate`, B.token, {
      method: 'POST',
    });
    await expectDenied('DELETE /dna-profiles/:id de A', `/dna-profiles/${A.dna.id}`, B.token, { method: 'DELETE' });
    await expectDenied('GET /dna-profiles/:id/insights de A', `/dna-profiles/${A.dna.id}/insights`, B.token);
    await expectDenied('POST /saved en la marca de A', '/saved', B.token, {
      method: 'POST',
      body: JSON.stringify({
        clientId: A.client.id,
        platform: 'Push Notification',
        type: 'Beneficio',
        content: 'inyectado',
        charCount: 9,
      }),
    });
    await expectDenied('PUT /saved/:id de A', `/saved/${A.variation.id}`, B.token, {
      method: 'PUT',
      body: JSON.stringify({ content: 'editado por B' }),
    });
    await expectDenied('DELETE /saved/:id de A', `/saved/${A.variation.id}`, B.token, { method: 'DELETE' });
    await expectDenied('DELETE /projects/:id de A', `/projects/${A.project.id}`, B.token, { method: 'DELETE' });
    await expectDenied('POST /feedback/negative en la marca de A', '/feedback/negative', B.token, {
      method: 'POST',
      body: JSON.stringify({ clientId: A.client.id, content: 'veneno', reason: 'veneno' }),
    });
    await expectDenied('DELETE /presets/:id de A', `/presets/${A.preset.id}`, B.token, { method: 'DELETE' });
    await expectDenied('DELETE /users/:id de A', `/users/${A.user.id}`, B.token, { method: 'DELETE' });
    await expectDenied('POST /copy/refine con la marca de A', '/copy/refine', B.token, {
      method: 'POST',
      body: JSON.stringify({
        clientId: A.client.id,
        instruction: 'acortar',
        variations: [{ id: 'x', platform: 'Push Notification', slot: 'body', type: 'Beneficio', content: 'hola', charCount: 4, variationIndex: 1 }],
      }),
    });
    await expectDenied('POST /generate con el brief de A', '/generate', B.token, {
      method: 'POST',
      body: JSON.stringify({ dnaProfileId: A.dna.id, params: { platforms: ['Push Notification'] } }),
    });

    console.log('\nBULK Y REVISIONES — no deben filtrar por id ajeno');
    // La fila de B que entra al bulk es DESECHABLE: el borrado de lo propio es
    // el comportamiento correcto y se lleva la fila puesta, así que usar acá
    // `B.variation` dejaba sin sujeto al control positivo y al chequeo de mass
    // assignment que vienen después — los dos fallaban por una fila borrada por
    // el propio test, no por una fuga.
    const desechable = await prisma.savedVariation.create({
      data: {
        clientId: B.client.id,
        platform: 'Push Notification',
        type: 'Beneficio',
        content: 'Fila desechable de B para el bulk',
        charCount: 33,
        tags: [],
      },
    });
    const bulk = await api('/saved/bulk-delete', B.token, {
      method: 'POST',
      body: JSON.stringify({ ids: [A.variation.id, desechable.id] }),
    });
    const survivedA = await prisma.savedVariation.findUnique({ where: { id: A.variation.id } });
    const borroLaPropia = !(await prisma.savedVariation.findUnique({ where: { id: desechable.id } }));
    record(
      'POST /saved/bulk-delete ignora los ids de A',
      Boolean(survivedA) && bulk.body?.skipped === 1,
      `respuesta ${JSON.stringify(bulk.body)}, la fila de A ${survivedA ? 'sobrevivió' : 'FUE BORRADA'}`
    );
    record(
      'POST /saved/bulk-delete sí borra la fila propia del mismo lote',
      borroLaPropia && bulk.body?.deleted === 1,
      `respuesta ${JSON.stringify(bulk.body)} — un bulk que no borra nada de lo propio no prueba nada`
    );

    const session = await api('/review-sessions', B.token, {
      method: 'POST',
      body: JSON.stringify({ title: 'Intento cross-tenant', variationIds: [A.variation.id] }),
    });
    record(
      'POST /review-sessions rechaza variaciones de A',
      session.status === 403 || session.status === 404,
      `respondió ${session.status} — un token público con copy ajeno sería una filtración`
    );

    console.log('\nPIEZAS — el tablero de producción no puede cruzar tenants');
    // El copy sembrado arriba es de Push Notification, que no produce pieza:
    // para el tablero hace falta un canal que sí, y aprobado.
    const aprobado = (clientId: string, projectId: string | null) =>
      prisma.savedVariation.create({
        data: {
          clientId,
          projectId,
          platform: 'Instagram Post',
          type: 'Beneficio',
          content: `Hook aprobado ${clientId.slice(0, 6)}`,
          charCount: 20,
          tags: [],
          slot: 'hook',
          slotLabel: 'Hook (línea 1)',
          isApproved: true,
        },
      });
    const aprobadoA = await aprobado(A.client.id, A.project.id);
    const aprobadoB = await aprobado(B.client.id, B.project.id);
    const piezaA = await prisma.pieza.create({
      data: {
        workspaceId: A.workspace.id,
        clientId: A.client.id,
        platform: 'Instagram Post',
        tipo: 'GRAFICA',
        formato: '1080×1080',
        titulo: 'Pieza de A',
        huella: 'verif-a-' + aprobadoA.id,
        creadaPorId: A.user.id,
        slots: {
          create: {
            savedVariationId: aprobadoA.id,
            slot: 'hook',
            slotLabel: 'Hook (línea 1)',
            textoCongelado: aprobadoA.content,
          },
        },
      },
    });

    const tablero = await api(`/piezas?clientId=${A.client.id}`, B.token);
    record(
      'GET /piezas de la marca de A',
      tablero.status === 403 || tablero.status === 404,
      `respondió ${tablero.status}`
    );
    const mias = await api('/piezas/mias', B.token);
    record(
      'GET /piezas/mias no incluye piezas de A',
      Array.isArray(mias.body) && !mias.body.some((p: any) => p.id === piezaA.id),
      `devolvió ${JSON.stringify(mias.body)?.slice(0, 120)}`
    );
    await expectDenied('GET /piezas/:id de A', `/piezas/${piezaA.id}`, B.token);
    await expectDenied('PATCH /piezas/:id de A', `/piezas/${piezaA.id}`, B.token, {
      method: 'PATCH',
      body: JSON.stringify({ titulo: 'Secuestrada' }),
    });
    await expectDenied('POST /piezas/:id/asignar de A', `/piezas/${piezaA.id}/asignar`, B.token, {
      method: 'POST',
      body: JSON.stringify({ asignadaAId: B.user.id }),
    });
    await expectDenied('POST /piezas/:id/devolver de A', `/piezas/${piezaA.id}/devolver`, B.token, {
      method: 'POST',
      body: JSON.stringify({ nota: 'intruso' }),
    });
    await expectDenied('POST /piezas con un aprobado de A', '/piezas', B.token, {
      method: 'POST',
      body: JSON.stringify({
        piezas: [{ platform: 'Instagram Post', formato: '1080×1080', titulo: 'Robo', savedVariationIds: [aprobadoA.id] }],
      }),
    });
    const propuesta = await api('/piezas/propuesta', B.token, {
      method: 'POST',
      body: JSON.stringify({ savedVariationIds: [aprobadoA.id] }),
    });
    record(
      'POST /piezas/propuesta ignora el copy de A',
      propuesta.status >= 200 && propuesta.status < 300 && propuesta.body?.piezas?.length === 0,
      `respondió ${propuesta.status} ${JSON.stringify(propuesta.body)?.slice(0, 120)}`
    );

    console.log('\nPIEZAS — el ciclo propio de B sí funciona');
    const creada = await api('/piezas', B.token, {
      method: 'POST',
      body: JSON.stringify({
        piezas: [{ platform: 'Instagram Post', formato: '1080×1080', titulo: 'Pieza de B', savedVariationIds: [aprobadoB.id] }],
      }),
    });
    const piezaB = creada.body?.[0];
    record('POST /piezas crea la pieza propia', creada.status === 201 && !!piezaB?.id, `respondió ${creada.status}`);

    const repetida = await api('/piezas', B.token, {
      method: 'POST',
      body: JSON.stringify({
        piezas: [{ platform: 'Instagram Post', formato: '1080×1080', titulo: 'Duplicada', savedVariationIds: [aprobadoB.id] }],
      }),
    });
    record(
      'POST /piezas rechaza con 409 la pieza repetida',
      repetida.status === 409,
      `respondió ${repetida.status} — el unique (workspaceId, huella) es la última línea`
    );

    // El A/B comparte el cuerpo y cambia el hook: son dos piezas del mismo
    // formato con un aprobado en común, y eso tiene que poder crearse. La
    // primera versión del modelo lo prohibía sin querer.
    const segundoHook = await aprobado(B.client.id, B.project.id);
    const ab = await api('/piezas', B.token, {
      method: 'POST',
      body: JSON.stringify({
        piezas: [
          { platform: 'Instagram Post', formato: '1080×1080', titulo: 'A/B — variante', savedVariationIds: [segundoHook.id] },
        ],
      }),
    });
    record(
      'POST /piezas permite el A/B: misma marca y formato, otro conjunto',
      ab.status === 201,
      `respondió ${ab.status} ${JSON.stringify(ab.body)?.slice(0, 90)}`
    );

    if (piezaB?.id) {
      const asignada = await api(`/piezas/${piezaB.id}/asignar`, B.token, {
        method: 'POST',
        body: JSON.stringify({ asignadaAId: B.user.id }),
      });
      record('POST /piezas/:id/asignar mueve a En diseño', asignada.body?.estado === 'EN_DISENO', `quedó en ${asignada.body?.estado}`);

      const fueraDeOrden = await api(`/piezas/${piezaB.id}/aceptar`, B.token, { method: 'POST' });
      record(
        'Aceptar desde En diseño responde 409',
        fueraDeOrden.status === 409,
        `respondió ${fueraDeOrden.status} — la tabla de transiciones es la única fuente`
      );

      const entregada = await api(`/piezas/${piezaB.id}/entregar`, B.token, {
        method: 'POST',
        body: JSON.stringify({ enlace: 'https://figma.com/file/verif' }),
      });
      record('POST /piezas/:id/entregar mueve a Por revisar', entregada.body?.estado === 'POR_REVISAR', `quedó en ${entregada.body?.estado}`);

      const sinNota = await api(`/piezas/${piezaB.id}/devolver`, B.token, { method: 'POST', body: JSON.stringify({}) });
      record('Devolver sin motivo responde 400', sinNota.status === 400, `respondió ${sinNota.status}`);

      const aceptada = await api(`/piezas/${piezaB.id}/aceptar`, B.token, { method: 'POST' });
      record('POST /piezas/:id/aceptar mueve a Lista', aceptada.body?.estado === 'LISTA', `quedó en ${aceptada.body?.estado}`);

      await prisma.savedVariation.update({ where: { id: aprobadoB.id }, data: { content: 'Hook editado después' } });
      const conDesfase = await api(`/piezas/${piezaB.id}`, B.token);
      record(
        'La pieza avisa que el copy cambió, y conserva el texto congelado',
        conDesfase.body?.desfases?.[0]?.motivo === 'editado' &&
          conDesfase.body?.slots?.[0]?.textoCongelado !== 'Hook editado después',
        `desfases ${JSON.stringify(conDesfase.body?.desfases)?.slice(0, 120)}`
      );
    }

    console.log('\nCONTROL POSITIVO — B sí puede con lo suyo');
    await expectAllowed('PUT /clients/:id propio', `/clients/${B.client.id}`, B.token, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Marca B renombrada' }),
    });
    await expectAllowed('PUT /saved/:id propio', `/saved/${B.variation.id}`, B.token, {
      method: 'PUT',
      body: JSON.stringify({ content: 'editado por su dueño' }),
    });

    console.log('\nMASS ASSIGNMENT — el body no debe poder mover la fila de tenant');
    await api(`/saved/${B.variation.id}`, B.token, {
      method: 'PUT',
      body: JSON.stringify({ content: 'x', clientId: A.client.id }),
    });
    const afterHijack = await prisma.savedVariation.findUnique({ where: { id: B.variation.id } });
    record(
      'PUT /saved/:id ignora clientId del body',
      afterHijack?.clientId === B.client.id,
      `quedó en clientId ${afterHijack?.clientId}`
    );
  } finally {
    // Limpieza: el orden respeta las FK.
    for (const t of [A, B]) {
      // Las piezas primero: referencian marca y workspace.
      await prisma.pieza.deleteMany({ where: { workspaceId: t.workspace.id } });
      await prisma.savedVariation.deleteMany({ where: { clientId: t.client.id } });
      await prisma.negativeFeedback.deleteMany({ where: { clientId: t.client.id } });
      await prisma.contentDNAProfile.deleteMany({ where: { clientId: t.client.id } });
      await prisma.generationLog.deleteMany({ where: { clientId: t.client.id } });
      await prisma.generationPreset.deleteMany({ where: { workspaceId: t.workspace.id } });
      await prisma.project.deleteMany({ where: { workspaceId: t.workspace.id } });
      await prisma.reviewSession.deleteMany({ where: { workspaceId: t.workspace.id } });
      await prisma.client.deleteMany({ where: { workspaceId: t.workspace.id } });
      await prisma.membership.deleteMany({ where: { workspaceId: t.workspace.id } });
      await prisma.user.deleteMany({ where: { id: t.user.id } });
      await prisma.workspace.deleteMany({ where: { id: t.workspace.id } });
    }
  }

  const failed = checks.filter(c => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} verificaciones pasaron`);
  if (failed.length > 0) {
    console.error(`\n${failed.length} FALLARON — hay fuga entre tenants:`);
    failed.forEach(f => console.error(`  · ${f.name}: ${f.detail}`));
    process.exit(1);
  }
  console.log('Aislamiento verificado.\n');
}

main()
  .catch(err => {
    console.error('\nVerificación abortada:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
