import React from 'react';
import { Check, CheckCircle2, Lock, ShieldAlert } from 'lucide-react';
import { RevisionDeAdn as Revision } from '../types';
import { clientApi } from '../services/api';

/**
 * Revisar el ADN de una marca madre antes de que lo hereden sus submarcas (docs/plan-revision-adn.md,
 * diseño en el .pen: «— Revisar el ADN antes de heredar»). Cada sección se da por buena o se corrige;
 * con las cinco revisadas se confirma, y recién ahí las submarcas heredan.
 *
 * No muestra nada en una marca sin submarcas: no hay a quién heredarle.
 */
interface Props {
  clientId: string;
  /** Después de confirmar: Marcas recarga para que el aviso y la etiqueta se vayan. */
  onConfirmado?: (submarcas: number) => void;
  /** Después de corregir una sección: el formulario del ADN de al lado lee las mismas columnas. */
  onCorregida?: () => void;
}

const MAX_CHIPS = 4;

const RevisionDeAdn: React.FC<Props> = ({ clientId, onConfirmado, onCorregida }) => {
  const [revision, setRevision] = React.useState<Revision | null>(null);
  const [editando, setEditando] = React.useState<{ clave: string; texto: string } | null>(null);
  const [ocupado, setOcupado] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmadas, setConfirmadas] = React.useState<number | null>(null);

  React.useEffect(() => {
    let vigente = true;
    setRevision(null);
    setEditando(null);
    setError(null);
    setConfirmadas(null);
    clientApi
      .revisionAdn(clientId)
      .then((r: Revision) => vigente && setRevision(r))
      .catch((e: Error) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
  }, [clientId]);

  if (!revision) return error ? <p className="text-[12px] text-red-600">{error}</p> : null;
  if (revision.submarcas.length === 0) return null;

  const n = revision.submarcas.length;

  if (revision.confirmadoEn) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[12.5px] text-emerald-900">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        {confirmadas !== null
          ? `ADN de ${revision.marca} confirmado. ${n === 1 ? 'Su submarca ya lo hereda' : `Sus ${n} submarcas ya lo heredan`}.`
          : `ADN confirmado · lo ${n === 1 ? 'hereda su submarca' : `heredan ${n} submarcas`}.`}
      </div>
    );
  }

  const revisar = async (clave: string, texto?: string) => {
    setOcupado(clave);
    setError(null);
    try {
      setRevision(await clientApi.revisarSeccionAdn(clientId, clave, texto));
      setEditando(null);
      if (texto !== undefined) onCorregida?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la revisión');
    } finally {
      setOcupado(null);
    }
  };

  const confirmar = async () => {
    setOcupado('confirmar');
    setError(null);
    try {
      const r = await clientApi.confirmarAdn(clientId);
      setRevision(r.estado);
      setConfirmadas(r.submarcasAfectadas);
      onConfirmado?.(r.submarcasAfectadas);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo confirmar el ADN');
    } finally {
      setOcupado(null);
    }
  };

  const faltan = revision.total - revision.revisadas;

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-[18px] w-[18px] shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold text-gray-900">
              Lo que confirmes acá lo {n === 1 ? 'hereda una submarca' : `heredan ${n} submarcas`}
            </h3>
            <p className="mt-0.5 text-[12px] leading-relaxed text-gray-700">
              Leé cada sección y decí si está bien o corregila. Las prohibiciones y keywords se suman a las de
              cada submarca; voz, propuesta de valor y guías las toman las que no tienen propias.
            </p>
          </div>
          <div className="w-[150px] shrink-0 text-right">
            <p className="text-[12px] font-semibold text-gray-900">
              {revision.revisadas} de {revision.total} revisadas
            </p>
            <div className="mt-1.5 h-1.5 rounded-full bg-white">
              <div
                className="h-1.5 rounded-full bg-amber-500 transition-all"
                style={{ width: `${(revision.revisadas / revision.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-gray-500">Lo heredan:</span>
          {revision.submarcas.slice(0, MAX_CHIPS).map(s => (
            <span key={s.id} className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
              {s.name}
            </span>
          ))}
          {n > MAX_CHIPS && (
            <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
              +{n - MAX_CHIPS} más
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {revision.secciones.map(s => {
          const enEdicion = editando?.clave === s.clave;
          return (
            <div key={s.clave} className={`flex gap-4 px-4 py-3.5 ${enEdicion ? 'bg-amber-50/30' : ''}`}>
              <div className="w-[170px] shrink-0">
                <p className="text-[13px] font-semibold text-gray-900">{s.nombre}</p>
                <p className="text-[11px] text-gray-400">{s.comoHereda}</p>
              </div>
              <div className="min-w-0 flex-1">
                {enEdicion ? (
                  <>
                    <textarea
                      autoFocus
                      rows={3}
                      value={editando.texto}
                      onChange={e => setEditando({ clave: s.clave, texto: e.target.value })}
                      className="w-full rounded-lg border-[1.5px] border-gray-900 px-2.5 py-2 text-[12px] leading-relaxed text-gray-900 outline-none"
                    />
                    <p className="mt-1 text-[11px] text-gray-400">Antes: {s.texto || '(vacía)'}</p>
                  </>
                ) : (
                  <p className="text-[12px] leading-relaxed text-gray-700 line-clamp-3">
                    {s.texto || <span className="text-gray-400">(vacía)</span>}
                  </p>
                )}
              </div>
              <div className="flex w-[230px] shrink-0 items-start justify-end gap-2">
                {enEdicion ? (
                  <>
                    <button
                      onClick={() => setEditando(null)}
                      className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11.5px] text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => revisar(s.clave, editando.texto)}
                      disabled={ocupado !== null}
                      className="rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] font-semibold text-white hover:bg-ink-hover disabled:opacity-50"
                    >
                      {ocupado === s.clave ? 'Guardando…' : 'Guardar'}
                    </button>
                  </>
                ) : s.revisada ? (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      <Check className="h-3 w-3" /> Está bien
                    </span>
                    <button
                      onClick={() => setEditando({ clave: s.clave, texto: s.texto })}
                      className="py-1 text-[11px] text-gray-400 hover:text-gray-700"
                    >
                      Cambiar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditando({ clave: s.clave, texto: s.texto })}
                      disabled={ocupado !== null}
                      className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11.5px] text-gray-700 hover:bg-gray-50"
                    >
                      Corregir
                    </button>
                    <button
                      onClick={() => revisar(s.clave)}
                      disabled={ocupado !== null}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-900 px-2.5 py-1.5 text-[11.5px] font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" /> {ocupado === s.clave ? 'Guardando…' : 'Está bien'}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-[12px] text-red-600">{error}</p>}

      <div className="flex items-center gap-4 px-0.5">
        <p className="flex-1 text-[11.5px] leading-relaxed text-gray-500">
          Hasta que confirmes, {n === 1 ? 'la submarca sigue' : 'cada submarca sigue'} con su propio ADN y nada
          cambia en el copy.
        </p>
        <button
          onClick={confirmar}
          disabled={faltan > 0 || ocupado !== null}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold ${
            faltan > 0 ? 'cursor-not-allowed bg-[#E7E5E0] text-gray-400' : 'bg-ink text-white hover:bg-ink-hover'
          }`}
        >
          {faltan > 0 && <Lock className="h-3.5 w-3.5" />}
          {faltan > 0
            ? `Confirmar el ADN · falta${faltan === 1 ? '' : 'n'} ${faltan}`
            : ocupado === 'confirmar'
              ? 'Confirmando…'
              : `Confirmar el ADN de ${revision.marca}`}
        </button>
      </div>
    </section>
  );
};

export default RevisionDeAdn;
