// Convierte una planilla de especificaciones de un medio (.xlsx) a JSON, para cargarla en la biblioteca de
// CDM con `npm run cdm:importar` (server). El servidor no lee .xlsx: recibe filas ya normalizadas.
//
//   node scripts/planilla-a-json.cjs <planilla.xlsx> <medio> <fecha AAAA-MM-DD> > salida.json
const XLSX = require('xlsx');
const [archivo, medio, fecha] = process.argv.slice(2);
if (!archivo || !medio || !fecha) {
  console.error('Uso: node scripts/planilla-a-json.cjs <planilla.xlsx> <medio> <fecha>');
  process.exit(1);
}
const wb = XLSX.readFile(archivo);
const hoja = nombre => (wb.Sheets[nombre] ? XLSX.utils.sheet_to_json(wb.Sheets[nombre], { defval: '' }) : []);
const alertas = XLSX.utils.sheet_to_json(wb.Sheets['Alertas y notas'] ?? {}, { header: 1, defval: '' })
  .filter(f => Number.isInteger(f[0]))
  .map(([numero, formato, ubicacion, inconsistencia, accion]) => ({ numero, formato, ubicacion, inconsistencia, accion }));
process.stdout.write(
  JSON.stringify(
    {
      medio,
      fuente: require('path').basename(archivo),
      fecha,
      especificaciones: hoja('Especificaciones'),
      zonasSeguras: hoja('Zonas seguras'),
      alertas,
    },
    null,
    2
  ) + '\n'
);
