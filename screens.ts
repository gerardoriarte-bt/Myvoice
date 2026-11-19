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
  FingerprintPattern,
  Gauge,
  Inbox,
  Map as MapIcon,
  History,
  LayoutGrid,
  Library,
  Megaphone,
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
  | 'help'
  | 'novedades'
  | 'control'
  | 'panorama'
  | 'loMio'
  | 'adn';

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
  /** Solo visible para el super admin (decisión 27), que está por encima de los workspaces. */
  superAdmin?: boolean;
  /**
   * El nombre con la plataforma por procesos, cuando cambia (diseño del 2026-11-17): dentro del paso My Voice,
   * «Generar» es lo suelto y «Revisiones» es lo que está con el cliente. El marco de hoy sigue con `name`.
   */
  nombrePorProcesos?: string;
  /** Existe solo con la plataforma por procesos: el marco de hoy no la muestra. */
  soloPorProcesos?: boolean;
}

/** El nombre que muestra cada marco. */
export const nombreEn = (pantalla: ScreenDef, porProcesos: boolean) =>
  (porProcesos && pantalla.nombrePorProcesos) || pantalla.name;

/** Si alguien ve una pantalla en el menú. El servidor vuelve a decidirlo en cada ruta. */
export const puedeVer = (pantalla: ScreenDef, quien: { administra: boolean; superAdmin: boolean; porProcesos: boolean }) =>
  (!pantalla.adminOnly || quien.administra) &&
  (!pantalla.superAdmin || quien.superAdmin) &&
  (!pantalla.soloPorProcesos || quien.porProcesos);

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
    nombrePorProcesos: 'Generar suelto',
    description: 'Elige marca, campaña y canales. El motor arma el concepto y escribe cada canal.',
    icon: Sparkles,
    stage: 'escribir',
    adminOnly: true,
  },
  saved: {
    id: 'saved',
    /**
     * Fue «Biblioteca» (sonaba a archivo) y después «Copy aprobado», que
     * mentía al revés: mostraba también lo pendiente. Desde el 2026-10-13 es
     * el recorrido entero del copy de una marca —por aprobar, con el cliente,
     * aprobado, en producción—, así que el nombre es lo que contiene.
     */
    name: 'Copy',
    description: 'El copy de la marca y en qué paso va: por aprobar, con el cliente, aprobado, en producción.',
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
    nombrePorProcesos: 'Con el cliente',
    description: 'Lo que se le mandó al cliente y lo que respondió.',
    icon: ClipboardCheck,
    stage: 'aprobar',
    adminOnly: true,
  },
  analytics: {
    id: 'analytics',
    name: 'Métricas',
    // Sin costo desde la decisión 27: el gasto de IA es del super admin, en Control.
    description: 'Tasa de aprobación y rechazos del workspace.',
    icon: BarChart3,
    stage: 'medir',
    adminOnly: true,
  },
  produccion: {
    id: 'produccion',
    name: 'Producción',
    nombrePorProcesos: 'Por marca',
    description: 'Las piezas de la marca, quién las mueve y en qué paso van.',
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
  /**
   * Fuera de NAV_STAGES a propósito: no es un paso del proceso. Se llega por un
   * enlace chico al pie de la barra lateral. El registro vive en `novedades.ts`.
   */
  /**
   * Del super admin (decisión 27): los interruptores de cada workspace, los usuarios de todas las empresas
   * y el gasto de IA. Es la única pantalla que muestra costos.
   */
  control: {
    id: 'control',
    name: 'Control',
    description: 'Todos los workspaces: su interruptor, su gente y lo que gastan en IA.',
    icon: Gauge,
    stage: 'administrar',
    // No depende del rol en el workspace activo: el super admin puede ser MEMBER donde está parado.
    adminOnly: false,
    superAdmin: true,
  },
  /**
   * El ADN de la marca activa, para todos (F1b): lo edita quien tiene Estrategia en la marca o un admin; el
   * resto lo lee. Es la entrada de Estrategia. «Marcas» sigue siendo de quien administra.
   */
  adn: {
    id: 'adn',
    name: 'ADN',
    description: 'Qué dice la marca, cómo suena y qué no se toca: lo que el motor lee al escribir.',
    icon: FingerprintPattern,
    stage: 'preparar',
    adminOnly: false,
    soloPorProcesos: true,
  },
  /**
   * Las piezas que esperan algo de quien mira, de todas las marcas: la entrada de Diseño con la plataforma
   * por procesos (D1). Es la vista «Lo mío» del tablero de Producción, con su propia entrada en el menú.
   */
  loMio: {
    id: 'loMio',
    name: 'Lo mío',
    description: 'Las piezas que esperan algo de ti, de todas las marcas.',
    icon: Inbox,
    stage: 'producir',
    adminOnly: false,
    soloPorProcesos: true,
  },
  /**
   * La entrada de quien administra con la plataforma por procesos (decisión 24): todas las campañas en curso
   * de todas las marcas, en qué paso va cada una y qué espera a quién.
   */
  panorama: {
    id: 'panorama',
    name: 'Panorama',
    description: 'Todas las campañas en curso, en qué paso va cada una y qué está esperando a quién.',
    icon: MapIcon,
    stage: 'administrar',
    adminOnly: true,
    soloPorProcesos: true,
  },
  novedades: {
    id: 'novedades',
    name: 'Novedades',
    description: 'Lo que cambió en My Voice, de lo más reciente a lo más viejo.',
    icon: Megaphone,
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
  { id: 'administrar', label: 'Administrar', screens: ['users', 'settings', 'help', 'control'] },
];

/** Atajo para los componentes: `screenName('saved')` en vez de repetir el string. */
export const screenName = (id: ScreenId): string => SCREENS[id].name;
