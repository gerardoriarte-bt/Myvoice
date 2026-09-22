import React from 'react';
import { Check, Eye, Loader2, RefreshCw, Ruler, ScanText, TriangleAlert } from 'lucide-react';
import { Hallazgo, Pieza, PiezaDetalle } from '../../types';
import { piezasApi } from '../../services/api';
import ChipSemaforo, { ETIQUETA_SEMAFORO } from './semaforo';

/**
 * El informe de la auditoría (D3).
 *
 * **Los dos chequeos no son la misma clase de cosa y no pueden verse iguales.**
 * «¿Dice lo que se aprobó?» compara contra una verdad conocida —el texto
 * congelado— y muestra los dos lados: es un hecho. «¿Respeta la marca?» es un
 * juicio, del mismo tipo que el Critic. Mezclarlos en una sola lista destruye
 * la confianza en el primero.
 *
 * Y el estado que decide si la herramienta sobrevive a la primera semana:
 * **«no se pudo leer»**. Cuando la auditoría no pudo extraer un texto, lo dice
 * y aclara que eso no significa que esté mal. Reportar un falso «no coincide»
 * ahí hace que el diseñador la desactive mentalmente y no vuelva.
 *
 * Cada hallazgo se cierra con una decisión, y aceptar pide nota: es el único
 * dato con el que D2 puede, algún día, darle a la auditoría la autoridad de
 * bloquear.
 */

interface Props {
  pieza: PiezaDetalle;
  onCambio: (pieza: Pieza) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => void;
}

const ICONO: Record<string, typeof Check> = {
  HECHO: ScanText,
  MEDIDAS: Ruler,
  JUICIO: TriangleAlert,
  ILEGIBLE: Eye,
};

const DECIDIDO: Record<string, string> = {
  ACEPTADO: 'Aceptado',
  CORREGIDO: 'Corregido',
};

function FilaHallazgo({ hallazgo, onDecidir }: { hallazgo: Hallazgo; onDecidir: (d: 'ACEPTADO' | 'CORREGIDO', nota?: string) => Promise<void> }) {
  const [aceptando, setAceptando] = React.useState(false);
  const [nota, setNota] = React.useState('');
  const [ocupado, setOcupado] = React.useState(false);
  const Icono = ICONO[hallazgo.tipo] ?? TriangleAlert;
  const esIlegible = hallazgo.tipo === 'ILEGIBLE';

  const correr = async (decision: 'ACEPTADO' | 'CORREGIDO', texto?: string) => {
    setOcupado(true);
    try {
      await onDecidir(decision, texto);
      setAceptando(false);
      setNota('');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <li className={`rounded-xl border p-3 ${esIlegible ? 'border-apple-border bg-apple-bg' : 'border-apple-border bg-white'}`}>
      <div className="flex items-start gap-2">
        <Icono className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${esIlegible ? 'text-apple-tertiary' : 'text-amber-600'}`} />
        <div className="min-w-0 flex-1">
          {hallazgo.slotLabel && (
            <p className="text-[10px] font-bold uppercase tracking-wide text-apple-tertiary">{hallazgo.slotLabel}</p>
          )}
          <p className="text-[12px] text-apple-text">{hallazgo.detalle}</p>

          {/* Un hecho se muestra con los dos lados: es lo que lo hace verificable. */}
          {hallazgo.tipo === 'HECHO' && (
            <div className="mt-2 space-y-1">
              <p className="text-[11px]">
                <span className="mr-1 text-[9px] font-bold uppercase tracking-wide text-apple-tertiary">Aprobado</span>
                <span className="text-apple-text">{hallazgo.esperado}</span>
              </p>
              <p className="text-[11px]">
                <span className="mr-1 text-[9px] font-bold uppercase tracking-wide text-apple-tertiary">En la pieza</span>
                <span className="text-apple-text">{hallazgo.encontrado ?? '—'}</span>
              </p>
            </div>
          )}

          {hallazgo.tipo === 'MEDIDAS' && (
            <p className="mt-1 text-[11px] text-apple-secondary">
              Pedía {hallazgo.esperado} y mide {hallazgo.encontrado}.
            </p>
          )}

          {hallazgo.tipo === 'JUICIO' && hallazgo.encontrado && (
            <p className="mt-1 text-[11px] italic text-apple-secondary">«{hallazgo.encontrado}»</p>
          )}

          {esIlegible && (
            <p className="mt-1 text-[10px] text-apple-tertiary">
              Esto no significa que esté mal: es hasta dónde pudo leer la auditoría.
            </p>
          )}

          {!esIlegible && hallazgo.decision === 'PENDIENTE' && !aceptando && (
            <div className="mt-2 flex items-center gap-2">
              <button
                disabled={ocupado}
                onClick={() => void correr('CORREGIDO')}
                className="rounded-lg bg-ink px-2.5 py-1 text-[11px] font-medium text-white hover:bg-ink-hover disabled:opacity-40"
              >
                Lo corrijo
              </button>
              <button
                disabled={ocupado}
                onClick={() => setAceptando(true)}
                className="rounded-lg border border-apple-border px-2.5 py-1 text-[11px] font-medium text-apple-text hover:bg-apple-fill"
              >
                Aceptar igual
              </button>
            </div>
          )}

          {aceptando && (
            <div className="mt-2 space-y-1.5">
              <textarea
                autoFocus
                rows={2}
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Por qué se acepta así…"
                className="w-full rounded-lg border border-apple-border px-2 py-1.5 text-[11px] text-apple-text"
              />
              <p className="text-[10px] text-apple-tertiary">
                Queda registrado quién decidió pasar por encima del hallazgo.
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={!nota.trim() || ocupado}
                  onClick={() => void correr('ACEPTADO', nota)}
                  className="rounded-lg bg-ink px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-40"
                >
                  Aceptar
                </button>
                <button
                  onClick={() => setAceptando(false)}
                  className="rounded-lg border border-apple-border px-2.5 py-1 text-[11px] font-medium text-apple-text"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {hallazgo.decision !== 'PENDIENTE' && (
            <p className="mt-1.5 text-[10px] text-apple-secondary">
              {DECIDIDO[hallazgo.decision]}
              {hallazgo.decididoPor?.name ? ` · ${hallazgo.decididoPor.name}` : ''}
              {hallazgo.notaDecision ? ` · «${hallazgo.notaDecision}»` : ''}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export default function Informe({ pieza, onCambio, onError, onRecargar }: Props) {
  const informe = pieza.informe;
  if (!informe) return null;

  const hechos = informe.hallazgos.filter(h => h.tipo === 'HECHO' || h.tipo === 'MEDIDAS');
  const juicios = informe.hallazgos.filter(h => h.tipo === 'JUICIO');
  const ilegibles = informe.hallazgos.filter(h => h.tipo === 'ILEGIBLE');

  const decidir = async (id: string, decision: 'ACEPTADO' | 'CORREGIDO', nota?: string) => {
    try {
      onCambio(await piezasApi.decidirHallazgo(id, decision, nota));
      onRecargar();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo guardar la decisión');
    }
  };

  const reauditar = async () => {
    try {
      onCambio(await piezasApi.reauditar(pieza.id));
      onRecargar();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo reintentar');
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-apple-tertiary">
          Verificación · versión {informe.numero}
        </h3>
        <ChipSemaforo estado={pieza.semaforo} hallazgos={informe.hallazgos.length} />
      </div>
      <p className="mt-1 text-[11px] text-apple-secondary">
        {pieza.semaforo ? ETIQUETA_SEMAFORO[pieza.semaforo].ayuda : ''}
        {informe.anchoPx && informe.altoPx ? ` · ${informe.anchoPx}×${informe.altoPx} px` : ''}
      </p>

      {informe.estadoAuditoria === 'PENDIENTE' && (
        <p className="mt-2 flex items-center gap-2 text-[12px] text-apple-secondary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Corriendo. La pieza ya está en revisión igual.
        </p>
      )}

      {informe.estadoAuditoria === 'NO_DISPONIBLE' && (
        <div className="mt-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
          <p className="text-[12px] font-medium text-orange-800">La verificación no pudo correr</p>
          {informe.motivoNoDisponible && (
            <p className="mt-1 text-[11px] text-apple-secondary">{informe.motivoNoDisponible}</p>
          )}
          <p className="mt-1 text-[11px] text-apple-secondary">
            No dice nada sobre la pieza: no llegó a mirarla.
          </p>
          <button
            onClick={() => void reauditar()}
            className="mt-2 flex items-center gap-1.5 rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-ink-hover"
          >
            <RefreshCw className="h-3 w-3" />
            Reintentar
          </button>
        </div>
      )}

      {informe.estadoAuditoria === 'COMPLETA' && (
        <div className="mt-3 space-y-4">
          <div>
            <p className="text-[11px] font-semibold text-apple-text">¿Dice lo que se aprobó?</p>
            <p className="text-[10px] text-apple-tertiary">
              Comparación contra el copy congelado. Es un hecho, no una opinión.
            </p>
            {hechos.length === 0 ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-700">
                <Check className="h-3 w-3" /> Todo el texto coincide.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {hechos.map(h => (
                  <FilaHallazgo key={h.id} hallazgo={h} onDecidir={(d, n) => decidir(h.id, d, n)} />
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold text-apple-text">¿Respeta la marca?</p>
            <p className="text-[10px] text-apple-tertiary">
              Ortografía, tono y prohibiciones contra el ADN. Es un juicio, del mismo tipo que el Critic.
            </p>
            {juicios.length === 0 ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-700">
                <Check className="h-3 w-3" /> Sin observaciones.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {juicios.map(h => (
                  <FilaHallazgo key={h.id} hallazgo={h} onDecidir={(d, n) => decidir(h.id, d, n)} />
                ))}
              </ul>
            )}
          </div>

          {ilegibles.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-apple-text">Lo que no se pudo leer</p>
              <ul className="mt-2 space-y-2">
                {ilegibles.map(h => (
                  <FilaHallazgo key={h.id} hallazgo={h} onDecidir={(d, n) => decidir(h.id, d, n)} />
                ))}
              </ul>
            </div>
          )}

          {informe.costoUsd != null && (
            <p className="text-[10px] text-apple-tertiary">
              Auditar esta versión costó USD {Number(informe.costoUsd).toFixed(4)}
              {informe.modelo ? ` · ${informe.modelo}` : ''}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
