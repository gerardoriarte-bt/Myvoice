/**
 * Los dominios a los que un workspace acepta invitar (H3.D, fase 4).
 *
 * **Esto no es alta por dominio.** Hay que separar dos cosas que se llaman
 * parecido:
 *
 *   · *Alta por dominio* —cualquiera con un email `@empresa.com` entra y se le
 *     crea el usuario— es justo lo que el H1 eliminó junto con el password
 *     maestro. No se reabre. La pertenencia se demuestra con una fila de
 *     `Membership`, nunca con la forma del email.
 *   · *Esta lista* solo mira el email **al invitar**, y lo único que hace es
 *     frenar el dedazo: mandarle la invitación a un Gmail personal. En una
 *     herramienta donde el invitado ve todas las marcas del workspace, ese
 *     error no es menor.
 *
 * Vacía = apagada, que es el estado normal. No hay bandera aparte porque una
 * lista vacía ya dice exactamente eso, y dos formas de apagar lo mismo terminan
 * discrepando.
 *
 * La comparación es **exacta**, no por sufijo: `empresa.com` no habilita
 * `mail.empresa.com`. Un sufijo parece más cómodo hasta que alguien registra
 * `no-empresa.com` — y sobre todo, una regla que se puede leer de un vistazo es
 * la que la gente entiende al ver el mensaje de error.
 *
 * Ver docs/plan-h3d-funciones-notificaciones.md, D5.
 */

/** Normaliza un dominio suelto. Acepta `@empresa.com` y `EMPRESA.com`. */
export const normalizarDominio = (valor: string): string | null => {
  const limpio = valor.trim().toLowerCase().replace(/^@/, '');
  // Algo.algo, sin espacios ni arroba: alcanza para atajar lo que se escribe
  // mal a mano, que es contra lo que esto protege.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(limpio)) return null;
  return limpio;
};

/** Normaliza la lista entera del body, descartando lo que no sea un dominio. */
export const normalizarLista = (valores: unknown): string[] => {
  if (!Array.isArray(valores)) return [];
  const limpios = valores
    .filter((v): v is string => typeof v === 'string')
    .map(normalizarDominio)
    .filter((d): d is string => d !== null);
  return [...new Set(limpios)].sort();
};

export const dominioDe = (email: string): string => email.trim().toLowerCase().split('@').pop() ?? '';

/** Lista vacía = todo permitido. Es el estado de todos los workspaces por defecto. */
export const emailPermitido = (email: string, permitidos: string[]): boolean =>
  permitidos.length === 0 || permitidos.includes(dominioDe(email));

/**
 * El mensaje del rechazo **nombra los dominios que sí acepta**. Un «no se
 * permite ese dominio» a secas deja a quien invita adivinando, y lo que hace
 * es pedirle a otro que invite por él.
 */
export const mensajeDeRechazo = (permitidos: string[]): string =>
  `Este workspace solo invita a ${permitidos.join(', ')}. Cambialo en Equipo si hace falta.`;
