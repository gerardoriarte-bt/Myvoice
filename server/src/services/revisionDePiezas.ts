/**
 * La ronda 2: el cliente aprueba la pieza terminada, no solo el texto.
 *
 * Vive en un servicio y no en el controller porque acá hay una decisión por
 * cada combinación de lo que el cliente manda, y esa tabla es el producto:
 *
 * | Lo que mandó             | La pieza                     | El feedback                  |
 * |--------------------------|------------------------------|------------------------------|
 * | Aprobada, sin comentar   | `CON_EL_CLIENTE` → `LISTA`   | evento `APROBADA_CLIENTE`    |
 * | Aprobada, con comentario | `CON_EL_CLIENTE` → `LISTA`   | + un comentario por categoría|
 * | Cambios (arte o mensaje) | `CON_EL_CLIENTE` → diseño    | un `DEVUELTA` por categoría  |
 * | Cambios sin escribir qué | — (400 antes de llegar acá)  | —                            |
 *
 * **Cambió el 2026-10-13** (docs/plan-produccion-con-responsable.md). Antes un
 * rechazo solo de copy dejaba la pieza quieta en Lista esperando que alguien
 * editara el copy en la Biblioteca, y eso ya no podía pasar: el copy en
 * producción no se edita ahí, y «Actualizar la orden» fallaba en Lista. La
 * pieza quedaba varada. Ahora vuelve a diseño marcada «Espera el copy» y el
 * responsable corrige el copy dentro de la pieza; la diseñadora no tiene
 * trabajo que hacer hasta entonces, y la tarjeta se lo dice.
 *
 * Ver docs/plan-h2e-aprobacion-de-pieza.md.
 */

import { ModoAprobacion, PiezaEstado, Prisma, RondaRevision, ReviewDecision } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { canManage, TenantContext, TenantError } from '../lib/tenancy.js';
import { urlDeSnapshot } from './piezaArchivo.js';

/** Cuántas piezas puede llevar una sesión. Un enlace con cincuenta no se revisa: se abandona. */
const TOPE = 30;

/**
 * Las piezas que pueden ir a la ronda 2, ya filtradas por workspace.
 *
 * Cuatro condiciones, y las cuatro importan:
 *   · **del workspace** — lo que entra a una sesión queda detrás de un token
 *     sin autenticación, así que es el último lugar donde confiar en el body;
 *   · **en `CON_EL_CLIENTE`** — el equipo ya la aceptó: al cliente no se le
 *     muestra una pieza que el equipo todavía no respalda;
 *   · **de una campaña «del cliente»** — lo dice el modo de la campaña, el
 *     mismo que rige el copy. El interruptor suelto que había se fue;
 *   · **sin otra revisión abierta** — mandar dos veces lo mismo era como el
 *     cliente terminaba aprobando dos veces lo ya aprobado.
 */
export const piezasElegibles = async (tenant: TenantContext, piezaIds: string[]) => {
  const ids = [...new Set(piezaIds.filter(id => typeof id === 'string' && id))].slice(0, TOPE);
  if (ids.length === 0) return [];
  const piezas = await prisma.pieza.findMany({
    where: {
      id: { in: ids },
      workspaceId: tenant.workspaceId,
      estado: PiezaEstado.CON_EL_CLIENTE,
      project: { modoAprobacion: ModoAprobacion.CLIENTE },
      itemsDeRevision: {
        none: { reviewSession: { status: { not: 'COMPLETED' }, expiresAt: { gt: new Date() } } },
      },
    },
    select: { id: true, clientId: true, project: { select: { responsableId: true } } },
  });
  // Se la manda el responsable de su campaña, o quien administra.
  return piezas.filter(p => canManage(tenant.role) || p.project?.responsableId === tenant.userId);
};

export const crearSesionDePiezas = async (
  tenant: TenantContext,
  datos: { title: string; piezaIds: string[]; expiresInDays?: number }
) => {
  const elegibles = await piezasElegibles(tenant, datos.piezaIds);
  if (elegibles.length === 0)
    throw new TenantError(
      'Ninguna de esas piezas se puede mandar al cliente: tienen que estar aceptadas por el equipo, ser de una campaña «del cliente» y no estar ya en otra revisión.',
      404
    );
  // Un enlace es de una sola marca, igual que en la ronda de copy: mezclar dos
  // le muestra a un cliente el trabajo de otro, sin contraseña de por medio.
  if (new Set(elegibles.map(p => p.clientId)).size > 1)
    throw new TenantError('Una revisión es de una sola marca', 400);

  const dias = typeof datos.expiresInDays === 'number' && datos.expiresInDays > 0 ? datos.expiresInDays : 7;
  // Se preserva el orden pedido, que es el orden en que el equipo las mira.
  const orden = new Map(datos.piezaIds.map((id, i) => [id, i]));
  const elegidas = elegibles.sort((a, b) => (orden.get(a.id) ?? 0) - (orden.get(b.id) ?? 0));

  return prisma.reviewSession.create({
    data: {
      title: datos.title,
      ronda: RondaRevision.PIEZA,
      expiresAt: new Date(Date.now() + dias * 24 * 60 * 60 * 1000),
      workspaceId: tenant.workspaceId,
      createdById: tenant.userId,
      items: { createMany: { data: elegidas.map((p, i) => ({ piezaId: p.id, sortOrder: i })) } },
    },
    select: { id: true, token: true, title: true, ronda: true, expiresAt: true },
  });
};

const INCLUDE_PIEZA_PUBLICA = {
  slots: { orderBy: { orden: 'asc' as const }, select: { slot: true, slotLabel: true, textoCongelado: true } },
  versiones: { orderBy: { numero: 'desc' as const }, take: 1, select: { claveSnapshot: true } },
  client: { select: { name: true } },
} satisfies Prisma.PiezaInclude;

/**
 * Lo que ve el cliente de cada pieza.
 *
 * **El copy aprobado viaja con la pieza**, y no es un extra: sin él, el cliente
 * compara el arte contra lo que RECUERDA haber aprobado, y lo que recuerda
 * nunca es exactamente lo que aprobó.
 *
 * Lo que NO viaja: el enlace de entrega, el costo de la auditoría, los
 * hallazgos y quién la diseñó. Nada de eso es asunto del cliente, y todo esto
 * queda detrás de un token sin autenticación.
 */
export const presentarPiezas = async (piezaIds: string[]) => {
  const piezas = await prisma.pieza.findMany({
    where: { id: { in: piezaIds } },
    include: INCLUDE_PIEZA_PUBLICA,
  });
  const porId = new Map(piezas.map(p => [p.id, p]));
  return Promise.all(
    piezaIds.map(async id => {
      const p = porId.get(id);
      if (!p) return null;
      return {
        id: p.id,
        platform: p.platform,
        formato: p.formato,
        titulo: p.titulo,
        tipo: p.tipo,
        marca: p.client.name,
        // Firmada y con vencimiento. Null en video y audio: se entregan por
        // enlace y no hay imagen que mostrar (estado límite 1).
        previaUrl: await urlDeSnapshot(p.versiones[0]?.claveSnapshot),
        slots: p.slots,
      };
    })
  ).then(lista => lista.filter((p): p is NonNullable<typeof p> => p !== null));
};

export interface DecisionDePieza {
  piezaId: string;
  decision: ReviewDecision;
  feedbackCopy?: string | null;
  feedbackDiseno?: string | null;
}

const limpia = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Aplica lo que decidió el cliente. Ver la tabla del encabezado.
 *
 * Corre dentro de la transacción de la entrega: o quedan registradas todas las
 * decisiones y todos los movimientos, o no queda ninguno. Una entrega a medias
 * dejaría piezas movidas sin el motivo que las movió.
 */
export const aplicarDecisiones = async (
  tx: Prisma.TransactionClient,
  submissionId: string,
  /** Quién revisó, del lado de afuera. No tiene cuenta: va como autor externo. */
  revisor: string,
  piezasDeLaSesion: Set<string>,
  decisiones: DecisionDePieza[]
) => {
  const movidas: { piezaId: string; rechazada: boolean }[] = [];
  for (const d of decisiones) {
    // Una decisión sobre una pieza que no está en esta sesión se ignora: el
    // body del portal es público y no manda sobre qué se decide.
    if (!piezasDeLaSesion.has(d.piezaId)) continue;

    const copy = limpia(d.feedbackCopy);
    const diseno = limpia(d.feedbackDiseno);

    await tx.reviewItemFeedback.create({
      data: {
        reviewSubmissionId: submissionId,
        piezaId: d.piezaId,
        decision: d.decision,
        feedbackCopy: copy || null,
        feedbackDiseno: diseno || null,
      },
    });

    const rechaza = d.decision === ReviewDecision.REJECTED;
    const hacia = rechaza ? PiezaEstado.EN_DISENO : PiezaEstado.LISTA;
    const { count } = await tx.pieza.updateMany({
      where: { id: d.piezaId, estado: PiezaEstado.CON_EL_CLIENTE },
      data: { estado: hacia, estadoDesde: new Date() },
    });
    // Si otro la movió mientras el cliente decidía, el feedback igual se guarda
    // como comentario: perderlo sería peor que tener una pieza en otra columna.
    const movio = count > 0;
    if (movio) movidas.push({ piezaId: d.piezaId, rechazada: rechaza });

    if (movio && !rechaza) {
      await tx.piezaEvento.create({
        data: {
          piezaId: d.piezaId,
          tipo: 'APROBADA_CLIENTE',
          deEstado: PiezaEstado.CON_EL_CLIENTE,
          aEstado: PiezaEstado.LISTA,
          autorId: null,
          autorExterno: revisor,
        },
      });
    }

    for (const [categoria, texto] of [
      ['DISENO', diseno],
      ['COPY', copy],
    ] as const) {
      if (!texto) continue;
      const devuelve = movio && rechaza;
      await tx.piezaEvento.create({
        data: {
          piezaId: d.piezaId,
          tipo: devuelve ? 'DEVUELTA' : 'COMENTARIO',
          // Un comentario no mueve nada, y afirmar un estado que este código
          // no verificó sería mentirle al historial.
          deEstado: devuelve ? PiezaEstado.CON_EL_CLIENTE : null,
          aEstado: devuelve ? PiezaEstado.EN_DISENO : null,
          autorId: null,
          autorExterno: revisor,
          nota: texto,
          categoria,
        },
      });
    }
  }
  return movidas;
};
