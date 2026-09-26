import * as XLSX from 'xlsx';
import { Pieza } from '../types';

/**
 * Las piezas listas, en Excel.
 *
 * No es un reporte: es el insumo del que programa y publica. Por eso son dos
 * hojas con la misma verdad en dos formas:
 *
 *   · **Piezas** — una fila por pieza, con el enlace al arte y su formato. Es
 *     la lista de lo que hay que subir.
 *   · **Copy** — una fila por slot, que es como se pega en un programador: el
 *     texto exacto y aprobado, sin tener que abrir la herramienta.
 *
 * El texto que se exporta es el **congelado en la pieza**, no el de la
 * aprobados: es el que se aprobó y el que está en el arte. Si alguien editó el
 * original después, la columna «Aviso» lo dice en vez de exportar en silencio
 * un texto que no coincide con la pieza.
 */

const NOMBRE_HOJA = (nombre: string) => nombre.replace(/[:\\/?*[\]]/g, '-').slice(0, 31);

const fecha = (iso: string): string => new Date(iso).toISOString().slice(0, 10);

const avisoDe = (pieza: Pieza): string =>
  pieza.desfases.length === 0
    ? ''
    : `El copy cambió después de aprobarse (${pieza.desfases
        .map(d => d.slotLabel)
        .join(', ')})`;

export const exportPiezasToExcel = (piezas: Pieza[], marca: string): void => {
  const wb = XLSX.utils.book_new();

  const filasPiezas: (string | number)[][] = [
    ['Marca', 'Campaña', 'Canal', 'Formato', 'Pieza', 'Enlace al arte', 'Diseñador', 'Aprobada el', 'Aviso'],
    ...piezas.map(p => [
      p.client?.name ?? marca,
      p.project?.name ?? '—',
      p.platform,
      p.formato,
      p.titulo,
      p.enlace ?? '—',
      p.asignadaA?.name ?? '—',
      fecha(p.estadoDesde),
      avisoDe(p),
    ]),
  ];
  const hojaPiezas = XLSX.utils.aoa_to_sheet(filasPiezas);
  hojaPiezas['!cols'] = [
    { wch: 18 }, { wch: 26 }, { wch: 20 }, { wch: 12 }, { wch: 44 },
    { wch: 46 }, { wch: 16 }, { wch: 13 }, { wch: 52 },
  ];
  XLSX.utils.book_append_sheet(wb, hojaPiezas, 'Piezas');

  const filasCopy: (string | number)[][] = [
    ['Canal', 'Formato', 'Pieza', 'Slot', 'Texto', 'Caracteres', 'Tipo'],
  ];
  for (const p of piezas) {
    for (const s of p.slots) {
      filasCopy.push([
        p.platform,
        p.formato,
        p.titulo,
        s.slotLabel,
        s.textoCongelado,
        s.textoCongelado.length,
        // El brief de producción viaja, pero marcado: no es texto publicable y
        // nadie debería pegarlo en un programador por error.
        s.esInstruccion ? 'Brief de producción' : 'Copy publicable',
      ]);
    }
  }
  const hojaCopy = XLSX.utils.aoa_to_sheet(filasCopy);
  hojaCopy['!cols'] = [
    { wch: 20 }, { wch: 12 }, { wch: 40 }, { wch: 22 }, { wch: 80 }, { wch: 11 }, { wch: 20 },
  ];
  const rango = XLSX.utils.decode_range(hojaCopy['!ref'] || 'A1');
  for (let r = rango.s.r; r <= rango.e.r; ++r) {
    const celda = hojaCopy[XLSX.utils.encode_cell({ r, c: 4 })];
    if (celda?.v) celda.s = { alignment: { wrapText: true, vertical: 'top' } };
  }
  XLSX.utils.book_append_sheet(wb, hojaCopy, NOMBRE_HOJA('Copy'));

  const seguro = marca.replace(/[^\w-]+/g, '_');
  XLSX.writeFile(wb, `piezas_listas_${seguro}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};
