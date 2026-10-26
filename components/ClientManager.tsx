import React from 'react';
import { SCREENS } from '../screens';
import { Check, Circle } from 'lucide-react';
import { Client, ContentDNAProfile, BrandConfig, FeedbackExample, Platform, SavedVariation } from '../types';
import TagInput from './TagInput';
import PromptPreview from './PromptPreview';
import GenerationHistory from './GenerationHistory';
import VoiceFingerprintCard from './VoiceFingerprintCard';
import BrandHubHero from './BrandHubHero';
import { clientApi, analyticsApi } from '../services/api';
import { Copy, CornerDownRight } from 'lucide-react';
import { distincion, familias, madreDe, madresPosibles, normalizarNombre, opcionDeMadre, tieneNombreRepetido } from '../marcas';

interface ClientManagerProps {
  clients: Client[];
  dnaProfiles: ContentDNAProfile[];
  voices: BrandConfig[];
  goals: BrandConfig[];
  onUpdateVoices: (voices: BrandConfig[]) => void;
  onUpdateGoals: (goals: BrandConfig[]) => void;
  onResetDefaults: () => void;
  savedVariations: SavedVariation[];
  onAdd: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<Client>) => void;
  onRemove: (id: string) => void;
  /** Une dos marcas que eran la misma. Resuelve cuando terminó, o falla con el motivo. */
  onUnir?: (origenId: string, destinoId: string) => Promise<void>;
  onSaveProfile: (profile: Omit<ContentDNAProfile, 'id' | 'createdAt'>) => void;
  onUpdateProfile: (id: string, updates: Partial<ContentDNAProfile>) => void;
  onDeleteProfile: (id: string) => void;
  onDuplicateProfile: (profile: ContentDNAProfile) => void;
  /** Entrar a una marca la vuelve la marca activa de toda la app. */
  onAbrirMarca?: (clientId: string) => void;
}

const ClientManager: React.FC<ClientManagerProps> = ({
  clients,
  dnaProfiles,
  voices,
  goals,
  savedVariations,
  onUpdateVoices,
  onUpdateGoals,
  onResetDefaults,
  onAdd,
  onUpdate,
  onRemove,
  onUnir,
  onSaveProfile,
  onUpdateProfile,
  onDeleteProfile,
  onDuplicateProfile,
  onAbrirMarca,
}) => {
  const [isAddingClient, setIsAddingClient] = React.useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = React.useState(false);
  const [activeClientHub, setActiveClientHub] = React.useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = React.useState<string | null>(null);
  const [clientForm, setClientForm] = React.useState({ name: '', industry: '', logo: '', marcaMadreId: '' });
  /** La tarjeta con nombre repetido que se está resolviendo, y el nombre nuevo si se renombra. */
  const [resolviendo, setResolviendo] = React.useState<{ id: string; modo: 'renombrar' | 'madre'; valor: string } | null>(null);
  /** El diálogo de unir: las dos marcas y cuál queda. */
  const [uniendo, setUniendo] = React.useState<{ a: string; b: string; queda: string } | null>(null);
  const [unirOcupado, setUnirOcupado] = React.useState(false);
  
  // States for Global Strategy Catalog
  const [newVoice, setNewVoice] = React.useState('');
  const [newGoal, setNewGoal] = React.useState('');
  const [editingCatalogItem, setEditingCatalogItem] = React.useState<{ type: 'voice' | 'goal', id: string, value: string } | null>(null);

  const [showDnaForm, setShowDnaForm] = React.useState(false);
  const [dnaForm, setDnaForm] = React.useState<Omit<ContentDNAProfile, 'id' | 'createdAt' | 'clientId'>>({
    name: '',
    campaignConcept: '',
    voice: voices[0]?.name || '',
    goal: goals[0]?.name || '',
    product: '',
    targetAudience: '',
    theme: '',
    keywords: '',
    prohibitions: '',
    brandVoiceGuidelines: '',
    valueProposition: '',
    primaryCTA: '',
    feedbackExamples: []
  });

  const [newFeedback, setNewFeedback] = React.useState<FeedbackExample>({ platform: Platform.INSTAGRAM_POST, content: '' });

  // Brand-guideline PDF upload state
  const [uploadingGuideline, setUploadingGuideline] = React.useState(false);
  const [deletingGuideline, setDeletingGuideline] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [extractedSummary, setExtractedSummary] = React.useState<string | null>(null);

  // Voice fingerprint state
  const [computingFingerprint, setComputingFingerprint] = React.useState(false);
  const [fingerprintError, setFingerprintError] = React.useState<string | null>(null);

  // Duplicate campaign state
  const [duplicatingId, setDuplicatingId] = React.useState<string | null>(null);

  // Client detail view state
  const [clientDetailView, setClientDetailView] = React.useState<'campaigns' | 'metrics'>('campaigns');

  // Analytics / Metricas state
  const [analyticsData, setAnalyticsData] = React.useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = React.useState(false);
  const [analyticsError, setAnalyticsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (clientDetailView === 'metrics' && activeClientHub) {
      setAnalyticsData(null);
      setAnalyticsError(null);
      setAnalyticsLoading(true);
      analyticsApi.get(activeClientHub)
        .then((data: any) => { setAnalyticsData(data); })
        .catch((err: any) => { setAnalyticsError(err?.message || 'Error cargando métricas'); })
        .finally(() => { setAnalyticsLoading(false); });
    }
  }, [clientDetailView, activeClientHub]);

  const handleDuplicateProfile = async (profile: ContentDNAProfile) => {
    setDuplicatingId(profile.id);
    try {
      const copy = await clientApi.duplicateDNA(profile.id);
      onDuplicateProfile(copy);
    } catch (err: any) {
      alert(err?.message || 'Error al duplicar la campaña');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleComputeFingerprint = async (clientId: string) => {
    setFingerprintError(null);
    setComputingFingerprint(true);
    try {
      const result = await clientApi.computeFingerprint(clientId);
      onUpdate(clientId, {
        brandFingerprint: result.client.brandFingerprint,
        brandFingerprintAt: result.client.brandFingerprintAt,
      } as Partial<Client>);
    } catch (err: any) {
      setFingerprintError(err?.message || 'Error calculando fingerprint');
    } finally {
      setComputingFingerprint(false);
    }
  };

  const handleDeleteGuideline = async (clientId: string) => {
    if (!window.confirm('¿Eliminar el manual de marca? Se perderá la extracción de IA guardada.')) return;
    setDeletingGuideline(true);
    setUploadError(null);
    setExtractedSummary(null);
    try {
      await clientApi.deleteBrandGuideline(clientId);
      onUpdate(clientId, {
        brandGuidelinePdfUrl: null,
        brandGuidelineFileName: null,
        brandGuidelineExtractedAt: null,
      } as Partial<Client>);
    } catch (err: any) {
      setUploadError(err?.message || 'Error al eliminar el manual');
    } finally {
      setDeletingGuideline(false);
    }
  };

  const handleUploadGuideline = async (clientId: string, file: File) => {
    setUploadError(null);
    setExtractedSummary(null);

    const MAX_MB = 15;
    const IDEAL_MB = 5;
    if (file.type !== 'application/pdf') {
      setUploadError(`Formato no válido: "${file.name}" no es un PDF. Solo se aceptan archivos .pdf.`);
      return;
    }
    const fileMb = file.size / 1024 / 1024;
    if (fileMb > MAX_MB) {
      setUploadError(`El archivo pesa ${fileMb.toFixed(1)} MB y supera el límite de ${MAX_MB} MB. Comprimí el PDF antes de subirlo.`);
      return;
    }
    if (fileMb > IDEAL_MB) {
      // Warn but allow — just clear previous error
      setUploadError(null);
    }

    setUploadingGuideline(true);
    try {
      const result = await clientApi.uploadBrandGuideline(clientId, file);
      // Sync local state through the existing onUpdate prop (server already persisted).
      const c = result.client as Partial<Client>;
      onUpdate(clientId, {
        voice: c.voice,
        valueProposition: c.valueProposition,
        brandVoiceGuidelines: c.brandVoiceGuidelines,
        brandKeywords: c.brandKeywords,
        brandProhibitions: c.brandProhibitions,
        brandGuidelinePdfUrl: c.brandGuidelinePdfUrl,
        brandGuidelineFileName: c.brandGuidelineFileName,
        brandGuidelineExtractedAt: c.brandGuidelineExtractedAt,
      } as Partial<Client>);
      setExtractedSummary(result.extracted?.summary || 'Marca actualizada con la información del PDF.');
    } catch (err: any) {
      setUploadError(err?.message || 'Error procesando el PDF');
    } finally {
      setUploadingGuideline(false);
    }
  };

  // Catalog Handlers
  const addCatalogItem = (type: 'voice' | 'goal') => {
    const value = type === 'voice' ? newVoice : newGoal;
    if (!value.trim()) return;
    const newItem = { id: Math.random().toString(36).substr(2, 9), name: value.trim() };
    if (type === 'voice') {
      onUpdateVoices([...voices, newItem]);
      setNewVoice('');
    } else {
      onUpdateGoals([...goals, newItem]);
      setNewGoal('');
    }
  };

  const removeCatalogItem = (type: 'voice' | 'goal', id: string) => {
    if (type === 'voice') onUpdateVoices(voices.filter(v => v.id !== id));
    else onUpdateGoals(goals.filter(g => g.id !== id));
  };

  const saveCatalogEdit = () => {
    if (!editingCatalogItem || !editingCatalogItem.value.trim()) return;
    if (editingCatalogItem.type === 'voice') {
      onUpdateVoices(voices.map(v => v.id === editingCatalogItem.id ? { ...v, name: editingCatalogItem.value } : v));
    } else {
      onUpdateGoals(goals.map(g => g.id === editingCatalogItem.id ? { ...g, name: editingCatalogItem.value } : g));
    }
    setEditingCatalogItem(null);
  };

  const startEditProfile = (profile: ContentDNAProfile) => {
    setDnaForm({
      name: profile.name,
      campaignConcept: profile.campaignConcept || '',
      voice: '', // Global legacy
      goal: profile.goal,
      product: profile.product,
      targetAudience: profile.targetAudience,
      theme: profile.theme,
      keywords: profile.keywords,
      prohibitions: profile.prohibitions || '',
      brandVoiceGuidelines: '', // Global legacy
      valueProposition: '', // Global legacy
      primaryCTA: profile.primaryCTA,
      feedbackExamples: profile.feedbackExamples || []
    });
    setEditingProfileId(profile.id);
    setShowDnaForm(true);
    setTimeout(() => {
      document.getElementById('dna-editor-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  const addFeedback = () => {
    if (!newFeedback.content.trim()) return;
    setDnaForm(prev => ({ ...prev, feedbackExamples: [...prev.feedbackExamples, { ...newFeedback }] }));
    setNewFeedback({ ...newFeedback, content: '' });
  };

  const removeFeedback = (index: number) => {
    setDnaForm(prev => ({ ...prev, feedbackExamples: prev.feedbackExamples.filter((_, i) => i !== index) }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setClientForm(prev => ({ ...prev, logo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDNA = () => {
    if (!activeClientHub) return;
    if (!dnaForm.name || !dnaForm.theme) {
      alert("Por favor completa los campos del Brief (Nombre y Tema).");
      return;
    }
    if (editingProfileId) onUpdateProfile(editingProfileId, dnaForm);
    else onSaveProfile({ ...dnaForm, clientId: activeClientHub });
    resetDnaForm();
  };

  const resetDnaForm = () => {
    setDnaForm({
      name: '',
      campaignConcept: '',
      voice: voices[0]?.name || '',
      goal: goals[0]?.name || '',
      product: '',
      targetAudience: '',
      theme: '',
      keywords: '',
      prohibitions: '',
      brandVoiceGuidelines: '',
      valueProposition: '',
      primaryCTA: '',
      feedbackExamples: []
    });
    setEditingProfileId(null);
    setShowDnaForm(false);
  };

  const enterHub = (clientId: string) => {
    setActiveClientHub(clientId);
    onAbrirMarca?.(clientId);
    resetDnaForm();
    setShowGlobalSettings(false);
    setClientDetailView('campaigns');
    setAnalyticsData(null);
    setAnalyticsError(null);
  };

  const exitHub = () => {
    setActiveClientHub(null);
    resetDnaForm();
    setClientDetailView('campaigns');
    setAnalyticsData(null);
    setAnalyticsError(null);
  };

  const inputStyle = "w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300 text-sm shadow-sm";
  const labelStyle = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3";

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* GLOBAL STRATEGY CATALOG SECTION */}
      {showGlobalSettings && !activeClientHub && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setShowGlobalSettings(false)}></div>
           <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-xl border border-gray-200 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <div>
                  <h3 className="text-[16px] font-medium text-gray-900">Configuración Global</h3>
                  <p className="text-[12px] text-gray-500 mt-0.5">Define las voces y objetivos disponibles para todas las marcas.</p>
                </div>
                <div className="flex items-center gap-4">
                   <button onClick={onResetDefaults} className="text-[12px] font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1.5 transition-colors">
                     <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                     Restaurar
                   </button>
                   <button onClick={() => setShowGlobalSettings(false)} className="text-gray-400 hover:text-gray-900 p-1 rounded-md transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 custom-scrollbar">
                {/* Voices List */}
                <div className="space-y-4">
                  <label className="block text-[12px] font-medium text-gray-700">Voces de Marca</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Ej: Rebelde e Irreverente" className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-[13px] outline-none focus:border-gray-400 transition-colors placeholder:text-gray-400" value={newVoice} onChange={e => setNewVoice(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCatalogItem('voice')} />
                    <button onClick={() => addCatalogItem('voice')} className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-4 rounded-lg font-medium transition-colors text-[13px]">+</button>
                  </div>
                  <div className="space-y-2">
                    {voices.map(v => (
                      <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg group hover:border-gray-300 transition-colors">
                        {editingCatalogItem?.id === v.id ? (
                          <input className="flex-1 font-medium text-[13px] outline-none bg-transparent" value={editingCatalogItem.value} onChange={e => setEditingCatalogItem({...editingCatalogItem, value: e.target.value})} onKeyDown={e => e.key === 'Enter' && saveCatalogEdit()} autoFocus />
                        ) : (
                          <span className="text-[13px] font-medium text-gray-700">{v.name}</span>
                        )}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => editingCatalogItem ? saveCatalogEdit() : setEditingCatalogItem({type: 'voice', id: v.id, value: v.name})} className="p-1 text-gray-400 hover:text-gray-900">
                             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => removeCatalogItem('voice', v.id)} className="p-1 text-gray-400 hover:text-red-500">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Goals List */}
                <div className="space-y-4">
                  <label className="block text-[12px] font-medium text-gray-700">Objetivos Tácticos</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Ej: Captación Directa" className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-[13px] outline-none focus:border-gray-400 transition-colors placeholder:text-gray-400" value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCatalogItem('goal')} />
                    <button onClick={() => addCatalogItem('goal')} className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-4 rounded-lg font-medium transition-colors text-[13px]">+</button>
                  </div>
                  <div className="space-y-2">
                    {goals.map(g => (
                      <div key={g.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg group hover:border-gray-300 transition-colors">
                        {editingCatalogItem?.id === g.id ? (
                          <input className="flex-1 font-medium text-[13px] outline-none bg-transparent" value={editingCatalogItem.value} onChange={e => setEditingCatalogItem({...editingCatalogItem, value: e.target.value})} onKeyDown={e => e.key === 'Enter' && saveCatalogEdit()} autoFocus />
                        ) : (
                          <span className="text-[13px] font-medium text-gray-700">{g.name}</span>
                        )}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => editingCatalogItem ? saveCatalogEdit() : setEditingCatalogItem({type: 'goal', id: g.id, value: g.name})} className="p-1 text-gray-400 hover:text-gray-900">
                             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => removeCatalogItem('goal', g.id)} className="p-1 text-gray-400 hover:text-red-500">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* REGISTRATION MODAL */}
      {isAddingClient && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setIsAddingClient(false)}></div>
           <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl border border-gray-200 animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                 <div>
                    <h3 className="text-[16px] font-medium text-gray-900">Nuevo Cliente</h3>
                    <p className="text-[12px] text-gray-500 mt-0.5">Añade una nueva marca a tu espacio de trabajo.</p>
                 </div>
                 <button onClick={() => setIsAddingClient(false)} className="text-gray-400 hover:text-gray-900 p-1 rounded-md transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); onAdd({ ...clientForm, marcaMadreId: clientForm.marcaMadreId || null } as any); setIsAddingClient(false); setClientForm({name:'', industry:'', logo:'', marcaMadreId: ''}); }} className="p-6">
                <div className="flex flex-col md:flex-row gap-6 mb-8">
                  <div className="w-24 h-24 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => document.getElementById('logo-upload')?.click()}>
                    {clientForm.logo ? (
                      <img src={clientForm.logo} className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-[10px] font-medium">Logo</span>
                      </div>
                    )}
                    <input id="logo-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-[12px] font-medium text-gray-700 mb-1">Nombre Comercial</label>
                      <input required type="text" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-[13px] outline-none focus:border-gray-400 transition-colors" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-gray-700 mb-1">Industria</label>
                      <input required type="text" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-[13px] outline-none focus:border-gray-400 transition-colors" placeholder="Ej: SaaS, Finanzas..." value={clientForm.industry} onChange={e => setClientForm({...clientForm, industry: e.target.value})} />
                    </div>
                    {/* No se bloquea crear un nombre que ya existe: se avisa antes, y
                        muchas veces lo que se quería era una complementaria. */}
                    {(() => {
                      const igual = clientForm.name.trim()
                        ? clients.find(c => normalizarNombre(c.name) === normalizarNombre(clientForm.name))
                        : undefined;
                      return igual && !clientForm.marcaMadreId ? (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                          Ya hay una «{igual.name}» en este workspace. ¿Querías crear una complementaria? Elegila en «Es parte de».
                        </p>
                      ) : null;
                    })()}
                    <div>
                      <label className="block text-[12px] font-medium text-gray-700 mb-1">Es parte de</label>
                      <select
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-[13px] outline-none focus:border-gray-400"
                        value={clientForm.marcaMadreId}
                        onChange={e => setClientForm({ ...clientForm, marcaMadreId: e.target.value })}
                      >
                        <option value="">Ninguna: es una marca madre</option>
                        {madresPosibles(null, clients).map(m => (
                          <option key={m.id} value={m.id}>{opcionDeMadre(m)}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-gray-500">Ordena el selector y esta pantalla. No comparte ADN, campañas ni aprobaciones.</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                   <button type="button" onClick={() => setIsAddingClient(false)} className="px-4 py-2 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-50 border border-transparent transition-colors">Cancelar</button>
                   <button type="submit" className="px-4 py-2 rounded-lg text-[13px] font-medium bg-ink text-white hover:bg-ink-hover transition-colors shadow-sm">Crear Cliente</button>
                </div>
              </form>
           </div>
        </div>
      )}


      {/* UNIR — docs/plan-marcas-relacionadas.md, entrega 2. Dibujado en el .pen,
          «§ Marcas · Declarar y unir». */}
      {uniendo && (() => {
        const a = clients.find(c => c.id === uniendo.a);
        const b = clients.find(c => c.id === uniendo.b);
        if (!a || !b) return null;
        const queda = uniendo.queda === a.id ? a : b;
        const seVa = queda === a ? b : a;
        const copyDe = (c: Client) => savedVariations.filter(v => v.clientId === c.id).length;
        const ADN: [keyof Client, string][] = [
          ['voice', 'voz'],
          ['valueProposition', 'propuesta de valor'],
          ['brandVoiceGuidelines', 'guía de voz'],
          ['brandKeywords', 'palabras clave'],
          ['brandProhibitions', 'prohibiciones'],
        ];
        const adnPropio = ADN.filter(([k]) => {
          const v = (seVa[k] as string | undefined)?.trim();
          return v && v !== (queda[k] as string | undefined)?.trim();
        }).map(([, n]) => n);
        const otraEnLista = (c: Client) => (c.nombreRepetidoCon ?? []).map(id => clients.find(x => x.id === id)).filter(Boolean) as Client[];
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-ink/40" onClick={() => !unirOcupado && setUniendo(null)} />
            <div role="dialog" aria-modal="true" className="relative w-full max-w-lg space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
              <h3 className="text-[16px] font-semibold text-gray-900">Unir las dos «{a.name.trim()}»</h3>
              {otraEnLista(a).length > 1 && (
                <label className="block text-[12px] text-gray-600">
                  Con cuál
                  <select
                    value={uniendo.b}
                    onChange={e => setUniendo({ ...uniendo, b: e.target.value, queda: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[13px]"
                  >
                    {otraEnLista(a).map(o => (
                      <option key={o.id} value={o.id}>{o.name} · {distincion(o)}</option>
                    ))}
                  </select>
                </label>
              )}
              <div className="space-y-2">
                <p className="text-[12px] font-medium text-gray-700">Queda esta, con todo lo de las dos</p>
                {[a, b].map(c => (
                  <label key={c.id} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 ${uniendo.queda === c.id ? 'border-gray-900' : 'border-gray-200'}`}>
                    <input type="radio" checked={uniendo.queda === c.id} onChange={() => setUniendo({ ...uniendo, queda: c.id })} className="mt-1" />
                    <span>
                      <span className="block text-[13px] font-semibold text-gray-900">{c.name}{madreDe(c, clients) ? ` · de ${madreDe(c, clients)!.name}` : ''}</span>
                      <span className="block text-[11px] text-gray-500">{distincion(c)} · {copyDe(c) === 1 ? '1 copy' : `${copyDe(c)} copys`}</span>
                    </span>
                  </label>
                ))}
              </div>
              <ul className="space-y-1.5 rounded-lg bg-gray-50 p-3 text-[12px] text-gray-700">
                <li>→ Pasan a «{queda.name.trim()}»: {seVa.conteos?.campanas === 1 ? '1 campaña' : `${seVa.conteos?.campanas ?? 0} campañas`}, {copyDe(seVa) === 1 ? '1 copy' : `${copyDe(seVa)} copys`}, y sus piezas, revisiones, historial y consumo.</li>
                <li>
                  → «{seVa.name.trim()}» se borra. El ADN de marca es el de la que queda.
                  {adnPropio.length > 0 && (
                    <span className="mt-1 block font-medium text-amber-800">
                      La que se borra tiene su propio ADN ({adnPropio.join(', ')}) y no se mezcla: si hace falta, copialo antes de unir.
                    </span>
                  )}
                </li>
                {(seVa.conteos?.complementarias ?? 0) > 0 && <li>→ Sus complementarias pasan a ser de «{queda.name.trim()}».</li>}
                <li>→ Quien la tenía elegida en el selector pasa a la que queda.</li>
              </ul>
              <div className="flex justify-end gap-2">
                <button disabled={unirOcupado} onClick={() => setUniendo(null)} className="rounded-lg border border-gray-200 px-3.5 py-2 text-[12.5px] font-medium text-gray-700">
                  Cancelar
                </button>
                <button
                  disabled={unirOcupado}
                  onClick={async () => {
                    setUnirOcupado(true);
                    try {
                      await onUnir!(seVa.id, queda.id);
                      setUniendo(null);
                    } finally {
                      setUnirOcupado(false);
                    }
                  }}
                  className="rounded-lg bg-ink px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50"
                >
                  {unirOcupado ? 'Uniendo…' : 'Unir · no se puede deshacer'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MAIN VIEW SWITCHER */}
      {!activeClientHub ? (
        // VIEW: PORTFOLIO GRID
        <div className="space-y-6 animate-in fade-in duration-500">
           {/* Header Portfolio */}
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-semibold text-[#1D1D1F] tracking-[-0.01em]">{SCREENS.clients.name}</h2>
                <p className="text-gray-500 text-[13px] mt-0.5">{SCREENS.clients.description}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowGlobalSettings(true)} 
                  className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-sm"
                >
                  Configuración Global
                </button>
                <button 
                  onClick={() => setIsAddingClient(true)} 
                  className="bg-ink text-white px-4 py-2 rounded-lg text-[13px] font-medium shadow-sm hover:bg-ink-hover transition-colors"
                >
                  + Nuevo Cliente
                </button>
              </div>
           </div>

           {/* El aviso no se descarta: se va cuando los nombres dejan de ser iguales. */}
           {clients.some(tieneNombreRepetido) && (
             <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
               <Copy className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
               <span>
                 {(() => {
                   // Uno por nombre normalizado: «Terpel» y «terpel » son el mismo nombre.
                   const porClave = new Map<string, string>();
                   for (const c of clients.filter(tieneNombreRepetido)) {
                     const clave = normalizarNombre(c.name);
                     if (!porClave.has(clave)) porClave.set(clave, c.name.trim());
                   }
                   const nombres = [...porClave.values()];
                   return nombres.length === 1 ? `Dos o más marcas se llaman «${nombres[0]}».` : `Hay nombres repetidos: ${nombres.map(n => `«${n}»`).join(', ')}.`;
                 })()}{' '}
                 En el selector se ven iguales y es fácil trabajar en la equivocada. Resolvelo en las tarjetas marcadas: renombrá la que sobra o hacela parte de la otra.
               </span>
             </div>
           )}

           {/* Grid Layout: ordenada por familia, cada madre seguida de sus complementarias. */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
             {familias(clients).flatMap(f => [f.madre, ...f.complementarias]).map(client => {
                const madre = madreDe(client, clients);
                const repetido = tieneNombreRepetido(client);
                const profilesCount = dnaProfiles.filter(p => p.clientId === client.id).length;
                const clientSaved = savedVariations.filter(v => v.clientId === client.id);
                const savedCount = clientSaved.length;
                const approvedCount = clientSaved.filter(v => v.isApproved).length;
                return (
                  <div key={client.id} onClick={() => enterHub(client.id)} className={`bg-white rounded-xl p-5 border hover:border-gray-300 transition-colors cursor-pointer group flex flex-col h-full shadow-sm ${repetido ? 'border-amber-400' : 'border-gray-200'}`}>
                     <div className="flex justify-between items-start mb-4">
                       <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
                          {client.logo ? <img src={client.logo} className="w-full h-full object-contain p-1" /> : <div className="text-gray-400 font-medium text-sm">{client.name.substring(0, 2).toUpperCase()}</div>}
                       </div>
                       <div className="flex items-center gap-2">
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             if(window.confirm(`¿Eliminar la marca ${client.name} y todas sus campañas?`)) onRemove(client.id);
                           }}
                           className="text-gray-300 hover:text-red-500 p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                           title="Eliminar Marca"
                         >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                         </button>
                       </div>
                     </div>
                     <div className="flex-1">
                        {madre && (
                          <p className="mb-1 flex items-center gap-1 text-[11px] text-gray-500">
                            <CornerDownRight className="h-3 w-3" /> Complementaria de {madre.name}
                          </p>
                        )}
                        <div className="mb-1 flex items-center gap-1.5">
                          <h3 className="truncate text-[15px] font-medium text-gray-900">{client.name}</h3>
                          {repetido && (
                            <span className="flex shrink-0 items-center gap-0.5 rounded border border-amber-200 bg-amber-50 px-1 text-[9.5px] font-semibold text-amber-700">
                              <Copy className="h-2.5 w-2.5" /> nombre repetido
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-500 truncate mb-3">
                          {repetido ? distincion(client) : client.industry}
                          {!madre && (client.conteos?.complementarias ?? 0) > 0 && ` · madre de ${client.conteos!.complementarias}`}
                        </p>
                        {repetido && (
                          <div className="mb-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5" onClick={e => e.stopPropagation()}>
                            <p className="text-[11.5px] font-medium text-gray-800">Otra marca se llama igual. ¿Qué es esta?</p>
                            {resolviendo?.id !== client.id ? (
                              <div className="flex flex-wrap gap-1.5">
                                {onUnir && (
                                  <button
                                    onClick={() => {
                                      const otra = clients.find(c => c.id === client.nombreRepetidoCon![0])!;
                                      // Por defecto queda la que más tiene: es la que menos se mueve.
                                      const peso = (c: Client) => (c.conteos?.campanas ?? 0) + (c.conteos?.complementarias ?? 0);
                                      setUniendo({ a: client.id, b: otra.id, queda: peso(otra) >= peso(client) ? otra.id : client.id });
                                    }}
                                    className="rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white hover:bg-ink-hover"
                                  >
                                    Es la misma: unir
                                  </button>
                                )}
                                <button
                                  onClick={() => setResolviendo({ id: client.id, modo: 'renombrar', valor: client.name })}
                                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100"
                                >
                                  Es otra: renombrar
                                </button>
                                {(client.conteos?.complementarias ?? 0) === 0 && !client.marcaMadreId && (
                                  <button
                                    onClick={() => setResolviendo({ id: client.id, modo: 'madre', valor: '' })}
                                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100"
                                  >
                                    Es parte de otra marca
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {resolviendo.modo === 'renombrar' ? (
                                  <input
                                    autoFocus
                                    value={resolviendo.valor}
                                    onChange={e => setResolviendo({ ...resolviendo, valor: e.target.value })}
                                    className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-[12px]"
                                  />
                                ) : (
                                  <select
                                    value={resolviendo.valor}
                                    onChange={e => setResolviendo({ ...resolviendo, valor: e.target.value })}
                                    className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-[12px]"
                                  >
                                    <option value="">Elegí la marca madre…</option>
                                    {madresPosibles(client, clients).map(m => (
                                      <option key={m.id} value={m.id}>{opcionDeMadre(m)}</option>
                                    ))}
                                  </select>
                                )}
                                {resolviendo.modo === 'madre' && (
                                  <p className="text-[10.5px] text-gray-500">El aviso sigue hasta que se renombre: un «{client.name}» dentro de otro sigue siendo ambiguo.</p>
                                )}
                                <div className="flex gap-1.5">
                                  <button
                                    disabled={!resolviendo.valor.trim()}
                                    onClick={() => {
                                      onUpdate(client.id, resolviendo.modo === 'renombrar' ? { name: resolviendo.valor.trim() } : { marcaMadreId: resolviendo.valor });
                                      setResolviendo(null);
                                    }}
                                    className="rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white disabled:opacity-40"
                                  >
                                    Guardar
                                  </button>
                                  <button onClick={() => setResolviendo(null)} className="rounded-md px-2 py-1 text-[11px] text-gray-600">
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {savedCount > 0 && (
                          <div className="inline-flex items-center gap-1.5 bg-violet-50 border border-violet-100 rounded-full px-2 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                            <span className="text-[10px] font-medium text-violet-700">
                              Motor entrenado · {savedCount} variación{savedCount !== 1 ? 'es' : ''}
                              {approvedCount > 0 && ` · ${approvedCount} aprobada${approvedCount !== 1 ? 's' : ''}`}
                            </span>
                          </div>
                        )}
                        {(() => {
                          const score = [
                            !!client.voice,
                            !!client.valueProposition,
                            !!client.brandVoiceGuidelines,
                            !!client.brandGuidelinePdfUrl,
                            profilesCount > 0,
                          ].filter(Boolean).length
                          return (
                            <div className="flex items-center gap-1 mt-1.5">
                              {[0,1,2,3,4].map(i => (
                                <div key={i} className={`w-4 h-1 rounded-full ${i < score ? 'bg-ink' : 'bg-gray-200'}`} />
                              ))}
                              <span className="text-[9px] text-gray-400 ml-1">ADN {score}/5</span>
                            </div>
                          )
                        })()}
                     </div>
                     <div className="mt-4 flex items-center justify-between text-[11px] text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${profilesCount > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          {profilesCount} Campañas
                        </span>
                        <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded text-gray-400 group-hover:text-gray-600 transition-colors">ADN →</span>
                     </div>
                  </div>
                );
             })}
             {clients.length === 0 && (
                <div className="col-span-full bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="md:col-span-2 space-y-3">
                      <span className="inline-block text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500">Onboarding</span>
                      <h3 className="text-[22px] font-medium text-gray-900 tracking-tight leading-tight">
                        Empezá agregando tu primera marca.
                      </h3>
                      <p className="text-[13px] text-gray-500 leading-relaxed max-w-md">
                        Cada marca es un workspace independiente: tiene su propio ADN, manual de marca (PDF), voice fingerprint y biblioteca aprobada que alimenta el motor.
                      </p>
                      <button
                        onClick={() => setIsAddingClient(true)}
                        className="mt-2 bg-ink text-white px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-ink transition-colors shadow-sm"
                      >
                        + Agregar primera marca
                      </button>
                    </div>
                    <div className="hidden md:flex items-center justify-center">
                      <div className="grid grid-cols-2 gap-2 w-44">
                        {['ADN', 'Brief', 'Tono', 'Métricas'].map((t, i) => (
                          <div key={i} className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-[10px] font-medium text-gray-600 text-center">
                            {t}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
             )}
           </div>
        </div>
      ) : (
        // VIEW: BRAND HUB (Master-Detail)
        (() => {
          const client = clients.find(c => c.id === activeClientHub);
          if (!client) return null;
          const profiles = dnaProfiles.filter(p => p.clientId === client.id);

          return (
            <div className="animate-in fade-in duration-300 space-y-6">
               <BrandHubHero
                 client={client}
                 profilesCount={profiles.length}
                 approvedCount={0}
                 generationCount={0}
                 onBack={exitHub}
               />

               <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  {/* DETAIL LEFT: CONSTITUCION DE MARCA (GLOBAL DNA) */}
                  <div className="xl:col-span-3 xl:sticky xl:top-[76px] space-y-4">
                     <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                           <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center p-1">
                              {client.logo ? <img src={client.logo} className="w-full h-full object-contain" /> : <span className="text-sm font-medium text-gray-500">{client.name.substring(0, 2).toUpperCase()}</span>}
                           </div>
                           <div>
                              <h3 className="text-[15px] font-medium text-gray-900 leading-tight">{client.name}</h3>
                              <p className="text-[12px] text-gray-500 mt-0.5">{client.industry}</p>
                           </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-100">
                           <div>
                              <label className="block text-[12px] font-medium text-gray-700 mb-1">Es parte de</label>
                              {(client.conteos?.complementarias ?? 0) > 0 ? (
                                <p className="rounded-lg bg-gray-50 px-3 py-2 text-[12px] text-gray-600">
                                  {client.name} tiene {client.conteos!.complementarias === 1 ? 'una complementaria' : `${client.conteos!.complementarias} complementarias`}, así que no puede ser parte de otra. Un solo nivel.
                                </p>
                              ) : (
                                <>
                                  <select
                                    className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-gray-400"
                                    value={client.marcaMadreId ?? ''}
                                    onChange={e => onUpdate(client.id, { marcaMadreId: e.target.value || null })}
                                  >
                                    <option value="">Ninguna: es una marca madre</option>
                                    {madresPosibles(client, clients).map(m => (
                                      <option key={m.id} value={m.id}>{opcionDeMadre(m)}</option>
                                    ))}
                                  </select>
                                  <p className="mt-1 text-[10.5px] text-gray-500">Solo ordena el selector y Marcas: no comparte ADN, campañas ni aprobaciones.</p>
                                </>
                              )}
                           </div>
                           <div>
                              <label className="block text-[12px] font-medium text-gray-700 mb-1">Voz Global</label>
                              <select
                                className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-gray-400 transition-colors"
                                value={client.voice || ''}
                                onChange={e => onUpdate(client.id, { voice: e.target.value })}
                              >
                                <option value="">Seleccionar voz...</option>
                                {voices.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                              </select>
                              {!client.voice && <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>Sin esto el copy será genérico</p>}
                           </div>
                           <div>
                              <label className="block text-[12px] font-medium text-gray-700 mb-1">Propuesta de Valor</label>
                              <textarea
                                className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-gray-400 transition-colors resize-none h-20 placeholder:text-gray-400"
                                placeholder="ADN inamovible de la marca"
                                value={client.valueProposition || ''}
                                onChange={e => onUpdate(client.id, { valueProposition: e.target.value })}
                              />
                              {!client.valueProposition && <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>Sin esto el copy será genérico</p>}
                           </div>
                           <div>
                              <label className="block text-[12px] font-medium text-gray-700 mb-1">Guidelines</label>
                              <textarea
                                className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-gray-400 transition-colors resize-none h-20 placeholder:text-gray-400"
                                placeholder="Reglas y estilo gramatical"
                                value={client.brandVoiceGuidelines || ''}
                                onChange={e => onUpdate(client.id, { brandVoiceGuidelines: e.target.value })}
                              />
                              {!client.brandVoiceGuidelines && <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>Sin esto el copy será genérico</p>}
                           </div>
                           <button 
                             onClick={() => alert('Modificaciones del ADN Global guardadas exitosamente.')}
                             className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-[12px] hover:bg-gray-200 transition-colors mt-2"
                           >
                             Guardar Cambios
                           </button>
                        </div>
                     </div>

                     {/* BRAND GUIDELINE PDF UPLOADER */}
                     <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-3">
                        <div>
                           <h4 className="text-[13px] font-medium text-gray-900">Manual de Marca</h4>
                           <p className="text-[11px] text-gray-500 mt-0.5">
                             Solo PDF · Ideal: menos de 5 MB · Máximo: 15 MB
                           </p>
                           <p className="text-[10px] text-gray-400 mt-0.5">
                             La IA extrae automáticamente voz de marca, propuesta de valor y guías de tono.
                           </p>
                        </div>

                        {client.brandGuidelineFileName ? (
                           <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                              <svg className="w-4 h-4 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM9.5 17l-1.5-1.5L10.5 13 8 10.5 9.5 9l2.5 2.5L14.5 9l1.5 1.5L13.5 13l2.5 2.5-1.5 1.5L12 14.5 9.5 17z" opacity=".3"/><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM13 3.5L18.5 9H13V3.5zM15 17h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                              <div className="flex-1 min-w-0">
                                 <p className="text-[12px] font-medium text-gray-700 truncate">{client.brandGuidelineFileName}</p>
                                 {client.brandGuidelineExtractedAt && (
                                   <p className="text-[10px] text-gray-400">
                                     Extraído {new Date(client.brandGuidelineExtractedAt as any).toLocaleString()}
                                   </p>
                                 )}
                              </div>
                              {client.brandGuidelinePdfUrl && (
                                <a
                                  href={client.brandGuidelinePdfUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Ver PDF"
                                  className="p-1 text-blue-500 hover:text-blue-700 shrink-0"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                              )}
                              <button
                                onClick={() => handleDeleteGuideline(client.id)}
                                disabled={deletingGuideline || uploadingGuideline}
                                title="Eliminar manual"
                                className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0 disabled:opacity-40"
                              >
                                {deletingGuideline
                                  ? <span className="w-4 h-4 border-2 border-gray-300 border-t-red-400 rounded-full animate-spin block" />
                                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                }
                              </button>
                           </div>
                        ) : (
                           <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-[11px] text-gray-400">
                             <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                             Sin manual cargado
                           </div>
                        )}

                        <label className={`block w-full py-2 rounded-lg font-medium text-[12px] text-center cursor-pointer transition-colors border ${
                          uploadingGuideline
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-ink text-white border-gray-900 hover:bg-ink-hover'
                        }`}>
                           {uploadingGuideline ? (
                             <span className="inline-flex items-center gap-2">
                               <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                               Procesando…
                             </span>
                           ) : (
                             client.brandGuidelinePdfUrl ? 'Reemplazar PDF' : 'Subir PDF y procesar'
                           )}
                           <input
                             type="file"
                             accept="application/pdf"
                             className="hidden"
                             disabled={uploadingGuideline || deletingGuideline}
                             onChange={e => {
                               const file = e.target.files?.[0];
                               if (file) handleUploadGuideline(client.id, file);
                               e.target.value = '';
                             }}
                           />
                        </label>

                        {uploadError && (
                          <div className="flex items-start gap-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
                            <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            <span>{uploadError}</span>
                          </div>
                        )}
                        {extractedSummary && !uploadError && (
                          <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 leading-relaxed">
                            <span className="font-medium block mb-1">Síntesis IA</span>
                            {extractedSummary}
                          </div>
                        )}
                     </div>

                     <VoiceFingerprintCard
                       fingerprint={client.brandFingerprint}
                       computedAt={client.brandFingerprintAt}
                       computing={computingFingerprint}
                       error={fingerprintError}
                       onCompute={() => handleComputeFingerprint(client.id)}
                     />

                     <button onClick={() => { if(window.confirm('¿Eliminar marca?')) { onRemove(client.id); exitHub(); } }} className="w-full text-center text-[12px] text-gray-400 hover:text-red-500 transition-colors">
                        Eliminar Marca
                     </button>
                  </div>

                  {/* DETAIL RIGHT: WORKSPACE CAMPAÑAS / METRICAS */}
                  <div className="xl:col-span-9 space-y-6">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <div>
                          <h4 className="text-[16px] font-medium text-gray-900">
                             {clientDetailView === 'metrics'
                               ? 'Métricas'
                               : showDnaForm ? (editingProfileId ? 'Editor de Campaña' : 'Nueva Campaña') : 'Campañas Activas'}
                          </h4>
                          <p className="text-[12px] text-gray-500 mt-0.5">
                             {clientDetailView === 'metrics'
                               ? 'Resumen de rendimiento por cliente'
                               : showDnaForm ? 'Parametriza el brief estratégico' : `${profiles.length} campañas configuradas`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Sub-tab toggle */}
                          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                            <button
                              onClick={() => setClientDetailView('campaigns')}
                              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${clientDetailView === 'campaigns' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                              Campañas
                            </button>
                            <button
                              onClick={() => setClientDetailView('metrics')}
                              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${clientDetailView === 'metrics' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                              Métricas
                            </button>
                          </div>
                          {clientDetailView === 'campaigns' && !showDnaForm && (
                            <button
                              onClick={() => { resetDnaForm(); setShowDnaForm(true); }}
                              className="bg-ink text-white px-4 py-2 rounded-lg text-[13px] font-medium shadow-sm hover:bg-ink-hover transition-colors"
                            >
                              + Crear Campaña
                            </button>
                          )}
                        </div>
                     </div>

                     {clientDetailView === 'metrics' ? (
                        /* METRICAS PANEL */
                        <div className="animate-in fade-in duration-300">
                          {analyticsLoading && (
                            <div className="flex items-center justify-center py-16">
                              <span className="w-6 h-6 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
                            </div>
                          )}
                          {analyticsError && !analyticsLoading && (
                            <div className="flex items-start gap-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">
                              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                              <span>{analyticsError}</span>
                            </div>
                          )}
                          {analyticsData && !analyticsLoading && (() => {
                            const summary = analyticsData.summary || {};
                            const byPlatform: any[] = (analyticsData.byPlatform || [])
                              .slice()
                              .sort((a: any, b: any) => (b.saved || 0) - (a.saved || 0))
                              .slice(0, 5);
                            const maxSaved = byPlatform.reduce((m: number, p: any) => Math.max(m, p.saved || 0), 1);
                            const totalSaved = summary.totalSaved || 0;

                            if (totalSaved === 0) {
                              return (
                                <div className="py-16 text-center text-[13px] text-gray-500 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                                  Sin datos registrados aun para este cliente.
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-6">
                                {/* Stat cards 2x2 */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Guardadas</p>
                                    <p className="text-[32px] font-semibold text-gray-900 leading-none">{totalSaved}</p>
                                  </div>
                                  <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm">
                                    <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider mb-2">Aprobadas</p>
                                    <p className="text-[32px] font-semibold text-emerald-700 leading-none">{summary.totalApproved || 0}</p>
                                  </div>
                                  <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm">
                                    <p className="text-[11px] font-medium text-blue-600 uppercase tracking-wider mb-2">Tasa aprobacion</p>
                                    <p className="text-[32px] font-semibold text-blue-700 leading-none">{summary.approvalRate || 0}%</p>
                                  </div>
                                  <div className="bg-white border border-red-200 rounded-xl p-5 shadow-sm">
                                    <p className="text-[11px] font-medium text-red-500 uppercase tracking-wider mb-2">Rechazadas</p>
                                    <p className="text-[32px] font-semibold text-red-600 leading-none">{summary.totalRejected || 0}</p>
                                  </div>
                                </div>

                                {/* Mini bar chart — CSS only */}
                                {byPlatform.length > 0 && (
                                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                    <h5 className="text-[13px] font-medium text-gray-900 mb-4">Por plataforma</h5>
                                    <div className="space-y-3">
                                      {byPlatform.map((item: any) => (
                                        <div key={item.platform} className="flex items-center gap-3">
                                          <span className="text-[11px] text-gray-600 w-36 truncate shrink-0">{item.platform}</span>
                                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-gray-700 rounded-full transition-all"
                                              style={{ width: `${Math.round(((item.saved || 0) / maxSaved) * 100)}%` }}
                                            />
                                          </div>
                                          <span className="text-[11px] font-medium text-gray-700 tabular-nums w-6 text-right shrink-0">{item.saved || 0}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                     ) : !showDnaForm ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {profiles.map(profile => (
                             <div key={profile.id} className="bg-white p-5 rounded-xl border border-gray-200 hover:border-gray-300 shadow-sm transition-colors group flex flex-col justify-between h-full">
                               <div className="space-y-3 relative">
                                  <div className="pr-10">
                                     <h5 className="text-[14px] font-medium text-gray-900 leading-tight mb-1">{profile.name}</h5>
                                     {(() => {
                                       const hasGoal = !!profile.goal
                                       const hasExamples = (profile.feedbackExamples?.length ?? 0) > 0
                                       if (hasGoal && hasExamples) return <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Completa</span>
                                       if (!hasGoal) return <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Sin objetivo</span>
                                       return <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Sin ejemplos</span>
                                     })()}
                                     <span className="inline-block bg-gray-100 text-gray-600 text-[11px] font-medium px-2 py-0.5 rounded border border-gray-200 mt-1.5">{profile.goal}</span>
                                  </div>
                                  <div className="absolute top-0 right-0 flex flex-col gap-1">
                                     <button onClick={() => startEditProfile(profile)} title="Editar" className="p-1.5 text-gray-400 hover:text-gray-900 rounded-md hover:bg-gray-50 transition-colors">
                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                     </button>
                                     <button
                                       onClick={() => handleDuplicateProfile(profile)}
                                       disabled={duplicatingId === profile.id}
                                       title="Duplicar campaña"
                                       className="p-1.5 text-gray-300 hover:text-blue-500 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                     >
                                       {duplicatingId === profile.id
                                         ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                         : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                       }
                                     </button>
                                     <button onClick={() => { if(window.confirm('¿Eliminar campaña?')) onDeleteProfile(profile.id); }} title="Eliminar" className="p-1.5 text-gray-300 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors">
                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                     </button>
                                  </div>
                               </div>
                               <div className="pt-4 mt-4 border-t border-gray-100">
                                  <p className="text-[12px] text-gray-600 line-clamp-2 leading-relaxed">"{profile.theme}"</p>
                                  {profile.feedbackExamples && profile.feedbackExamples.length > 0 && (
                                     <div className="flex items-center gap-1.5 mt-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        <span className="text-[10px] font-medium text-gray-500">Motor Entrenado ({profile.feedbackExamples.length})</span>
                                     </div>
                                  )}
                               </div>
                             </div>
                           ))}
                           {profiles.length === 0 && (
                              <div className="col-span-full py-12 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-center bg-gray-50/50">
                                 <p className="text-[13px] font-medium text-gray-900 mb-0.5">Sin Campañas</p>
                                 <p className="text-[12px] text-gray-500">Crea una campaña para empezar a generar copy.</p>
                              </div>
                           )}
                        </div>
                     ) : (
                        // WORKSPACE: FORMULARIO DE CAMPAÑA — sectional + sticky preview
                        <div id="dna-editor-form" className="grid grid-cols-1 xl:grid-cols-12 gap-5 animate-in fade-in duration-200">
                          {/* SECTION NAV — completion-driven */}
                          {(() => {
                            const conceptDone   = !!(dnaForm.campaignConcept || '').trim();
                            const briefDone     = !!dnaForm.name.trim() && !!dnaForm.theme.trim();
                            const audienceDone  = !!(dnaForm.targetAudience || '').trim();
                            const keywordsDone  = !!(dnaForm.keywords || '').trim() || !!(dnaForm.prohibitions || '').trim();
                            const fewshotCount  = dnaForm.feedbackExamples.length;
                            const fewshotDone   = fewshotCount > 0;

                            const items = [
                              { id: 'sec-concept',  label: 'Concepto',                  done: conceptDone,  required: false },
                              { id: 'sec-brief',    label: 'Brief',                     done: briefDone,    required: true,  meta: !briefDone ? 'Nombre + Tema' : undefined },
                              { id: 'sec-audience', label: 'Audiencia',                 done: audienceDone, required: false },
                              { id: 'sec-tags',     label: 'Keywords / Prohibiciones',  done: keywordsDone, required: false },
                              { id: 'sec-fewshot',  label: 'Few-shot',                  done: fewshotDone,  required: false, meta: fewshotCount > 0 ? `${fewshotCount} ej.` : undefined },
                            ];
                            const completed = items.filter(i => i.done).length;
                            const pct = Math.round((completed / items.length) * 100);

                            return (
                              <nav className="xl:col-span-2 hidden xl:block xl:sticky xl:top-[80px] self-start">
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                  <div className="px-3 pt-3 pb-2 border-b border-gray-100">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Completitud</span>
                                      <span className="text-[10px] font-medium text-gray-700 tabular-nums">{completed}/{items.length}</span>
                                    </div>
                                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-gray-700'}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                  <div className="p-2 space-y-0.5">
                                    {items.map(s => (
                                      <a
                                        key={s.id}
                                        href={`#${s.id}`}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                                          s.done ? 'text-gray-900 hover:bg-emerald-50/60' : 'text-gray-500 hover:bg-gray-50'
                                        }`}
                                      >
                                        {s.done ? (
                                          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                                            <Check className="w-2 h-2" strokeWidth={4} />
                                          </span>
                                        ) : (
                                          <Circle className={`w-3.5 h-3.5 shrink-0 ${s.required ? 'text-amber-400' : 'text-gray-300'}`} strokeWidth={2} />
                                        )}
                                        <span className="truncate flex-1">{s.label}</span>
                                        {s.meta && (
                                          <span className="text-[9px] font-medium text-gray-400">{s.meta}</span>
                                        )}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              </nav>
                            );
                          })()}

                          {/* FIELDS */}
                          <div className="xl:col-span-6 space-y-5">
                            {/* CONCEPTO */}
                            <section id="sec-concept" className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-xl p-5 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full" />
                                <label className="block text-[12px] font-medium text-gray-900">Concepto de Campaña</label>
                                <span className="text-[10px] font-medium text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-100 ml-auto">Anclaje creativo</span>
                              </div>
                              <p className="text-[11px] text-gray-600 leading-relaxed">
                                Frase que <strong>se mantiene textual</strong> en todos los canales. Vacío = la IA la deriva del brief.
                              </p>
                              <textarea
                                placeholder='Ej: "Una vez al año bajamos el precio. Hoy."'
                                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-gray-900 text-[13px] outline-none focus:border-blue-400 transition-colors resize-none h-16 font-medium"
                                value={dnaForm.campaignConcept || ''}
                                onChange={e => setDnaForm({ ...dnaForm, campaignConcept: e.target.value })}
                              />
                            </section>

                            {/* BRIEF */}
                            <section id="sec-brief" className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                              <h6 className="text-[13px] font-medium text-gray-900">Brief estratégico</h6>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Nombre de la Campaña *</label>
                                  <input type="text" placeholder="Ej: Black Friday 2025" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-[13px] outline-none focus:border-gray-400 transition-colors" value={dnaForm.name} onChange={e => setDnaForm({...dnaForm, name: e.target.value})} />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Objetivo Táctico</label>
                                  <select className="w-full px-3 py-2 bg-white border border-gray-200 text-gray-900 rounded-lg text-[13px] outline-none focus:border-gray-400 transition-colors" value={dnaForm.goal} onChange={e => setDnaForm({...dnaForm, goal: e.target.value})}>
                                    {goals.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Producto / Servicio</label>
                                  <input placeholder="¿Qué vendemos?" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-[13px] outline-none focus:border-gray-400 transition-colors" value={dnaForm.product} onChange={e => setDnaForm({...dnaForm, product: e.target.value})} />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-700 mb-1">CTA</label>
                                  <input placeholder="Ej: Compra ahora" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-[13px] outline-none focus:border-gray-400 transition-colors" value={dnaForm.primaryCTA} onChange={e => setDnaForm({...dnaForm, primaryCTA: e.target.value})} />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">Tema Central / Brief *</label>
                                <textarea placeholder="Contexto, oferta, qué queremos comunicar…" className="w-full px-3 py-2 bg-white border border-gray-200 text-gray-900 rounded-lg text-[13px] outline-none focus:border-gray-400 transition-colors resize-none h-24" value={dnaForm.theme} onChange={e => setDnaForm({...dnaForm, theme: e.target.value})} />
                              </div>
                            </section>

                            {/* AUDIENCIA */}
                            <section id="sec-audience" className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                              <h6 className="text-[13px] font-medium text-gray-900">Audiencia</h6>
                              <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">Audiencia Específica</label>
                                <input placeholder="¿A quién le hablamos hoy?" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-[13px] outline-none focus:border-gray-400 transition-colors" value={dnaForm.targetAudience} onChange={e => setDnaForm({...dnaForm, targetAudience: e.target.value})} />
                              </div>
                            </section>

                            {/* TAGS */}
                            <section id="sec-tags" className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                              <h6 className="text-[13px] font-medium text-gray-900">Léxico</h6>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Keywords (favorecer)</label>
                                  <TagInput value={dnaForm.keywords} onChange={v => setDnaForm({ ...dnaForm, keywords: v })} placeholder="Agregar keyword y Enter…" variant="neutral" ariaLabel="Keywords" />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Prohibiciones (evitar)</label>
                                  <TagInput value={dnaForm.prohibitions || ''} onChange={v => setDnaForm({ ...dnaForm, prohibitions: v })} placeholder="Términos a evitar…" variant="danger" ariaLabel="Prohibiciones" />
                                </div>
                              </div>
                            </section>

                            {/* FEW-SHOT */}
                            <section id="sec-fewshot" className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                              <div>
                                <h6 className="text-[13px] font-medium text-gray-900">Ejemplos Exitosos (Few-Shot)</h6>
                                <p className="text-[11px] text-gray-500 mt-0.5">Copys pasados que el motor IA tomará como referencia tonal.</p>
                              </div>
                              <div className="flex flex-col md:flex-row gap-2">
                                <select className="md:w-40 px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-[12px] outline-none focus:border-gray-400 transition-colors" value={newFeedback.platform} onChange={e => setNewFeedback({ ...newFeedback, platform: e.target.value })}>
                                  {Object.values(Platform).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <div className="flex-1 flex gap-2">
                                  <input placeholder="Pegá el copy…" className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-[12px] outline-none focus:border-gray-400 transition-colors" value={newFeedback.content} onChange={e => setNewFeedback({...newFeedback, content: e.target.value})} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeedback())} />
                                  <button type="button" onClick={addFeedback} className="bg-ink text-white px-4 rounded-lg font-medium text-[12px] hover:bg-ink transition-colors">Añadir</button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                                {dnaForm.feedbackExamples.map((ex, i) => (
                                  <div key={i} className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100 group relative">
                                    <span className="text-[10px] font-medium text-gray-500 mb-1">{ex.platform}</span>
                                    <p className="text-[12px] text-gray-700 pr-6 leading-relaxed">"{ex.content}"</p>
                                    <button type="button" onClick={() => removeFeedback(i)} className="absolute top-2.5 right-2.5 text-gray-300 hover:text-red-500 transition-colors">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  </div>
                                ))}
                                {dnaForm.feedbackExamples.length === 0 && (
                                  <div className="text-center py-6 text-[11px] text-gray-400 border border-dashed border-gray-200 rounded-lg">Sin ejemplos agregados</div>
                                )}
                              </div>
                            </section>

                            {/* ACCIONES */}
                            <div className="flex justify-end gap-3 pt-2">
                              <button onClick={() => setShowDnaForm(false)} className="px-4 py-2 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-50 border border-transparent transition-colors">
                                Cancelar
                              </button>
                              <button onClick={handleSaveDNA} className="px-6 py-2 bg-ink text-white rounded-lg font-medium text-[13px] hover:bg-ink shadow-sm transition-colors">
                                {editingProfileId ? 'Actualizar Campaña' : 'Guardar Campaña'}
                              </button>
                            </div>
                          </div>

                          {/* PREVIEW STICKY */}
                          <aside className="xl:col-span-4 xl:sticky xl:top-[80px] self-start">
                            <div className="h-[calc(100vh-110px)] min-h-[500px]">
                              <PromptPreview client={client} draft={dnaForm} />
                            </div>
                          </aside>
                        </div>
                     )}

                     {clientDetailView === 'campaigns' && !showDnaForm && (
                       <GenerationHistory initialClientId={client.id} />
                     )}
                  </div>
               </div>
            </div>
          );
        })()
      )}
    </div>
  );
};

export default ClientManager;
