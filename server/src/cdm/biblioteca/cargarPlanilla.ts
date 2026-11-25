import { Platform } from '../../types.js';
import { ClaseDeMedio, Prisma, TipoDeArchivo, ZonaDeCampo } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

/**
 * Carga la planilla de especificaciones de un medio en la biblioteca de CDM (F2, decisión 18;
 * docs/ecosistema/cdm/biblioteca/meta.md).
 *
 * La planilla viene **por ubicación**, como la dan las guías de los medios (Meta: 34 ubicaciones). La
 * biblioteca se organiza **por pieza maestra**: un tipo de archivo y una proporción, con las ubicaciones que
 * cubre. Esto las agrupa, y cada pieza guarda una versión nueva solo si algo cambió.
 *
 * Recibe filas ya leídas (JSON), nunca un .xlsx: el servidor no abre planillas. La lee el navegador o
 * `scripts/planilla-a-json.cjs`.
 *
 * Primero planifica (qué es nuevo, qué cambia, qué tiene errores) y solo escribe si se lo piden, en una
 * transacción: es la misma lógica para la pantalla (B6) y para `npm run cdm:importar`.
 */

export interface PlanillaDeMedio {
  medio: string;
  /** La clase del medio (decisión 29). Solo cuenta al crearlo: uno que ya existe conserva la suya. */
  clase?: ClaseDeMedio;
  fuente: string;
  /** AAAA-MM-DD: la fecha de la guía. Con la fuente, es la versión (meta.md, regla 5). */
  fecha: string;
  /**
   * El canal del motor que escribe los textos de plataforma de estas piezas (F4). Sin él, Meta Ads, que fue la
   * primera planilla. Google lo trae (`Google Recursos`, 2026-11-25). Las piezas sin textos no llevan canal.
   */
  canal?: string;
  especificaciones: Record<string, unknown>[];
  zonasSeguras?: Record<string, unknown>[];
  alertas?: { numero: number; formato: string; ubicacion: string; inconsistencia: string; accion: string }[];
}

interface CampoPlaneado {
  clave: string;
  nombre: string;
  zona: ZonaDeCampo;
  minimo: number | null;
  maximo: number | null;
  /** Cuántos de ese texto lleva la pieza («Título (3-15)» → 15). Solo se guarda cuando es más de uno. */
  repeticiones?: number;
}

interface UbicacionPlaneada {
  plataforma: string;
  nombre: string;
  proporcion: string;
  resolucion: string | null;
  detalles: Record<string, string>;
  zonaSegura: ZonaSegura | null;
  urlFuente: string | null;
  alerta: number | null;
  alertaTexto: string | null;
  porConfirmar: boolean;
  campos: CampoPlaneado[];
}

interface ZonaSegura {
  superior: number | null;
  inferior: number | null;
  lados: number | null;
  restriccion?: string | null;
}

export interface FormatoPlaneado {
  nombre: string;
  tipoArchivo: TipoDeArchivo;
  proporcion: string;
  anchoPx: number | null;
  altoPx: number | null;
  archivos: string | null;
  pesoMaximo: string | null;
  guia: { lienzo: { ancho: number; alto: number } | null; zonaSegura: ZonaSegura | null };
  ubicaciones: UbicacionPlaneada[];
}

export interface PlanDeCarga {
  medio: { nombre: string; nuevo: boolean; clase: ClaseDeMedio };
  formatos: {
    nombre: string;
    ubicaciones: number;
    accion: 'nuevo' | 'version' | 'igual';
    version: number;
    porConfirmar: number;
    /** El rango del texto principal entre sus ubicaciones: lo que la revisión muestra por pieza (B5). */
    textoPrincipal: { desde: number; hasta: number } | null;
  }[];
  /** Lo leído, para el resumen de la revisión: ubicaciones por tipo y las alertas de la guía. */
  leidas: { imagen: number; video: number };
  alertas: { numero: number; ubicacion: string; inconsistencia: string; accion: string }[];
  errores: string[];
}

// ---------------------------------------------------------------------------------------------- lectura

/** «–», «N/A», «No indica» o vacío: la guía no da el dato (nota de la planilla). */
const texto = (v: unknown): string | null => {
  const s = String(v ?? '').trim();
  return !s || ['–', '-', 'N/A', 'No indica'].includes(s) ? null : s;
};

/** «50-150» → 50 a 150; «125» → hasta 125. Los largos de Meta son recomendaciones: se guardan como tope. */
const largo = (v: unknown): { minimo: number | null; maximo: number | null } | null => {
  const s = texto(v);
  if (!s) return null;
  const rango = /^(\d+)\s*-\s*(\d+)$/.exec(s);
  if (rango) return { minimo: Number(rango[1]), maximo: Number(rango[2]) };
  return /^\d+$/.test(s) ? { minimo: null, maximo: Number(s) } : null;
};

const porcentaje = (v: unknown): number | null => {
  const m = /(\d+(?:[.,]\d+)?)\s*%/.exec(String(v ?? ''));
  return m ? Number(m[1].replace(',', '.')) : null;
};

const TIPOS: Record<string, TipoDeArchivo> = { imagen: 'IMAGEN', video: 'VIDEO', texto: 'TEXTO', html5: 'HTML' };

/**
 * Los textos de una planilla que los trae en una columna (Google, 2026-11-25): «Título (3-15): 30 · Título largo
 * (1-5): 90 · Negocio: 25». Cada tramo es un texto con su largo y, entre paréntesis, cuántos lleva la pieza.
 */
const CLAVE_DE_TEXTO: Record<string, { clave: string; nombre: string }> = {
  titulo: { clave: 'titulo', nombre: 'Título' },
  'titulo anuncio': { clave: 'titulo', nombre: 'Título' },
  'titulo largo': { clave: 'tituloLargo', nombre: 'Título largo' },
  descripcion: { clave: 'descripcion', nombre: 'Descripción' },
  'descripcion anuncio': { clave: 'descripcion', nombre: 'Descripción' },
  negocio: { clave: 'negocio', nombre: 'Nombre del negocio' },
  ruta: { clave: 'ruta', nombre: 'Ruta de la URL' },
  cta: { clave: 'cta', nombre: 'Llamado a la acción' },
  'tarjeta titulo': { clave: 'tarjetaTitulo', nombre: 'Título de tarjeta' },
  // DV360 los nombra distinto.
  'titulo corto': { clave: 'titulo', nombre: 'Título' },
  anunciante: { clave: 'negocio', nombre: 'Nombre del negocio' },
  cuerpo: { clave: 'descripcion', nombre: 'Descripción' },
  'cuerpo largo': { clave: 'descripcionLarga', nombre: 'Descripción larga' },
  'card headline': { clave: 'tarjetaTitulo', nombre: 'Título de tarjeta' },
  'card description': { clave: 'tarjetaDescripcion', nombre: 'Descripción de tarjeta' },
  // Los que van dentro del arte (columna «En la pieza»): banners, intersticiales y videos sin textos de plataforma.
  titular: { clave: 'titular', nombre: 'Titular' },
  'llamado a la accion': { clave: 'llamado', nombre: 'Llamado a la acción' },
};
const sinTildes = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const textosEnColumna = (v: unknown, zona: ZonaDeCampo = ZonaDeCampo.PLATAFORMA): CampoPlaneado[] => {
  const s = texto(v);
  if (!s) return [];
  return s.split('·').flatMap(tramo => {
    const m = /^(.+?)\s*(?:\((\d+)\s*-\s*(\d+)\))?\s*:\s*(\d+)\s*$/.exec(tramo.trim());
    const def = m ? CLAVE_DE_TEXTO[sinTildes(m[1])] : undefined;
    if (!m || !def) return [];
    const cuantos = m[3] ? Number(m[3]) : 1;
    return [{ clave: def.clave, nombre: def.nombre, zona, minimo: null, maximo: Number(m[4]), ...(cuantos > 1 ? { repeticiones: cuantos } : {}) }];
  });
};

/**
 * La pieza de una ubicación (meta.md: «se asignan a la pieza que ya se produce»). Un rango que empieza en
 * 1,91:1 no pide una 1,91:1 aparte; 9:16 manda; entre 1:1 y 4:5 gana la primera que nombra la guía.
 */
export const piezaDe = (aspecto: string): string | null => {
  const s = aspecto.replace(/1,91:1/g, '');
  if (s.includes('9:16')) return '9:16';
  const uno = s.indexOf('1:1');
  const cuatro = s.indexOf('4:5');
  if (uno < 0 && cuatro < 0) return null;
  if (uno < 0) return '4:5';
  if (cuatro < 0) return '1:1';
  return uno < cuatro ? '1:1' : '4:5';
};

/** «1.440 x 2.560» → 1440 × 2560. Con «1:1: … / 4:5: …», toma el tramo de la proporción de la pieza. */
const medidas = (resolucion: string | null, proporcion: string) => {
  if (!resolucion) return null;
  const tramo = resolucion.split('/').find(t => t.trim().startsWith(`${proporcion}:`)) ?? resolucion;
  const m = /(\d[\d.]*)\s*x\s*(\d[\d.]*)/i.exec(tramo);
  if (!m) return null;
  return { ancho: Number(m[1].replace(/\./g, '')), alto: Number(m[2].replace(/\./g, '')), minima: /m[ií]n/i.test(tramo) };
};

const masComun = <T,>(valores: T[]): T | null => {
  const cuenta = new Map<string, { v: T; n: number }>();
  for (const v of valores) {
    const k = JSON.stringify(v);
    cuenta.set(k, { v, n: (cuenta.get(k)?.n ?? 0) + 1 });
  }
  return [...cuenta.values()].sort((a, b) => b.n - a.n)[0]?.v ?? null;
};

const CAMPOS: { columna: string; clave: string; nombre: string }[] = [
  { columna: 'Texto principal (caract.)', clave: 'textoPrincipal', nombre: 'Texto principal' },
  { columna: 'Título (caract.)', clave: 'titulo', nombre: 'Título' },
  { columna: 'Descripción (caract.)', clave: 'descripcion', nombre: 'Descripción' },
];

const DETALLES: [string, string][] = [
  ['Ancho mín. (px)', 'anchoMinimo'],
  ['Alto mín. (px)', 'altoMinimo'],
  ['Tolerancia aspecto', 'tolerancia'],
  ['Duración', 'duracion'],
  ['Configuración de video', 'video'],
  ['Subtítulos', 'subtitulos'],
  ['Sonido', 'sonido'],
  ['Otras indicaciones', 'otras'],
];

/** Agrupa las filas por pieza maestra. Lo que no se puede leer va a `errores` y no se carga. */
export const leerPlanilla = (p: PlanillaDeMedio): { formatos: FormatoPlaneado[]; errores: string[] } => {
  const errores: string[] = [];
  const grupos = new Map<string, { tipo: TipoDeArchivo; proporcion: string; filas: Record<string, unknown>[]; nombre?: string }>();
  p.especificaciones.forEach((fila, i) => {
    const n = i + 2; // la fila 1 es el encabezado
    const tipo = TIPOS[String(fila['Formato'] ?? '').trim().toLowerCase()];
    const aspecto = texto(fila['Relación de aspecto']);
    if (!tipo) return errores.push(`Fila ${n}: formato «${fila['Formato']}» desconocido (Imagen, Video, Texto o HTML5)`);
    if (!texto(fila['Ubicación'])) return errores.push(`Fila ${n}: falta la ubicación`);
    // Una planilla que ya dice la pieza (Google, 2026-11-25) la respeta: no se deduce de la proporción.
    const pieza = texto(fila['Pieza']);
    if (pieza) {
      grupos.set(pieza, { tipo, proporcion: aspecto ?? '', filas: [...(grupos.get(pieza)?.filas ?? []), fila], nombre: pieza });
      return;
    }
    const proporcion = aspecto ? piezaDe(aspecto) : null;
    if (!proporcion) return errores.push(`Fila ${n}: no se reconoce la proporción «${aspecto ?? ''}»`);
    const clave = `${tipo} ${proporcion}`;
    grupos.set(clave, { tipo, proporcion, filas: [...(grupos.get(clave)?.filas ?? []), fila] });
  });

  const alertas = new Map((p.alertas ?? []).map(a => [Number(a.numero), a]));
  const zona = (formato: string, ubicacion: string): ZonaSegura | null => {
    const z = (p.zonasSeguras ?? []).find(
      f => String(f['Formato']).trim() === formato && String(f['Ubicación']).trim() === ubicacion
    );
    return z
      ? { superior: porcentaje(z['Superior']), inferior: porcentaje(z['Inferior']), lados: porcentaje(z['Cada lado']), restriccion: texto(z['Restricción']) }
      : null;
  };

  const formatos: FormatoPlaneado[] = [...grupos.values()].map(({ tipo, proporcion, filas, nombre: nombreDePieza }) => {
    const ubicaciones: UbicacionPlaneada[] = filas.map(f => {
      const formato = String(f['Formato']).trim();
      const nombre = String(f['Ubicación']).trim();
      const numeroAlerta = Number(texto(f['Alerta #'])) || null;
      const alerta = numeroAlerta ? alertas.get(numeroAlerta) : undefined;
      return {
        plataforma: String(f['Plataforma'] ?? '').trim(),
        nombre,
        proporcion: String(f['Relación de aspecto']).trim(),
        resolucion: texto(f['Resolución recomendada (px)']),
        detalles: Object.fromEntries(
          // Con la pieza explícita (Google, DV360) cada ubicación dice además su archivo y su peso: no siempre son
          // los de la pieza. Meta no los agrega, para que su biblioteca no cambie de versión.
          [...DETALLES, ...(texto(f['Pieza']) ? ([['Tipo de archivo', 'archivos'], ['Peso máximo', 'peso']] as const) : [])]
            .map(([col, k]) => [k, texto(f[col])])
            .filter(([, v]) => v)
        ) as Record<string, string>,
        zonaSegura: zona(formato, nombre),
        urlFuente: texto(f['URL fuente']),
        alerta: numeroAlerta,
        alertaTexto: alerta ? `${alerta.inconsistencia} · ${alerta.accion}` : null,
        porConfirmar: Boolean(numeroAlerta),
        campos: [
          ...CAMPOS.flatMap(c => {
            const l = largo(f[c.columna]);
            return l ? [{ clave: c.clave, nombre: c.nombre, zona: ZonaDeCampo.PLATAFORMA, ...l }] : [];
          }),
          ...textosEnColumna(f['Textos']),
          ...textosEnColumna(f['En la pieza'], ZonaDeCampo.PIEZA),
        ],
      };
    });
    // El lienzo de la pieza: la resolución recomendada más común; si todas son mínimas, la mínima.
    const todas = filas.map(f => medidas(texto(f['Resolución recomendada (px)']), proporcion)).filter(Boolean) as {
      ancho: number; alto: number; minima: boolean;
    }[];
    const lienzo = masComun(todas.filter(m => !m.minima).map(({ ancho, alto }) => ({ ancho, alto })))
      ?? masComun(todas.map(({ ancho, alto }) => ({ ancho, alto })));
    // La zona segura de la pieza es la más conservadora de sus ubicaciones (alerta 10: usar 20 %).
    const zonas = ubicaciones.map(u => u.zonaSegura).filter(Boolean) as ZonaSegura[];
    const max = (k: 'superior' | 'inferior' | 'lados') => {
      const v = zonas.map(z => z[k]).filter((x): x is number => x != null);
      return v.length ? Math.max(...v) : null;
    };
    return {
      nombre: nombreDePieza ?? `${tipo === 'IMAGEN' ? 'Imagen' : 'Video'} ${proporcion}`,
      tipoArchivo: tipo,
      proporcion,
      anchoPx: lienzo?.ancho ?? null,
      altoPx: lienzo?.alto ?? null,
      archivos: masComun(filas.map(f => texto(f['Tipo de archivo'])).filter(Boolean)) as string | null,
      pesoMaximo: masComun(filas.map(f => texto(f['Peso máximo'])).filter(Boolean)) as string | null,
      guia: { lienzo, zonaSegura: zonas.length ? { superior: max('superior'), inferior: max('inferior'), lados: max('lados') } : null },
      ubicaciones,
    };
  });
  return { formatos, errores };
};

// --------------------------------------------------------------------------------------------- planificar

/**
 * JSON con las claves ordenadas: la base guarda `jsonb`, que reordena las claves, y sin esto una carga
 * idéntica parecía un cambio y creaba una versión nueva.
 */
const canonico = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canonico)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.keys(v as object)
            .sort()
            .filter(k => (v as Record<string, unknown>)[k] !== undefined)
            .map(k => [k, canonico((v as Record<string, unknown>)[k])])
        )
      : v;

/** Lo que define una versión, sin la fuente ni la fecha: si solo cambió la fecha, no hay versión nueva. */
const huella = (f: Omit<FormatoPlaneado, 'nombre' | 'tipoArchivo' | 'proporcion'>) =>
  JSON.stringify(
    canonico({ anchoPx: f.anchoPx, altoPx: f.altoPx, archivos: f.archivos, pesoMaximo: f.pesoMaximo, guia: f.guia, ubicaciones: f.ubicaciones })
  );

const INCLUDE_VERSION = {
  ubicaciones: { orderBy: { orden: 'asc' as const }, include: { campos: { orderBy: { orden: 'asc' as const } } } },
} satisfies Prisma.FormatoVersionInclude;

type VersionGuardada = Prisma.FormatoVersionGetPayload<{ include: typeof INCLUDE_VERSION }>;

const desdeLaBase = (v: VersionGuardada) =>
  huella({
    anchoPx: v.anchoPx,
    altoPx: v.altoPx,
    archivos: v.archivos,
    pesoMaximo: v.pesoMaximo,
    guia: v.guia as FormatoPlaneado['guia'],
    ubicaciones: v.ubicaciones.map(ubicacionDesdeLaBase),
  });

/** Una ubicación guardada, como la deja `leerPlanilla`: para comparar versiones y heredar la revisión. */
const ubicacionDesdeLaBase = (u: VersionGuardada['ubicaciones'][number]): UbicacionPlaneada => ({
      plataforma: u.plataforma,
      nombre: u.nombre,
      proporcion: u.proporcion,
      resolucion: u.resolucion,
      detalles: (u.detalles ?? {}) as Record<string, string>,
      zonaSegura: (u.zonaSegura ?? null) as ZonaSegura | null,
      urlFuente: u.urlFuente,
      alerta: u.alerta,
      alertaTexto: u.alertaTexto,
      porConfirmar: u.porConfirmar,
      // En el orden en que se guardaron, con las repeticiones solo cuando son más de una: igual que al leer.
      campos: [...u.campos]
        .sort((a, b) => a.orden - b.orden)
        .map(x => ({ clave: x.clave, nombre: x.nombre, zona: x.zona, minimo: x.minimo, maximo: x.maximo, ...(x.repeticiones > 1 ? { repeticiones: x.repeticiones } : {}) })),
});
const huellaDeUbicacion = (u: UbicacionPlaneada) => JSON.stringify(canonico(u));

type Db = Prisma.TransactionClient | typeof prisma;

const planificarCon = async (db: Db, workspaceId: string, p: PlanillaDeMedio, leida = leerPlanilla(p)) => {
  const medio = await db.medio.findUnique({ where: { workspaceId_nombre: { workspaceId, nombre: p.medio } } });
  const ubicaciones = leida.formatos.flatMap(f => f.ubicaciones.map(() => f.tipoArchivo));
  const plan: PlanDeCarga = {
    medio: { nombre: p.medio, nuevo: !medio, clase: medio?.clase ?? p.clase ?? ClaseDeMedio.PAGOS },
    formatos: [],
    leidas: { imagen: ubicaciones.filter(t => t === 'IMAGEN').length, video: ubicaciones.filter(t => t === 'VIDEO').length },
    alertas: (p.alertas ?? []).map(a => ({ numero: Number(a.numero), ubicacion: `${a.formato} · ${a.ubicacion}`, inconsistencia: a.inconsistencia, accion: a.accion })),
    errores: leida.errores,
  };
  for (const f of leida.formatos) {
    const formato = medio
      ? await db.formato.findUnique({
          where: { medioId_nombre: { medioId: medio.id, nombre: f.nombre } },
          include: { versiones: { orderBy: { numero: 'desc' }, take: 1, include: INCLUDE_VERSION } },
        })
      : null;
    const ultima = formato?.versiones[0];
    const accion = !ultima ? 'nuevo' : desdeLaBase(ultima) === huella(f) ? 'igual' : 'version';
    const principal = f.ubicaciones.flatMap(u => u.campos.filter(c => c.clave === 'textoPrincipal').map(c => c.maximo)).filter((x): x is number => x != null);
    plan.formatos.push({
      nombre: f.nombre,
      ubicaciones: f.ubicaciones.length,
      accion,
      version: accion === 'igual' ? ultima!.numero : (ultima?.numero ?? 0) + 1,
      porConfirmar: f.ubicaciones.filter(u => u.porConfirmar).length,
      textoPrincipal: principal.length ? { desde: Math.min(...principal), hasta: Math.max(...principal) } : null,
    });
  }
  return { plan, leida, medio };
};

/** En seco: qué haría la carga. No escribe nada. */
export const planificarCarga = async (workspaceId: string, p: PlanillaDeMedio) => (await planificarCon(prisma, workspaceId, p)).plan;

/**
 * Escribe la carga en una transacción: el medio (en borrador si es nuevo), cada pieza nueva o cambiada con
 * su versión, y el registro de la carga. Lo que tiene errores no se carga; lo igual no crea versión.
 */
export const aplicarCarga = async (workspaceId: string, p: PlanillaDeMedio, autorId: string | null): Promise<PlanDeCarga> =>
  prisma.$transaction(async tx => {
    const { plan, leida } = await planificarCon(tx, workspaceId, p);
    const canalDe = (f: FormatoPlaneado) => (f.ubicaciones.some(u => u.campos.length) ? (p.canal ?? Platform.META_ADS) : null);
    const medio = await tx.medio.upsert({
      where: { workspaceId_nombre: { workspaceId, nombre: p.medio } },
      create: { workspaceId, nombre: p.medio, clase: p.clase ?? ClaseDeMedio.PAGOS },
      update: {},
    });
    const carga = await tx.cargaDePlanilla.create({
      data: { workspaceId, archivo: p.fuente, medio: p.medio, resumen: plan as unknown as Prisma.InputJsonValue, autorId },
    });
    for (const f of leida.formatos) {
      const paso = plan.formatos.find(x => x.nombre === f.nombre)!;
      if (paso.accion === 'igual') continue;
      const formato = await tx.formato.upsert({
        where: { medioId_nombre: { medioId: medio.id, nombre: f.nombre } },
        // Los textos de plataforma de la pieza los escribe el canal de la planilla (Meta Ads si no dice; F4,
        // 2026-11-23). Una pieza sin textos (un logo, un banner) no lleva canal. Un formato con canal lo conserva.
        create: { workspaceId, medioId: medio.id, nombre: f.nombre, tipoArchivo: f.tipoArchivo, proporcion: f.proporcion || null, canal: canalDe(f) },
        update: {},
      });
      if (!formato.canal && canalDe(f)) await tx.formato.update({ where: { id: formato.id }, data: { canal: canalDe(f) } });
      // Lo que el equipo ya revisó y no cambió conserva su revisión en la versión nueva.
      const anterior = await tx.formatoVersion.findFirst({ where: { formatoId: formato.id }, orderBy: { numero: 'desc' }, include: INCLUDE_VERSION });
      const revisadas = new Map(
        (anterior?.ubicaciones ?? []).filter(u => u.revision).map(u => [huellaDeUbicacion(ubicacionDesdeLaBase(u)), u])
      );
      const version = await tx.formatoVersion.create({
        data: {
          formatoId: formato.id,
          numero: paso.version,
          anchoPx: f.anchoPx,
          altoPx: f.altoPx,
          archivos: f.archivos,
          pesoMaximo: f.pesoMaximo,
          guia: f.guia as unknown as Prisma.InputJsonValue,
          fuente: p.fuente,
          fuenteFecha: new Date(`${p.fecha}T00:00:00Z`),
          cargaId: carga.id,
        },
      });
      for (const [orden, u] of f.ubicaciones.entries()) {
        const ubicacion = await tx.ubicacion.create({
          data: {
            formatoVersionId: version.id,
            plataforma: u.plataforma,
            nombre: u.nombre,
            orden,
            proporcion: u.proporcion,
            resolucion: u.resolucion,
            detalles: u.detalles,
            zonaSegura: u.zonaSegura ? (u.zonaSegura as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
            urlFuente: u.urlFuente,
            alerta: u.alerta,
            alertaTexto: u.alertaTexto,
            porConfirmar: u.porConfirmar,
            ...(() => {
              const r = revisadas.get(huellaDeUbicacion(u));
              return r ? { revision: r.revision, revisionNota: r.revisionNota, revisadaPorId: r.revisadaPorId, revisadaEn: r.revisadaEn } : {};
            })(),
          },
        });
        if (u.campos.length) {
          await tx.campoDeTexto.createMany({
            data: u.campos.map((c, orden) => ({ formatoVersionId: version.id, ubicacionId: ubicacion.id, ...c, orden })),
          });
        }
      }
    }
    return plan;
  });
