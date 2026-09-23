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

/**
 * Un miembro más del mismo workspace, con sesión propia. La bandeja no se
 * puede verificar con un solo usuario: casi todas sus reglas hablan de la
 * diferencia entre quien hace algo y quien se entera.
 */
async function nuevoMiembro(workspaceId: string, tag: string) {
  const user = await prisma.user.create({
    data: {
      email: `verif-${tag}-${Date.now()}@example.com`,
      name: `Verif ${tag}`,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      workspaceId,
    },
  });
  await prisma.membership.create({
    data: { userId: user.id, workspaceId, role: WorkspaceRole.MEMBER },
  });
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: PASSWORD }),
  });
  const session = await res.json();
  if (!session.token) throw new Error(`No se pudo loguear a ${tag}: ${JSON.stringify(session)}`);
  return { user, token: session.token as string };
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
    await expectDenied('POST /piezas/:id/comentar de A', `/piezas/${piezaA.id}/comentar`, B.token, {
      method: 'POST',
      body: JSON.stringify({ nota: 'intruso' }),
    });
    await expectDenied('POST /piezas con un aprobado de A', '/piezas', B.token, {
      method: 'POST',
      body: JSON.stringify({
        piezas: [{ platform: 'Instagram Post', formato: '1080×1080', titulo: 'Robo', savedVariationIds: [aprobadoA.id] }],
      }),
    });
    // Fase 3: el archivo y su auditoría son de la pieza, así que heredan su
    // dueño. Un PNG mínimo de 1×1 alcanza para probar el camino completo.
    const pngMinimo = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const subirComoB = async (piezaId: string) => {
      const form = new FormData();
      form.append('archivo', new Blob([pngMinimo], { type: 'image/png' }), 'pieza.png');
      const res = await fetch(`${API_URL}/piezas/${piezaId}/archivo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${B.token}` },
        body: form,
      });
      return { status: res.status, body: await res.json().catch(() => null) };
    };
    const subidaAjena = await subirComoB(piezaA.id);
    record(
      'POST /piezas/:id/archivo de A',
      subidaAjena.status === 403 || subidaAjena.status === 404,
      `respondió ${subidaAjena.status}`
    );
    await expectDenied('POST /piezas/:id/reauditar de A', `/piezas/${piezaA.id}/reauditar`, B.token, { method: 'POST' });

    const hallazgoDeA = await prisma.piezaVersion.create({
      data: {
        piezaId: piezaA.id,
        numero: 1,
        subidaPorId: A.user.id,
        hallazgos: { create: { tipo: 'JUICIO', detalle: 'Hallazgo de A' } },
      },
      include: { hallazgos: true },
    });
    await expectDenied(
      'POST /piezas/hallazgos/:id/decision de A',
      `/piezas/hallazgos/${hallazgoDeA.hallazgos[0].id}/decision`,
      B.token,
      { method: 'POST', body: JSON.stringify({ decision: 'ACEPTADO', nota: 'intruso' }) }
    );

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


      // La subida propia: mueve la pieza a Por revisar y deja una versión con
      // su auditoría pendiente. La auditoría misma no corre en esta prueba
      // —no hay proveedor de IA— y queda en NO_DISPONIBLE, que es justamente
      // el estado que el tablero tiene que saber mostrar.
      const subidaPropia = await subirComoB(piezaB.id);
      record(
        'POST /piezas/:id/archivo entrega la pieza propia y crea su versión',
        subidaPropia.status === 200 && subidaPropia.body?.estado === 'POR_REVISAR' && subidaPropia.body?.version?.numero === 1,
        `respondió ${subidaPropia.status}, estado ${subidaPropia.body?.estado}`
      );

      const sinNota = await api(`/piezas/${piezaB.id}/devolver`, B.token, { method: 'POST', body: JSON.stringify({}) });
      record('Devolver sin motivo responde 400', sinNota.status === 400, `respondió ${sinNota.status}`);

      // Comentar no cambia ninguna columna de Pieza. La primera versión daba
      // 409 por eso: el updateMany con data vacío no tocaba ninguna fila.
      const sinTexto = await api(`/piezas/${piezaB.id}/comentar`, B.token, { method: 'POST', body: JSON.stringify({}) });
      record('Comentar sin texto responde 400', sinTexto.status === 400, `respondió ${sinTexto.status}`);

      const comentada = await api(`/piezas/${piezaB.id}/comentar`, B.token, {
        method: 'POST',
        body: JSON.stringify({ nota: 'El logo va sobre fondo claro' }),
      });
      record(
        'Comentar deja el comentario y NO cambia el estado',
        comentada.status === 200 && comentada.body?.comentarios === 1 && comentada.body?.estado === 'POR_REVISAR',
        `respondió ${comentada.status}, estado ${comentada.body?.estado}, comentarios ${comentada.body?.comentarios}`
      );

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

    console.log('\nFUNCIONES DEL EQUIPO — un eje aparte del permiso');
    await expectDenied('POST funciones sobre un usuario de A', `/workspace/members/${A.user.id}/funciones`, B.token, {
      method: 'POST',
      body: JSON.stringify({ funcion: 'DISENO' }),
    });
    await expectDenied('POST funciones con una marca de A', `/workspace/members/${B.user.id}/funciones`, B.token, {
      method: 'POST',
      body: JSON.stringify({ funcion: 'APROBACION', clientId: A.client.id }),
    });

    const funcionDeA = await prisma.miembroFuncion.create({
      data: { workspaceId: A.workspace.id, userId: A.user.id, funcion: 'DISENO' },
    });
    await expectDenied(
      'DELETE una función de A',
      `/workspace/members/${A.user.id}/funciones/${funcionDeA.id}`,
      B.token,
      { method: 'DELETE' }
    );

    const propia = await api(`/workspace/members/${B.user.id}/funciones`, B.token, {
      method: 'POST',
      body: JSON.stringify({ funcion: 'DISENO', clientId: B.client.id }),
    });
    record(
      'POST funciones sobre lo propio asigna y devuelve la lista',
      propia.status === 200 &&
        propia.body?.[0]?.funcion === 'DISENO' &&
        propia.body?.[0]?.clientId === B.client.id &&
        typeof propia.body?.[0]?.marca === 'string',
      `respondió ${propia.status} ${JSON.stringify(propia.body)?.slice(0, 110)}`
    );

    // Idempotente: la pantalla puede reintentar sin duplicar ni romperse.
    const funcionRepetida = await api(`/workspace/members/${B.user.id}/funciones`, B.token, {
      method: 'POST',
      body: JSON.stringify({ funcion: 'DISENO', clientId: B.client.id }),
    });
    record(
      'Asignar dos veces la misma función no duplica',
      funcionRepetida.status === 200 && funcionRepetida.body?.length === 1,
      `devolvió ${funcionRepetida.body?.length} funciones`
    );

    const miembros = await api('/users', B.token);
    record(
      'GET /users trae las funciones de cada miembro',
      Array.isArray(miembros.body) && miembros.body.find((m: any) => m.id === B.user.id)?.funciones?.length === 1,
      `devolvió ${JSON.stringify(miembros.body?.[0]?.funciones)}`
    );

    console.log('\nBANDEJA — a quién le llega el aviso y a quién no');
    /**
     * Hace falta más de una persona en el workspace: la primera regla contra
     * el ruido es que a nadie se le avisa de su propia acción, así que con un
     * solo usuario todas estas pruebas darían "cero avisos" por el motivo
     * equivocado.
     */
    const segundoDeB = await nuevoMiembro(B.workspace.id, 'disena');
    const terceroDeB = await nuevoMiembro(B.workspace.id, 'aprueba');
    const otraMarcaDeB = await prisma.client.create({
      data: { name: 'Otra marca de B', industry: 'Test', workspaceId: B.workspace.id },
    });

    const paraAsignar = await api('/piezas', B.token, {
      method: 'POST',
      body: JSON.stringify({
        piezas: [
          { platform: 'Instagram Post', formato: '1080×1080', titulo: 'Lote 1', savedVariationIds: [(await aprobado(B.client.id, B.project.id)).id] },
          { platform: 'Instagram Post', formato: '1080×1080', titulo: 'Lote 2', savedVariationIds: [(await aprobado(B.client.id, B.project.id)).id] },
        ],
      }),
    });
    const [lote1, lote2] = paraAsignar.body ?? [];

    await api(`/piezas/${lote1?.id}/asignar`, B.token, {
      method: 'POST',
      body: JSON.stringify({ asignadaAId: segundoDeB.user.id }),
    });
    const trasPrimera = await api('/notificaciones', segundoDeB.token);
    record(
      'La asignación le avisa a quien recibe la pieza',
      trasPrimera.body?.sinLeer === 1 &&
        trasPrimera.body?.notificaciones?.[0]?.tipo === 'ASIGNACION' &&
        trasPrimera.body?.notificaciones?.[0]?.cantidad === 1,
      `bandeja ${JSON.stringify(trasPrimera.body)?.slice(0, 140)}`
    );

    const delAutor = await api('/notificaciones', B.token);
    record(
      'A nadie por su propia acción: quien asigna no se avisa a sí mismo',
      delAutor.body?.sinLeer === 0,
      `el autor quedó con ${delAutor.body?.sinLeer} sin leer`
    );

    await api(`/piezas/${lote2?.id}/asignar`, B.token, {
      method: 'POST',
      body: JSON.stringify({ asignadaAId: segundoDeB.user.id }),
    });
    const trasSegunda = await api('/notificaciones', segundoDeB.token);
    record(
      'Dos asignaciones seguidas son UN aviso con cantidad 2, no dos avisos',
      trasSegunda.body?.notificaciones?.length === 1 &&
        trasSegunda.body?.notificaciones?.[0]?.cantidad === 2 &&
        trasSegunda.body?.notificaciones?.[0]?.piezaId === null,
      `bandeja ${JSON.stringify(trasSegunda.body?.notificaciones)?.slice(0, 160)}`
    );

    // El tercero aprueba OTRA marca: la entrega de una pieza de la primera no
    // es asunto suyo. Y como el workspace no tiene aprobadores para esta, el
    // aviso sube a quien administra (estado límite 1).
    await prisma.miembroFuncion.create({
      data: {
        workspaceId: B.workspace.id,
        userId: terceroDeB.user.id,
        funcion: 'APROBACION',
        clientId: otraMarcaDeB.id,
      },
    });
    await api(`/piezas/${lote1?.id}/entregar`, segundoDeB.token, {
      method: 'POST',
      body: JSON.stringify({ enlace: 'https://drive.google.com/file/lote1' }),
    });
    const delAprobadorAjeno = await api('/notificaciones', terceroDeB.token);
    record(
      'La entrega NO le llega al aprobador de otra marca',
      delAprobadorAjeno.body?.sinLeer === 0,
      `recibió ${JSON.stringify(delAprobadorAjeno.body?.notificaciones)?.slice(0, 120)}`
    );
    const delQueAdministra = await api('/notificaciones', B.token);
    record(
      'Sin aprobadores para esa marca, la entrega avisa a quien administra',
      delQueAdministra.body?.sinLeer === 1 && delQueAdministra.body?.notificaciones?.[0]?.tipo === 'ENTREGA',
      `bandeja ${JSON.stringify(delQueAdministra.body)?.slice(0, 140)}`
    );

    // Y con un aprobador declarado para la marca, el aviso deja de subir.
    await prisma.miembroFuncion.create({
      data: {
        workspaceId: B.workspace.id,
        userId: terceroDeB.user.id,
        funcion: 'APROBACION',
        clientId: B.client.id,
      },
    });
    await api(`/piezas/${lote2?.id}/entregar`, segundoDeB.token, {
      method: 'POST',
      body: JSON.stringify({ enlace: 'https://drive.google.com/file/lote2' }),
    });
    const delAprobadorPropio = await api('/notificaciones', terceroDeB.token);
    record(
      'Declarado el aprobador de la marca, la entrega le llega a él',
      delAprobadorPropio.body?.sinLeer === 1 &&
        delAprobadorPropio.body?.notificaciones?.[0]?.tipo === 'ENTREGA',
      `bandeja ${JSON.stringify(delAprobadorPropio.body)?.slice(0, 140)}`
    );

    const avisoDeB = trasSegunda.body?.notificaciones?.[0]?.id;
    const bandejaDeA = await api('/notificaciones', A.token);
    record(
      'GET /notificaciones no trae la bandeja de otro workspace',
      bandejaDeA.body?.sinLeer === 0 && bandejaDeA.body?.notificaciones?.length === 0,
      `A recibió ${JSON.stringify(bandejaDeA.body)?.slice(0, 120)}`
    );
    await expectDenied(
      'POST /notificaciones/:id/leida sobre un aviso ajeno',
      `/notificaciones/${avisoDeB}/leida`,
      A.token,
      { method: 'POST' }
    );
    // Ni siquiera desde el mismo workspace: la bandeja es de una persona.
    await expectDenied(
      'POST /notificaciones/:id/leida sobre el aviso de un compañero',
      `/notificaciones/${avisoDeB}/leida`,
      terceroDeB.token,
      { method: 'POST' }
    );

    const leida = await api(`/notificaciones/${avisoDeB}/leida`, segundoDeB.token, { method: 'POST' });
    record(
      'El dueño sí marca su aviso como leído',
      leida.status === 200 && leida.body?.sinLeer === 0,
      `respondió ${leida.status}, sinLeer ${leida.body?.sinLeer}`
    );

    console.log('\nDOMINIOS PERMITIDOS — acotan a quién se invita, no quién entra');
    const sinAcotar = await api('/workspace/dominios', B.token);
    record(
      'Por defecto la lista está vacía: se puede invitar a cualquier dominio',
      sinAcotar.status === 200 && Array.isArray(sinAcotar.body?.dominios) && sinAcotar.body.dominios.length === 0,
      `respondió ${sinAcotar.status} ${JSON.stringify(sinAcotar.body)}`
    );

    const guardada = await api('/workspace/dominios', B.token, {
      method: 'PUT',
      // Con basura entre medio: lo que no es un dominio se descarta, y el resto
      // se guarda igual. Y `@EMPRESA.com` es el mismo que `empresa.com`.
      body: JSON.stringify({ dominios: ['@EMPRESA.com', 'empresa.com', 'no es un dominio', '', 'otra.co'] }),
    });
    record(
      'PUT normaliza, deduplica y descarta lo que no es un dominio',
      JSON.stringify(guardada.body?.dominios) === JSON.stringify(['empresa.com', 'otra.co']),
      `quedó ${JSON.stringify(guardada.body?.dominios)}`
    );

    const fuera = await api('/workspace/invites', B.token, {
      method: 'POST',
      body: JSON.stringify({ email: 'alguien@gmail.com', role: 'MEMBER' }),
    });
    record(
      'Invitar fuera de la lista se rechaza, y el mensaje dice qué dominios acepta',
      fuera.status === 400 && typeof fuera.body?.error === 'string' && fuera.body.error.includes('empresa.com'),
      `respondió ${fuera.status} ${JSON.stringify(fuera.body)?.slice(0, 120)}`
    );

    const dentro = await api('/workspace/invites', B.token, {
      method: 'POST',
      body: JSON.stringify({ email: `invitada-${Date.now()}@empresa.com`, role: 'MEMBER' }),
    });
    record(
      'Invitar dentro de la lista sigue funcionando',
      dentro.status === 201,
      `respondió ${dentro.status} ${JSON.stringify(dentro.body)?.slice(0, 120)}`
    );

    // La lista es del workspace activo y no se puede leer ni escribir la ajena:
    // no hay parámetro donde pedirla, así que B solo ve la suya.
    const deA = await api('/workspace/dominios', A.token);
    record(
      'La lista de A sigue vacía: B no tocó la de nadie más',
      deA.status === 200 && deA.body?.dominios?.length === 0,
      `A quedó con ${JSON.stringify(deA.body?.dominios)}`
    );
    const invitaA = await api('/workspace/invites', A.token, {
      method: 'POST',
      body: JSON.stringify({ email: `libre-${Date.now()}@gmail.com`, role: 'MEMBER' }),
    });
    record(
      'Y A sigue invitando a cualquier dominio: la regla no se filtró entre tenants',
      invitaA.status === 201,
      `respondió ${invitaA.status} ${JSON.stringify(invitaA.body)?.slice(0, 120)}`
    );

    // Se apaga vaciando la lista: una sola forma de apagarlo.
    const apagada = await api('/workspace/dominios', B.token, {
      method: 'PUT',
      body: JSON.stringify({ dominios: [] }),
    });
    record(
      'Vaciar la lista vuelve a permitir cualquier dominio',
      apagada.body?.dominios?.length === 0,
      `quedó ${JSON.stringify(apagada.body?.dominios)}`
    );

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
      // Las notificaciones primero: su FK a Pieza es SetNull, así que borrar
      // las piezas no se las lleva.
      await prisma.workspaceInvite.deleteMany({ where: { workspaceId: t.workspace.id } });
      await prisma.notificacion.deleteMany({ where: { workspaceId: t.workspace.id } });
      await prisma.miembroFuncion.deleteMany({ where: { workspaceId: t.workspace.id } });
      await prisma.piezaVersion.deleteMany({ where: { pieza: { workspaceId: t.workspace.id } } });
      await prisma.pieza.deleteMany({ where: { workspaceId: t.workspace.id } });
      await prisma.savedVariation.deleteMany({ where: { clientId: t.client.id } });
      await prisma.negativeFeedback.deleteMany({ where: { clientId: t.client.id } });
      await prisma.contentDNAProfile.deleteMany({ where: { clientId: t.client.id } });
      await prisma.generationLog.deleteMany({ where: { clientId: t.client.id } });
      await prisma.generationPreset.deleteMany({ where: { workspaceId: t.workspace.id } });
      await prisma.project.deleteMany({ where: { workspaceId: t.workspace.id } });
      await prisma.reviewSession.deleteMany({ where: { workspaceId: t.workspace.id } });
      await prisma.client.deleteMany({ where: { workspaceId: t.workspace.id } });
      // Los miembros extra de la bandeja se borran por email: se crean dentro
      // de la corrida y no viven en el objeto del tenant.
      const delWorkspace = await prisma.membership.findMany({
        where: { workspaceId: t.workspace.id },
        select: { userId: true },
      });
      await prisma.membership.deleteMany({ where: { workspaceId: t.workspace.id } });
      await prisma.user.deleteMany({
        where: { id: { in: [t.user.id, ...delWorkspace.map(m => m.userId)] } },
      });
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
