/**
 * Diccionario de pantallas: el nombre, el icono y la etapa de cada una.
 *
 * Existe por un motivo concreto: hasta acá el ítem del menú y el título de la
 * pantalla se escribían por separado, y cinco de nueve terminaron diciendo
 * cosas distintas — «Brand Voice» en el menú contra «Clientes» adentro, dos
 * nombres que además apuntan a conceptos diferentes. Ver
 * `docs/oraculo-diseno.md`, F1 y F2.
 *
 * La regla: **el nombre vive acá y en ningún otro lado**. Un componente que
 * escriba su propio título vuelve a abrir el problema.
 *
 * Las etapas ordenan la navegación como el proceso que el producto ya ejecuta
 * —preparar la marca, producir el copy, aprobarlo con el cliente, medir— en vez
 * de como una lista plana de nueve pestañas.
 */

import {
  BarChart3,
  BookOpen,
  Building2,
  ClipboardCheck,
  History,
  LayoutGrid,
  Library,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';

export type ScreenId =
  | 'clients'
  | 'generator'
  | 'saved'
  | 'analytics'
  | 'history'
  | 'collaboration'
  | 'produccion'
  | 'users'
  | 'settings'
  | 'help';

/**
 * Cinco etapas, no cuatro: cuando entra la pieza, «producir» dejaba de
 * distinguir dos cosas distintas —producir el copy y producir el arte— con el
 * mismo nombre. El copy se ESCRIBE; la pieza se PRODUCE. Auditar es una etapa
 * del proceso pero no un destino del menú: su informe se abre desde la tarjeta.
 */
export type StageId = 'preparar' | 'escribir' | 'aprobar' | 'producir' | 'medir' | 'administrar';

export interface ScreenDef {
  id: ScreenId;
  /** El nombre. Alimenta el ítem del menú Y el título de la pantalla. */
  name: string;
  /** Bajada del título. Una línea, en el mismo tono que el resto del producto. */
  description: string;
  icon: typeof Building2;
  stage: StageId;
  /** Solo visible para quien administra el workspace (OWNER o ADMIN). */
  adminOnly: boolean;
}

export const SCREENS: Record<ScreenId, ScreenDef> = {
  clients: {
    id: 'clients',
    name: 'Marcas',
    description: 'El ADN de cada marca: voz, propuesta de valor, prohibiciones y ejemplos aprobados.',
    icon: Building2,
    stage: 'preparar',
    adminOnly: true,
  },
  generator: {
    id: 'generator',
    name: 'Generar',
    description: 'Elegí marca, campaña y canales. El motor arma el concepto y escribe cada canal.',
    icon: Sparkles,
    stage: 'escribir',
    adminOnly: true,
  },
  saved: {
    id: 'saved',
    /**
     * Se llamaba «Biblioteca» y el nombre trabajaba en contra: sonaba a archivo
     * donde se guardan cosas, cuando es el paso donde el copy avanza — se
     * elige, se aprueba, y de acá sale hacia el cliente o hacia producción.
     * El nombre nuevo dice exactamente qué sale de acá.
     */
    name: 'Copy aprobado',
    description: 'Lo que pasó el filtro, listo para el cliente o para producir.',
    icon: Library,
    stage: 'aprobar',
    adminOnly: false,
  },
  history: {
    id: 'history',
    name: 'Historial',
    description: 'Cada corrida del motor, con su concepto, su costo y su modelo.',
    icon: History,
    stage: 'escribir',
    adminOnly: true,
  },
  collaboration: {
    id: 'collaboration',
    name: 'Revisiones',
    description: 'Enviá piezas a revisión del cliente y seguí sus decisiones.',
    icon: ClipboardCheck,
    stage: 'aprobar',
    adminOnly: true,
  },
  analytics: {
    id: 'analytics',
    name: 'Métricas',
    description: 'Consumo, costo y tasa de aprobación del workspace.',
    icon: BarChart3,
    stage: 'medir',
    adminOnly: true,
  },
  produccion: {
    id: 'produccion',
    name: 'Producción',
    description: 'Las piezas aprobadas, de quién es cada una y en qué va.',
    icon: LayoutGrid,
    stage: 'producir',
    // La primera pantalla de trabajo que ve alguien que no administra: un
    // diseñador es MEMBER y hasta acá solo tenía el copy aprobado.
    adminOnly: false,
  },
  users: {
    id: 'users',
    name: 'Equipo',
    description: 'Quién entra a este workspace y con qué rol.',
    icon: Users,
    stage: 'administrar',
    adminOnly: true,
  },
  settings: {
    id: 'settings',
    name: 'Configuración',
    description: 'Proveedor de IA, modelos y credenciales de este workspace.',
    icon: Settings,
    stage: 'administrar',
    adminOnly: true,
  },
  help: {
    id: 'help',
    name: 'Guía',
    description: 'Cómo funciona el motor y qué hace cada pantalla.',
    icon: BookOpen,
    stage: 'administrar',
    adminOnly: false,
  },
};

/**
 * Orden de la navegación. Las etapas se numeran en la interfaz: el menú cuenta
 * la secuencia del trabajo, no el orden en que se fueron construyendo las
 * pantallas.
 */
/**
 * Las etapas, en el orden en que ocurren.
 *
 * Hasta el 2026-09-26 no era así: «Revisiones» vivía en la etapa 4 y ocurre
 * ANTES que Producción, que era la 3. El menú numeraba las etapas —eso estaba
 * bien— pero los números no seguían el proceso, y eso hace que la numeración
 * trabaje en contra: promete un orden y enseña otro.
 *
 * Aprobar quedó como una etapa propia con las dos aprobaciones adentro: la
 * interna, donde se elige el copy que sirve, y la del cliente.
 */
export const NAV_STAGES: { id: StageId; label: string; screens: ScreenId[] }[] = [
  { id: 'preparar', label: 'Preparar', screens: ['clients'] },
  { id: 'escribir', label: 'Escribir', screens: ['generator', 'history'] },
  { id: 'aprobar', label: 'Aprobar', screens: ['saved', 'collaboration'] },
  { id: 'producir', label: 'Producir', screens: ['produccion'] },
  { id: 'medir', label: 'Medir', screens: ['analytics'] },
  { id: 'administrar', label: 'Administrar', screens: ['users', 'settings', 'help'] },
];

/** Atajo para los componentes: `screenName('saved')` en vez de repetir el string. */
export const screenName = (id: ScreenId): string => SCREENS[id].name;
