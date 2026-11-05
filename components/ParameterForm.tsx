import React from 'react';
import { Building2, Layers, Target, Radio, Zap, Check, Loader2, Sparkles, ChevronRight, BookOpen, X, Minus, Plus, Copy as CopyIcon } from 'lucide-react';
import { CANTIDAD, SLIDES, acotar, esCarrusel, nombreDePiezas } from '../piezas';
import { Platform, PLATFORM_GROUPS, FunnelStage, FUNNEL_STAGE_DESCRIPTIONS, CopyParameters, BrandConfig, Client, ContentDNAProfile, Project, WorkspaceMember } from '../types';
import { PlatformIcon } from './ui/platformIcons';
import { apiRequest, clientApi, libraryApi } from '../services/api';
import AprobacionDeCampana from './AprobacionDeCampana';
import { nombreConMadre } from '../marcas';

interface ParameterFormProps {
  onSubmit: (params: CopyParameters) => void;
  /** Cambia cada vez que se pide «Otro medio»: el formulario vuelve sin medio elegido. */
  limpiarMedio?: number;
  isLoading: boolean;
  clients: Client[];
  dnaProfiles: ContentDNAProfile[];
  /** La marca activa. El selector de acá y el del encabezado son el mismo dato. */
  defaultClientId: string;
  onClientChange?: (clientId: string) => void;
  onNavigateToClients: () => void;
  /** Para mostrar y, si administra, definir quién aprueba la campaña elegida. */
  miembros?: WorkspaceMember[];
  puedeEditarAprobacion?: boolean;
  onError?: (mensaje: string) => void;
}

const ParameterForm: React.FC<ParameterFormProps> = ({
  onSubmit,
  limpiarMedio,
  isLoading,
  clients,
  dnaProfiles,
  defaultClientId,
  onClientChange,
  onNavigateToClients,
  miembros = [],
  puedeEditarAprobacion = false,
  onError = () => {},
}) => {


  const [clientId, setClientId] = React.useState(defaultClientId || '');
  const [activeProfileId, setActiveProfileId] = React.useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<Platform[]>([]);
  const [funnelStage, setFunnelStage] = React.useState<FunnelStage>(FunnelStage.CONVERSION);
  // Cuántas piezas del medio y, en el carrusel, cuántas slides (docs/plan-piezas-por-medio.md).
  const [cantidad, setCantidad] = React.useState<number>(CANTIDAD.porDefecto);
  const [slides, setSlides] = React.useState<number>(SLIDES.porDefecto);
  const medio = selectedPlatforms[0] ?? null;
  React.useEffect(() => {
    if (limpiarMedio) setSelectedPlatforms([]);
  }, [limpiarMedio]);

  const [dnaInsights, setDnaInsights] = React.useState<{approvedCount: number; negativeCount: number; topReasons: {reason: string; count: number}[]} | null>(null);

  // Presets state
  const [presets, setPresets] = React.useState<any[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = React.useState(false);
  const [showPresetSave, setShowPresetSave] = React.useState(false);
  const [presetName, setPresetName] = React.useState('');
  const [isSavingPreset, setIsSavingPreset] = React.useState(false);
  const [presetSelectValue, setPresetSelectValue] = React.useState('');

  const loadPresets = async () => {
    setIsLoadingPresets(true);
    try {
      const data = await apiRequest('/presets');
      setPresets(Array.isArray(data) ? data : []);
    } catch {
      // silently ignore
    } finally {
      setIsLoadingPresets(false);
    }
  };

  React.useEffect(() => {
    loadPresets();
  }, []);

  const applyPreset = (preset: any) => {
    const p = preset.parameters;
    if (!p) return;
    if (typeof p.clientId === 'string' && p.clientId) setClientId(p.clientId);
    if (typeof p.activeProfileId === 'string') setActiveProfileId(p.activeProfileId);
    if (Array.isArray(p.selectedPlatforms) && p.selectedPlatforms.length > 0) {
      setSelectedPlatforms(p.selectedPlatforms as Platform[]);
    }
    if (Number.isInteger(p.cantidad)) setCantidad(acotar(p.cantidad, CANTIDAD));
    if (Number.isInteger(p.slides)) setSlides(acotar(p.slides, SLIDES));
    if (typeof p.funnelStage === 'string' && Object.values(FunnelStage).includes(p.funnelStage as FunnelStage)) {
      setFunnelStage(p.funnelStage as FunnelStage);
    }
    setPresetSelectValue('');
  };

  const savePreset = async () => {
    if (!presetName.trim()) return;
    setIsSavingPreset(true);
    try {
      await apiRequest('/presets', {
        method: 'POST',
        body: JSON.stringify({
          name: presetName.trim(),
          clientId,
          parameters: {
            clientId,
            activeProfileId,
            selectedPlatforms,
            funnelStage,
            cantidad,
            slides,
          },
        }),
      });
      await loadPresets();
      setShowPresetSave(false);
      setPresetName('');
    } catch {
      // silently ignore
    } finally {
      setIsSavingPreset(false);
    }
  };

  const deletePreset = async (id: string) => {
    try {
      await apiRequest('/presets/' + id, { method: 'DELETE' });
      setPresets(prev => prev.filter(p => p.id !== id));
    } catch {
      // silently ignore
    }
  };

  React.useEffect(() => {
    if (clients.length > 0) {
      if (!clientId || !clients.find(c => c.id === clientId)) {
        setClientId(defaultClientId || clients[0].id);
      }
    }
  }, [clients, defaultClientId]);

  // La marca del encabezado manda: si cambia allá, cambia acá.
  React.useEffect(() => {
    if (defaultClientId && defaultClientId !== clientId) setClientId(defaultClientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultClientId]);

  React.useEffect(() => {
    setActiveProfileId(null);
    setDnaInsights(null);
  }, [clientId]);

  /**
   * La campaña operativa del brief elegido: quién aprueba lo que se genere.
   * Se muestra antes de generar porque sin responsable el copy se guarda pero
   * no avanza, y conviene saberlo antes de gastar, no después.
   */
  const [campana, setCampana] = React.useState<Project | null>(null);
  React.useEffect(() => {
    setCampana(null);
    if (!activeProfileId) return;
    libraryApi
      .campanaDeBrief(activeProfileId)
      .then((c: Project) => setCampana(c))
      .catch(() => setCampana(null));
  }, [activeProfileId]);

  React.useEffect(() => {
    if (!activeProfileId) { setDnaInsights(null); return; }
    clientApi.getDNAInsights(activeProfileId)
      .then((data: any) => setDnaInsights(data))
      .catch(() => setDnaInsights(null));
  }, [activeProfileId]);

  // Un medio por generación: elegir otro reemplaza al anterior.
  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms(prev => (prev[0] === p ? [] : [p]));
  };

  const buildParams = (): CopyParameters | null => {
    const activeClient = clients.find(c => c.id === clientId);
    const profile = dnaProfiles.find(p => p.id === activeProfileId);
    if (!profile || selectedPlatforms.length === 0 || !clientId) return null;
    return {
      voice: profile.voice,
      goal: profile.goal,
      theme: profile.theme,
      product: profile.product,
      targetAudience: profile.targetAudience,
      keywords: profile.keywords,
      prohibitions: profile.prohibitions,
      brandVoiceGuidelines: profile.brandVoiceGuidelines,
      valueProposition: profile.valueProposition,
      primaryCTA: profile.primaryCTA,
      funnelStage,
      feedbackExamples: profile.feedbackExamples,
      platforms: selectedPlatforms.slice(0, 1),
      cantidad,
      ...(esCarrusel(medio) ? { slides } : {}),
      clientId,
      dnaProfileId: profile.id,
      clientName: activeClient?.name,
      clientIndustry: activeClient?.industry,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = buildParams();
    if (p) onSubmit(p);
  };

  const clientProfiles = dnaProfiles.filter(p => p.clientId === clientId);

  const activeClient = clients.find(c => c.id === clientId);
  const activeProfile = clientProfiles.find(p => p.id === activeProfileId);
  const canSubmit = !isLoading && !!activeProfileId && selectedPlatforms.length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300 sticky top-6"
    >
      {/* PRESETS */}
      <div className="px-5 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Presets</span>
          <button
            type="button"
            onClick={() => setShowPresetSave(v => !v)}
            className="text-[10px] font-medium text-gray-500 border border-gray-200 bg-white px-2 py-0.5 rounded hover:bg-gray-50 transition-colors"
          >
            Guardar como preset
          </button>
        </div>

        <select
          value={presetSelectValue}
          onChange={e => {
            const val = e.target.value;
            setPresetSelectValue(val);
            if (val !== '') {
              const found = presets.find(p => p.id === val);
              if (found) applyPreset(found);
            }
          }}
          disabled={isLoadingPresets || presets.length === 0}
          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 focus:border-gray-400 outline-none transition-colors text-[12px] disabled:opacity-50"
        >
          <option value="">{isLoadingPresets ? 'Cargando…' : 'Cargar preset…'}</option>
          {presets.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {showPresetSave && (
          <div className="mt-2 flex items-center gap-1.5">
            <input
              type="text"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              placeholder="Nombre del preset"
              className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-900 outline-none focus:border-gray-400 transition-colors"
            />
            <button
              type="button"
              onClick={savePreset}
              disabled={isSavingPreset || !presetName.trim()}
              className="text-[11px] font-medium bg-ink text-white px-3 py-1.5 rounded-lg hover:bg-ink disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {isSavingPreset ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => { setShowPresetSave(false); setPresetName(''); }}
              className="text-[11px] font-medium text-gray-500 border border-gray-200 bg-white px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {presets.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {presets.map(p => (
              <span key={p.id} className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-medium px-2 py-0.5 rounded-full">
                {p.name}
                <button
                  type="button"
                  onClick={() => deletePreset(p.id)}
                  className="text-gray-400 hover:text-gray-700 transition-colors ml-0.5"
                  aria-label={`Eliminar preset ${p.name}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* STEPPER */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-0">
          {[
            { n: 1, label: 'Marca',    done: !!clientId },
            { n: 2, label: 'Campaña',  done: !!activeProfileId },
            { n: 3, label: 'Funnel',   done: true },
            { n: 4, label: 'Medio',  done: selectedPlatforms.length > 0 },
          ].map((step, i, arr) => (
            <React.Fragment key={step.n}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold border-2 transition-colors ${
                  step.done
                    ? 'bg-ink border-gray-900 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {step.done ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg> : step.n}
                </div>
                <span className={`text-[9px] font-medium ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</span>
              </div>
              {i < arr.length - 1 && (
                <div className={`flex-1 h-0.5 mb-3 mx-1 ${step.done ? 'bg-ink' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* MARCA */}
      <Section icon={<Building2 className="w-3.5 h-3.5" />} label="Marca">
        <select
          value={clientId}
          onChange={e => {
            setClientId(e.target.value);
            onClientChange?.(e.target.value);
          }}
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-gray-400 outline-none transition-colors text-[13px]"
        >
          {clients.length === 0 && <option value="">Sin marcas registradas</option>}
          {clients.map(c => <option key={c.id} value={c.id}>{nombreConMadre(c, clients)}</option>)}
        </select>

        {activeClient && (
          <div className="mt-2 flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
            <div className="w-8 h-8 bg-white rounded-md overflow-hidden border border-gray-100 flex items-center justify-center shrink-0">
              {activeClient.logo
                ? <img src={activeClient.logo} className="w-full h-full object-contain p-1" alt={activeClient.name} />
                : <span className="font-medium text-gray-400 text-[10px]">{activeClient.name.substring(0, 2).toUpperCase()}</span>}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-gray-900 leading-none mb-0.5 truncate">{activeClient.name}</p>
              <p className="text-[10px] text-gray-500">{activeClient.industry}</p>
            </div>
            {activeClient.brandFingerprint && (
              <span className="ml-auto text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full" title="Voice fingerprint calculado">
                ◉ FP
              </span>
            )}
          </div>
        )}
      </Section>

      {/* CAMPAÑA */}
      <Section icon={<Layers className="w-3.5 h-3.5" />} label="Campaña" hint="ADN estratégico" required={!activeProfileId}>
        {clientId && clientProfiles.length > 0 ? (
          <div className="space-y-1.5">
            {clientProfiles.map(profile => {
              const active = activeProfileId === profile.id;
              const trained = (profile.feedbackExamples?.length || 0) > 0;
              return (
                <React.Fragment key={profile.id}>
                <button
                  type="button"
                  onClick={() => setActiveProfileId(profile.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    active
                      ? 'bg-blue-50 border-blue-300 shadow-[0_0_0_3px_rgba(59,130,246,0.08)]'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] font-medium leading-tight ${active ? 'text-blue-900' : 'text-gray-900'}`}>{profile.name}</p>
                      {profile.campaignConcept && (
                        <p className={`text-[10px] mt-1 leading-snug italic ${active ? 'text-blue-700/80' : 'text-gray-500'} line-clamp-2`}>
                          "{profile.campaignConcept}"
                        </p>
                      )}
                    </div>
                    {active && (
                      <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Pill>{profile.goal}</Pill>
                    {trained && <Pill variant="info">◉ Entrenada ({profile.feedbackExamples!.length})</Pill>}
                  </div>
                </button>
                {/* Pegado a la campaña elegida y no al final de la lista: con
                    muchas campañas quedaba lejos de lo que se acababa de elegir. */}
                {active && campana && (
                  <AprobacionDeCampana
                    campana={campana}
                    miembros={miembros}
                    puedeEditar={puedeEditarAprobacion}
                    onCambio={setCampana}
                    onError={onError}
                  />
                )}
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div className="p-5 border border-dashed border-gray-200 rounded-lg text-center bg-gray-50/50">
            <BookOpen className="w-5 h-5 text-gray-300 mx-auto mb-2" />
            <p className="text-[12px] font-medium text-gray-900 mb-0.5">Sin campañas</p>
            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">Configura el ADN de una campaña para activar el motor.</p>
            {clientId && (
              <button
                type="button"
                onClick={onNavigateToClients}
                className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-700 text-[11px] font-medium px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
              >
                Configurar campaña
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
        {dnaInsights && (dnaInsights.approvedCount > 0 || dnaInsights.negativeCount > 0) && (
          <div className="flex items-center gap-3 mt-1.5 px-1">
            {dnaInsights.approvedCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                {dnaInsights.approvedCount} aprobados
              </span>
            )}
            {dnaInsights.negativeCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-red-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {dnaInsights.negativeCount} rechazos aprendidos
              </span>
            )}
            {(dnaInsights.approvedCount > 0 || dnaInsights.negativeCount > 0) && (
              <span className="text-[10px] text-gray-400">· el ADN está aprendiendo</span>
            )}
          </div>
        )}
        {activeProfile && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-1.5 animate-in fade-in duration-200">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-500">Vista previa del ADN</p>
            {activeProfile.product && (
              <p className="text-[11px] text-blue-900"><span className="font-medium">Producto:</span> {activeProfile.product}</p>
            )}
            {activeProfile.targetAudience && (
              <p className="text-[11px] text-blue-900"><span className="font-medium">Audiencia:</span> {activeProfile.targetAudience}</p>
            )}
            {(activeProfile.feedbackExamples?.length ?? 0) > 0 && (
              <p className="text-[11px] text-blue-700">◉ {activeProfile.feedbackExamples!.length} ejemplo{activeProfile.feedbackExamples!.length !== 1 ? 's' : ''} de entrenamiento</p>
            )}
          </div>
        )}
      </Section>

      {/* FUNNEL */}
      <Section icon={<Target className="w-3.5 h-3.5" />} label="Etapa del funnel" hint="Condiciona tono e intención">
        <div className="grid grid-cols-2 gap-1.5">
          {Object.values(FunnelStage).map(stage => {
            const active = funnelStage === stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setFunnelStage(stage)}
                className={`text-left p-2.5 rounded-lg border transition-all ${
                  active
                    ? 'bg-blue-50 border-blue-300 shadow-[0_0_0_3px_rgba(59,130,246,0.08)]'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[11px] font-medium ${active ? 'text-blue-900' : 'text-gray-900'}`}>{stage}</span>
                  {active && (
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <span className={`text-[9.5px] leading-tight block ${active ? 'text-blue-700/80' : 'text-gray-500'}`}>
                  {FUNNEL_STAGE_DESCRIPTIONS[stage]}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* CANALES */}
      <Section icon={<Radio className="w-3.5 h-3.5" />} label="Medio" hint={medio ? medio : 'Uno por generación'} required={!medio}>
        <div className="space-y-3">
          {Object.entries(PLATFORM_GROUPS).map(([groupName, platforms]) => (
            <div key={groupName}>
              <div className="text-[9px] font-medium uppercase tracking-[0.15em] text-gray-400 mb-1.5">{groupName}</div>
              <div className="flex flex-wrap gap-1.5">
                {platforms.map(p => {
                  const active = selectedPlatforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border text-[11px] font-medium transition-all ${
                        active
                          ? 'bg-ink text-white border-gray-900 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`shrink-0 transition-opacity ${active ? 'opacity-100' : 'opacity-70'}`}>
                        <PlatformIcon platform={p} size="sm" />
                      </span>
                      <span>{p}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* CUÁNTOS: solo con un medio elegido */}
      {medio && (
        <Section icon={<CopyIcon className="w-3.5 h-3.5" />} label="Cuántos" hint={nombreDePiezas(medio, cantidad)}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-6">
              <Contador etiqueta={esCarrusel(medio) ? 'Carruseles' : 'Piezas'} valor={cantidad} limites={CANTIDAD} onCambio={setCantidad} />
              {esCarrusel(medio) && <Contador etiqueta="Slides por carrusel" valor={slides} limites={SLIDES} onCambio={setSlides} />}
            </div>
            <VistaPrevia cantidad={cantidad} slides={esCarrusel(medio) ? slides : 0} medio={medio} />
          </div>
        </Section>
      )}

      {/* CTA */}
      <div className="px-5 py-4 bg-gray-50/50 border-t border-gray-100 space-y-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-2.5 rounded-lg font-medium text-[13px] transition-all flex items-center justify-center gap-2 ${
            !canSubmit
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              : 'bg-ink text-white hover:bg-ink shadow-sm hover:shadow-md'
          }`}
        >
          {isLoading
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generando…</>
            : <><Sparkles className="w-3.5 h-3.5" />{medio ? `Generar ${nombreDePiezas(medio, cantidad)}` : 'Generar'}</>}
        </button>

        {activeProfile && (

          <div className="pt-1 flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
            <Zap className="w-3 h-3" />
            <span className="flex items-center gap-1 flex-wrap justify-center">
              <span>Director</span>
              <span className="text-gray-300">→</span>
              <span>{medio ? nombreDePiezas(medio, cantidad) : 'Redactor'}</span>
              <span className="text-gray-300">→</span>
              <span>Validador</span>
              <span className="text-gray-300">→</span>
              <span>Editor IA</span>
              <span className="text-gray-300">→</span>
              <span>Auditoría</span>
            </span>
          </div>
        )}
      </div>
    </form>
  );
};

/** − n + para la cantidad y las slides. */
const Contador: React.FC<{
  etiqueta: string;
  valor: number;
  limites: { min: number; max: number };
  onCambio: (n: number) => void;
}> = ({ etiqueta, valor, limites, onCambio }) => (
  <div>
    <div className="mb-1.5 text-[11px] font-semibold text-gray-700">{etiqueta}</div>
    <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white">
      <button type="button" disabled={valor <= limites.min} onClick={() => onCambio(valor - 1)} className="flex h-8 w-8 items-center justify-center text-gray-600 disabled:opacity-30" aria-label={`Menos ${etiqueta.toLowerCase()}`}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="flex h-8 w-11 items-center justify-center border-x border-gray-200 text-[15px] font-bold text-gray-900">{valor}</span>
      <button type="button" disabled={valor >= limites.max} onClick={() => onCambio(valor + 1)} className="flex h-8 w-8 items-center justify-center text-gray-600 disabled:opacity-30" aria-label={`Más ${etiqueta.toLowerCase()}`}>
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
);

/**
 * Lo que va a salir, de un vistazo: una pieza al frente (en el carrusel, sus slides numeradas, la primera
 * verde y la última ámbar) y las demás apiladas detrás, con «5 × 6» al lado. Diseño en el .pen.
 */
const VistaPrevia: React.FC<{ cantidad: number; slides: number; medio: string }> = ({ cantidad, slides, medio }) => {
  const atras = Math.min(cantidad - 1, 2);
  return (
    <div className="flex items-center gap-6 rounded-lg bg-gray-50 px-4 py-3">
      <div className="relative" style={{ marginRight: atras * 8, marginTop: atras * 6 }}>
        {Array.from({ length: atras }).map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-lg border border-gray-200 bg-gray-100"
            style={{ transform: `translate(${(atras - i) * 8}px, ${-(atras - i) * 6}px)` }}
          />
        ))}
        <div className="relative flex gap-1 rounded-lg border border-gray-200 bg-white p-1.5">
          {slides > 0 ? (
            Array.from({ length: slides }).map((_, i) => (
              <span
                key={i}
                className={`flex h-9 w-6 items-center justify-center rounded text-[9px] font-bold ${
                  i === 0 ? 'bg-[#0F766E] text-white' : i === slides - 1 ? 'bg-[#D97706] text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i + 1}
              </span>
            ))
          ) : (
            <span className="block h-9 w-14 rounded bg-gray-200" />
          )}
        </div>
      </div>
      <div>
        <div className="text-[22px] font-bold leading-none text-gray-900">{slides > 0 ? `${cantidad} × ${slides}` : `× ${cantidad}`}</div>
        <div className="mt-1 text-[10.5px] text-gray-500">{slides > 0 ? 'carruseles × slides' : nombreDePiezas(medio, cantidad).replace(/^\d+ /, '')}</div>
      </div>
    </div>
  );
};

const Section: React.FC<{
  icon: React.ReactNode;
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ icon, label, hint, required, children }) => (
  <div className="px-5 py-4 border-b border-gray-100 last:border-b-0">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-gray-500">{icon}</span>
      <span className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.08em]">{label}</span>
      {required && (
        <span className="text-[9px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
          requerido
        </span>
      )}
      {hint && !required && <span className="text-[10px] text-gray-400 ml-auto truncate">{hint}</span>}
    </div>
    {children}
  </div>
);

const Pill: React.FC<{ children: React.ReactNode; variant?: 'default' | 'info' }> = ({ children, variant = 'default' }) => {
  const cls = variant === 'info'
    ? 'bg-blue-50 text-blue-700 border-blue-100'
    : 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`text-[9.5px] font-medium px-1.5 py-0.5 rounded border ${cls}`}>{children}</span>
  );
};

export default ParameterForm;
