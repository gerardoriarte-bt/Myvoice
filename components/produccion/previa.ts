/**
 * La previa de una pieza entregada, sacada del enlace.
 *
 * Es una AYUDA, no una prueba: existe para no tener que abrir otra pestaña
 * para aprobar. Solo se puede armar cuando el enlace es un archivo de Drive
 * compartido («cualquiera con el enlace») o una imagen directa; con un enlace
 * de Figma, o uno restringido, no hay miniatura posible y la tarjeta lo dice en
 * vez de mostrar una imagen rota.
 *
 * Cuando la fase 3 traiga el archivo subido y su snapshot, esa imagen reemplaza
 * a esta y sí es evidencia de qué se aprobó.
 */

/** Los tres formatos de enlace que Drive reparte según desde dónde se copie. */
const PATRONES_DRIVE = [
  /drive\.google\.com\/file\/d\/([\w-]{20,})/,
  /drive\.google\.com\/open\?id=([\w-]{20,})/,
  /drive\.google\.com\/uc\?(?:export=\w+&)?id=([\w-]{20,})/,
  /docs\.google\.com\/[\w/]*\/d\/([\w-]{20,})/,
];

export const idDeDrive = (enlace: string): string | null => {
  for (const patron of PATRONES_DRIVE) {
    const m = enlace.match(patron);
    if (m) return m[1];
  }
  return null;
};

export const esImagenDirecta = (enlace: string): boolean =>
  /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(enlace);

/**
 * URL de la miniatura, o null si del enlace no se puede sacar ninguna. El
 * ancho pedido es el del recuadro en pantalla por dos, para que no se vea
 * borrosa en pantallas retina.
 */
export const previaDelEnlace = (enlace: string | null | undefined, ancho = 400): string | null => {
  if (!enlace) return null;
  const id = idDeDrive(enlace);
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w${ancho}`;
  if (esImagenDirecta(enlace)) return enlace;
  return null;
};

/** Qué decir cuando no hay previa. Nombrar el motivo evita que parezca un error. */
export const motivoSinPrevia = (enlace: string | null | undefined): string => {
  if (!enlace) return 'Todavía no se entregó.';
  if (/figma\.com/i.test(enlace)) return 'Los enlaces de Figma no se pueden previsualizar.';
  if (idDeDrive(enlace)) return 'El archivo de Drive no está compartido con el enlace.';
  return 'De este enlace no se puede sacar una previa.';
};
