/**
 * La bandeja: quién se entera de qué.
 *
 * Fase 2 de H3.D. Acá vive **la única función que resuelve destinatarios**
 * (`destinatariosDe`). Si mañana hay que avisar por un evento nuevo, se agrega
 * un caso a ese switch y nada más cambia; en cuanto dos lugares resuelven
 * destinatarios, empiezan a discrepar y nadie sabe cuál manda.
 *
 * Tres reglas contra el ruido, que valen más que la lista de eventos (D4):
 *
 *   1. **A nadie por su propia acción.** Quien se autoasigna una pieza no
 *      recibe un aviso contándole lo que acaba de hacer.
 *   2. **Un lote es un aviso.** Repartir cinco piezas de una campaña deja un
 *      aviso con `cantidad = 5`, no cinco avisos.
 *   3. **Sin recordatorios.** Si nadie actúa, el tablero ya lo muestra.
 *
 * Y una que sale de los estados límite: **nunca se cae en «no avisar a nadie»**.
 * Una entrega en un workspace que todavía no declaró aprobadores le avisa a
 * quienes lo administran. Un aviso que no le llega a nadie es peor que uno de
 * más: la pieza queda esperando y no hay quien lo note.
 *
 * Ver docs/plan-h3d-funciones-notificaciones.md.
 */

import { FuncionEquipo, Prisma, WorkspaceRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { TenantContext, TenantError } from '../lib/tenancy.js';
import { notifyAviso } from './notificationService.js';

export type TipoNotificacion = 'ASIGNACION' | 'ENTREGA';

/**
 * Cuánto tiempo sigue abierto un aviso para absorber la pieza siguiente.
 *
 * Diez minutos es lo que dura repartir las piezas de una campaña de una
 * sentada. Más ancha, y dos repartos distintos del mismo día terminan en un
 * «te asignaron 7 piezas» que ya no dice de qué. Más angosta, y el lote se
 * parte en dos avisos que es justo lo que la regla venía a evitar.
 */
const VENTANA_LOTE_MIN = 10;

export interface EventoNotificable {
  tipo: TipoNotificacion;
  piezaId: string;
  clientId: string;
  /** Nombre de la marca, para el texto del aviso. */
  marca: string;
  /** Cómo se llama la pieza en la bandeja: «Instagram Post 1080×1080». */
  pieza: string;
  /** Quién hizo la acción. Nunca se le avisa a sí mismo (D4, regla 1). */
  autorId: string;
  /** Solo en ASIGNACION: a quién se le asignó. */
  asignadaAId?: string | null;
}

/**
 * A quiénes les toca enterarse. **Nadie más resuelve destinatarios.**
 *
 * Devuelve ids ya sin el autor, así que una lista vacía significa exactamente
 * «no hay a quién avisarle» y quien llama no tiene que volver a filtrar.
 */
export const destinatariosDe = async (
  tenant: TenantContext,
  evento: EventoNotificable
): Promise<string[]> => {
  const ids = new Set<string>();

  if (evento.tipo === 'ASIGNACION') {
    // La asignación no mira funciones: le toca a quien recibió la pieza, tenga
    // declarada la función de Diseño o no (D2: la función sugiere, no manda).
    if (evento.asignadaAId) ids.add(evento.asignadaAId);
  } else {
    const aprobadores = await prisma.miembroFuncion.findMany({
      where: {
        workspaceId: tenant.workspaceId,
        funcion: FuncionEquipo.APROBACION,
        // Los acotados a esta marca MÁS los que aprueban sin acotar.
        OR: [{ clientId: null }, { clientId: evento.clientId }],
      },
      select: { userId: true },
    });
    for (const a of aprobadores) ids.add(a.userId);

    // Estado límite 1: el workspace todavía no declaró aprobadores —que es el
    // estado de todos el día del despliegue—. Se avisa más arriba, no se deja
    // la pieza sin dueño.
    if (ids.size === 0) {
      const jefes = await prisma.membership.findMany({
        where: {
          workspaceId: tenant.workspaceId,
          role: { in: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN] },
        },
        select: { userId: true },
      });
      for (const j of jefes) ids.add(j.userId);
    }
  }

  // Estado límite 3: la misma persona asigna y recibe. Se quita siempre al
  // final, para que también aplique al aprobador que entrega su propia pieza.
  ids.delete(evento.autorId);
  return [...ids];
};

const textoDe = (evento: EventoNotificable, cantidad: number) => {
  if (evento.tipo === 'ASIGNACION')
    return cantidad === 1
      ? { titulo: 'Te asignaron una pieza', detalle: `${evento.pieza} · ${evento.marca}` }
      : { titulo: `Te asignaron ${cantidad} piezas`, detalle: evento.marca };

  return cantidad === 1
    ? { titulo: 'Una pieza espera tu visto bueno', detalle: `${evento.pieza} · ${evento.marca}` }
    : { titulo: `${cantidad} piezas esperan tu visto bueno`, detalle: evento.marca };
};

/**
 * Escribe los avisos de un evento.
 *
 * Recibe el cliente de la transacción a propósito: el aviso se escribe **en la
 * misma transacción que mueve la pieza**. Si la transacción se cae por la
 * guarda de concurrencia, no queda un aviso de algo que no pasó; y si el aviso
 * fallara, no queda una pieza movida de la que nadie se enteró.
 */
export const notificar = async (
  tx: Prisma.TransactionClient,
  tenant: TenantContext,
  evento: EventoNotificable,
  destinatarios: string[]
): Promise<AvisoEscrito[]> => {
  const escritos: AvisoEscrito[] = [];
  const desde = new Date(Date.now() - VENTANA_LOTE_MIN * 60_000);

  for (const userId of destinatarios) {
    // El lote se agrupa por persona, tipo y marca, y solo mientras siga sin
    // leerse: en cuanto alguien lo leyó, el aviso ya cumplió y el siguiente
    // empieza de cero.
    const abierto = await tx.notificacion.findFirst({
      where: {
        workspaceId: tenant.workspaceId,
        userId,
        tipo: evento.tipo,
        clientId: evento.clientId,
        leidaAt: null,
        updatedAt: { gte: desde },
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, cantidad: true },
    });

    if (abierto) {
      const cantidad = abierto.cantidad + 1;
      await tx.notificacion.update({
        where: { id: abierto.id },
        data: {
          cantidad,
          // El lote ya no apunta a una tarjeta: el destino pasa a ser el
          // tablero de la marca, que es donde están las piezas del reparto.
          piezaId: null,
          ...textoDe(evento, cantidad),
        },
      });
      escritos.push({ userId, esNuevo: false, ...evento, ...textoDe(evento, cantidad) });
      continue;
    }

    await tx.notificacion.create({
      data: {
        workspaceId: tenant.workspaceId,
        userId,
        tipo: evento.tipo,
        clientId: evento.clientId,
        piezaId: evento.piezaId,
        cantidad: 1,
        ...textoDe(evento, 1),
      },
    });
    escritos.push({ userId, esNuevo: true, ...evento, ...textoDe(evento, 1) });
  }

  return escritos;
};

// --------------------------------------------------------------- el correo

/**
 * Lo que quedó escrito, para poder mandarlo por correo después.
 *
 * `esNuevo` distingue el aviso recién creado del que absorbió una pieza más.
 * Es lo que decide si además sale un correo: ver `enviarEnSegundoPlano`.
 */
export interface AvisoEscrito extends EventoNotificable {
  userId: string;
  esNuevo: boolean;
  titulo: string;
  detalle: string | null;
}

/**
 * El correo de los avisos, **después** de la transacción y sin bloquear la
 * respuesta. Mismo criterio que la auditoría: quien asignó una pieza no tiene
 * por qué esperar a que Resend conteste.
 *
 * **Solo sale correo del aviso nuevo.** El que absorbió una pieza más ya tiene
 * el suyo en camino, y mandar otro por cada pieza de un reparto es exactamente
 * el lote que D4 viene a evitar — con el agravante de que el correo es el canal
 * que interrumpe. El precio es que un correo puede decir «una pieza» cuando en
 * la bandeja ya hay cinco: el correo es el empujón, la herramienta es el
 * registro, y el enlace lleva a las cinco.
 */
export const enviarEnSegundoPlano = (tenant: TenantContext, avisos: AvisoEscrito[]): void => {
  const nuevos = avisos.filter(a => a.esNuevo);
  if (nuevos.length === 0) return;

  void (async () => {
    try {
      const gente = await prisma.user.findMany({
        where: { id: { in: [...new Set(nuevos.map(a => a.userId))] } },
        select: { id: true, email: true },
      });
      const correoDe = new Map(gente.map(g => [g.id, g.email]));
      const app = process.env.APP_URL || 'https://myvoice.lobueno.co';

      for (const aviso of nuevos) {
        const email = correoDe.get(aviso.userId);
        if (!email) continue;
        await notifyAviso({
          para: [email],
          tipo: aviso.tipo,
          titulo: aviso.titulo,
          detalle: aviso.detalle,
          marca: aviso.marca,
          // El enlace aterriza en la pieza, no en la portada: un correo que te
          // deja en la pantalla de inicio te hace buscar lo que te avisó.
          url: `${app}/?pieza=${aviso.piezaId}&marca=${aviso.clientId}`,
        });
      }
    } catch (error) {
      // Nunca tumba nada: el aviso ya está en la bandeja y el correo es un
      // canal adicional. Queda en el log, sin reintento silencioso.
      console.error('[Notificacion] No se pudo enviar el correo del aviso:', error);
    }
  })();
};

// ------------------------------------------------------------------ lecturas

const INCLUDE = {
  client: { select: { id: true, name: true } },
} satisfies Prisma.NotificacionInclude;

const presentar = (n: Prisma.NotificacionGetPayload<{ include: typeof INCLUDE }>) => ({
  id: n.id,
  tipo: n.tipo,
  titulo: n.titulo,
  detalle: n.detalle,
  cantidad: n.cantidad,
  piezaId: n.piezaId,
  clientId: n.clientId,
  marca: n.client?.name ?? null,
  leida: n.leidaAt !== null,
  createdAt: n.createdAt,
  updatedAt: n.updatedAt,
});

/**
 * La bandeja de quien pregunta. Nunca la de otro: el `userId` sale del token,
 * no del request, así que no hay forma de pedir la bandeja ajena.
 */
export const listar = async (tenant: TenantContext, limite = 30) => {
  const [filas, sinLeer] = await Promise.all([
    prisma.notificacion.findMany({
      where: { workspaceId: tenant.workspaceId, userId: tenant.userId },
      include: INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: Math.min(Math.max(limite, 1), 100),
    }),
    prisma.notificacion.count({
      where: { workspaceId: tenant.workspaceId, userId: tenant.userId, leidaAt: null },
    }),
  ]);
  return { notificaciones: filas.map(presentar), sinLeer };
};

/**
 * Marca una como leída. `updateMany` con el dueño en el `where`: una id de
 * otra persona no actualiza nada y responde 404, igual que el resto de las
 * guardas — un 403 confirmaría que esa notificación existe.
 */
export const marcarLeida = async (tenant: TenantContext, id: string) => {
  const { count } = await prisma.notificacion.updateMany({
    where: { id, workspaceId: tenant.workspaceId, userId: tenant.userId, leidaAt: null },
    data: { leidaAt: new Date() },
  });
  // Ya leída no es un error: la pantalla puede reintentar sin romper nada.
  if (count === 0) {
    const existe = await prisma.notificacion.findFirst({
      where: { id, workspaceId: tenant.workspaceId, userId: tenant.userId },
      select: { id: true },
    });
    if (!existe) throw new TenantError('Notificación no encontrada', 404);
  }
  return listar(tenant);
};

export const marcarTodasLeidas = async (tenant: TenantContext) => {
  await prisma.notificacion.updateMany({
    where: { workspaceId: tenant.workspaceId, userId: tenant.userId, leidaAt: null },
    data: { leidaAt: new Date() },
  });
  return listar(tenant);
};
