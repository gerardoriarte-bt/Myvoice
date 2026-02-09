
import React from 'react';
import { Client, ContentDNAProfile, BrandConfig, FeedbackExample, Platform } from '../types';

interface ClientManagerProps {
  clients: Client[];
  dnaProfiles: ContentDNAProfile[];
  voices: BrandConfig[];
  goals: BrandConfig[];
  onUpdateVoices: (voices: BrandConfig[]) => void;
  onUpdateGoals: (goals: BrandConfig[]) => void;
  onResetDefaults: () => void;
  onAdd: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<Client>) => void;
  onRemove: (id: string) => void;
  onSaveProfile: (profile: Omit<ContentDNAProfile, 'id' | 'createdAt'>) => void;
  onUpdateProfile: (id: string, updates: Partial<ContentDNAProfile>) => void;
  onDeleteProfile: (id: string) => void;
}

const ClientManager: React.FC<ClientManagerProps> = ({ 
  clients, 
  dnaProfiles, 
  voices, 
  goals, 
  onUpdateVoices,
  onUpdateGoals,
  onResetDefaults,
  onAdd, 
  onUpdate, 
  onRemove,
  onSaveProfile,
  onUpdateProfile,
  onDeleteProfile
}) => {
  const [isAddingClient, setIsAddingClient] = React.useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = React.useState(false);
  const [editingClientId, setEditingClientId] = React.useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = React.useState<string | null>(null);
  const [clientForm, setClientForm] = React.useState({ name: '', industry: '', logo: '' });
  
  // States for Global Strategy Catalog
  const [newVoice, setNewVoice] = React.useState('');
  const [newGoal, setNewGoal] = React.useState('');
  const [editingCatalogItem, setEditingCatalogItem] = React.useState<{ type: 'voice' | 'goal', id: string, value: string } | null>(null);

  const [showDnaForm, setShowDnaForm] = React.useState(false);
  const [dnaForm, setDnaForm] = React.useState<Omit<ContentDNAProfile, 'id' | 'createdAt' | 'clientId'>>({
    name: '',
    voice: voices[0]?.name || '',
    goal: goals[0]?.name || '',
    product: '',
    targetAudience: '',
    theme: '',
    keywords: '',
    brandVoiceGuidelines: '',
    valueProposition: '',
    primaryCTA: '',
    feedbackExamples: []
  });

  const [newFeedback, setNewFeedback] = React.useState<FeedbackExample>({ platform: Platform.INSTAGRAM, content: '' });

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
    setEditingClientId(profile.clientId);
    setDnaForm({
      name: profile.name,
      voice: '', // Global legacy
      goal: profile.goal,
      product: profile.product,
      targetAudience: profile.targetAudience,
      theme: profile.theme,
      keywords: profile.keywords,
      brandVoiceGuidelines: '', // Global legacy
      valueProposition: '', // Global legacy
      primaryCTA: profile.primaryCTA,
      feedbackExamples: profile.feedbackExamples || []
    });
    setEditingProfileId(profile.id);
    setShowDnaForm(true);
    setTimeout(() => {
      document.getElementById('dna-editor-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  const handleSaveDNA = (clientId: string) => {
    if (!dnaForm.name || !dnaForm.theme) {
      alert("Por favor completa los campos del Brief (Nombre y Tema).");
      return;
    }
    if (editingProfileId) onUpdateProfile(editingProfileId, dnaForm);
    else onSaveProfile({ ...dnaForm, clientId });
    resetDnaForm();
  };

  const resetDnaForm = () => {
    setDnaForm({
      name: '',
      voice: voices[0]?.name || '',
      goal: goals[0]?.name || '',
      product: '',
      targetAudience: '',
      theme: '',
      keywords: '',
      brandVoiceGuidelines: '',
      valueProposition: '',
      primaryCTA: '',
      feedbackExamples: []
    });
    setEditingProfileId(null);
    setShowDnaForm(false);
  };

  const inputStyle = "w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300 text-sm shadow-sm";
  const labelStyle = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3";

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header with Sub-Nav */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Gestión de <span className="text-gradient">Marcas</span></h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Portfolio y Arquitectura Estratégica</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setShowGlobalSettings(!showGlobalSettings); setIsAddingClient(false); }} 
            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${showGlobalSettings ? 'bg-slate-100 border-slate-900 text-slate-900' : 'bg-white border-slate-300 text-slate-500 hover:border-slate-900 hover:text-slate-900'}`}
          >
            CATÁLOGO ESTRATÉGICO
          </button>
          <button 
            onClick={() => { setIsAddingClient(!isAddingClient); setShowGlobalSettings(false); setEditingClientId(null); }} 
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all hover:scale-[1.02] active:scale-95"
          >
            {isAddingClient ? 'CANCELAR' : 'REGISTRAR MARCA'}
          </button>
        </div>
      </div>

      {/* GLOBAL STRATEGY CATALOG SECTION */}
      {showGlobalSettings && (
        <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-300 shadow-xl animate-in slide-in-from-top-4 duration-500 space-y-10">
          <div className="flex justify-between items-center pb-6 border-b border-slate-200">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Arquitectura de ADN Global</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Define las voces y objetivos disponibles para todas las marcas.</p>
            </div>
            <button onClick={onResetDefaults} className="text-[10px] font-black text-slate-400 hover:text-slate-900 flex items-center gap-2 uppercase">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Restaurar Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Voices List */}
            <div className="space-y-6">
              <label className={labelStyle}>Voces de Marca Disponibles</label>
              <div className="flex gap-2">
                <input type="text" placeholder="Ej: Rebelde e Irreverente" className={inputStyle} value={newVoice} onChange={e => setNewVoice(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCatalogItem('voice')} />
                <button onClick={() => addCatalogItem('voice')} className="bg-slate-900 text-white px-6 rounded-2xl font-black transition-all hover:bg-black shrink-0 shadow-lg">+</button>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {voices.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl group hover:border-slate-900 transition-all">
                    {editingCatalogItem?.id === v.id ? (
                      <input className="flex-1 font-bold text-xs outline-none" value={editingCatalogItem.value} onChange={e => setEditingCatalogItem({...editingCatalogItem, value: e.target.value})} onKeyDown={e => e.key === 'Enter' && saveCatalogEdit()} autoFocus />
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-tight text-slate-700">{v.name}</span>
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => editingCatalogItem ? saveCatalogEdit() : setEditingCatalogItem({type: 'voice', id: v.id, value: v.name})} className="p-1.5 text-slate-400 hover:text-slate-900">{editingCatalogItem?.id === v.id ? 'OK' : '✎'}</button>
                      <button onClick={() => removeCatalogItem('voice', v.id)} className="p-1.5 text-slate-400 hover:text-red-600">×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Goals List */}
            <div className="space-y-6">
              <label className={labelStyle}>Objetivos de Negocio</label>
              <div className="flex gap-2">
                <input type="text" placeholder="Ej: Captación Directa" className={inputStyle} value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCatalogItem('goal')} />
                <button onClick={() => addCatalogItem('goal')} className="bg-slate-900 text-white px-6 rounded-2xl font-black transition-all hover:bg-black shrink-0 shadow-lg">+</button>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {goals.map(g => (
                  <div key={g.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl group hover:border-slate-900 transition-all">
                    {editingCatalogItem?.id === g.id ? (
                      <input className="flex-1 font-bold text-xs outline-none" value={editingCatalogItem.value} onChange={e => setEditingCatalogItem({...editingCatalogItem, value: e.target.value})} onKeyDown={e => e.key === 'Enter' && saveCatalogEdit()} autoFocus />
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-tight text-slate-700">{g.name}</span>
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => editingCatalogItem ? saveCatalogEdit() : setEditingCatalogItem({type: 'goal', id: g.id, value: g.name})} className="p-1.5 text-slate-400 hover:text-slate-900">{editingCatalogItem?.id === g.id ? 'OK' : '✎'}</button>
                      <button onClick={() => removeCatalogItem('goal', g.id)} className="p-1.5 text-slate-400 hover:text-red-600">×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddingClient && (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-300 animate-in slide-in-from-top-4 duration-500">
          <form onSubmit={(e) => { e.preventDefault(); onAdd(clientForm); setIsAddingClient(false); setClientForm({name:'', industry:'', logo:''}); }} className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-end">
            <div className="space-y-6">
              <div>
                <label className={labelStyle}>NOMBRE COMERCIAL</label>
                <input required type="text" className={inputStyle} value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} />
              </div>
              <div>
                <label className={labelStyle}>SECTOR ECONÓMICO</label>
                <input required type="text" className={inputStyle} value={clientForm.industry} onChange={e => setClientForm({...clientForm, industry: e.target.value})} />
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-slate-50 rounded-3xl border border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {clientForm.logo ? <img src={clientForm.logo} className="w-full h-full object-contain" /> : <span className="text-xl grayscale opacity-20 font-black">LOGO</span>}
                </div>
                <div className="flex-1">
                  <label className={labelStyle}>IDENTIDAD VISUAL</label>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="w-full text-[10px] font-black text-slate-400 cursor-pointer" />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg">GUARDAR REGISTRO</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-12">
        {clients.map(client => {
          const profiles = dnaProfiles.filter(p => p.clientId === client.id);
          const isManagingThisClient = editingClientId === client.id;

          return (
            <div key={client.id} className="bg-white rounded-[3rem] shadow-md border border-slate-200 overflow-hidden group hover:border-slate-400 transition-all">
              <div className="p-10 flex flex-col lg:flex-row gap-12">
                <div className="lg:w-1/4 space-y-8">
                  <div className="w-28 h-28 rounded-3xl bg-slate-50 border border-slate-200 overflow-hidden shadow-inner flex items-center justify-center mx-auto lg:mx-0">
                    {client.logo ? <img src={client.logo} className="w-full h-full object-contain" /> : <div className="text-slate-300 font-black text-4xl">{client.name[0]}</div>}
                  </div>
                  <div className="text-center lg:text-left">
                    <h3 className="text-2xl font-black text-slate-900 mb-2 leading-none">{client.name}</h3>
                    <span className="px-4 py-2 bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest rounded-xl border border-slate-300">{client.industry}</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => { setEditingClientId(isManagingThisClient ? null : client.id); resetDnaForm(); }}
                      className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm ${isManagingThisClient ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-900 hover:bg-slate-50'}`}
                    >
                      {isManagingThisClient ? 'Cerrar ADN' : 'Configurar ADN'}
                    </button>
                    <button onClick={() => onRemove(client.id)} className="w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-red-600 transition-colors">Eliminar Marca</button>
                  </div>
                </div>

                <div className="flex-1 bg-slate-50/50 rounded-[2.5rem] p-10 border border-slate-200">
                  <div className="flex justify-between items-center mb-10">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Campañas Activas ({profiles.length})</h4>
                  </div>

                  {showDnaForm && editingClientId === client.id ? (
                    <div id="dna-editor-form" className="bg-white p-10 rounded-[2.5rem] border border-slate-300 shadow-2xl space-y-10 animate-in slide-in-from-top-4 duration-500">
                      <div className="flex justify-between items-center pb-6 border-b border-slate-200">
                        <div>
                           <h5 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{editingProfileId ? 'Actualizar Campaña' : 'Nueva Campaña'}</h5>
                           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Marca: {client.name}</p>
                        </div>
                        <button onClick={resetDnaForm} className="text-slate-400 hover:text-slate-900 transition-colors bg-slate-50 p-2 rounded-full">
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className={labelStyle}>Nombre de la Campaña *</label>
                          <input type="text" placeholder="Ej: Redención de Puntos 2025" className={inputStyle} value={dnaForm.name} onChange={e => setDnaForm({...dnaForm, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelStyle}>Objetivo</label>
                            <select className={inputStyle} value={dnaForm.goal} onChange={e => setDnaForm({...dnaForm, goal: e.target.value})}>
                              {goals.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelStyle}>Producto / Servicio</label>
                            <input placeholder="Ej: Gasolina Evo" className={inputStyle} value={dnaForm.product} onChange={e => setDnaForm({...dnaForm, product: e.target.value})} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                           <label className={labelStyle}>Tema Central / Ángulo *</label>
                           <textarea placeholder="¿De qué trata esta campaña?" className={inputStyle + " h-24 resize-none"} value={dnaForm.theme} onChange={e => setDnaForm({...dnaForm, theme: e.target.value})} />
                        </div>
                        <div>
                           <label className={labelStyle}>Audiencia Objetivo</label>
                           <input placeholder="Ej: Transportadores de carga, familias..." className={inputStyle} value={dnaForm.targetAudience} onChange={e => setDnaForm({...dnaForm, targetAudience: e.target.value})} />
                        </div>
                      </div>

                      <div className="pt-10 border-t border-slate-200 space-y-6">
                         <div className="bg-slate-50 rounded-[2.5rem] border border-slate-300 p-10 space-y-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                               <div>
                                  <h6 className="text-sm font-black text-slate-900 uppercase tracking-widest">Módulo: Pilares de Éxito</h6>
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Mensajes históricos que funcionaron (Aprendizaje opcional)</p>
                               </div>
                               {dnaForm.feedbackExamples.length > 0 && (
                                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-300 shadow-sm animate-in zoom-in">
                                     <div className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse"></div>
                                     <span className="text-[8px] font-black text-slate-900 uppercase tracking-widest">Motor Entrenado ({dnaForm.feedbackExamples.length})</span>
                                  </div>
                               )}
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 items-stretch">
                               <div className="md:w-64 shrink-0">
                                  <select 
                                    className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 text-[10px] uppercase outline-none focus:border-slate-900 transition-all shadow-sm"
                                    value={newFeedback.platform} 
                                    onChange={e => setNewFeedback({ ...newFeedback, platform: e.target.value })}
                                  >
                                    {Object.values(Platform).map(p => <option key={p} value={p}>{p}</option>)}
                                  </select>
                               </div>
                               <div className="flex-1 flex gap-3">
                                  <input 
                                    placeholder="Contenido exitoso..." 
                                    className="flex-1 px-6 py-4 bg-white border border-slate-300 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-slate-900 transition-all placeholder:text-slate-400 shadow-sm" 
                                    value={newFeedback.content} 
                                    onChange={e => setNewFeedback({...newFeedback, content: e.target.value})} 
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeedback())}
                                  />
                                  <button 
                                    type="button" 
                                    onClick={addFeedback} 
                                    className="bg-slate-900 text-white px-10 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
                                  >
                                    AÑADIR
                                  </button>
                               </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                               {dnaForm.feedbackExamples.map((ex, i) => (
                                 <div key={i} className="flex flex-col justify-between p-6 bg-white rounded-[1.75rem] border border-slate-300 group shadow-sm hover:border-slate-900 transition-all relative">
                                   <div className="mb-4">
                                     <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[7px] font-black uppercase rounded-lg mb-3 tracking-widest">{ex.platform}</span>
                                     <p className="text-[10px] font-bold text-slate-700 leading-relaxed italic line-clamp-4">"{ex.content}"</p>
                                   </div>
                                   <button 
                                      type="button" 
                                      onClick={() => removeFeedback(i)} 
                                      className="absolute top-4 right-4 text-slate-300 hover:text-red-600 transition-colors p-1"
                                   >
                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                   </button>
                                 </div>
                               ))}
                               {dnaForm.feedbackExamples.length === 0 && (
                                  <div className="md:col-span-2 lg:col-span-3 py-16 border-2 border-dashed border-slate-300 rounded-[2rem] flex flex-col items-center justify-center bg-white/60">
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulo de aprendizaje vacío</p>
                                     <p className="text-[8px] font-bold text-slate-300 uppercase mt-1">Este paso es opcional para mejorar la precisión del copy</p>
                                  </div>
                               )}
                            </div>
                         </div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-4 pt-8">
                        <button onClick={() => handleSaveDNA(client.id)} className="flex-1 bg-slate-900 text-white py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-black shadow-2xl transition-all hover:scale-[1.01] active:scale-95">
                          {editingProfileId ? 'Actualizar Brief de Campaña' : 'Guardar Brief'}
                        </button>
                        <button onClick={resetDnaForm} className="px-12 bg-white text-slate-500 border border-slate-300 py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-100 transition-colors">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      {/* GLOBAL BRAND DNA SETTINGS */}
                      {isManagingThisClient && !showDnaForm && (
                         <div className="bg-white p-8 rounded-[2rem] border border-slate-300 shadow-lg animate-in fade-in space-y-6">
                            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                               <div>
                                  <h5 className="text-sm font-black text-slate-900 uppercase tracking-widest">ADN Global de Marca</h5>
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Identidad persistente para todas las campañas</p>
                               </div>
                               <button 
                                 onClick={() => {
                                   onUpdate(client.id, {
                                      voice: client.voice,
                                      brandVoiceGuidelines: client.brandVoiceGuidelines,
                                      valueProposition: client.valueProposition
                                   });
                                 }}
                                 className="text-[9px] font-black text-slate-900 border border-slate-900 px-4 py-2 rounded-xl hover:bg-slate-900 hover:text-white transition-all uppercase tracking-widest"
                               >
                                 Guardar Cambios Globales
                               </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div>
                                  <label className={labelStyle}>Voz de Marca (Global)</label>
                                  <select 
                                    className={inputStyle} 
                                    value={client.voice || ''} 
                                    onChange={e => onUpdate(client.id, { voice: e.target.value })}
                                  >
                                    <option value="">Selecciona una voz...</option>
                                    {voices.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                                  </select>
                               </div>
                               <div>
                                  <label className={labelStyle}>Propuesta de Valor (Global)</label>
                                  <textarea 
                                    className={inputStyle + " h-24 resize-none"} 
                                    placeholder="¿Por qué comprar esta marca?"
                                    value={client.valueProposition || ''}
                                    onChange={e => onUpdate(client.id, { valueProposition: e.target.value })}
                                  />
                               </div>
                            </div>
                            <div>
                               <label className={labelStyle}>Guidelines de Personalidad (Global)</label>
                               <textarea 
                                 className={inputStyle + " h-24 resize-none"} 
                                 placeholder="Reglas de tono, palabras prohibidas, estilo..."
                                 value={client.brandVoiceGuidelines || ''}
                                 onChange={e => onUpdate(client.id, { brandVoiceGuidelines: e.target.value })}
                               />
                            </div>
                         </div>
                      )}

                      {/* CREATE NEW BRIEF BUTTON (Only Visible When Managing) */}
                      {isManagingThisClient && !showDnaForm && (
                        <button 
                          onClick={() => { setEditingClientId(client.id); resetDnaForm(); setShowDnaForm(true); }}
                          className="w-full py-8 border-2 border-dashed border-slate-300 rounded-[2rem] hover:border-slate-900 hover:bg-slate-50 transition-all group flex flex-col items-center justify-center gap-2"
                        >
                          <div className="bg-slate-100 p-3 rounded-full group-hover:bg-slate-900 group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900">Crear Nueva Campaña</span>
                        </button>
                      )}

                      {/* BRIEFS LIST */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {profiles.map(profile => (
                          <div key={profile.id} className="bg-white p-8 rounded-[2rem] border border-slate-300 hover:border-slate-500 transition-all group/card shadow-md flex flex-col justify-between">
                            <div className="space-y-6">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-[12px] font-black text-slate-900 uppercase tracking-tight mb-1">{profile.name}</p>
                                  <div className="flex gap-2">
                                     <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{profile.goal}</span>
                                  </div>
                                </div>
                                <div className="flex gap-1.5">
                                  <button onClick={() => startEditProfile(profile)} className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm border border-slate-200" title="Editar Brief">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                  </button>
                                  <button onClick={() => onDeleteProfile(profile.id)} className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm border border-slate-200">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              </div>
                              
                              <div className="space-y-4 pt-4 border-t border-slate-100">
                                <p className="text-[10px] text-slate-600 font-bold leading-relaxed line-clamp-2">
                                  <span className="text-slate-900 uppercase text-[9px]">Tema:</span> {profile.theme}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {profiles.length === 0 && !isManagingThisClient && (
                        <div className="md:col-span-2 py-20 border-2 border-dashed border-slate-300 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                           <div className="bg-slate-100 p-6 rounded-full mb-4 shadow-inner">
                              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                           </div>
                           <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">No hay Campañas Activas</p>
                           <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tight max-w-[240px]">Configura el ADN para crear campañas.</p>
                        </div>
                        )}
                      </div>
                   </div>
                 )}
              </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClientManager;
