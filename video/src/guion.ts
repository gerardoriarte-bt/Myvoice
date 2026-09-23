/**
 * El guión, en un solo lugar.
 *
 * Las duraciones viven acá y en ningún otro lado: ajustar el ritmo con la
 * música tiene que ser cambiar números en esta lista, no tocar diecinueve
 * componentes. Es la única decisión de arquitectura que importa en este
 * proyecto, porque el montaje final se hace moviendo cortes al beat.
 *
 * Texto completo y razones de cada plano: docs/guion-reel-1min.md
 */

export const FPS = 30;
export const ANCHO = 1920;
export const ALTO = 1080;

export const COLORES = {
  tinta: '#1D1D1F',
  grisTexto: '#6E6E73',
  fondoClaro: '#F5F5F7',
  blanco: '#FFFFFF',
  azul: '#0071E3',
  ambar: '#B45309',
  ambarSuave: '#FFFBEB',
  verde: '#047857',
} as const;

/** Un punto de la captura, en coordenadas relativas (0-1), al que mirar. */
export interface Foco {
  x: number;
  y: number;
  /** 1 = la captura entera; 2 = el doble de zoom sobre ese punto. */
  zoom: number;
}

export type Plano =
  | {
      tipo: 'titular';
      duracion: number;
      /** Las líneas ya dichas, que quedan apiladas arriba en gris. */
      anteriores: string[];
      linea: string;
      /** El flash a blanco del final del bloque 1. */
      flashFinal?: boolean;
    }
  | {
      tipo: 'pantalla';
      duracion: number;
      imagen: string;
      /** Dos palabras en versalitas: la entrada de lectura del bloque. */
      rotulo: string;
      texto: string;
      subtexto?: string;
      fondo: string;
      /** De dónde a dónde mira la cámara: eso es todo el movimiento del plano. */
      desde: Foco;
      hasta: Foco;
      /**
   * Recuadro que señala una zona, en coordenadas **del cuadro**, no de la
   * captura: por eso el plano que lo usa no mueve la cámara. Si la cámara se
   * moviera, el recuadro se quedaría señalando el lugar equivocado.
   */
      resalte?: { x: number; y: number; ancho: number; alto: number; etiqueta?: string; desdeFrame: number };
      /** Etiquetas que entran y salen sobre la captura (los cuatro roles del motor). */
      etiquetas?: string[];
      /** El contador que sube y frena justo debajo del límite. */
      contador?: { hasta: number; limite: number; sufijo: string };
      /** Sellos que caen sobre la captura. */
      sellos?: { texto: string; color: string; x: number; y: number; desdeFrame: number }[];
      /** Entra con whip pan (mismo bloque) o con corte seco (bloque nuevo). */
      transicion: 'whip' | 'corte';
    }
  | { tipo: 'declaracion'; duracion: number; rotulo: string; lineas: string[]; apoyo?: string }
  | { tipo: 'dato'; duracion: number; rotulo: string; numero: number; sufijo: string; frase: string; pie: string }
  | { tipo: 'partida'; duracion: number; imagen: string; aprobado: string; enLaPieza: string; diferencia: string[] }
  | { tipo: 'mosaico'; duracion: number; imagenes: string[]; texto: string }
  | { tipo: 'cierre'; duracion: number };

const s = (segundos: number) => segundos * FPS;

export const PLANOS: Plano[] = [
  // ── Bloque 1 · El problema ────────────────────────────────────────────────
  { tipo: 'titular', duracion: s(2), anteriores: [], linea: 'Una campaña.' },
  { tipo: 'titular', duracion: s(2), anteriores: ['Una campaña.'], linea: '14 canales.' },
  { tipo: 'titular', duracion: s(2), anteriores: ['Una campaña.', '14 canales.'], linea: '40 piezas de copy.' },
  {
    tipo: 'titular',
    duracion: s(2),
    anteriores: ['Una campaña.', '14 canales.', '40 piezas de copy.'],
    // Antes decía «Y el lunes a las 9», que cerraba el problema pero no abría
    // nada: lo que seguía —a quién le pasa esto— quedaba colgado. «Todo, para
    // el lunes» deja la frase esperando respuesta, y la respuesta es el que mira.
    linea: 'Y todo, para el lunes.',
    flashFinal: true,
  },

  // ── Para quién es ─────────────────────────────────────────────────────────
  // Tres golpes cortos y no un párrafo: el párrafo no se llegaba a leer en tres
  // segundos, y encima rompía el ritmo del bloque anterior, que venía de cuatro
  // líneas de dos segundos. Las dos preguntas hacen que quien se reconoce se
  // quede; la tercera le dice que el video le habla a él.
  { tipo: 'declaracion', duracion: s(1.5), rotulo: 'para quién es', lineas: ['¿Manejás', 'varias marcas?'] },
  { tipo: 'declaracion', duracion: s(1.5), rotulo: 'para quién es', lineas: ['¿Y catorce canales', 'por campaña?'] },
  { tipo: 'declaracion', duracion: s(1.5), rotulo: 'para quién es', lineas: ['Esto es para', 'tu equipo.'] },

  // ── Bloque 2 · El copy ────────────────────────────────────────────────────
  {
    tipo: 'pantalla',
    duracion: s(3),
    imagen: '02-marcas-adn.png',
    rotulo: 'el adn de la marca',
    texto: 'Su voz, y lo que nunca diría',
    fondo: COLORES.fondoClaro,
    desde: { x: 0.5, y: 0.34, zoom: 1.12 },
    hasta: { x: 0.5, y: 0.34, zoom: 1.12 },
    resalte: { x: 0.175, y: 0.208, ancho: 0.285, alto: 0.048, etiqueta: 'lo que la marca nunca diría', desdeFrame: 20 },
    transicion: 'corte',
  },
  {
    tipo: 'pantalla',
    duracion: s(2.5),
    imagen: '03-generar.png',
    rotulo: 'el brief',
    texto: 'Un brief. Una vez.',
    fondo: COLORES.fondoClaro,
    desde: { x: 0.5, y: 0.3, zoom: 1.1 },
    hasta: { x: 0.5, y: 0.62, zoom: 1.1 },
    transicion: 'whip',
  },
  {
    tipo: 'pantalla',
    duracion: s(3),
    imagen: '04-progreso.png',
    rotulo: 'el motor',
    texto: 'Cuatro roles de IA, 14 canales a la vez',
    fondo: COLORES.fondoClaro,
    desde: { x: 0.5, y: 0.5, zoom: 1.0 },
    hasta: { x: 0.5, y: 0.5, zoom: 1.12 },
    etiquetas: ['Director', 'Redactor', 'Editor', 'Auditor'],
    transicion: 'whip',
  },
  {
    tipo: 'pantalla',
    duracion: s(2.5),
    imagen: '05-resultados.png',
    rotulo: 'el copy',
    texto: 'Con el largo exacto de cada canal',
    fondo: COLORES.fondoClaro,
    desde: { x: 0.45, y: 0.55, zoom: 1.35 },
    hasta: { x: 0.55, y: 0.55, zoom: 1.45 },
    contador: { hasta: 118, limite: 124, sufijo: 'caracteres' },
    transicion: 'whip',
  },
  {
    tipo: 'pantalla',
    duracion: s(2),
    imagen: '06-biblioteca.png',
    rotulo: 'la biblioteca',
    texto: 'Todo aprobado, en un solo lugar',
    fondo: COLORES.fondoClaro,
    desde: { x: 0.25, y: 0.6, zoom: 1.25 },
    hasta: { x: 0.75, y: 0.6, zoom: 1.25 },
    transicion: 'whip',
  },

  // ── Bloque 3 · El cliente ─────────────────────────────────────────────────
  {
    tipo: 'pantalla',
    duracion: s(2),
    imagen: '07-revisiones.png',
    rotulo: 'la aprobación',
    texto: 'Un enlace para el cliente',
    fondo: COLORES.blanco,
    desde: { x: 0.5, y: 0.5, zoom: 1.0 },
    hasta: { x: 0.5, y: 0.42, zoom: 1.08 },
    transicion: 'corte',
  },
  {
    tipo: 'pantalla',
    duracion: s(2),
    imagen: '08-portal-cliente.png',
    rotulo: 'el portal',
    texto: 'Aprueba sin crear una cuenta',
    subtexto: 'Sin cuenta, sin contraseña',
    fondo: COLORES.blanco,
    desde: { x: 0.5, y: 0.45, zoom: 1.05 },
    hasta: { x: 0.5, y: 0.5, zoom: 1.0 },
    sellos: [
      { texto: 'Aprobado', color: COLORES.verde, x: 0.24, y: 0.36, desdeFrame: 18 },
      { texto: 'Pide cambios', color: COLORES.ambar, x: 0.68, y: 0.52, desdeFrame: 34 },
    ],
    transicion: 'whip',
  },

  // ── Bloque 4 · La producción ──────────────────────────────────────────────
  {
    tipo: 'pantalla',
    duracion: s(3),
    imagen: '09-tablero.png',
    rotulo: 'la producción',
    texto: 'Lo aprobado se vuelve trabajo asignado',
    fondo: COLORES.tinta,
    desde: { x: 0.5, y: 0.5, zoom: 1.0 },
    hasta: { x: 0.45, y: 0.52, zoom: 1.15 },
    transicion: 'corte',
  },
  {
    tipo: 'pantalla',
    duracion: s(2.5),
    imagen: '10-orden-trabajo.png',
    rotulo: 'la orden de trabajo',
    texto: 'El diseñador recibe el copy exacto',
    fondo: COLORES.tinta,
    desde: { x: 0.5, y: 0.35, zoom: 1.3 },
    hasta: { x: 0.5, y: 0.4, zoom: 1.4 },
    transicion: 'whip',
  },
  {
    tipo: 'pantalla',
    duracion: s(2.5),
    imagen: '10-orden-trabajo.png',
    rotulo: 'el brief visual',
    texto: 'Y la idea que el motor ya escribió',
    fondo: COLORES.tinta,
    desde: { x: 0.5, y: 0.62, zoom: 1.35 },
    hasta: { x: 0.5, y: 0.72, zoom: 1.35 },
    transicion: 'whip',
  },

  // ── Bloque 5 · La verificación ────────────────────────────────────────────
  {
    tipo: 'partida',
    duracion: s(4.5),
    imagen: '11-auditoria.png',
    aprobado: 'Rendí más por tanque con Terpel Máxima',
    enLaPieza: 'Rendi más por tanque con Terpel Máxima',
    diferencia: ['Rendí', 'Rendi'],
  },
  {
    // La otra mitad de la auditoría, que el video no mostraba: además de
    // comparar el texto, la IA MIRA LA PIEZA y la juzga contra el ADN de la
    // marca. Es lo que la distingue de un corrector ortográfico.
    tipo: 'pantalla',
    duracion: s(2.5),
    imagen: '11-auditoria.png',
    rotulo: 'y contra la marca',
    texto: 'Y que respete el ADN de la marca',
    subtexto: 'Prohibiciones, tono y ortografía — sobre la imagen',
    fondo: COLORES.tinta,
    desde: { x: 0.62, y: 0.68, zoom: 1.5 },
    hasta: { x: 0.62, y: 0.78, zoom: 1.5 },
    transicion: 'whip',
  },
  {
    tipo: 'pantalla',
    duracion: s(2.5),
    imagen: '11-auditoria.png',
    rotulo: 'la regla',
    texto: 'Avisa. No bloquea. Decide una persona.',
    fondo: COLORES.tinta,
    desde: { x: 0.5, y: 0.5, zoom: 1.2 },
    hasta: { x: 0.5, y: 0.5, zoom: 1.0 },
    transicion: 'whip',
  },

  // ── El dato ───────────────────────────────────────────────────────────────
  // Después de mostrar el recorrido completo, no antes: un número sin el
  // recorrido detrás es una promesa; con el recorrido detrás es una conclusión.
  {
    tipo: 'dato',
    duracion: s(3.5),
    rotulo: 'lo que cambia',
    numero: 60,
    sufijo: '%',
    frase: 'menos tiempo por campaña',
    pie: 'Estimación del equipo sobre su propio flujo de trabajo',
  },

  // ── Bloque 6 · Cierre ─────────────────────────────────────────────────────
  {
    tipo: 'pantalla',
    duracion: s(2.5),
    imagen: '13-metricas.png',
    rotulo: 'el costo',
    texto: 'Con el costo de cada campaña a la vista',
    fondo: COLORES.fondoClaro,
    desde: { x: 0.3, y: 0.35, zoom: 1.2 },
    hasta: { x: 0.6, y: 0.4, zoom: 1.2 },
    transicion: 'corte',
  },
  {
    tipo: 'mosaico',
    duracion: s(3),
    texto: 'Del brief a la pieza verificada',
    imagenes: [
      '02-marcas-adn.png', '03-generar.png', '04-progreso.png', '05-resultados.png',
      '06-biblioteca.png', '07-revisiones.png', '08-portal-cliente.png', '09-tablero.png',
      '10-orden-trabajo.png', '11-auditoria.png', '12-mis-piezas.png', '13-metricas.png',
    ],
  },
  { tipo: 'cierre', duracion: s(4) },
];

export const DURACION_TOTAL = PLANOS.reduce((total, p) => total + p.duracion, 0);
