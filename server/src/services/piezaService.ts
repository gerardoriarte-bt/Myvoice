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
import { ModoAprobacion, Prisma, PiezaEstado, PiezaTipo, RondaRevision, WorkspaceRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { TenantContext, TenantError } from '../lib/tenancy.js';
import { guardarVersion, medidasDelFormato, urlDeSnapshot, ArchivoSubido } from './piezaArchivo.js';
import { auditarEnSegundoPlano } from './auditoriaService.js';
import { exigir, permisosDe, AccionConPermiso } from './permisosPieza.js';
import {
  AvisoEscrito,
  destinatariosDe,
  enviarEnSegundoPlano,
  EventoNotificable,
  notificar,
} from './notificacionService.js';
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
  /**
   * `hacia` es el de una campaña interna. En una campaña «del cliente» aceptar
   * la deja en CON_EL_CLIENTE: el visto bueno del equipo no es el final.
   */
  aceptar:            { desde: [PiezaEstado.POR_REVISAR], hacia: PiezaEstado.LISTA,       evento: 'ACEPTADA' },
  devolver:           { desde: [PiezaEstado.POR_REVISAR, PiezaEstado.CON_EL_CLIENTE], hacia: PiezaEstado.EN_DISENO, evento: 'DEVUELTA', exigeNota: true },
  reabrir:            { desde: [PiezaEstado.LISTA],       hacia: PiezaEstado.EN_DISENO,   evento: 'REABIERTA', exigeNota: true },
  /**
   * Un comentario no mueve la pieza: solo dice algo. Vive en el mismo
   * historial append-only que las decisiones —quién asignó, quién devolvió y
   * por qué— en vez de en un chat aparte, porque al leer una pieza lo que
   * importa es la secuencia completa, no dos listas que hay que intercalar.
   */
  comentar:           { desde: [PiezaEstado.POR_ASIGNAR, PiezaEstado.EN_DISENO, PiezaEstado.POR_REVISAR, PiezaEstado.CON_EL_CLIENTE, PiezaEstado.LISTA], hacia: null, evento: 'COMENTARIO', exigeNota: true },
  'actualizar-copy':  { desde: [PiezaEstado.POR_ASIGNAR, PiezaEstado.EN_DISENO, PiezaEstado.POR_REVISAR], hacia: null, evento: 'COPY_ACTUALIZADO' },
};

/** Qué permiso pide cada acción de la tabla. Comentar es de cualquiera. */
const PERMISO_DE: Record<AccionPieza, AccionConPermiso | null> = {
  asignar: 'asignar',
  reasignar: 'asignar',
  entregar: 'entregar',
  aceptar: 'aceptar',
  devolver: 'devolver',
  reabrir: 'reabrir',
  comentar: null,
  'actualizar-copy': 'actualizarCopy',
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
  // La campaña dice quién decide (su responsable) y adónde va la pieza al
  // aceptarse (su modo de aprobación). Ver permisosPieza.ts.
  project: {
    select: {
      id: true,
      name: true,
      modoAprobacion: true,
      responsableId: true,
      responsable: { select: { id: true, name: true } },
    },
  },
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
  motivo: 'sin-pieza' | 'no-aprobado' | 'ya-en-pieza' | 'sin-campana' | 'sin-responsable';
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
    include: { project: { select: { id: true, name: true, responsableId: true } } },
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
    // La aprobación es obligatoria y tiene responsable (docs/plan-aprobacion-por-campana.md):
    // sin campaña no hay quién la haya dado, aunque la fila diga «aprobado».
    if (!v.project) {
      excluidos.push({ savedVariationId: v.id, platform: v.platform, motivo: 'sin-campana', detalle: 'No tiene campaña: asignale una y aprobalo.' });
      continue;
    }
    if (!v.project.responsableId) {
      excluidos.push({ savedVariationId: v.id, platform: v.platform, motivo: 'sin-responsable', detalle: `«${v.project.name}» no tiene responsable de aprobación.` });
      continue;
    }
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
    // La MARCA entra en la clave. Sin ella, dos aprobados de marcas distintas
    // en el mismo canal caían en el mismo grupo, la propuesta los mostraba
    // juntos y recién al confirmar saltaba «Una pieza es de una sola marca».
    // El freno existía pero llegaba tarde: ahora son dos piezas, que es lo que
    // siempre debieron ser.
    const clave = `${v.clientId}|${v.projectId ?? ''}|${v.platform}`;
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
    include: { project: { select: { responsableId: true } } },
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
      if (!v.project?.responsableId)
        throw new TenantError('Solo va a producción el copy de una campaña con responsable de aprobación', 400);
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
  const pieza = await piezaParaDecidir(tenant, piezaId);
  exigir(tenant, pieza, 'entregar');
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

  const esperadas = medidasDelFormato(pieza.formato);
  const midioDistinto =
    esperadas && guardada.anchoPx && guardada.altoPx
      ? guardada.anchoPx !== esperadas.ancho || guardada.altoPx !== esperadas.alto
      : false;

  /*
   * La pieza NO pasa a «Por revisar» al subirse: se queda en diseño con
   * «Auditando…» y pasa cuando la auditoría termina (pasarARevision). Así el
   * responsable recibe una pieza con su informe, no una que todavía se está
   * leyendo — D3 decía «antes de que llegue a quien aprueba» y el código la
   * mandaba antes.
   */
  await prisma.$transaction(async tx => {
    const { count } = await tx.pieza.updateMany({
      where: { id: piezaId, estado: PiezaEstado.EN_DISENO },
      data: { updatedAt: new Date() },
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
        tipo: 'SUBIDA',
        deEstado: PiezaEstado.EN_DISENO,
        aEstado: PiezaEstado.EN_DISENO,
        autorId: tenant.userId,
        nota: `Versión ${numero}`,
      },
    });
  });

  const version = await prisma.piezaVersion.findFirstOrThrow({
    where: { piezaId, numero },
    select: { id: true },
  });
  // La auditoría corre después de responder: la diseñadora ya entregó y no
  // tiene por qué esperar dos llamadas de visión. La tarjeta dice «Auditando».
  auditarEnSegundoPlano(version.id, () => pasarARevision(tenant, piezaId, version.id));

  return leerUna(tenant, piezaId);
};

/**
 * La auditoría terminó (bien o con NO_DISPONIBLE): la pieza pasa a «Por
 * revisar» y recién ahora se le avisa al responsable.
 *
 * Solo si la versión auditada sigue siendo la última y la pieza sigue en
 * diseño: si mientras tanto se subió otra versión, la que importa es esa, y su
 * propia auditoría la va a mover.
 */
export const pasarARevision = async (tenant: TenantContext, piezaId: string, versionId: string) => {
  const pieza = await prisma.pieza.findUnique({
    where: { id: piezaId },
    include: { versiones: { orderBy: { numero: 'desc' }, take: 1, select: { id: true, numero: true, subidaPorId: true } } },
  });
  if (!pieza || pieza.estado !== PiezaEstado.EN_DISENO || pieza.versiones[0]?.id !== versionId) return;

  // El aviso sale a nombre de quien subió: es su entrega, y así no se le avisa a sí mismo.
  const autor = { ...tenant, userId: pieza.versiones[0].subidaPorId ?? tenant.userId };
  const aviso = await prepararAviso(autor, pieza, 'ENTREGA');
  let escritos: AvisoEscrito[] = [];
  await prisma.$transaction(async tx => {
    const { count } = await tx.pieza.updateMany({
      where: { id: piezaId, estado: PiezaEstado.EN_DISENO },
      data: { estado: PiezaEstado.POR_REVISAR, estadoDesde: new Date() },
    });
    if (count === 0) return;
    await tx.piezaEvento.create({
      data: {
        piezaId,
        tipo: 'ENTREGADA',
        deEstado: PiezaEstado.EN_DISENO,
        aEstado: PiezaEstado.POR_REVISAR,
        autorId: autor.userId,
        nota: `Versión ${pieza.versiones[0].numero}`,
      },
    });
    escritos = await notificar(tx, autor, aviso.evento, aviso.destinatarios);
  });
  enviarEnSegundoPlano(autor, escritos);
};

/**
 * Al arrancar: una auditoría que estaba corriendo cuando el servidor se
 * reinició no va a terminar nunca, y su pieza quedaría en «Auditando» para
 * siempre. Se cierra como NO_DISPONIBLE —se puede reintentar— y la pieza pasa
 * a revisión, que es lo que haría una auditoría fallida.
 */
export const rescatarAuditoriasTrabadas = async () => {
  const trabadas = await prisma.piezaVersion.findMany({
    where: { estadoAuditoria: AuditoriaEstado.PENDIENTE, createdAt: { lt: new Date(Date.now() - 10 * 60_000) } },
    include: { pieza: { select: { id: true, workspaceId: true } } },
  });
  for (const v of trabadas) {
    await prisma.piezaVersion.update({
      where: { id: v.id },
      data: {
        estadoAuditoria: AuditoriaEstado.NO_DISPONIBLE,
        motivoNoDisponible: 'La auditoría se cortó (el servidor se reinició). Se puede reintentar.',
        auditadaAt: new Date(),
      },
    });
    const tenant = { workspaceId: v.pieza.workspaceId, userId: v.subidaPorId ?? '', role: WorkspaceRole.MEMBER };
    await pasarARevision(tenant, v.pieza.id, v.id).catch(e => console.error('[auditoria] rescate:', e));
  }
  if (trabadas.length) console.log(`[auditoria] ${trabadas.length} auditoría(s) trabada(s) cerradas al arrancar`);
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
export const prepararAviso = async (
  tenant: TenantContext,
  pieza: { id: string; clientId: string; platform: string; formato: string; projectId: string | null },
  tipo: EventoNotificable['tipo'],
  asignadaAId?: string | null
) => {
  const [marca, campana] = await Promise.all([
    prisma.client.findUnique({ where: { id: pieza.clientId }, select: { name: true } }),
    pieza.projectId
      ? prisma.project.findUnique({ where: { id: pieza.projectId }, select: { responsableId: true } })
      : null,
  ]);
  const evento: EventoNotificable = {
    tipo,
    piezaId: pieza.id,
    clientId: pieza.clientId,
    marca: marca?.name ?? 'la marca',
    pieza: `${pieza.platform} ${pieza.formato}`,
    autorId: tenant.userId,
    asignadaAId,
    responsableId: campana?.responsableId ?? null,
  };
  return { evento, destinatarios: await destinatariosDe(tenant, evento) };
};

// ------------------------------------------------------------- transiciones

export interface DatosTransicion {
  asignadaAId?: string;
  enlace?: string;
  /** Sin clasificar. Se sigue aceptando: no toda nota tiene categoría. */
  nota?: string;
  /** H2.E · D7: el mismo desglose que usa el cliente, puertas adentro. */
  notaCopy?: string;
  notaDiseno?: string;
}

/**
 * El motivo, desglosado.
 *
 * Devuelve una entrada por categoría escrita, y **el historial guarda una por
 * cada una**: son dos cosas distintas con destinatarios distintos, y meterlas
 * en un solo evento con dos campos obligaría a cada lector a desarmarlo.
 *
 * Una nota suelta se guarda **sin categoría**. Es tentador asignarle una —la
 * devolución va al diseñador, así que «debe ser de diseño»— y es exactamente
 * el error que D5 del plan previene: una clasificación equivocada es peor que
 * ninguna. NULL significa «nadie lo clasificó», que es cierto y no ensucia.
 */
const motivosDe = (datos: DatosTransicion): { categoria: string | null; texto: string }[] => {
  const limpia = (v?: string) => (typeof v === 'string' ? v.trim() : '');
  const motivos: { categoria: string | null; texto: string }[] = [];
  const copy = limpia(datos.notaCopy);
  const diseno = limpia(datos.notaDiseno);
  if (copy) motivos.push({ categoria: 'COPY', texto: copy });
  if (diseno) motivos.push({ categoria: 'DISENO', texto: diseno });
  if (motivos.length === 0) {
    const suelta = limpia(datos.nota);
    if (suelta) motivos.push({ categoria: null, texto: suelta });
  }
  return motivos;
};

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

  const motivos = motivosDe(datos);
  if (transicion.exigeNota && motivos.length === 0)
    throw new TenantError('Esta acción necesita un motivo escrito', 400);

  const actual = await piezaParaDecidir(tenant, piezaId);
  if (!transicion.desde.includes(actual.estado))
    throw new TenantError(`Una pieza en "${actual.estado}" no admite esta acción`, 409);
  const permiso = PERMISO_DE[accion];
  if (permiso) exigir(tenant, actual, permiso);

  // Aceptar en una campaña «del cliente» no es el final: queda esperándolo.
  const hacia =
    accion === 'aceptar' && actual.project?.modoAprobacion === ModoAprobacion.CLIENTE
      ? PiezaEstado.CON_EL_CLIENTE
      : transicion.hacia;

  // Pasar por alto un hallazgo es una decisión, y queda escrita.
  if (accion === 'aceptar') {
    const sinDecidir = (actual.versiones[0]?.hallazgos ?? []).filter(
      h => h.decision === 'PENDIENTE' && h.tipo !== 'ILEGIBLE'
    ).length;
    if (sinDecidir > 0 && motivos.length === 0)
      throw new TenantError(
        `Hay ${sinDecidir === 1 ? 'un hallazgo' : `${sinDecidir} hallazgos`} sin decidir: aceptarla igual pide una línea de por qué.`,
        400
      );
  }

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

  if (hacia) {
    cambios.estado = hacia;
    cambios.estadoDesde = new Date();
  }

  // Comentar y actualizar-copy no cambian ninguna columna de Pieza, y un
  // updateMany con `data` vacío no toca ninguna fila: sin esto, su guarda de
  // concurrencia daría siempre 409. Tocar `updatedAt` mantiene la guarda —la
  // condición sobre el estado sigue ahí— y deja constancia de que la pieza se
  // movió.
  if (Object.keys(cambios).length === 0) cambios.updatedAt = new Date();

  // Avisan las acciones que le pasan el trabajo a otra persona (D4, revisada
  // en docs/plan-produccion-con-responsable.md): asignar, entregar y devolver.
  // Aceptar, comentar y el resto quedan en el tablero y en el historial;
  // convertirlas en avisos es lo que hace que el equipo filtre los correos.
  const aviso =
    accion === 'asignar' || accion === 'reasignar'
      ? await prepararAviso(tenant, actual, 'ASIGNACION', datos.asignadaAId)
      : accion === 'entregar'
        ? await prepararAviso(tenant, actual, 'ENTREGA')
        : (accion === 'devolver' || accion === 'reabrir') && actual.asignadaAId
          ? await prepararAviso(tenant, actual, 'DEVOLUCION', actual.asignadaAId)
          : null;

  let escritos: AvisoEscrito[] = [];
  await prisma.$transaction(async tx => {
    const { count } = await tx.pieza.updateMany({
      where: { id: piezaId, estado: actual.estado },
      data: cambios,
    });
    if (count === 0)
      throw new TenantError('Alguien más movió esta pieza mientras la mirabas', 409);

    if (accion === 'actualizar-copy') await recongelarCopy(tx, piezaId);

    // Una entrada por motivo. Sin motivos —aceptar, asignar— queda la entrada
    // sola que registra el movimiento.
    for (const motivo of motivos.length ? motivos : [{ categoria: null, texto: null }]) {
      await tx.piezaEvento.create({
        data: {
          piezaId,
          tipo: transicion.evento,
          deEstado: actual.estado,
          aEstado: hacia ?? actual.estado,
          autorId: tenant.userId,
          nota: motivo.texto,
          categoria: motivo.categoria,
        },
      });
    }

    if (aviso) escritos = await notificar(tx, tenant, aviso.evento, aviso.destinatarios);
  });

  // El correo sale con la transacción ya confirmada: si hubiera quedado
  // adentro, un 409 de la guarda de concurrencia dejaría correos anunciando
  // algo que nunca pasó.
  enviarEnSegundoPlano(tenant, escritos);

  // Se relee fuera de la transacción y con la misma forma que el tablero: la
  // pantalla reemplaza la tarjeta con lo que devuelve esta llamada, así que
  // tiene que traer los desfases y los comentarios o la tarjeta se vacía.
  return leerUna(tenant, piezaId);
};

const leerUna = async (tenant: TenantContext, piezaId: string) => {
  const pieza = await prisma.pieza.findUniqueOrThrow({ where: { id: piezaId }, include: INCLUDE_PIEZA });
  const [comentarios, contexto] = await Promise.all([contarComentarios([piezaId]), contextoDe([pieza])]);
  return presentar(tenant, pieza, comentarios.get(piezaId) ?? 0, contexto.get(piezaId));
};

/** Una pieza con lo que hace falta para decidir permisos. 404 si es de otro workspace. */
const piezaParaDecidir = async (tenant: TenantContext, piezaId: string) => {
  const pieza = await prisma.pieza.findUnique({
    where: { id: piezaId },
    include: {
      project: { select: { name: true, modoAprobacion: true, responsableId: true, responsable: { select: { name: true } } } },
      versiones: { orderBy: { numero: 'desc' }, take: 1, include: { hallazgos: true } },
    },
  });
  if (!pieza || pieza.workspaceId !== tenant.workspaceId) throw new TenantError('Pieza no encontrada', 404);
  return pieza;
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
const presentar = async (
  tenant: TenantContext,
  pieza: PiezaConSlots,
  comentarios = 0,
  contexto?: ContextoDePieza
) => ({
  ...conDesfases(pieza, comentarios),
  previaUrl: await urlDeSnapshot(pieza.versiones[0]?.claveSnapshot),
  ...permisosDe(tenant, pieza),
  devolucion: contexto?.devolucion ?? null,
  cierre: contexto?.cierre ?? null,
  enviadaAlCliente: contexto?.enviadaAlCliente ?? null,
});

/**
 * Lo que la tarjeta cuenta de lo que pasó, calculado del historial y no
 * guardado: quién la devolvió y por qué, quién la cerró, cuándo se le mandó al
 * cliente. Guardarlo sería otra columna que mantener en sincronía con los
 * eventos, que ya son la verdad.
 */
interface ContextoDePieza {
  devolucion: {
    por: string;
    createdAt: Date;
    motivos: { categoria: string | null; nota: string | null }[];
    /** Hubo motivo de copy y el responsable todavía no lo corrigió. */
    esperaCopy: boolean;
  } | null;
  cierre: { via: 'CLIENTE' | 'INTERNA'; por: string; createdAt: Date } | null;
  enviadaAlCliente: { createdAt: Date } | null;
}

const contextoDe = async (piezas: { id: string; estado: PiezaEstado }[]): Promise<Map<string, ContextoDePieza>> => {
  const ids = piezas.map(p => p.id);
  if (!ids.length) return new Map();
  const [eventos, enRevision] = await Promise.all([
    prisma.piezaEvento.findMany({
      where: {
        piezaId: { in: ids },
        tipo: { in: ['DEVUELTA', 'REABIERTA', 'COPY_CORREGIDO', 'ACEPTADA', 'APROBADA_CLIENTE', 'ENTREGADA', 'SUBIDA'] },
      },
      orderBy: { createdAt: 'desc' },
      include: { autor: { select: { name: true } } },
    }),
    prisma.reviewSessionItem.findMany({
      where: {
        piezaId: { in: ids },
        reviewSession: { ronda: RondaRevision.PIEZA, status: { not: 'COMPLETED' }, expiresAt: { gt: new Date() } },
      },
      select: { piezaId: true, reviewSession: { select: { createdAt: true } } },
    }),
  ]);
  const porPieza = new Map<string, typeof eventos>();
  for (const e of eventos) porPieza.set(e.piezaId, [...(porPieza.get(e.piezaId) ?? []), e]);
  const enviada = new Map(enRevision.map(i => [i.piezaId!, i.reviewSession.createdAt]));

  return new Map(
    piezas.map(p => {
      const lista = porPieza.get(p.id) ?? [];
      const nombre = (e: (typeof lista)[number]) => e.autor?.name ?? e.autorExterno ?? 'Alguien';
      let devolucion: ContextoDePieza['devolucion'] = null;
      if (p.estado === PiezaEstado.EN_DISENO) {
        // La devolución vigente: la última, si nada se entregó después.
        const i = lista.findIndex(e => e.tipo === 'DEVUELTA' || e.tipo === 'REABIERTA' || e.tipo === 'ENTREGADA' || e.tipo === 'SUBIDA');
        const ultima = i >= 0 ? lista[i] : null;
        if (ultima && (ultima.tipo === 'DEVUELTA' || ultima.tipo === 'REABIERTA')) {
          // Una devolución con dos categorías deja dos eventos casi juntos, del
          // mismo autor: sin mirar el autor, dos devoluciones seguidas (la del
          // equipo y la del cliente) se mezclaban en una.
          const juntos = lista.filter(
            e =>
              e.tipo === ultima.tipo &&
              e.autorId === ultima.autorId &&
              e.autorExterno === ultima.autorExterno &&
              Math.abs(e.createdAt.getTime() - ultima.createdAt.getTime()) < 5000
          );
          const corregido = lista.some(e => e.tipo === 'COPY_CORREGIDO' && e.createdAt > ultima.createdAt);
          devolucion = {
            por: nombre(ultima),
            createdAt: ultima.createdAt,
            motivos: juntos.map(e => ({ categoria: e.categoria, nota: e.nota })),
            esperaCopy: juntos.some(e => e.categoria === 'COPY') && !corregido,
          };
        }
      }
      let cierre: ContextoDePieza['cierre'] = null;
      if (p.estado === PiezaEstado.LISTA) {
        const c = lista.find(e => e.tipo === 'APROBADA_CLIENTE' || e.tipo === 'ACEPTADA');
        if (c) cierre = { via: c.tipo === 'APROBADA_CLIENTE' ? 'CLIENTE' : 'INTERNA', por: nombre(c), createdAt: c.createdAt };
      }
      const env = p.estado === PiezaEstado.CON_EL_CLIENTE ? enviada.get(p.id) : undefined;
      return [p.id, { devolucion, cierre, enviadaAlCliente: env ? { createdAt: env } : null }];
    })
  );
};

/**
 * El responsable corrige el copy **dentro de la pieza**.
 *
 * Existe porque una corrección de mensaje no tenía por dónde hacerse: el copy
 * en producción no se edita en Copy, y la pieza quedaba varada. Corregir acá
 * actualiza el texto congelado de la pieza Y el copy original, que queda
 * aprobado por el responsable —es quien aprueba—; en una campaña del cliente,
 * él lo vuelve a ver cuando la pieza le llegue de nuevo.
 *
 * No mueve la pieza: la tarjeta deja de decir «Espera el copy» y la
 * diseñadora actualiza el arte.
 */
export const corregirCopy = async (
  tenant: TenantContext,
  piezaId: string,
  correcciones: { slot: string; texto: string }[]
) => {
  const pieza = await piezaParaDecidir(tenant, piezaId);
  exigir(tenant, pieza, 'corregirCopy');
  const permitidos: PiezaEstado[] = [PiezaEstado.EN_DISENO, PiezaEstado.POR_REVISAR, PiezaEstado.CON_EL_CLIENTE];
  if (!permitidos.includes(pieza.estado))
    throw new TenantError('El copy se corrige mientras la pieza está en curso: si ya está lista, reabrila', 409);

  const limpias = (Array.isArray(correcciones) ? correcciones : [])
    .map(c => ({ slot: typeof c?.slot === 'string' ? c.slot : '', texto: typeof c?.texto === 'string' ? c.texto.trim() : '' }))
    .filter(c => c.slot && c.texto);
  if (!limpias.length) throw new TenantError('No hay ningún texto corregido', 400);

  const slots = await prisma.piezaSlot.findMany({ where: { piezaId } });
  const porSlot = new Map(slots.map(s => [s.slot, s]));
  const yo = await prisma.user.findUnique({ where: { id: tenant.userId }, select: { name: true } });

  await prisma.$transaction(async tx => {
    const cambiados: string[] = [];
    for (const c of limpias) {
      const s = porSlot.get(c.slot);
      // Un slot que no es de esta pieza se ignora, como un id ajeno.
      if (!s || s.esInstruccion || s.textoCongelado === c.texto) continue;
      await tx.piezaSlot.update({ where: { id: s.id }, data: { textoCongelado: c.texto } });
      if (s.savedVariationId) {
        await tx.savedVariation.update({
          where: { id: s.savedVariationId },
          data: {
            content: c.texto,
            charCount: c.texto.length,
            isApproved: true,
            aprobadoPorId: tenant.userId,
            aprobadoPorNombre: yo?.name ?? null,
            aprobadoEn: new Date(),
            aprobadoVia: ModoAprobacion.INTERNA,
          },
        });
      }
      cambiados.push(s.slotLabel);
    }
    if (!cambiados.length) throw new TenantError('El texto es el mismo: no hay nada que corregir', 400);
    await tx.piezaEvento.create({
      data: {
        piezaId,
        tipo: 'COPY_CORREGIDO',
        autorId: tenant.userId,
        categoria: 'COPY',
        nota: `Corrigió: ${cambiados.join(', ')}`,
      },
    });
  });
  return leerUna(tenant, piezaId);
};

// ---------------------------------------------------------------- lecturas

export const listarPorMarca = async (tenant: TenantContext, clientId: string) => {
  const piezas = await prisma.pieza.findMany({
    where: { workspaceId: tenant.workspaceId, clientId },
    include: INCLUDE_PIEZA,
    orderBy: [{ estado: 'asc' }, { estadoDesde: 'asc' }],
  });
  return presentarVarias(tenant, piezas);
};

const presentarVarias = async (tenant: TenantContext, piezas: PiezaConSlots[]) => {
  const ids = piezas.map(p => p.id);
  const [comentarios, contexto] = await Promise.all([contarComentarios(ids), contextoDe(piezas)]);
  return Promise.all(piezas.map(p => presentar(tenant, p, comentarios.get(p.id) ?? 0, contexto.get(p.id))));
};

/**
 * «Lo mío» cruza marcas: el tablero es por marca porque así es todo el
 * producto, pero una diseñadora trabaja en varias a la vez. Y no es solo lo
 * que diseño: también lo que espera mi decisión como responsable, que antes no
 * tenía dónde verse.
 */
export const listarMias = async (tenant: TenantContext) => {
  const piezas = await prisma.pieza.findMany({
    where: {
      workspaceId: tenant.workspaceId,
      OR: [
        { asignadaAId: tenant.userId },
        {
          project: { responsableId: tenant.userId },
          estado: { in: [PiezaEstado.POR_REVISAR, PiezaEstado.CON_EL_CLIENTE] },
        },
      ],
    },
    include: INCLUDE_PIEZA,
    orderBy: { estadoDesde: 'asc' },
  });
  return presentarVarias(tenant, piezas);
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
  const contexto = await contextoDe([pieza]);
  const base = await presentar(tenant, { ...pieza, eventos: comentarios.slice(0, 1) }, comentarios.length, contexto.get(pieza.id));
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
  exigir(tenant, await piezaParaDecidir(tenant, piezaId), 'renombrar');
  const { count } = await prisma.pieza.updateMany({
    where: { id: piezaId, workspaceId: tenant.workspaceId },
    data: { titulo: titulo.slice(0, 160) },
  });
  if (count === 0) throw new TenantError('Pieza no encontrada', 404);
  return leerUna(tenant, piezaId);
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
  exigir(tenant, await piezaParaDecidir(tenant, hallazgo.version.pieza.id), 'decidirHallazgos');

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

  return leerUna(tenant, hallazgo.version.pieza.id);
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
  auditarEnSegundoPlano(version.id, () => pasarARevision(tenant, piezaId, version.id));
  return leerUna(tenant, piezaId);
};
