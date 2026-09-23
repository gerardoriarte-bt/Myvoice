/**
 * La pieza: del copy aprobado al trabajo de diseño.
 *
 * Acá viven las dos reglas que el tablero no puede tener repartidas:
 *
 *   1. **Cómo nace una pieza** (D7). El servidor arma la PROPUESTA —una pieza
 *      por canal, un aprobado por slot, el formato por defecto del spec— y una
 *      persona la confirma. El cliente nunca decide qué es elegible: manda ids
 *      y el servidor vuelve a validar todo.
 *   2. **Qué la saca de cada columna** (D5). La tabla TRANSICIONES es la única
 *      descripción de la máquina de estados; los endpoints solo la ejecutan.
 *
 * Todo lo que cambia una pieza deja su PiezaEvento en la misma transacción: el
 * historial no es opcional, porque es lo que responde "quién decidió esto".
 *
 * Ver docs/plan-h2-produccion-auditoria.md.
 */

import { createHash } from 'node:crypto';
import { Prisma, PiezaEstado, PiezaTipo } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { TenantContext, TenantError } from '../lib/tenancy.js';
import { guardarVersion, medidasDelFormato, urlDeSnapshot, ArchivoSubido } from './piezaArchivo.js';
import { auditarEnSegundoPlano } from './auditoriaService.js';
import { destinatariosDe, EventoNotificable, notificar } from './notificacionService.js';
import { AuditoriaEstado } from '@prisma/client';
import {
  esFormatoValido,
  esSlotDeInstruccion,
  formatoPorDefecto,
  getChannelSpec,
  getPiezaSpec,
  resolveSlotLabel,
} from '../channels/registry.js';

/**
 * Identidad de una pieza por su contenido: el formato más los aprobados que la
 * componen. Es lo que la base usa para rechazar la pieza REPETIDA —un doble
 * clic, dos personas mandando el mismo lote a producir— sin estorbar los dos
 * casos en que un mismo aprobado va a más de una pieza a propósito: otro
 * formato de Display, y el A/B, donde las dos piezas comparten el cuerpo y solo
 * cambia el hook.
 */
const huellaDe = (formato: string, savedVariationIds: string[]): string =>
  createHash('sha256').update([formato, ...[...savedVariationIds].sort()].join('|')).digest('hex');

/** Posición del slot en el spec del canal; -1 si el spec ya no lo declara. */
const ordenDeSlot = (platform: string, slot: string): number =>
  getChannelSpec(platform)?.slots.findIndex(s => s.id === slot) ?? -1;

const TIPO_POR_SPEC: Record<'grafica' | 'video' | 'audio', PiezaTipo> = {
  grafica: PiezaTipo.GRAFICA,
  video: PiezaTipo.VIDEO,
  audio: PiezaTipo.AUDIO,
};

export type AccionPieza =
  | 'comentar'
  | 'asignar'
  | 'reasignar'
  | 'entregar'
  | 'aceptar'
  | 'devolver'
  | 'reabrir'
  | 'actualizar-copy';

interface Transicion {
  /** Estados desde los que la acción es legal. */
  desde: PiezaEstado[];
  /** Estado resultante, o null si la acción no mueve la pieza de columna. */
  hacia: PiezaEstado | null;
  /** Tipo de PiezaEvento que deja. */
  evento: string;
  /** La acción no se ejecuta sin nota: el motivo es el dato, no un adorno. */
  exigeNota?: boolean;
}

/**
 * D5: cada columna tiene un dueño y UNA acción que la vacía. Que esto sea una
 * tabla y no una cadena de `if` es lo que permite leer la máquina de estados
 * completa de un vistazo, y que el diseño y el código digan lo mismo.
 */
export const TRANSICIONES: Record<AccionPieza, Transicion> = {
  asignar:            { desde: [PiezaEstado.POR_ASIGNAR], hacia: PiezaEstado.EN_DISENO,   evento: 'ASIGNADA' },
  reasignar:          { desde: [PiezaEstado.EN_DISENO],   hacia: null,                    evento: 'ASIGNADA' },
  entregar:           { desde: [PiezaEstado.EN_DISENO],   hacia: PiezaEstado.POR_REVISAR, evento: 'ENTREGADA' },
  aceptar:            { desde: [PiezaEstado.POR_REVISAR], hacia: PiezaEstado.LISTA,       evento: 'ACEPTADA' },
  devolver:           { desde: [PiezaEstado.POR_REVISAR], hacia: PiezaEstado.EN_DISENO,   evento: 'DEVUELTA',  exigeNota: true },
  reabrir:            { desde: [PiezaEstado.LISTA],       hacia: PiezaEstado.EN_DISENO,   evento: 'REABIERTA', exigeNota: true },
  /**
   * Un comentario no mueve la pieza: solo dice algo. Vive en el mismo
   * historial append-only que las decisiones —quién asignó, quién devolvió y
   * por qué— en vez de en un chat aparte, porque al leer una pieza lo que
   * importa es la secuencia completa, no dos listas que hay que intercalar.
   */
  comentar:           { desde: [PiezaEstado.POR_ASIGNAR, PiezaEstado.EN_DISENO, PiezaEstado.POR_REVISAR, PiezaEstado.LISTA], hacia: null, evento: 'COMENTARIO', exigeNota: true },
  'actualizar-copy':  { desde: [PiezaEstado.POR_ASIGNAR, PiezaEstado.EN_DISENO, PiezaEstado.POR_REVISAR], hacia: null, evento: 'COPY_ACTUALIZADO' },
};

/** Lo que el tablero y la orden de trabajo necesitan de una pieza. */
const INCLUDE_PIEZA = {
  slots: {
    orderBy: { orden: 'asc' as const },
    include: {
      savedVariation: {
        select: { id: true, content: true, isApproved: true, platform: true },
      },
    },
  },
  asignadaA: { select: { id: true, name: true, email: true } },
  /** Solo el último comentario: la tarjeta muestra uno, la orden todos. */
  eventos: {
    where: { tipo: 'COMENTARIO' },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    include: { autor: { select: { id: true, name: true } } },
  },
  client: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
  /** La última entrega: de ahí salen la previa y el semáforo de la tarjeta. */
  versiones: {
    orderBy: { numero: 'desc' as const },
    take: 1,
    include: { hallazgos: { orderBy: { tipo: 'asc' as const } } },
  },
} satisfies Prisma.PiezaInclude;

type PiezaConSlots = Prisma.PiezaGetPayload<{ include: typeof INCLUDE_PIEZA }>;

/**
 * El aviso «el copy cambió» NO es un estado guardado: se calcula al leer,
 * comparando el texto congelado con el original. Guardarlo obligaría a
 * mantenerlo sincronizado desde cada lugar que edita la Biblioteca, y el día
 * que uno se olvide la tarjeta mentiría.
 */
export type MotivoDesfase = 'editado' | 'desaprobado' | 'borrado';

export interface SlotDesfasado {
  slot: string;
  slotLabel: string;
  motivo: MotivoDesfase;
  textoCongelado: string;
  textoActual: string | null;
}

export const desfasesDeCopy = (pieza: PiezaConSlots): SlotDesfasado[] =>
  pieza.slots.flatMap<SlotDesfasado>(s => {
    const base = { slot: s.slot, slotLabel: s.slotLabel, textoCongelado: s.textoCongelado };
    const original = s.savedVariation;
    if (!original) return [{ ...base, motivo: 'borrado', textoActual: null }];
    if (original.content !== s.textoCongelado)
      return [{ ...base, motivo: 'editado', textoActual: original.content }];
    if (!original.isApproved)
      return [{ ...base, motivo: 'desaprobado', textoActual: original.content }];
    return [];
  });

/**
 * La cuenta de comentarios sale de un groupBy y no de traerlos todos: una pieza
 * con veinte comentarios no tiene por qué pesar veinte veces en el tablero.
 */
const contarComentarios = async (piezaIds: string[]): Promise<Map<string, number>> => {
  if (!piezaIds.length) return new Map();
  const filas = await prisma.piezaEvento.groupBy({
    by: ['piezaId'],
    where: { piezaId: { in: piezaIds }, tipo: 'COMENTARIO' },
    _count: { _all: true },
  });
  return new Map(filas.map(f => [f.piezaId, f._count._all]));
};

/**
 * El semáforo de D3, calculado y no guardado: sale de los hallazgos de la
 * última versión. Tres estados y ninguno rojo — el rojo prometería un bloqueo
 * que D2 dice que no existe.
 *
 *   verificada    — todo coincide y la marca no tiene observaciones.
 *   hallazgos     — al menos una diferencia o un juicio. Gana sobre los otros.
 *   revisar-a-ojo — algo no se pudo leer y lo demás coincide. No es un hallazgo.
 *   sin-auditoria — el proveedor falló. No cuenta como resultado.
 *   auditando     — está corriendo.
 */
export type Semaforo = 'verificada' | 'hallazgos' | 'revisar-a-ojo' | 'sin-auditoria' | 'auditando' | null;

const semaforoDe = (version: { estadoAuditoria: string; hallazgos: { tipo: string }[] } | undefined): Semaforo => {
  if (!version) return null;
  if (version.estadoAuditoria === 'PENDIENTE') return 'auditando';
  if (version.estadoAuditoria === 'NO_DISPONIBLE') return 'sin-auditoria';
  const reales = version.hallazgos.filter(h => h.tipo !== 'ILEGIBLE');
  if (reales.length > 0) return 'hallazgos';
  return version.hallazgos.length > 0 ? 'revisar-a-ojo' : 'verificada';
};

export const conDesfases = (pieza: PiezaConSlots, comentarios = 0) => {
  const { eventos, versiones, ...resto } = pieza;
  const ultima = versiones[0];
  return {
    ...resto,
    desfases: desfasesDeCopy(pieza),
    version: ultima
      ? {
          id: ultima.id,
          numero: ultima.numero,
          anchoPx: ultima.anchoPx,
          altoPx: ultima.altoPx,
          pesoBytes: ultima.pesoBytes,
          estadoAuditoria: ultima.estadoAuditoria,
          hallazgos: ultima.hallazgos.length,
          pendientes: ultima.hallazgos.filter(h => h.decision === 'PENDIENTE' && h.tipo !== 'ILEGIBLE').length,
        }
      : null,
    semaforo: semaforoDe(ultima),
    comentarios,
    ultimoComentario: eventos[0]
      ? { nota: eventos[0].nota, autor: eventos[0].autor?.name ?? null, createdAt: eventos[0].createdAt }
      : null,
  };
};

// --------------------------------------------------------------- propuesta

export interface SlotPropuesto {
  savedVariationId: string;
  slot: string;
  slotLabel: string;
  contenido: string;
  esInstruccion: boolean;
  /** Otros aprobados del mismo slot: la pregunta «¿una pieza o dos?» de D7. */
  alternativas: { savedVariationId: string; contenido: string }[];
}

export interface PiezaPropuesta {
  platform: string;
  tipo: PiezaTipo;
  formato: string;
  formatosDisponibles: string[];
  titulo: string;
  clientId: string;
  projectId: string | null;
  proyectoNombre: string | null;
  slots: SlotPropuesto[];
}

export interface Excluido {
  savedVariationId: string;
  platform: string;
  motivo: 'sin-pieza' | 'no-aprobado' | 'ya-en-pieza';
  detalle: string;
}

export interface Propuesta {
  piezas: PiezaPropuesta[];
  excluidos: Excluido[];
}

/**
 * Arma la propuesta a partir de un conjunto de aprobados. Agrupa por (campaña,
 * canal) porque eso es una pieza: el mismo canal de dos campañas distintas es
 * trabajo distinto aunque el copy se parezca.
 */
export const proponerPiezas = async (
  tenant: TenantContext,
  savedVariationIds: string[]
): Promise<Propuesta> => {
  if (!savedVariationIds.length) throw new TenantError('No hay contenido seleccionado', 400);

  const variaciones = await prisma.savedVariation.findMany({
    where: { id: { in: savedVariationIds }, client: { workspaceId: tenant.workspaceId } },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { savedAt: 'asc' },
  });

  const yaEnPieza = new Set(
    (
      await prisma.piezaSlot.findMany({
        where: { savedVariationId: { in: variaciones.map(v => v.id) } },
        select: { savedVariationId: true },
      })
    ).map(s => s.savedVariationId)
  );

  const excluidos: Excluido[] = [];
  const grupos = new Map<string, typeof variaciones>();

  for (const v of variaciones) {
    const spec = getPiezaSpec(v.platform);
    if (!v.isApproved) {
      excluidos.push({ savedVariationId: v.id, platform: v.platform, motivo: 'no-aprobado', detalle: 'Todavía no está aprobado.' });
      continue;
    }
    if (!spec) {
      excluidos.push({
        savedVariationId: v.id,
        platform: v.platform,
        motivo: 'sin-pieza',
        detalle: 'No produce pieza de diseño: el copy aprobado es lo que se publica.',
      });
      continue;
    }
    if (yaEnPieza.has(v.id)) {
      excluidos.push({ savedVariationId: v.id, platform: v.platform, motivo: 'ya-en-pieza', detalle: 'Ya está en una pieza.' });
      continue;
    }
    const clave = `${v.projectId ?? ''}|${v.platform}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), v]);
  }

  const piezas: PiezaPropuesta[] = [];
  for (const grupo of grupos.values()) {
    const primera = grupo[0];
    const spec = getPiezaSpec(primera.platform)!;
    const porSlot = new Map<string, typeof grupo>();
    for (const v of grupo) {
      const slot = v.slot ?? 'sinSlot';
      porSlot.set(slot, [...(porSlot.get(slot) ?? []), v]);
    }

    const slots: SlotPropuesto[] = [...porSlot.entries()].map(([slot, candidatos], i) => {
      const [elegida, ...resto] = candidatos;
      return {
        savedVariationId: elegida.id,
        slot,
        // La etiqueta sale del registry; la guardada puede ser de un spec viejo.
        slotLabel: resolveSlotLabel(primera.platform, elegida.slot) ?? elegida.slotLabel ?? slot,
        contenido: elegida.content,
        esInstruccion: esSlotDeInstruccion(elegida.slot),
        alternativas: resto.map(v => ({ savedVariationId: v.id, contenido: v.content })),
      };
    });

    // El orden del spec, no el de guardado: la orden de trabajo se lee como se
    // arma la pieza, con el hook arriba. Un slot que el spec ya no tiene va al
    // final en vez de desaparecer.
    const orden = (slot: string) => {
      const i = ordenDeSlot(primera.platform, slot);
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };
    slots.sort((a, b) => orden(a.slot) - orden(b.slot));

    piezas.push({
      platform: primera.platform,
      tipo: TIPO_POR_SPEC[spec.tipo],
      formato: formatoPorDefecto(primera.platform) ?? spec.formatos[0],
      formatosDisponibles: spec.formatos,
      titulo: primera.project?.name ? `${primera.project.name} — ${primera.platform}` : primera.platform,
      clientId: primera.clientId,
      projectId: primera.projectId,
      proyectoNombre: primera.project?.name ?? null,
      slots,
    });
  }

  return { piezas, excluidos };
};

// ------------------------------------------------------------------- alta

export interface PiezaAConfirmar {
  platform: string;
  formato: string;
  titulo: string;
  savedVariationIds: string[];
  /** Piezas hermanas: mismo visual en dos canales. Se asignan juntas. */
  hermanaDe?: number;
}

/**
 * Crea las piezas confirmadas. Revalida TODO: el cliente pudo haber cambiado
 * cualquier cosa entre la propuesta y la confirmación, y la propuesta no es una
 * autorización.
 */
export const crearPiezas = async (tenant: TenantContext, piezas: PiezaAConfirmar[]) => {
  if (!Array.isArray(piezas) || piezas.length === 0)
    throw new TenantError('No hay piezas para crear', 400);

  const todosLosIds = piezas.flatMap(p => p.savedVariationIds ?? []);
  if (!todosLosIds.length) throw new TenantError('Una pieza sin copy aprobado no es una pieza', 400);

  const variaciones = await prisma.savedVariation.findMany({
    where: { id: { in: todosLosIds }, client: { workspaceId: tenant.workspaceId } },
  });
  const porId = new Map(variaciones.map(v => [v.id, v]));

  // Hermanas (estado límite 1): las piezas que apuntan a otra con `hermanaDe`
  // comparten su grupoId. Se resuelve en una pasada previa porque el índice de
  // la propuesta solo tiene sentido dentro de esta llamada.
  const grupos = new Map<number, string>();
  for (const [i, p] of piezas.entries()) {
    const raiz = p.hermanaDe;
    if (raiz === undefined || raiz < 0 || raiz >= piezas.length || raiz === i) continue;
    if (!grupos.has(raiz)) grupos.set(raiz, crypto.randomUUID());
    grupos.set(i, grupos.get(raiz)!);
  }

  const datos = piezas.map((p, i) => {
    const spec = getPiezaSpec(p.platform);
    if (!spec) throw new TenantError(`"${p.platform}" no produce pieza de diseño`, 400);
    if (!esFormatoValido(p.platform, p.formato))
      throw new TenantError(`"${p.formato}" no es un formato de ${p.platform}`, 400);

    const suyas = (p.savedVariationIds ?? []).map(id => {
      const v = porId.get(id);
      // Mismo 404 que las guardas: un id de otro workspace no se distingue de
      // uno inexistente.
      if (!v) throw new TenantError('Contenido no encontrado', 404);
      if (!v.isApproved) throw new TenantError('Solo va a producción lo aprobado', 400);
      if (v.platform !== p.platform)
        throw new TenantError('Una pieza es de un solo canal', 400);
      return v;
    });
    if (!suyas.length) throw new TenantError('Una pieza sin copy aprobado no es una pieza', 400);

    const marcas = new Set(suyas.map(v => v.clientId));
    if (marcas.size > 1) throw new TenantError('Una pieza es de una sola marca', 400);

    return {
      pieza: {
        workspaceId: tenant.workspaceId,
        clientId: suyas[0].clientId,
        projectId: suyas[0].projectId,
        platform: p.platform,
        tipo: TIPO_POR_SPEC[spec.tipo],
        formato: p.formato,
        titulo: (p.titulo || p.platform).slice(0, 160),
        huella: huellaDe(p.formato, suyas.map(v => v.id)),
        grupoId: grupos.get(i) ?? null,
        creadaPorId: tenant.userId,
      },
      slots: suyas.map((v, orden) => ({
        savedVariationId: v.id,
        slot: v.slot ?? 'sinSlot',
        slotLabel: resolveSlotLabel(v.platform, v.slot) ?? v.slotLabel ?? (v.slot ?? 'sinSlot'),
        textoCongelado: v.content,
        esInstruccion: esSlotDeInstruccion(v.slot),
        orden,
      })),
    };
  });

  try {
    return await prisma.$transaction(async tx => {
      const creadas = [];
      for (const d of datos) {
        const pieza = await tx.pieza.create({
          data: {
            ...d.pieza,
            slots: { create: d.slots },
            eventos: { create: { tipo: 'CREADA', aEstado: PiezaEstado.POR_ASIGNAR, autorId: tenant.userId } },
          },
          include: INCLUDE_PIEZA,
        });
        creadas.push(pieza);
      }
      return creadas;
    });
  } catch (e) {
    // El unique (workspaceId, huella) es la última línea: dos personas mandando
    // el mismo lote a producir a la vez chocan acá, no en una lectura previa
    // que para entonces ya quedó vieja.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      throw new TenantError('Esa misma pieza ya existe', 409);
    throw e;
  }
};

// ----------------------------------------------------------- entrega real

/**
 * La entrega de la fase 3 para los canales gráficos: el archivo, no un enlace.
 *
 * Es lo que hace posible la auditoría —una pieza en un Drive privado no se
 * puede leer— y lo que convierte la previa en evidencia de qué se aprobó. El
 * video y el audio siguen entregándose con enlace: con el tope de 10 MB un reel
 * no entra, y subir ese tope metería en el bucket justo los archivos que D6
 * quería evitar.
 *
 * Cada entrega es una VERSIÓN nueva. Devolver a diseño y volver a subir es el
 * camino normal, y el informe de la v1 tiene que sobrevivir a la v2: es lo que
 * después permite ver si el hallazgo se corrigió.
 */
export const entregarArchivo = async (tenant: TenantContext, piezaId: string, archivo: ArchivoSubido) => {
  const pieza = await prisma.pieza.findUnique({ where: { id: piezaId } });
  if (!pieza || pieza.workspaceId !== tenant.workspaceId) throw new TenantError('Pieza no encontrada', 404);
  if (pieza.tipo !== PiezaTipo.GRAFICA)
    throw new TenantError('Los canales de video y audio se entregan con un enlace, no con un archivo', 400);
  if (pieza.estado !== PiezaEstado.EN_DISENO)
    throw new TenantError(`Una pieza en "${pieza.estado}" no admite esta acción`, 409);

  const ultima = await prisma.piezaVersion.aggregate({ where: { piezaId }, _max: { numero: true } });
  const numero = (ultima._max.numero ?? 0) + 1;

  // Se guarda ANTES de la transacción a propósito: subir al bucket puede tardar
  // segundos y una transacción abierta ese tiempo traba la tabla. Si la
  // transacción falla después, quedan un original y un snapshot huérfanos —
  // los limpia la regla de ciclo de vida, y es preferible a lo contrario: una
  // versión en la base apuntando a un archivo que no existe.
  const guardada = await guardarVersion(piezaId, numero, archivo);

  // Subir el archivo es la otra forma de entregar, así que avisa igual que el
  // enlace: para quien aprueba, las dos dejan la pieza esperando una decisión.
  const aviso = await prepararAviso(tenant, pieza, 'ENTREGA');

  const esperadas = medidasDelFormato(pieza.formato);
  const midioDistinto =
    esperadas && guardada.anchoPx && guardada.altoPx
      ? guardada.anchoPx !== esperadas.ancho || guardada.altoPx !== esperadas.alto
      : false;

  await prisma.$transaction(async tx => {
    const { count } = await tx.pieza.updateMany({
      where: { id: piezaId, estado: PiezaEstado.EN_DISENO },
      data: { estado: PiezaEstado.POR_REVISAR, estadoDesde: new Date() },
    });
    if (count === 0) throw new TenantError('Alguien más movió esta pieza mientras la mirabas', 409);

    await tx.piezaVersion.create({
      data: {
        piezaId,
        numero,
        ...guardada,
        subidaPorId: tenant.userId,
        // Las medidas distintas son un HECHO que se sabe sin preguntarle a
        // ningún modelo, así que el hallazgo se escribe acá y no en la
        // auditoría. No bloquea: se sube igual y alguien decide (D2).
        hallazgos: midioDistinto
          ? {
              create: {
                tipo: 'MEDIDAS',
                detalle: 'La pieza no mide lo que pide el canal.',
                esperado: pieza.formato,
                encontrado: `${guardada.anchoPx}×${guardada.altoPx}`,
              },
            }
          : undefined,
      },
    });

    await tx.piezaEvento.create({
      data: {
        piezaId,
        tipo: 'ENTREGADA',
        deEstado: PiezaEstado.EN_DISENO,
        aEstado: PiezaEstado.POR_REVISAR,
        autorId: tenant.userId,
        nota: `Versión ${numero}`,
      },
    });

    await notificar(tx, tenant, aviso.evento, aviso.destinatarios);
  });

  const version = await prisma.piezaVersion.findFirstOrThrow({
    where: { piezaId, numero },
    select: { id: true },
  });
  // La auditoría corre después de responder: el diseñador ya entregó y no
  // tiene por qué esperar dos llamadas de visión. La tarjeta dice «Auditando».
  auditarEnSegundoPlano(version.id);

  return leerUna(piezaId);
};

// --------------------------------------------------------------- la bandeja

/**
 * Arma el aviso y resuelve a quién le toca, **antes** de abrir la transacción.
 *
 * Los destinatarios se calculan afuera porque son lecturas y no hay razón para
 * tenerlas dentro de una transacción que bloquea la fila de la pieza. La
 * escritura sí va adentro: un aviso de algo que no llegó a pasar es peor que
 * ningún aviso.
 */
const prepararAviso = async (
  tenant: TenantContext,
  pieza: { id: string; clientId: string; platform: string; formato: string },
  tipo: EventoNotificable['tipo'],
  asignadaAId?: string | null
) => {
  const marca = await prisma.client.findUnique({
    where: { id: pieza.clientId },
    select: { name: true },
  });
  const evento: EventoNotificable = {
    tipo,
    piezaId: pieza.id,
    clientId: pieza.clientId,
    marca: marca?.name ?? 'la marca',
    pieza: `${pieza.platform} ${pieza.formato}`,
    autorId: tenant.userId,
    asignadaAId,
  };
  return { evento, destinatarios: await destinatariosDe(tenant, evento) };
};

// ------------------------------------------------------------- transiciones

export interface DatosTransicion {
  asignadaAId?: string;
  enlace?: string;
  nota?: string;
}

/**
 * Ejecuta una acción de la tabla. El cambio de estado va con
 * `updateMany({ where: { id, estado: <el esperado> } })`: si otra persona movió
 * la pieza entremedio, no actualiza ninguna fila y devolvemos 409 en vez de
 * pisar su decisión.
 */
export const ejecutarAccion = async (
  tenant: TenantContext,
  piezaId: string,
  accion: AccionPieza,
  datos: DatosTransicion
) => {
  const transicion = TRANSICIONES[accion];
  if (!transicion) throw new TenantError('Acción desconocida', 400);

  const nota = typeof datos.nota === 'string' ? datos.nota.trim() : '';
  if (transicion.exigeNota && !nota)
    throw new TenantError('Esta acción necesita un motivo escrito', 400);

  const actual = await prisma.pieza.findUnique({ where: { id: piezaId } });
  if (!actual || actual.workspaceId !== tenant.workspaceId) throw new TenantError('Pieza no encontrada', 404);
  if (!transicion.desde.includes(actual.estado))
    throw new TenantError(`Una pieza en "${actual.estado}" no admite esta acción`, 409);

  const cambios: Prisma.PiezaUncheckedUpdateManyInput = {};

  if (accion === 'asignar' || accion === 'reasignar') {
    if (!datos.asignadaAId) throw new TenantError('Falta a quién se asigna', 400);
    const membresia = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: datos.asignadaAId, workspaceId: tenant.workspaceId } },
    });
    // Sin membresía no existe para este workspace: 404, no 403.
    if (!membresia) throw new TenantError('Miembro no encontrado', 404);
    cambios.asignadaAId = datos.asignadaAId;
  }

  if (accion === 'entregar') {
    const enlace = typeof datos.enlace === 'string' ? datos.enlace.trim() : '';
    // En la fase 2 el entregable es un enlace. La fase 3 agrega el archivo
    // para los canales gráficos; el video se entrega así para siempre.
    if (!/^https?:\/\//i.test(enlace)) throw new TenantError('Hace falta un enlace a la pieza', 400);
    cambios.enlace = enlace;
  }

  if (transicion.hacia) {
    cambios.estado = transicion.hacia;
    cambios.estadoDesde = new Date();
  }

  // Comentar y actualizar-copy no cambian ninguna columna de Pieza, y un
  // updateMany con `data` vacío no toca ninguna fila: sin esto, su guarda de
  // concurrencia daría siempre 409. Tocar `updatedAt` mantiene la guarda —la
  // condición sobre el estado sigue ahí— y deja constancia de que la pieza se
  // movió.
  if (Object.keys(cambios).length === 0) cambios.updatedAt = new Date();

  // Solo dos de las nueve acciones avisan (D4). Las otras siete —aceptar,
  // devolver, comentar…— quedan en el tablero y en el historial, que es donde
  // se miran; convertirlas en avisos es lo que hace que el equipo filtre los
  // correos de la herramienta y se pierdan también los dos que importan.
  const aviso =
    accion === 'asignar' || accion === 'reasignar'
      ? await prepararAviso(tenant, actual, 'ASIGNACION', datos.asignadaAId)
      : accion === 'entregar'
        ? await prepararAviso(tenant, actual, 'ENTREGA')
        : null;

  await prisma.$transaction(async tx => {
    const { count } = await tx.pieza.updateMany({
      where: { id: piezaId, estado: actual.estado },
      data: cambios,
    });
    if (count === 0)
      throw new TenantError('Alguien más movió esta pieza mientras la mirabas', 409);

    if (accion === 'actualizar-copy') await recongelarCopy(tx, piezaId);

    await tx.piezaEvento.create({
      data: {
        piezaId,
        tipo: transicion.evento,
        deEstado: actual.estado,
        aEstado: transicion.hacia ?? actual.estado,
        autorId: tenant.userId,
        nota: nota || null,
      },
    });

    if (aviso) await notificar(tx, tenant, aviso.evento, aviso.destinatarios);
  });

  // Se relee fuera de la transacción y con la misma forma que el tablero: la
  // pantalla reemplaza la tarjeta con lo que devuelve esta llamada, así que
  // tiene que traer los desfases y los comentarios o la tarjeta se vacía.
  return leerUna(piezaId);
};

const leerUna = async (piezaId: string) => {
  const pieza = await prisma.pieza.findUniqueOrThrow({ where: { id: piezaId }, include: INCLUDE_PIEZA });
  const comentarios = await contarComentarios([piezaId]);
  return presentar(pieza, comentarios.get(piezaId) ?? 0);
};

/**
 * Vuelve a congelar el texto desde los originales. Es explícito a propósito
 * (estado límite 3): si el copy se actualizara solo, el diseñador estaría
 * trabajando sobre algo que cambió sin avisarle.
 */
const recongelarCopy = async (tx: Prisma.TransactionClient, piezaId: string) => {
  const slots = await tx.piezaSlot.findMany({
    where: { piezaId },
    include: { savedVariation: { select: { content: true } } },
  });
  for (const s of slots) {
    if (!s.savedVariation || s.savedVariation.content === s.textoCongelado) continue;
    await tx.piezaSlot.update({
      where: { id: s.id },
      data: { textoCongelado: s.savedVariation.content },
    });
  }
};

/**
 * La forma con la que viaja una pieza a la pantalla.
 *
 * La previa sale del SNAPSHOT guardado y no del enlace: es nuestra, no depende
 * de los permisos de un Drive ajeno y es exactamente la imagen que miró la
 * auditoría. La URL está firmada y vence, así que se pide en cada lectura en
 * vez de guardarse.
 */
const presentar = async (pieza: PiezaConSlots, comentarios = 0) => ({
  ...conDesfases(pieza, comentarios),
  previaUrl: await urlDeSnapshot(pieza.versiones[0]?.claveSnapshot),
});

// ---------------------------------------------------------------- lecturas

export const listarPorMarca = async (tenant: TenantContext, clientId: string) => {
  const piezas = await prisma.pieza.findMany({
    where: { workspaceId: tenant.workspaceId, clientId },
    include: INCLUDE_PIEZA,
    orderBy: [{ estado: 'asc' }, { estadoDesde: 'asc' }],
  });
  const comentarios = await contarComentarios(piezas.map(p => p.id));
  return Promise.all(piezas.map(p => presentar(p, comentarios.get(p.id) ?? 0)));
};

/**
 * Mis piezas cruza marcas: el tablero es por marca porque así es todo el
 * producto, pero un diseñador trabaja en varias a la vez.
 */
export const listarMias = async (tenant: TenantContext) => {
  const piezas = await prisma.pieza.findMany({
    where: { workspaceId: tenant.workspaceId, asignadaAId: tenant.userId },
    include: INCLUDE_PIEZA,
    orderBy: { estadoDesde: 'asc' },
  });
  const comentarios = await contarComentarios(piezas.map(p => p.id));
  return Promise.all(piezas.map(p => presentar(p, comentarios.get(p.id) ?? 0)));
};

export const detalle = async (tenant: TenantContext, piezaId: string) => {
  const pieza = await prisma.pieza.findUnique({
    where: { id: piezaId },
    include: {
      ...INCLUDE_PIEZA,
      eventos: {
        orderBy: { createdAt: 'desc' },
        include: { autor: { select: { id: true, name: true } } },
      },
    },
  });
  if (!pieza || pieza.workspaceId !== tenant.workspaceId) throw new TenantError('Pieza no encontrada', 404);

  // Las hermanas viven en la orden de trabajo: el diseñador tiene que saber
  // que este visual también va a Historia (estado límite 1).
  const hermanas = pieza.grupoId
    ? await prisma.pieza.findMany({
        where: { grupoId: pieza.grupoId, id: { not: pieza.id }, workspaceId: tenant.workspaceId },
        select: { id: true, platform: true, formato: true, estado: true, titulo: true },
      })
    : [];

  // En el detalle `eventos` trae el historial completo, así que el último
  // comentario se calcula sobre los comentarios y no sobre el último evento.
  const comentarios = pieza.eventos.filter(e => e.tipo === 'COMENTARIO');
  const base = await presentar({ ...pieza, eventos: comentarios.slice(0, 1) }, comentarios.length);
  // La orden de trabajo muestra el informe completo: los hallazgos de la
  // última versión con sus dos lados, no solo el semáforo (D3).
  const version = pieza.versiones[0]
    ? await prisma.piezaVersion.findUnique({
        where: { id: pieza.versiones[0].id },
        include: {
          hallazgos: { orderBy: [{ tipo: 'asc' }, { slot: 'asc' }], include: { decididoPor: { select: { name: true } } } },
          subidaPor: { select: { name: true } },
        },
      })
    : null;
  return { ...base, eventos: pieza.eventos, hermanas, informe: version };
};

/**
 * El título es lo único que se edita a mano. No deja evento: renombrar no es
 * una decisión sobre el trabajo, es una corrección de etiqueta.
 */
export const renombrar = async (tenant: TenantContext, piezaId: string, titulo: string) => {
  const { count } = await prisma.pieza.updateMany({
    where: { id: piezaId, workspaceId: tenant.workspaceId },
    data: { titulo: titulo.slice(0, 160) },
  });
  if (count === 0) throw new TenantError('Pieza no encontrada', 404);
  return leerUna(piezaId);
};

/**
 * Qué hizo una persona con un hallazgo.
 *
 * Es obligatorio guardarlo, y no por prolijidad: es la única medida de si la
 * auditoría acierta. D2 la dejó avisando en vez de bloqueando justamente
 * porque un chequeo automático tiene que ganarse esa autoridad con historial,
 * y este es el historial.
 *
 * Aceptar un hallazgo pide nota; corregirlo no, porque corregir ya es la
 * respuesta.
 */
export const decidirHallazgo = async (
  tenant: TenantContext,
  hallazgoId: string,
  decision: 'ACEPTADO' | 'CORREGIDO',
  nota?: string
) => {
  const hallazgo = await prisma.hallazgo.findUnique({
    where: { id: hallazgoId },
    include: { version: { include: { pieza: { select: { id: true, workspaceId: true } } } } },
  });
  if (!hallazgo || hallazgo.version.pieza.workspaceId !== tenant.workspaceId)
    throw new TenantError('Hallazgo no encontrado', 404);

  const texto = typeof nota === 'string' ? nota.trim() : '';
  if (decision === 'ACEPTADO' && !texto)
    throw new TenantError('Aceptar un hallazgo pide una nota: queda registrado quién decidió pasarlo por alto', 400);

  await prisma.hallazgo.update({
    where: { id: hallazgoId },
    data: {
      decision,
      notaDecision: texto || null,
      decididoPorId: tenant.userId,
      decididoAt: new Date(),
    },
  });

  return leerUna(hallazgo.version.pieza.id);
};

/**
 * Reintenta la auditoría de la última versión. Existe porque NO_DISPONIBLE es
 * una caída del proveedor, no un veredicto: la pieza no tiene por qué quedarse
 * sin informe porque un servicio estuvo caído dos minutos.
 */
export const reauditar = async (tenant: TenantContext, piezaId: string) => {
  const pieza = await prisma.pieza.findUnique({
    where: { id: piezaId },
    include: { versiones: { orderBy: { numero: 'desc' }, take: 1 } },
  });
  if (!pieza || pieza.workspaceId !== tenant.workspaceId) throw new TenantError('Pieza no encontrada', 404);
  const version = pieza.versiones[0];
  if (!version) throw new TenantError('Esta pieza todavía no tiene un archivo para auditar', 400);

  // Los hallazgos de la corrida anterior se borran: son de una auditoría que no
  // terminó, y mezclarlos con los nuevos haría imposible leer el informe.
  await prisma.$transaction([
    prisma.hallazgo.deleteMany({ where: { piezaVersionId: version.id, tipo: { not: 'MEDIDAS' } } }),
    prisma.piezaVersion.update({
      where: { id: version.id },
      data: { estadoAuditoria: AuditoriaEstado.PENDIENTE, motivoNoDisponible: null, auditadaAt: null },
    }),
  ]);
  auditarEnSegundoPlano(version.id);
  return leerUna(piezaId);
};
