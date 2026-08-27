/**
 * Resumen estructurado para los scripts que escriben en la base.
 *
 * Los cuatro backfills corren contra producción con `--apply`, encadenados en
 * una secuencia donde el orden importa y donde la migración
 * `_workspace_required` falla a propósito si el paso anterior dejó huérfanos.
 * Si eso pasa a mitad del despliegue, lo único que tenía el operador para
 * diagnosticar era el scrollback.
 *
 * La propiedad que importa: el bloque `plan` sale IDÉNTICO en dry-run y en
 * `--apply`, así los dos reportes se pueden difear y la pregunta "¿escribió lo
 * que dijo que iba a escribir?" se responde con un comando en vez de leyendo
 * consola:
 *
 *   npm run backfill:telemetria                 # deja un JSON de dry-run
 *   npm run backfill:telemetria -- --apply      # deja otro de apply
 *   diff <(jq .plan a.json) <(jq .plan b.json)  # vacío = hizo lo prometido
 *
 * Los archivos van a `server/.backfills/` (gitignoreado): son evidencia de una
 * corrida contra una base concreta, no código.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Conteo = Record<string, number>;

export interface ResumenJson {
  script: string;
  modo: 'dry-run' | 'apply';
  iniciadoEn: string;
  duracionMs: number;
  /** Filas leídas por tabla. */
  leidas: Conteo;
  /** Lo que se va a escribir. Idéntico en dry-run y en apply — es el bloque a difear. */
  plan: Conteo;
  /** Lo que se escribió de verdad. Vacío en dry-run. */
  escritas: Conteo;
  /** Filas que el script decidió no tocar, con el motivo. */
  salteadas: { motivo: string; filas: number }[];
  advertencias: string[];
  /** true si `escritas` no coincide con `plan` — hay que mirar antes de seguir. */
  divergencia: boolean;
}

export class Reporte {
  private readonly inicio = Date.now();
  private readonly leidasMap: Conteo = {};
  private readonly planMap: Conteo = {};
  private readonly escritasMap: Conteo = {};
  private readonly salteadasArr: { motivo: string; filas: number }[] = [];
  private readonly advertenciasArr: string[] = [];

  constructor(private readonly script: string, private readonly apply: boolean) {}

  leidas(tabla: string, filas: number): this {
    this.leidasMap[tabla] = (this.leidasMap[tabla] ?? 0) + filas;
    return this;
  }

  /** Lo que el script se compromete a escribir. Se llama SIEMPRE, también en dry-run. */
  planea(accion: string, filas: number): this {
    this.planMap[accion] = (this.planMap[accion] ?? 0) + filas;
    return this;
  }

  /** Lo que efectivamente escribió. Se llama solo después de la transacción. */
  escribio(accion: string, filas: number): this {
    this.escritasMap[accion] = (this.escritasMap[accion] ?? 0) + filas;
    return this;
  }

  saltea(motivo: string, filas: number): this {
    if (filas > 0) this.salteadasArr.push({ motivo, filas });
    return this;
  }

  advierte(mensaje: string): this {
    this.advertenciasArr.push(mensaje);
    return this;
  }

  /**
   * Imprime el resumen y lo deja en disco. Devuelve la ruta del archivo.
   * En apply, si lo escrito no coincide con lo planeado lo marca como
   * divergencia: la transacción no falló, pero el script no hizo lo que dijo.
   */
  cierra(): string {
    const modo: 'dry-run' | 'apply' = this.apply ? 'apply' : 'dry-run';
    const divergencia =
      this.apply &&
      Object.keys(this.planMap).some(k => this.planMap[k] !== (this.escritasMap[k] ?? 0));

    const resumen: ResumenJson = {
      script: this.script,
      modo,
      iniciadoEn: new Date(this.inicio).toISOString(),
      duracionMs: Date.now() - this.inicio,
      leidas: this.leidasMap,
      plan: this.planMap,
      escritas: this.escritasMap,
      salteadas: this.salteadasArr,
      advertencias: this.advertenciasArr,
      divergencia,
    };

    const dir = join(__dirname, '..', '..', '.backfills');
    mkdirSync(dir, { recursive: true });
    const sello = resumen.iniciadoEn.replace(/[:.]/g, '-');
    const ruta = join(dir, `${this.script}-${modo}-${sello}.json`);
    writeFileSync(ruta, JSON.stringify(resumen, null, 2) + '\n');

    const linea = (c: Conteo) =>
      Object.keys(c).length === 0 ? '—' : Object.entries(c).map(([k, v]) => `${k}=${v}`).join('  ');

    console.log(`\n── resumen · ${this.script} · ${modo} ──`);
    console.log(`leídas     ${linea(resumen.leidas)}`);
    console.log(`plan       ${linea(resumen.plan)}`);
    console.log(`escritas   ${this.apply ? linea(resumen.escritas) : '(dry-run: ninguna)'}`);
    for (const s of resumen.salteadas) console.log(`salteadas  ${s.motivo}=${s.filas}`);
    for (const a of resumen.advertencias) console.log(`⚠  ${a}`);
    if (divergencia) {
      console.log('⚠  DIVERGENCIA: lo escrito no coincide con lo planeado. Revisar antes de seguir con la secuencia.');
    }
    console.log(`duración   ${resumen.duracionMs} ms`);
    console.log(`reporte    ${ruta}\n`);

    return ruta;
  }
}
