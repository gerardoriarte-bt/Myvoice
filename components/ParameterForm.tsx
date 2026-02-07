
import React from 'react';
import { Platform, CopyParameters, BrandConfig, Client, ContentDNAProfile } from '../types';

interface ParameterFormProps {
  onSubmit: (params: CopyParameters) => void;
  isLoading: boolean;
  clients: Client[];
  dnaProfiles: ContentDNAProfile[];
  defaultClientId: string;
  onNavigateToClients: () => void;
}

const ParameterForm: React.FC<ParameterFormProps> = ({ 
  onSubmit, 
  isLoading, 
  clients, 
  dnaProfiles,
  defaultClientId,
  onNavigateToClients
}) => {
  const [clientId, setClientId] = React.useState(defaultClientId || '');
  const [activeProfileId, setActiveProfileId] = React.useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<Platform[]>([]);

  React.useEffect(() => {
    if (clients.length > 0) {
      if (!clientId || !clients.find(c => c.id === clientId)) {
        setClientId(defaultClientId || clients[0].id);
      }
    }
  }, [clients, defaultClientId]);

  React.useEffect(() => {
    setActiveProfileId(null);
  }, [clientId]);

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const activeClient = clients.find(c => c.id === clientId);
    const profile = dnaProfiles.find(p => p.id === activeProfileId);
    
    if (!profile || selectedPlatforms.length === 0 || !clientId) return;
    
    onSubmit({ 
      voice: profile.voice, 
      goal: profile.goal, 
      theme: profile.theme, 
      product: profile.product,
      targetAudience: profile.targetAudience,
      keywords: profile.keywords,
      brandVoiceGuidelines: profile.brandVoiceGuidelines,
      valueProposition: profile.valueProposition,
      primaryCTA: profile.primaryCTA,
      feedbackExamples: profile.feedbackExamples, // Inyectamos el aprendizaje
      platforms: selectedPlatforms, 
      clientId,
      clientName: activeClient?.name,
      clientIndustry: activeClient?.industry
    });
  };

  const clientProfiles = dnaProfiles.filter(p => p.clientId === clientId);
  const activeClient = clients.find(c => c.id === clientId);

  const inputStyle = "w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300 text-sm";
  const labelStyle = "block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4";

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 space-y-10 shadow-sm animate-in fade-in duration-700">
        <div className="space-y-5">
          <label className={labelStyle}>1. Marca</label>
          <select 
            value={clientId} 
            onChange={(e) => setClientId(e.target.value)} 
            className={inputStyle + " appearance-none cursor-pointer pr-10 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%22%20d%3D%22m19.5%208.25-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25em_1.25em] bg-[right_1.25rem_center] bg-no-repeat"}
          >
            {clients.length === 0 && <option value="">Sin marcas registradas</option>}
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          
          {activeClient && (
            <div className="flex items-center gap-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 animate-in slide-in-from-left-2">
              <div className="w-10 h-10 bg-white rounded-xl overflow-hidden shadow-sm shrink-0 border border-slate-100">
                {activeClient.logo ? (
                  <img src={activeClient.logo} className="w-full h-full object-contain" alt={activeClient.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-slate-300 bg-slate-50 text-xs">
                    {activeClient.name[0]}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[11px] font-black uppercase text-slate-900 leading-none mb-1">{activeClient.name}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{activeClient.industry}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5 pt-6 border-t border-slate-50">
          <div className="flex justify-between items-center">
            <label className={labelStyle}>2. ADN Estratégico</label>
            {clientProfiles.length > 0 && (
              <span className="text-[8px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">Selección</span>
            )}
          </div>
          
          {clientId && clientProfiles.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {clientProfiles.map(profile => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setActiveProfileId(profile.id)}
                  className={`p-5 rounded-2xl border text-left transition-all duration-300 relative group/dna ${
                    activeProfileId === profile.id 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-[1.02] z-10' 
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                  }`}
                >
                  {activeProfileId === profile.id && (
                    <div className="absolute -right-2 -top-2 w-6 h-6 bg-slate-900 border-2 border-white rounded-full flex items-center justify-center text-[10px] animate-in zoom-in-50">
                       ✓
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em]">{profile.name}</p>
                    {profile.feedbackExamples && profile.feedbackExamples.length > 0 && (
                       <span className="text-[7px] font-black px-1.5 py-0.5 bg-green-500 text-white rounded-md uppercase animate-pulse">DNA Trained</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                     <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase border ${activeProfileId === profile.id ? 'border-white/20 bg-white/10' : 'border-slate-100 bg-slate-50'}`}>
                       {profile.voice}
                     </span>
                     <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase border ${activeProfileId === profile.id ? 'border-white/20 bg-white/10' : 'border-slate-100 bg-slate-50'}`}>
                       {profile.goal}
                     </span>
                  </div>
                  <p className={`text-[9px] font-bold uppercase tracking-tight line-clamp-1 opacity-60`}>
                    Tema: {profile.theme}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-10 border border-dashed border-slate-200 rounded-3xl text-center bg-slate-50/20 space-y-5">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Falta ADN</p>
                <p className="text-[9px] font-bold text-slate-300 uppercase leading-relaxed max-w-[200px] mx-auto">
                  Configura el ADN de la marca para activar el motor.
                </p>
              </div>
              {clientId && (
                <button 
                  type="button"
                  onClick={onNavigateToClients}
                  className="bg-white border border-slate-200 text-slate-900 text-[9px] font-black px-6 py-3 rounded-xl uppercase tracking-widest hover:bg-slate-50 transition-all inline-flex items-center gap-2 shadow-sm"
                >
                  Configurar ADN
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-5 pt-6 border-t border-slate-50">
          <label className={labelStyle}>3. Canales</label>
          <div className="flex flex-wrap gap-2">
            {Object.values(Platform).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`px-5 py-3 rounded-xl border text-[10px] font-black transition-all uppercase tracking-widest ${
                  selectedPlatforms.includes(p) 
                  ? 'bg-slate-100 text-slate-900 border-slate-900' 
                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-900 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !activeProfileId || selectedPlatforms.length === 0}
          className={`w-full py-5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-4 uppercase tracking-[0.25em] ${
            isLoading 
              ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200' 
              : 'bg-slate-900 text-white hover:bg-black active:scale-[0.98] shadow-xl shadow-slate-900/10'
          }`}
        >
          {isLoading ? 'ESCRIBIENDO...' : 'EJECUTAR MOTOR'}
        </button>
      </form>
    </div>
  );
};

export default ParameterForm;
