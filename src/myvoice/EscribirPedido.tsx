import React from 'react';
import { Loader2 } from 'lucide-react';
import ResultadosPorPieza from '../../components/ResultadosPorPieza';
import { CANTIDAD, SLIDES, acotar, nombreDePiezas } from '../../piezas';
import { generationApi, libraryApi } from '../../services/api';
import type { ClaveAdn, CampaignSpine, Client, ContentDNAProfile, CopyParameters, CopyVariation, Platform, PedidoDeCopy } from '../../types';
import { ETAPA_DEL_MOTOR, parametrosDelBrief } from './parametrosDelBrief';

const ETAPA_NOMBRE = { RECONOCIMIENTO: 'Reconocimiento', CONSIDERACION: 'Consideración', CONVERSION: 'Conversión', RETENCION: 'Retención' } as const;

/**
 * Escribir un pedido de CDM dentro de su tarjeta (F4, 2026-11-20). Las reglas vienen del pedido —el medio, la
 * etapa y cuántas piezas— y la voz del brief de la campaña, así que no hay formulario: se genera, se revisa y
 * se guarda aquí, y lo guardado cuenta para el pedido. Generar suelto queda para lo que no viene de CDM.
 */

interface Props {
  pedido: PedidoDeCopy;
  campanaId: string;
  brief: ContentDNAProfile;
  marca: Client | undefined;
  onGuardado: (cuantas: number) => void;
  onCerrar: () => void;
  onAviso: (mensaje: string, tipo: 'success' | 'error' | 'info' | 'warning') => void;
  /** Lleva a una sección del ADN (de dónde sale cada texto, 2026-11-25). */
  onIrAlAdn?: (clave: ClaveAdn) => void;
}

export default function EscribirPedido({ pedido, campanaId, brief, marca, onGuardado, onCerrar, onAviso, onIrAlAdn }: Props) {
  const [fase, setFase] = React.useState<'concepto' | 'escribiendo' | 'listo' | 'error'>('concepto');
  const [detalle, setDetalle] = React.useState<string | null>(null);
  const [spine, setSpine] = React.useState<CampaignSpine | null>(null);
  const [textos, setTextos] = React.useState<CopyVariation[]>([]);
  const [guardados, setGuardados] = React.useState<string[]>([]);
  const iniciado = React.useRef(false);

  const platform = pedido.canal as Platform;
  // Las slides del carrusel salen del pedido: cuántos textos «slide…» trae la pieza.
  const slides = pedido.textos.filter(t => /^slide/i.test(t.clave)).reduce((n, t) => n + t.repeticiones, 0);
  const params: CopyParameters = React.useMemo(
    () => ({
      ...parametrosDelBrief(brief, marca, {
        platform,
        funnelStage: ETAPA_DEL_MOTOR[pedido.etapa],
        cantidad: acotar(pedido.piezas - pedido.escritas, CANTIDAD),
        slides: slides >= SLIDES.min ? acotar(slides, SLIDES) : undefined,
      }),
      // Qué textos lleva la pieza y su largo, según las ubicaciones que eligió CDM (Meta Ads: un video 4:5 no lleva
      // descripción, y el texto principal de Stories es más corto que el del feed).
      textosDelPedido: pedido.textos.map(t => ({ slot: t.clave, max: t.maximo })),
    }),
    [brief, marca, platform, pedido, slides]
  );

  const generar = React.useCallback(async () => {
    setFase('concepto');
    setDetalle(null);
    setTextos([]);
    const recogidos: CopyVariation[] = [];
    // `generateStream` se traga lo que se lance dentro del callback: el fallo se anota y se mira al final.
    let fallo: string | null = null;
    try {
      await generationApi.generateStream(brief.id, params, event => {
        if (event.type === 'spine') {
          setSpine(event.payload);
          setFase('escribiendo');
        } else if (event.type === 'channel') {
          recogidos.push(...event.payload.variations);
          setTextos([...recogidos]);
        } else if (event.type === 'channel-retry') {
          setDetalle(`Reintentando ${event.payload.intento}/${event.payload.intentosMax}…`);
        } else if (event.type === 'channel-error') {
          fallo = String(event.payload.message).replace('ALERTA_CREDITOS:', '').trim();
        }
      });
      setFase(recogidos.length ? 'listo' : 'error');
      if (!recogidos.length) setDetalle(fallo ?? 'El motor no devolvió piezas. Inténtalo otra vez.');
      else if (fallo) onAviso(`Faltaron piezas: ${fallo}`, 'warning');
    } catch (err) {
      setFase('error');
      setDetalle(err instanceof Error ? err.message : 'No se pudo escribir el pedido');
    }
  }, [brief.id, params]);

  // Se genera al abrir: «Escribir» ya fue la decisión de gastar.
  React.useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    void generar();
  }, [generar]);

  const guardar = async (deLasPiezas: CopyVariation[]) => {
    let ok = 0;
    for (const v of deLasPiezas) {
      try {
        await libraryApi.saveVariation({ ...v, clientId: brief.clientId, projectId: campanaId, lineaDePlanningId: pedido.id, tags: [] });
        ok++;
      } catch (err) {
        onAviso(err instanceof Error ? err.message : 'No se pudo guardar', 'error');
        break;
      }
    }
    if (ok) {
      const conjuntos = [...new Set(deLasPiezas.map(v => v.conjuntoId).filter((c): c is string => !!c))];
      setGuardados(prev => [...prev, ...conjuntos]);
      onGuardado(conjuntos.length);
    }
  };

  return (
    <div className="border-t border-violet-200 bg-violet-50/40 px-4 py-4">
      {fase === 'concepto' || fase === 'escribiendo' ? (
        <div className="flex items-center gap-2 text-[13px] text-violet-900">
          <Loader2 className="h-4 w-4 animate-spin" />
          {fase === 'concepto'
            ? 'Armando el concepto con el brief de la campaña…'
            : `Escribiendo ${nombreDePiezas(platform, params.cantidad ?? 1).toLowerCase()} para ${ETAPA_NOMBRE[pedido.etapa]}…`}
          {detalle && <span className="text-violet-700">· {detalle}</span>}
        </div>
      ) : fase === 'error' ? (
        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          <span className="flex-1 text-red-700">{detalle}</span>
          <button type="button" onClick={() => void generar()} className="rounded-lg bg-[#1D1D1F] px-3 py-1.5 text-[12px] font-semibold text-white">
            Intentar otra vez
          </button>
          <button type="button" onClick={onCerrar} className="text-[12px] font-semibold text-[#6E6E73] hover:text-[#1D1D1F]">
            Cerrar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <ResultadosPorPieza
            variations={textos}
            spine={spine}
            platform={platform}
            slides={params.slides}
            dnaProfileId={brief.id}
            clientId={brief.clientId}
            onIrAlAdn={onIrAlAdn}
            savedContentList={[]}
            savedConjuntos={guardados}
            onGuardar={guardar}
            onOtra={async (texto, deLaPieza) => {
              if (!spine) return;
              try {
                const r = await generationApi.regenerarTexto({
                  dnaProfileId: brief.id,
                  platform: String(texto.platform),
                  existingSpine: spine,
                  params,
                  pieza: texto.piezaIndex,
                  slot: texto.slot,
                  variationIndex: texto.variationIndex,
                  conjuntoId: texto.conjuntoId,
                  textos: deLaPieza.map(t => ({ slot: t.slot, slotLabel: t.slotLabel, content: t.content, variationIndex: t.variationIndex })),
                });
                if (r?.variation) setTextos(prev => prev.map(v => (v.id === texto.id ? r.variation : v)));
              } catch (err) {
                onAviso(err instanceof Error ? err.message : 'No se pudo reescribir el texto', 'error');
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => void generar()} className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1D1D1F] hover:bg-[#F5F5F7]">
              Escribir otra versión
            </button>
            <button type="button" onClick={onCerrar} className="rounded-lg bg-[#1D1D1F] px-3 py-1.5 text-[12px] font-semibold text-white">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
