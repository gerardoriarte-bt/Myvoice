/**
 * Carga los 14 canales de My Voice como formatos de la biblioteca de CDM de un workspace (F2c, decisión 15 y
 * 29; en el `.pen`, B6 a B8).
 *
 *   npm run cdm:canales -- <slug>            → dry-run: qué medios y formatos crearía o cambiaría
 *   npm run cdm:canales -- <slug> --apply    → lo escribe, en una transacción
 *
 * Lee `server/src/channels/specs/`, que es la fuente de hoy, y cada canal va al medio de su clase: Instagram,
 * TikTok y YouTube en Redes sociales; Google en Pagos; CRM y web en Propios; Radio en Tradicional. La cantidad
 * de cada texto es la de `porPieza` (desde el 2026-11-05 dice cuántos lleva una pieza): no queda nada por
 * decidir de B8. El puente con el motor es `Formato.canal` = el valor de `Platform`.
 *
 * Es un script y no código de CDM porque lee los specs de My Voice, y CDM no importa a My Voice
 * (`npm run fronteras`). Correrlo dos veces no crea versiones si los specs no cambiaron.
 */

import { ClaseDeMedio, PrismaClient, TipoDeArchivo, ZonaDeCampo } from '@prisma/client';
import { listChannels } from '../src/channels/registry.js';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const slug = args.find(a => !a.startsWith('--'));

/** Dónde va cada canal (decisión 29) y cómo lo llama el equipo. */
const DESTINO: Record<string, { medio: string; clase: ClaseDeMedio; nombre: string }> = {
  'Instagram Post': { medio: 'Instagram', clase: 'REDES_SOCIALES', nombre: 'Post de Instagram' },
  'Instagram Historia': { medio: 'Instagram', clase: 'REDES_SOCIALES', nombre: 'Historia de Instagram' },
  'Instagram Carrusel': { medio: 'Instagram', clase: 'REDES_SOCIALES', nombre: 'Carrusel de Instagram' },
  'Instagram Reel': { medio: 'Instagram', clase: 'REDES_SOCIALES', nombre: 'Reel de Instagram' },
  TikTok: { medio: 'TikTok', clase: 'REDES_SOCIALES', nombre: 'Video de TikTok' },
  YouTube: { medio: 'YouTube', clase: 'REDES_SOCIALES', nombre: 'Video de YouTube' },
  'Google Ads': { medio: 'Google', clase: 'PAGOS', nombre: 'Anuncio de búsqueda' },
  'Google Display': { medio: 'Google', clase: 'PAGOS', nombre: 'Display responsivo' },
  'Rich Media': { medio: 'CRM y web', clase: 'PROPIOS', nombre: 'Rich media' },
  'Pop up': { medio: 'CRM y web', clase: 'PROPIOS', nombre: 'Pop up web' },
  'Push Notification': { medio: 'CRM y web', clase: 'PROPIOS', nombre: 'Notificación push' },
  Email: { medio: 'CRM y web', clase: 'PROPIOS', nombre: 'Email' },
  WhatsApp: { medio: 'CRM y web', clase: 'PROPIOS', nombre: 'Mensaje de WhatsApp' },
  'Cuña de Radio': { medio: 'Radio', clase: 'TRADICIONAL', nombre: 'Cuña de radio' },
};

const TIPO: Record<string, TipoDeArchivo> = { grafica: 'IMAGEN', video: 'VIDEO', audio: 'AUDIO' };
const ZONA: Record<string, ZonaDeCampo> = { copyOut: 'PLATAFORMA', indicacion: 'INDICACION' };

/** «1080×1350» → 1080 × 1350. «600 px de ancho» → 600 × null. «20 s» → nada. */
const medidas = (formato?: string) => {
  const m = /(\d+)\s*[×x]\s*(\d+)/.exec(formato ?? '');
  if (m) return { anchoPx: Number(m[1]), altoPx: Number(m[2]) };
  const ancho = /(\d+)\s*px/.exec(formato ?? '');
  return { anchoPx: ancho ? Number(ancho[1]) : null, altoPx: null };
};

interface Plan {
  canal: string;
  medio: string;
  clase: ClaseDeMedio;
  nombre: string;
  tipoArchivo: TipoDeArchivo;
  anchoPx: number | null;
  altoPx: number | null;
  guia: { medidas: string[] } | null;
  campos: { clave: string; nombre: string; zona: ZonaDeCampo; unidad: string; minimo: number | null; maximo: number | null; repeticiones: number; orden: number }[];
}

const leerCanales = (): Plan[] =>
  listChannels().map(spec => {
    const destino = DESTINO[spec.id];
    if (!destino) throw new Error(`El canal «${spec.id}» no tiene medio asignado en DESTINO`);
    const pieza = spec.pieza;
    return {
      canal: spec.id,
      ...destino,
      tipoArchivo: pieza ? TIPO[pieza.tipo] ?? 'TEXTO' : 'TEXTO',
      ...medidas(pieza?.formatos[0]),
      guia: pieza ? { medidas: pieza.formatos } : null,
      campos: spec.slots
        .filter(s => !s.legado)
        .map((s, orden) => ({
          orden,
          clave: s.id,
          nombre: s.label,
          zona: (s.zona && ZONA[s.zona]) || 'PIEZA',
          unidad: s.unit === 'word' ? 'palabras' : 'caracteres',
          minimo: s.min ?? null,
          maximo: s.max ?? null,
          repeticiones: s.porPieza,
        })),
    };
  });

/** Lo que define la versión: si es igual a la guardada, no se crea otra. */
const huella = (p: Pick<Plan, 'anchoPx' | 'altoPx' | 'guia' | 'campos'>) =>
  JSON.stringify({
    anchoPx: p.anchoPx,
    altoPx: p.altoPx,
    medidas: p.guia?.medidas ?? null,
    campos: [...p.campos].sort((a, b) => a.orden - b.orden).map(c => [c.clave, c.nombre, c.zona, c.unidad, c.minimo, c.maximo, c.repeticiones, c.orden]),
  });

async function main() {
  if (!slug) throw new Error('Uso: npm run cdm:canales -- <slug> [--apply]');
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!ws) throw new Error(`No hay un workspace con el slug «${slug}»`);
  const planes = leerCanales();

  const resultado = await prisma.$transaction(async tx => {
    const filas: string[] = [];
    for (const p of planes) {
      const medio = await tx.medio.findUnique({ where: { workspaceId_nombre: { workspaceId: ws.id, nombre: p.medio } } });
      if (medio && medio.clase !== p.clase) {
        filas.push(`  ! ${p.medio} ya existe como ${medio.clase}: el canal ${p.canal} queda ahí; cámbiale la clase en la biblioteca si hace falta`);
      }
      const formato = medio
        ? await tx.formato.findUnique({
            where: { medioId_nombre: { medioId: medio.id, nombre: p.nombre } },
            include: { versiones: { orderBy: { numero: 'desc' }, take: 1, include: { campos: true } } },
          })
        : null;
      const ultima = formato?.versiones[0];
      const igual =
        ultima &&
        huella({
          anchoPx: ultima.anchoPx,
          altoPx: ultima.altoPx,
          guia: ultima.guia as Plan['guia'],
          campos: ultima.campos.map(c => ({
            clave: c.clave,
            nombre: c.nombre,
            zona: c.zona,
            unidad: c.unidad,
            minimo: c.minimo,
            maximo: c.maximo,
            repeticiones: c.repeticiones,
            orden: c.orden,
          })),
        }) === huella(p);
      const numero = (ultima?.numero ?? 0) + 1;
      filas.push(
        `  ${p.medio.padEnd(10)} ${p.nombre.padEnd(24)} ${String(p.campos.length).padStart(2)} campos · ${
          igual ? `igual (versión ${ultima!.numero})` : ultima ? `cambia → versión ${numero}` : 'nuevo, versión 1'
        }`
      );
      if (!APPLY || igual) continue;
      const m = medio ?? (await tx.medio.create({ data: { workspaceId: ws.id, nombre: p.medio, clase: p.clase } }));
      const f =
        formato ??
        (await tx.formato.create({ data: { workspaceId: ws.id, medioId: m.id, nombre: p.nombre, tipoArchivo: p.tipoArchivo, canal: p.canal } }));
      const v = await tx.formatoVersion.create({
        data: {
          formatoId: f.id,
          numero,
          anchoPx: p.anchoPx,
          altoPx: p.altoPx,
          guia: p.guia ?? undefined,
          fuente: 'My Voice',
          fuenteFecha: new Date(),
        },
      });
      await tx.campoDeTexto.createMany({ data: p.campos.map(c => ({ formatoVersionId: v.id, ...c })) });
    }
    if (!APPLY) throw Object.assign(new Error('dry-run'), { filas });
    return filas;
  }).catch(e => {
    if (e?.message === 'dry-run') return e.filas as string[];
    throw e;
  });

  console.log(`Los ${planes.length} canales de My Voice en «${ws.name}»:`);
  for (const f of resultado) console.log(f);
  console.log(
    APPLY
      ? '\nCargado. Los medios nuevos quedan en borrador: Planning los revisa y los activa.'
      : '\nDry-run: no se escribió nada. Agrega --apply para cargarlo.'
  );
}

main()
  .catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
