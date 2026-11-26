import { prisma } from '../lib/prisma.js';

/**
 * El uso de la herramienta (Gerardo, 2026-11-26: la línea base contra la que se comparará la adopción). Cada pedido
 * autenticado a un workspace suma uno a la persona, el día (de Bogotá) y el área de la plataforma: `acciones` si cambia
 * algo, `lecturas` si solo lee. Se suma en memoria y se guarda cada minuto con un `upsert` por fila, para no escribir en
 * la base en cada pedido: un reinicio puede perder hasta un minuto de conteo, nunca un pedido.
 *
 * No cuenta el sondeo de cada minuto («Por aprobar» y la bandeja): una pestaña abierta no es trabajo.
 */

const SONDEO = ['/por-aprobar', '/notificaciones'];

/** El área por el prefijo de la ruta: los pasos del proceso, más lo general. */
const AREAS: [string, string][] = [
  ['/clients', 'marca'],
  ['/dna-profiles', 'marca'],
  ['/projects', 'marca'],
  ['/cdm', 'cdm'],
  ['/generate', 'copy'],
  ['/copy', 'copy'],
  ['/saved', 'copy'],
  ['/copywriting', 'copy'],
  ['/presets', 'copy'],
  ['/feedback', 'copy'],
  ['/review-sessions', 'aprobacion'],
  ['/piezas', 'produccion'],
  ['/implementacion', 'implementacion'],
  ['/campanas', 'reporte'],
];
export const areaDe = (ruta: string) => AREAS.find(([p]) => ruta === p || ruta.startsWith(`${p}/`))?.[1] ?? 'general';

/** El día de Bogotá (UTC−5, sin horario de verano), como fecha a medianoche UTC para la columna DATE. */
const diaDeBogota = (t: number) => new Date(Math.floor((t - 5 * 3_600_000) / 86_400_000) * 86_400_000);

type Conteo = { workspaceId: string; userId: string; dia: Date; area: string; lecturas: number; acciones: number; primeraVez: Date; ultimaVez: Date };
let pendientes = new Map<string, Conteo>();

export const anotarUso = (t: { workspaceId: string; userId: string }, metodo: string, ruta: string) => {
  if (metodo === 'GET' && SONDEO.some(p => ruta.startsWith(p))) return;
  const ahora = new Date();
  const dia = diaDeBogota(ahora.getTime());
  const area = areaDe(ruta);
  const clave = `${t.workspaceId}|${t.userId}|${dia.toISOString()}|${area}`;
  const c = pendientes.get(clave) ?? { workspaceId: t.workspaceId, userId: t.userId, dia, area, lecturas: 0, acciones: 0, primeraVez: ahora, ultimaVez: ahora };
  if (metodo === 'GET' || metodo === 'HEAD') c.lecturas++;
  else c.acciones++;
  c.ultimaVez = ahora;
  pendientes.set(clave, c);
};

export const guardarUso = async () => {
  if (!pendientes.size) return;
  const lote = [...pendientes.values()];
  pendientes = new Map();
  for (const c of lote) {
    await prisma.usoDiario
      .upsert({
        where: { workspaceId_userId_dia_area: { workspaceId: c.workspaceId, userId: c.userId, dia: c.dia, area: c.area } },
        create: c,
        update: { lecturas: { increment: c.lecturas }, acciones: { increment: c.acciones }, ultimaVez: c.ultimaVez },
      })
      .catch(err => console.warn(`[uso] no se pudo guardar: ${err?.message}`));
  }
};

let reloj: NodeJS.Timeout | null = null;
export const empezarARegistrarUso = () => {
  if (reloj) return;
  reloj = setInterval(() => void guardarUso(), 60_000);
  reloj.unref();
  // Al apagarse el contenedor (cada deploy) se guarda lo que haya en memoria. Escuchar SIGTERM le quita a Node su
  // salida por defecto, así que se sale a mano, con un tope por si la base no responde.
  process.once('SIGTERM', () => {
    setTimeout(() => process.exit(0), 5_000).unref();
    void guardarUso().finally(() => process.exit(0));
  });
};
