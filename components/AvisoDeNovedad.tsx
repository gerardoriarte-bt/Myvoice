import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Novedad, fechaCorta } from '../novedades';
import { ScreenId } from '../screens';

/**
 * El aviso de una novedad al iniciar sesión (ver `novedades.ts`).
 *
 * Solo cuenta como visto lo que la persona eligió: «Entendido» o el botón que
 * lleva a hacer lo que pide. Escape o un clic afuera lo cierran por esta vez y
 * vuelve en la próxima sesión: un aviso que se va sin leerlo no avisó nada.
 */
interface Props {
  novedad: Novedad;
  /** Quien administra recibe lo que le toca hacer; el resto, qué cambia. */
  administra: boolean;
  /** Marcar como vista y, si viene, ir a esa pantalla. */
  onVista: (irA?: ScreenId) => void;
  /** Cerrar sin marcar. */
  onCerrar: () => void;
}

export default function AvisoDeNovedad({ novedad, administra, onVista, onCerrar }: Props) {
  const aviso = novedad.aviso!;
  const paraVos = administra ? aviso.paraQuienAdministra : aviso.paraElEquipo;

  React.useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[#1D1D1F]/40 p-6"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aviso-novedad-titulo"
        className="flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="overflow-y-auto">
          <div className="px-[26px] pb-[18px] pt-6">
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-indigo-700">
                Novedad · {fechaCorta(novedad.fecha)}
              </span>
              <span className="text-[10.5px] text-gray-400">
                {administra ? 'para quien administra' : 'para el equipo'}
              </span>
            </div>
            <h2 id="aviso-novedad-titulo" className="mt-2 text-[19px] font-semibold leading-tight text-gray-900">
              {novedad.titulo}
            </h2>
          </div>

          <div className="space-y-4 px-[26px] pb-5">
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500">Por qué cambió</h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-gray-700">{aviso.porQue}</p>
            </section>

            <section
              className={`rounded-[10px] border p-3.5 ${
                administra ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <h3
                className={`text-[10px] font-bold uppercase tracking-[0.08em] ${
                  administra ? 'text-amber-800' : 'text-gray-500'
                }`}
              >
                {paraVos.titulo}
              </h3>
              <ol className="mt-2 space-y-2">
                {paraVos.pasos.map((paso, i) => (
                  <li key={i} className="flex gap-2.5 text-[12.5px] leading-snug text-gray-700">
                    <span className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    {paso}
                  </li>
                ))}
              </ol>
            </section>

            {aviso.tambien.length > 0 && (
              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500">También cambia</h3>
                <ul className="mt-1 space-y-1">
                  {aviso.tambien.map((t, i) => (
                    <li key={i} className="flex gap-2 text-[12px] leading-snug text-gray-700">
                      <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
                      {t}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50 px-[26px] py-3.5">
          <span className="flex-1 text-[11px] text-gray-400">
            {aviso.guia ? `El detalle está en la Guía, sección «${aviso.guia}».` : ''}
          </span>
          <button
            onClick={() => onVista()}
            className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[12.5px] font-medium text-gray-700 hover:bg-gray-100"
          >
            Entendido
          </button>
          <button
            autoFocus
            onClick={() => onVista(paraVos.accion.pantalla)}
            className="flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-black"
          >
            {paraVos.accion.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
