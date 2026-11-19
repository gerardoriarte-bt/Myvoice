/**
 * Las rutas de la plataforma por procesos (F0, docs/plan-plataforma-por-procesos.md). Solo se usan con
 * `plataformaPorProcesos` encendido: apagado, la app sigue sin rutas, como hoy.
 *
 * No hay librería de rutas: son once pantallas y una campaña en el camino, y el servidor (nginx y Vite)
 * ya devuelve `index.html` para cualquier ruta. La campaña vive en la ruta (`/campana/:id/…`) y no en
 * `localStorage` como la marca: dos pestañas pueden estar en campañas distintas, y un aviso abre la suya.
 *
 * Los nombres de las pantallas siguen viviendo en `screens.ts`; acá solo dónde está cada una.
 */

import type { ScreenId } from '../../screens';
import type { FuncionEquipo, User } from '../../types';

export const RUTAS: Record<ScreenId, string> = {
  clients: '/marca',
  saved: '/myvoice/copy',
  generator: '/myvoice/generar',
  collaboration: '/myvoice/con-el-cliente',
  history: '/myvoice/historial',
  analytics: '/myvoice/metricas',
  produccion: '/produccion',
  users: '/cuenta/equipo',
  settings: '/cuenta/configuracion',
  help: '/guia',
  novedades: '/novedades',
  control: '/control',
  panorama: '/panorama',
  loMio: '/produccion/lo-mio',
  adn: '/marca/adn',
};

export interface Ubicacion {
  pantalla: ScreenId | null;
  campanaId: string | null;
}

const CON_CAMPANA = /^\/campana\/([^/]+)(\/.*)?$/;

export const leerRuta = (pathname: string): Ubicacion => {
  const m = CON_CAMPANA.exec(pathname);
  const campanaId = m ? decodeURIComponent(m[1]) : null;
  const resto = (m ? m[2] ?? '' : pathname).replace(/\/+$/, '');
  const pantalla = (Object.keys(RUTAS) as ScreenId[]).find(id => RUTAS[id] === resto) ?? null;
  return { pantalla, campanaId };
};

export const armarRuta = ({ pantalla, campanaId }: { pantalla: ScreenId; campanaId: string | null }): string =>
  (campanaId ? `/campana/${encodeURIComponent(campanaId)}` : '') + RUTAS[pantalla];

/**
 * Los pasos del encabezado y el menú de cada uno. CDM (②) e Implementación (⑤) se suman cuando existan:
 * un paso que no se puede abrir no se muestra. Se numeran en el orden en que se ven, para que los números
 * sigan siendo el orden del trabajo.
 */
export type PasoId = 'marca' | 'myvoice' | 'produccion';

export interface PasoDef {
  id: PasoId;
  nombre: string;
  /** Lo que se hace en el paso, en la cabecera de su menú: «MY VOICE · COPY». */
  tema: string;
  color: string;
  grupos: { titulo: string; pantallas: ScreenId[] }[];
  /** El paso de trabajo del servidor (`comun/permisos.ts`) y la función que actúa en él (F1). */
  trabajo: NonNullable<User['entorno']>;
  funcion: FuncionEquipo;
}

export const PASOS: PasoDef[] = [
  { id: 'marca', nombre: 'Marca', tema: 'ADN', color: '#1D1D1F', grupos: [{ titulo: 'Trabajo', pantallas: ['adn', 'clients'] }], trabajo: 'ADN', funcion: 'ESTRATEGIA' },
  {
    id: 'myvoice',
    nombre: 'My Voice',
    tema: 'Copy',
    color: '#6D28D9',
    grupos: [
      { titulo: 'Trabajo', pantallas: ['saved', 'generator', 'collaboration'] },
      { titulo: 'Seguimiento', pantallas: ['history', 'analytics'] },
    ],
    trabajo: 'COPY',
    funcion: 'COPY',
  },
  { id: 'produccion', nombre: 'Producción', tema: 'Piezas', color: '#B45309', grupos: [{ titulo: 'Trabajo', pantallas: ['loMio', 'produccion'] }], trabajo: 'PRODUCCION', funcion: 'DISENO' },
];

/** El paso de una pantalla; las de la cuenta (Equipo, Configuración, Guía, Novedades) no son de ninguno. */
export const pasoDe = (pantalla: ScreenId): PasoDef | null =>
  PASOS.find(p => p.grupos.some(g => g.pantallas.includes(pantalla))) ?? null;

/**
 * Si la persona ACTÚA en un paso (F1, decisión 22): admin, o tiene la función del paso en esa marca o en
 * todas. Es lo que el servidor decide en `comun/permisos.ts`; acá solo elige si se muestra la franja de
 * lectura. Ver, ve todos los pasos.
 */
export const actuaEn = (usuario: User, administra: boolean, paso: PasoDef, marcaId: string) =>
  administra || (usuario.funciones ?? []).some(f => f.funcion === paso.funcion && (!f.clientId || f.clientId === marcaId));

/** Donde entra cada persona con la plataforma por procesos: la primera pantalla visible de su paso. */
export const pantallaDeEntrada = (
  usuario: User,
  administra: boolean,
  visible: (id: ScreenId) => boolean
): ScreenId => {
  const paso = PASOS.find(p => p.trabajo === usuario.entorno);
  const suya = paso?.grupos.flatMap(g => g.pantallas).find(visible);
  if (suya) return suya;
  return administra ? 'panorama' : 'loMio';
};
