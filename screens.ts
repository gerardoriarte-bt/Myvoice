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
  | 'users'
  | 'settings'
  | 'help';

export type StageId = 'preparar' | 'producir' | 'aprobar' | 'administrar';

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
    stage: 'producir',
    adminOnly: true,
  },
  saved: {
    id: 'saved',
    name: 'Biblioteca',
    description: 'Contenido guardado por proyecto y marca.',
    icon: Library,
    stage: 'producir',
    adminOnly: false,
  },
  history: {
    id: 'history',
    name: 'Historial',
    description: 'Cada corrida del motor, con su concepto, su costo y su modelo.',
    icon: History,
    stage: 'producir',
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
    stage: 'aprobar',
    adminOnly: true,
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
export const NAV_STAGES: { id: StageId; label: string; screens: ScreenId[] }[] = [
  { id: 'preparar', label: 'Preparar', screens: ['clients'] },
  { id: 'producir', label: 'Producir', screens: ['generator', 'saved', 'history'] },
  { id: 'aprobar', label: 'Aprobar y medir', screens: ['collaboration', 'analytics'] },
  { id: 'administrar', label: 'Administrar', screens: ['users', 'settings', 'help'] },
];

/** Atajo para los componentes: `screenName('saved')` en vez de repetir el string. */
export const screenName = (id: ScreenId): string => SCREENS[id].name;
