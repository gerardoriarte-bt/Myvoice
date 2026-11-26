/**
 * Horas hábiles entre dos momentos (2026-11-26, la línea base de Gerardo): de lunes a viernes, de 8:00 a 18:00 hora de
 * Bogotá, sin los festivos de Colombia. Las horas corridas cuentan noches y fines de semana, y una campaña que se
 * aprueba un viernes en la tarde parece lenta solo por el calendario; las dos se muestran, y la línea base debe usar
 * la misma con que se midió el proceso de antes.
 *
 * Bogotá no tiene horario de verano: siempre UTC−5.
 */

const BOGOTA_MS = -5 * 3_600_000;
const JORNADA = { desde: 8, hasta: 18 };
const DIA_MS = 86_400_000;

/** El domingo de Pascua (algoritmo anónimo gregoriano), como día UTC. */
const pascua = (anio: number) => {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(anio, mes - 1, dia);
};

/** Ley 51 de 1983 («ley Emiliani»): estos festivos se corren al lunes siguiente si no caen en lunes. */
const alLunes = (t: number) => {
  const dow = new Date(t).getUTCDay();
  return dow === 1 ? t : t + ((8 - dow) % 7) * DIA_MS;
};

const cacheDeFestivos = new Map<number, Set<number>>();
/** Los festivos de Colombia de un año, como días UTC a medianoche. */
export const festivosDeColombia = (anio: number) => {
  const hecho = cacheDeFestivos.get(anio);
  if (hecho) return hecho;
  const f = (mes: number, dia: number) => Date.UTC(anio, mes - 1, dia);
  const p = pascua(anio);
  const dias = [
    f(1, 1),
    f(5, 1),
    f(7, 20),
    f(8, 7),
    f(12, 8),
    f(12, 25),
    p - 3 * DIA_MS, // Jueves Santo
    p - 2 * DIA_MS, // Viernes Santo
    ...[f(1, 6), f(3, 19), f(6, 29), f(8, 15), f(10, 12), f(11, 1), f(11, 11)].map(alLunes),
    alLunes(p + 39 * DIA_MS), // Ascensión
    alLunes(p + 60 * DIA_MS), // Corpus Christi
    alLunes(p + 68 * DIA_MS), // Sagrado Corazón
  ];
  const set = new Set(dias);
  cacheDeFestivos.set(anio, set);
  return set;
};

/** Si un día (medianoche UTC del día de Bogotá) es hábil: ni fin de semana ni festivo. */
export const esHabil = (diaUtc: number) => {
  const dow = new Date(diaUtc).getUTCDay();
  return dow !== 0 && dow !== 6 && !festivosDeColombia(new Date(diaUtc).getUTCFullYear()).has(diaUtc);
};

/** Horas hábiles entre dos fechas ISO (o null si falta alguna). */
export const horasHabiles = (desde: string | null, hasta: string | null): number | null => {
  if (!desde || !hasta) return null;
  // Se trabaja en «hora de Bogotá como si fuera UTC» para cortar los días por la medianoche de Bogotá.
  const ini = Date.parse(desde) + BOGOTA_MS;
  const fin = Date.parse(hasta) + BOGOTA_MS;
  if (!(fin > ini)) return 0;
  let total = 0;
  for (let dia = ini - (ini % DIA_MS); dia < fin; dia += DIA_MS) {
    if (!esHabil(dia)) continue;
    const a = Math.max(ini, dia + JORNADA.desde * 3_600_000);
    const b = Math.min(fin, dia + JORNADA.hasta * 3_600_000);
    if (b > a) total += b - a;
  }
  return total / 3_600_000;
};
