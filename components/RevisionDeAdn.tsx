import React from 'react';
import { CheckCircle2, Lock, ShieldAlert } from 'lucide-react';
import { RevisionDeAdn as Revision } from '../types';
import { clientApi } from '../services/api';

/**
 * Confirmar el ADN de una marca madre antes de que lo hereden sus submarcas (docs/plan-revision-adn.md).
 * Desde el ADN 2.0 (docs/plan-adn-2.md, F2) cada sección se da por buena en su tarjeta, en la pantalla
 * del ADN; esta franja muestra cuántas de las que pide la revisión faltan y confirma. Recién ahí las
 * submarcas heredan.
 *
 * No muestra nada en una marca sin submarcas: no hay a quién heredarle.
 */
interface Props {
  clientId: string;
  /** Cambia cuando una tarjeta marcó o editó una sección: se vuelve a leer el estado. */
  recarga?: number;
  /** Después de confirmar: Marcas recarga para que el aviso y la etiqueta se vayan. */
  onConfirmado?: (submarcas: number) => void;
  /** Lleva a la tarjeta de una sección que falta revisar. */
  onIrASeccion?: (clave: string) => void;
}

const MAX_CHIPS = 4;

const RevisionDeAdn: React.FC<Props> = ({ clientId, recarga, onConfirmado, onIrASeccion }) => {
  const [revision, setRevision] = React.useState<Revision | null>(null);
  const [ocupado, setOcupado] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [recienConfirmado, setRecienConfirmado] = React.useState(false);

  React.useEffect(() => {
    let vigente = true;
    clientApi
      .revisionAdn(clientId)
      .then((r: Revision) => vigente && setRevision(r))
      .catch((e: Error) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
  }, [clientId, recarga]);

  React.useEffect(() => setRecienConfirmado(false), [clientId]);

  if (!revision) return error ? <p className="text-[12px] text-red-600">{error}</p> : null;
  if (revision.submarcas.length === 0) return null;

  const n = revision.submarcas.length;

  if (revision.confirmadoEn) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[12.5px] text-emerald-900">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        {recienConfirmado
          ? `ADN de ${revision.marca} confirmado. ${n === 1 ? 'Su submarca ya lo hereda' : `Sus ${n} submarcas ya lo heredan`}.`
          : `ADN confirmado · lo ${n === 1 ? 'hereda su submarca' : `heredan ${n} submarcas`}.`}
      </div>
    );
  }

  const confirmar = async () => {
    setOcupado(true);
    setError(null);
    try {
      const r = await clientApi.confirmarAdn(clientId);
      setRevision(r.estado);
      setRecienConfirmado(true);
      onConfirmado?.(r.submarcasAfectadas);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo confirmar el ADN');
    } finally {
      setOcupado(false);
    }
  };

  const faltan = revision.secciones.filter(s => !s.revisada);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-[18px] w-[18px] shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold text-gray-900">
            Lo que confirmes acá lo {n === 1 ? 'hereda una submarca' : `heredan ${n} submarcas`}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {faltan.length > 0 ? (
              <>
                <span className="text-[11.5px] text-gray-700">Decí «Está bien» o corregí:</span>
                {faltan.map(s => (
                  <button
                    key={s.clave}
                    onClick={() => onIrASeccion?.(s.clave)}
                    className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] text-gray-800 hover:border-amber-500"
                  >
                    {s.nombre}
                  </button>
                ))}
              </>
            ) : (
              <span className="text-[11.5px] text-gray-700">Todo revisado. Lo heredan:</span>
            )}
            {faltan.length === 0 &&
              revision.submarcas.slice(0, MAX_CHIPS).map(s => (
                <span key={s.id} className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
                  {s.name}
                </span>
              ))}
            {faltan.length === 0 && n > MAX_CHIPS && (
              <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">+{n - MAX_CHIPS} más</span>
            )}
          </div>
          {error && <p className="mt-1.5 text-[12px] text-red-600">{error}</p>}
        </div>
        <button
          onClick={confirmar}
          disabled={faltan.length > 0 || ocupado}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold ${
            faltan.length > 0 ? 'cursor-not-allowed bg-[#E7E5E0] text-gray-400' : 'bg-ink text-white hover:bg-ink-hover'
          }`}
        >
          {faltan.length > 0 && <Lock className="h-3.5 w-3.5" />}
          {faltan.length > 0
            ? `Confirmar · falta${faltan.length === 1 ? '' : 'n'} ${faltan.length}`
            : ocupado
              ? 'Confirmando…'
              : `Confirmar el ADN de ${revision.marca}`}
        </button>
      </div>
    </div>
  );
};

export default RevisionDeAdn;
