/**
 * Las novedades del producto: lo que cambió, cuándo y por qué.
 *
 * Es el único lugar donde se escriben. Alimenta dos cosas:
 *
 * - la pantalla «Novedades», el registro completo, de lo más reciente a lo más
 *   viejo. No está en el menú por etapas porque no es un paso del proceso: se
 *   llega por un enlace chico al pie de la barra lateral;
 * - el aviso al iniciar sesión, solo para las entradas con `aviso`. Cada
 *   persona lo ve una vez (lo visto se guarda en `User.novedadesVistas`) y solo
 *   si ya usaba la herramienta antes de esa fecha: a quien llega después,
 *   «ahora cambió» no le dice nada.
 *
 * Una entrada por cambio que alguien note al usar la herramienta. Lo interno
 * —migraciones, scripts, refactors— no va: para eso están los commits.
 * El `id` no se cambia una vez publicado: es lo que se guarda como visto.
 */

import type { ScreenId } from './screens';

export interface PasoDelAviso {
  /** Título del recuadro de pasos. */
  titulo: string;
  pasos: string[];
  /** El botón principal: lleva a donde se hace lo que pide. */
  accion: { label: string; pantalla: ScreenId };
}

export interface Novedad {
  id: string;
  /** ISO, YYYY-MM-DD. El día en que llegó a producción. */
  fecha: string;
  titulo: string;
  /** Lo que se ve en la pantalla Novedades: corto, en lo que la persona nota. */
  cambios: string[];
  /** Si existe, la novedad se avisa al iniciar sesión. */
  aviso?: {
    porQue: string;
    /** Para quien administra el workspace (OWNER o ADMIN). */
    paraQuienAdministra: PasoDelAviso;
    /** Para el resto del equipo. */
    paraElEquipo: PasoDelAviso;
    tambien: string[];
    /** La sección de la Guía donde está el detalle. */
    guia?: string;
  };
}

export const NOVEDADES: Novedad[] = [
  {
    id: 'marcas-relacionadas',
    fecha: '2026-10-26',
    titulo: 'Marcas relacionadas, y el nombre repetido se nota',
    cambios: [
      'Una marca puede ser parte de otra: «Terpel CRM» aparece debajo de Terpel en el selector y en Marcas. Solo ordena; cada marca sigue con su ADN y sus campañas.',
      'Si dos marcas se llaman igual, el selector lo avisa y dice qué distingue a cada una. Se resuelve en Marcas, renombrando una o haciéndola parte de la otra.',
      'Al crear una marca con un nombre que ya existe, la herramienta lo avisa antes de guardar.',
    ],
  },
  {
    id: 'produccion-con-responsable',
    fecha: '2026-10-13',
    titulo: 'Producción: cada pieza la aprueba el responsable de su campaña',
    cambios: [
      'Acepta o devuelve una pieza el responsable de la campaña, y nunca quien la entregó. Los demás ven quién lo hace.',
      'Nueva columna «Con el cliente»: si la campaña es del cliente, la pieza aceptada lo espera ahí. Lista vuelve a ser el final.',
      'La pieza llega a revisión con la verificación terminada, y la tarjeta dice si fue devuelta, por quién y por qué.',
      'Un cambio de mensaje ya no deja la pieza varada: el responsable corrige el copy dentro de la pieza.',
      '«Mis piezas» ahora es «Lo mío»: suma lo que espera tu visto bueno.',
    ],
    aviso: {
      porQue:
        'Hasta ahora cualquiera del equipo podía aceptar una pieza, incluso quien la había diseñado, y la aprobación del cliente sobre el arte era un interruptor suelto. Ahora la pieza sigue la misma regla que el copy: la aprueba el responsable de su campaña, y el cliente la ve si la campaña es del cliente.',
      paraQuienAdministra: {
        titulo: 'Lo que cambia para quien administra',
        pasos: [
          'Revisá que cada campaña con piezas en curso tenga responsable: sin él, nadie puede aceptarlas.',
          'Si el responsable es también quien diseña, nombrá a otra persona: nadie acepta lo que entregó.',
          'Las piezas de campañas del cliente que ya estaban enviadas pasaron a «Con el cliente».',
        ],
        accion: { label: 'Ir a Producción', pantalla: 'produccion' },
      },
      paraElEquipo: {
        titulo: 'Qué cambia para vos',
        pasos: [
          'Si diseñás: lo devuelto aparece primero en «Lo mío», con el motivo, y te llega un aviso.',
          'Si sos responsable de una campaña: aceptás, devolvés y corregís el copy de sus piezas.',
          'Si no te toca decidir, la tarjeta te dice quién lo hace en lugar de los botones.',
        ],
        accion: { label: 'Ver lo mío', pantalla: 'produccion' },
      },
      tambien: [
        'El cliente tiene que escribir qué cambiar cuando pide cambios.',
        'Revisiones ya no se rompe al abrir una revisión de piezas respondida.',
      ],
      guia: 'Producción',
    },
  },
  {
    id: 'aprobacion-por-campana',
    fecha: '2026-10-13',
    titulo: 'La aprobación ahora es por campaña, y siempre tiene un responsable',
    cambios: [
      'Cada campaña dice quién aprueba —el equipo o el cliente— y quién es el responsable. Nada se produce sin esa aprobación.',
      'La marca se elige una sola vez, arriba, y vale para todas las pantallas.',
      '«Copy aprobado» ahora se llama «Copy» y muestra en qué paso va cada texto.',
      'Al cliente se le envía desde Copy; Revisiones sigue sus respuestas.',
    ],
    aviso: {
      porQue:
        'Hasta ahora un copy podía llegar a producción sin que nadie respondiera por él, y si el cliente lo rechazaba, la aprobación interna seguía en pie. Ahora cada campaña dice quién aprueba —el equipo o el cliente— y quién es el responsable. Nada se produce sin esa aprobación.',
      paraQuienAdministra: {
        titulo: 'Lo que te toca antes de que el copy avance',
        pasos: [
          'En Copy, elegí cada campaña y nombrá su responsable. Sin responsable, el copy se guarda pero no avanza: nadie puede aprobarlo.',
          'Definí si la aprueba el equipo o el cliente. Si es el cliente, el responsable es quien le manda el enlace.',
          'El copy aprobado que no tenía campaña aparece en «Sin campaña»: asignale una y aprobalo de nuevo.',
        ],
        accion: { label: 'Ir a nombrar responsables', pantalla: 'saved' },
      },
      paraElEquipo: {
        titulo: 'Qué cambia para vos',
        pasos: [
          'Si sos responsable de una campaña, en Copy vas a ver «Aprobar» o «Enviar al cliente» sobre su copy.',
          'Si no lo sos, el copy espera a quien responde: cada campaña dice quién es.',
          'Si una campaña no tiene responsable, su copy no avanza: avisale a quien administra para que lo nombre.',
        ],
        accion: { label: 'Ver Copy', pantalla: 'saved' },
      },
      tambien: [
        'La marca se elige una sola vez, arriba, y vale para todas las pantallas.',
        '«Copy aprobado» ahora se llama «Copy» y muestra en qué paso va cada texto.',
        'Al cliente se le envía desde Copy; Revisiones sigue sus respuestas.',
      ],
      guia: 'Copy',
    },
  },
  {
    id: 'revisiones-de-piezas',
    fecha: '2026-10-13',
    titulo: 'Corregido: Revisiones con piezas respondidas',
    cambios: [
      'Abrir una revisión de piezas que el cliente ya respondió rompía la pantalla. Ahora muestra qué aprobó, qué pidió cambiar y si el comentario es del mensaje o del arte.',
    ],
  },
  {
    id: 'campana-en-su-marca',
    fecha: '2026-10-13',
    titulo: 'Corregido: campañas que caían en otra marca',
    cambios: ['Una campaña creada desde Marcas podía quedar guardada en la primera marca de la lista. Ahora queda en la marca donde se creó.'],
  },
  {
    id: 'cliente-aprueba-la-pieza',
    fecha: '2026-09-26',
    titulo: 'El cliente aprueba también la pieza terminada',
    cambios: [
      'Una segunda revisión, sobre el arte final, con los comentarios de copy y de diseño por separado.',
      'El camino del copy a la pieza quedó a la vista, y el menú se reordenó en el orden en que ocurre el trabajo.',
      'Cada enlace de revisión es de una sola marca, y la marca se ve al actuar.',
    ],
  },
  {
    id: 'funciones-y-notificaciones',
    fecha: '2026-09-23',
    titulo: 'Funciones del equipo y notificaciones',
    cambios: [
      'Cada persona puede tener funciones —Copy, Diseño, Aprobación—, también por marca.',
      'La campana, arriba a la derecha, avisa lo que te toca.',
    ],
  },
  {
    id: 'varias-empresas',
    fecha: '2026-08-28',
    titulo: 'Varias empresas en una misma herramienta',
    cambios: [
      'Cada empresa tiene su espacio, su equipo y sus marcas, sin ver las de las demás.',
      'Invitaciones para sumar gente al equipo, y un selector para quien trabaja con varias empresas.',
      'El menú se ordena por etapas del trabajo, y cada pantalla tiene un solo nombre.',
    ],
  },
];

/** La novedad a avisar: la más reciente con aviso, que no vio y posterior a su alta. */
export const novedadPendiente = (vistas: string[] = [], altaISO?: string): Novedad | null => {
  const alta = altaISO ? altaISO.slice(0, 10) : null;
  return (
    NOVEDADES.find(n => n.aviso && !vistas.includes(n.id) && (!alta || alta < n.fecha)) ?? null
  );
};

/** «14 oct 2026». */
export const fechaCorta = (iso: string): string =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
