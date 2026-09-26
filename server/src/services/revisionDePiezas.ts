/**
 * La ronda 2: el cliente aprueba la pieza terminada, no solo el texto.
 *
 * Vive en un servicio y no en el controller porque acá hay una decisión por
 * cada combinación de lo que el cliente manda, y esa tabla es el producto:
 *
 * | Lo que mandó            | La pieza          | El feedback                       |
 * |-------------------------|-------------------|-----------------------------------|
 * | Aprobada, sin comentar  | sigue `LISTA`     | —                                 |
 * | Aprobada, con comentario| sigue `LISTA`     | un evento por categoría           |
 * | Cambios, del arte       | vuelve a diseño   | evento `DEVUELTA` · `DISENO`      |
 * | Cambios, solo del copy  | **sigue `LISTA`** | evento `COMENTARIO` · `COPY`      |
 *
 * **La última fila es la que hay que mirar dos veces.** Una pieza cuyo problema
 * es el mensaje no vuelve sola a diseño: el diseñador no puede hacer nada hasta
 * que el copy cambie, y mandársela sería ponerle en el tablero trabajo que
 * todavía no existe. Lo que queda esperando es el copy — y cuando alguien lo
 * edite en la Biblioteca, el aviso de desfase que YA existe va a saltar en esa
 * pieza y en sus hermanas. Cero estado nuevo.
 *
 * Ver docs/plan-h2e-aprobacion-de-pieza.md.
 */

import { PiezaEstado, Prisma, RondaRevision, ReviewDecision } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { TenantContext, TenantError } from '../lib/tenancy.js';
import { urlDeSnapshot } from './piezaArchivo.js';

/** Cuántas piezas puede llevar una sesión. Un enlace con cincuenta no se revisa: se abandona. */
const TOPE = 30;

/**
 * Las piezas que pueden ir a la ronda 2, ya filtradas por workspace.
 *
 * Tres condiciones, y las tres importan:
 *   · **del workspace** — lo que entra a una sesión queda detrás de un token
 *     sin autenticación, así que es el último lugar donde confiar en el body;
 *   · **en `LISTA`** — D2: al cliente no se le muestra una pieza que el equipo
 *     todavía no respalda;
 *   · **de una campaña que lo pidió** — D3.
 */
export const piezasElegibles = async (tenant: TenantContext, piezaIds: string[]) => {
  const ids = [...new Set(piezaIds.filter(id => typeof id === 'string' && id))].slice(0, TOPE);
  if (ids.length === 0) return [];
  return prisma.pieza.findMany({
    where: {
      id: { in: ids },
      workspaceId: tenant.workspaceId,
      estado: PiezaEstado.LISTA,
      project: { pideAprobacionDeCliente: true },
    },
    select: { id: true },
  });
};

export const crearSesionDePiezas = async (
  tenant: TenantContext,
  datos: { title: string; piezaIds: string[]; expiresInDays?: number }
) => {
  const elegibles = await piezasElegibles(tenant, datos.piezaIds);
  if (elegibles.length === 0)
    throw new TenantError(
      'Ninguna de esas piezas se puede mandar al cliente: tienen que estar listas y pertenecer a una campaña que pida su aprobación.',
      404
    );

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
    // Solo el feedback de arte mueve la pieza, y solo si además hay rechazo.
    const vuelveADiseno = rechaza && !!diseno;

    if (vuelveADiseno) {
      const { count } = await tx.pieza.updateMany({
        where: { id: d.piezaId, estado: PiezaEstado.LISTA },
        data: { estado: PiezaEstado.EN_DISENO, estadoDesde: new Date() },
      });
      // Si otro la movió mientras el cliente decidía, el feedback igual se
      // guarda: perderlo sería peor que tener una pieza en otra columna.
      if (count === 0) continue;
    }

    for (const [categoria, texto] of [
      ['DISENO', diseno],
      ['COPY', copy],
    ] as const) {
      if (!texto) continue;
      const mueve = vuelveADiseno && categoria === 'DISENO';
      await tx.piezaEvento.create({
        data: {
          piezaId: d.piezaId,
          tipo: mueve ? 'DEVUELTA' : 'COMENTARIO',
          // Un comentario no mueve nada, y decir «de LISTA a LISTA» sería
          // afirmar un estado que este código no verificó.
          deEstado: mueve ? PiezaEstado.LISTA : null,
          aEstado: mueve ? PiezaEstado.EN_DISENO : null,
          autorId: null,
          autorExterno: revisor,
          nota: texto,
          categoria,
        },
      });
    }
  }
};
