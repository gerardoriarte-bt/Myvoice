
import React from 'react';
import { Lock, Unlock, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { CopyVariation, Project, Platform, Client, CoherenceReport, CampaignSpine, UsageReport } from '../types';
import CoherenceBanner from './CoherenceBanner';
import SpineHero from './SpineHero';
import UsageBadge from './UsageBadge';
import { PlatformIcon, getPlatformLabel } from './ui/platformIcons';
import ScoreCircle from './ui/ScoreCircle';
import { exportCampaignToExcel } from '../services/exportToExcel';
import { negativeFeedbackApi } from '../services/api';

interface ResultsTableProps {
  variations: CopyVariation[];
  projects: Project[];
  activeClient?: Client;
  onSave: (variation: CopyVariation, projectId: string) => void;
  onCreateProject: (name: string) => string;
  savedContentList: string[];
  coherence?: CoherenceReport | null;
  spine?: CampaignSpine | null;
  usage?: UsageReport | null;
  onRegenerate?: (lockedKeys: Set<string>) => void;
  isLoading?: boolean;
}

const variationKey = (v: CopyVariation) =>
  `${v.platform}::${v.slot || '_default'}::${v.variationIndex ?? 0}`;

const ResultsTable: React.FC<ResultsTableProps> = ({ variations, projects, activeClient, onSave, onCreateProject, savedContentList, coherence, spine, usage, onRegenerate, isLoading }) => {
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [mockupId, setMockupId] = React.useState<string | null>(null);
  const [editBuffer, setEditBuffer] = React.useState('');
  const [localVariations, setLocalVariations] = React.useState<CopyVariation[]>(variations);
  const [newProjectName, setNewProjectName] = React.useState('');
  const [collapsedSlots, setCollapsedSlots] = React.useState<Set<string>>(new Set());
  const [lockedKeys, setLockedKeys] = React.useState<Set<string>>(new Set());
  const [negativeFeedbackTarget, setNegativeFeedbackTarget] = React.useState<CopyVariation | null>(null);
  const [negativeReason, setNegativeReason] = React.useState('');
  const [negativeSaving, setNegativeSaving] = React.useState(false);
  const [negativeSavedIds, setNegativeSavedIds] = React.useState<Set<string>>(new Set());

  const isLocked = (v: CopyVariation) => lockedKeys.has(variationKey(v));
  const toggleLock = (v: CopyVariation) => {
    const key = variationKey(v);
    setLockedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const slotKey = (platform: string, slot?: string) => `${platform}::${slot || '_default'}`;
  const isCollapsed = (platform: string, slot?: string) => collapsedSlots.has(slotKey(platform, slot));
  const toggleSlot = (platform: string, slot?: string) => {
    const key = slotKey(platform, slot);
    setCollapsedSlots(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  React.useEffect(() => {
    setLocalVariations(variations);
    // Default: collapse all slots except the first per platform.
    const seenFirst = new Set<string>();
    const next = new Set<string>();
    variations.forEach(v => {
      const platform = String(v.platform);
      const firstSeen = seenFirst.has(platform);
      if (!firstSeen) {
        seenFirst.add(platform);
        return; // first slot of platform stays expanded
      }
      next.add(`${platform}::${v.slot || '_default'}`);
    });
    setCollapsedSlots(next);
  }, [variations]);

  const isSaved = (content: string) => savedContentList.includes(content);

  const startEditing = (v: CopyVariation) => {
    setEditingId(v.id);
    setEditBuffer(v.content);
  };

  const saveEdit = (id: string) => {
    setLocalVariations(prev => prev.map(v => v.id === id ? { ...v, content: editBuffer, charCount: editBuffer.length } : v));
    setEditingId(null);
  };

  const handleSave = (variation: CopyVariation, projectId: string) => {
    onSave(variation, projectId);
    setSavingId(null);
  };

  const handleCreateAndSave = (variation: CopyVariation) => {
    if (!newProjectName.trim()) return;
    const projectId = onCreateProject(newProjectName);
    onSave(variation, projectId);
    setNewProjectName('');
    setSavingId(null);
  };

  const exportToExcel = () => {
    exportCampaignToExcel({
      variations: localVariations,
      spine,
      client: activeClient,
      coherence,
      usage,
    });
  };

  const cleanText = (text: string) => {
    return text.replace(/\[(ASUNTO|HEADER|BODY|CTA|TÍTULO|CUERPO|TITULO|DESCRIPCIÓN|DESCRIPCION)\]:?/gi, '').trim();
  };

  const renderMockup = (v: CopyVariation) => {
    const visualIdeaMatch = v.content.match(/\[IDEA VISUAL:? (.*?)\]/i);
    const visualIdea = visualIdeaMatch ? visualIdeaMatch[1] : "Imagen de campaña estratégica";
    const contentWithoutVisual = v.content.replace(/\[IDEA VISUAL:? (.*?)\]/i, '').trim();

    // Use a more robust split (handles both | and -)
    const splitContent = (text: string) => {
      if (text.includes('|')) return text.split('|').map(s => cleanText(s));
      if (text.includes(' - ')) return text.split(' - ').map(s => cleanText(s));
      return [cleanText(text)];
    };

    switch (v.platform) {
      case Platform.PUSH:
        const [pTitle, pBody] = splitContent(contentWithoutVisual);
        return (
          <div className="bg-slate-900 p-8 rounded-[3rem] w-full max-w-[320px] mx-auto shadow-2xl border-[12px] border-slate-800 relative h-[600px] flex flex-col pt-20">
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-20 h-6 bg-slate-800 rounded-full"></div>
            <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-5 shadow-2xl border border-white/20 animate-in slide-in-from-top-4 duration-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center shadow-inner">
                  {activeClient?.logo ? <img src={activeClient.logo} className="w-4 h-4 object-contain" /> : <div className="w-2 h-2 bg-slate-900 rounded-full"></div>}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-white uppercase tracking-tighter leading-none">{activeClient?.name || 'MY VOICE'}</p>
                </div>
                <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">ahora</span>
              </div>
              <p className="text-[12px] font-black text-white leading-tight mb-1">{pTitle}</p>
              <p className="text-[11px] font-medium text-white/70 leading-snug">{pBody}</p>
            </div>
          </div>
        );

      case Platform.INSTAGRAM_POST:
        return (
          <div className="bg-white border border-slate-200 rounded-[3rem] w-full max-w-[340px] mx-auto shadow-2xl overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 flex items-center gap-3 border-b border-slate-50">
              <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
                 <div className="w-full h-full rounded-full bg-white p-0.5">
                    <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center font-black text-[10px] overflow-hidden">
                      {activeClient?.logo ? <img src={activeClient.logo} className="w-full h-full object-cover" /> : activeClient?.name[0]}
                    </div>
                 </div>
              </div>
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{activeClient?.name || 'brand_name'}</span>
            </div>
            <div className="aspect-square bg-slate-900 flex items-center justify-center p-10 text-center relative group overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 opacity-80"></div>
               {visualIdeaMatch && (
                 <p className="text-[11px] font-black text-white/90 uppercase tracking-[0.2em] relative z-10 px-6 leading-relaxed">
                   {visualIdea}
                 </p>
               )}
            </div>
            <div className="p-5 flex-1 space-y-4">
              <div className="flex gap-5">
                <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[140px] custom-scrollbar pr-2">
                 <p className="text-[12px] text-slate-900 leading-relaxed font-medium">
                   <span className="font-black mr-2 uppercase tracking-tighter">{activeClient?.name?.replace(/\s/g, '').toLowerCase() || 'brand'}</span>
                   {cleanText(contentWithoutVisual)}
                 </p>
              </div>
            </div>
          </div>
        );

      case Platform.GOOGLE_ADS:
        const [gTitle, gDesc] = splitContent(contentWithoutVisual);
        return (
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-[420px] mx-auto shadow-2xl border border-slate-100 flex flex-col gap-4">
             <div className="flex items-center gap-3">
                <div className="bg-slate-100 px-2 py-0.5 rounded text-[8px] font-black text-slate-600 uppercase">Patrocinado</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">www.{activeClient?.name?.toLowerCase().replace(/\s/g, '') || 'empresa'}.com</div>
             </div>
             <div className="space-y-2">
                <h4 className="text-2xl font-black text-[#1a0dab] hover:underline cursor-pointer leading-tight tracking-tight">{gTitle}</h4>
                <p className="text-[14px] text-[#4d5156] leading-relaxed font-medium">{gDesc}</p>
             </div>
          </div>
        );

      case Platform.POP_UP:
        const popParts = splitContent(contentWithoutVisual);
        const [popTitle, popBody, popCta] = popParts;
        return (
          <div className="bg-slate-900/20 p-8 rounded-[4rem] w-full max-w-[420px] mx-auto shadow-2xl relative flex items-center justify-center overflow-hidden backdrop-blur-sm">
             <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl text-center space-y-8 relative z-10 animate-in zoom-in-90 duration-700 border border-slate-100">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl mx-auto flex items-center justify-center border border-slate-100 shadow-inner">
                   {activeClient?.logo ? <img src={activeClient.logo} className="w-12 h-12 object-contain grayscale" /> : <div className="w-10 h-10 bg-slate-900 rounded-2xl"></div>}
                </div>
                <div className="space-y-3">
                   <h5 className="text-2xl font-black text-slate-900 leading-none uppercase tracking-tighter">{popTitle}</h5>
                   <p className="text-[13px] font-bold text-slate-500 leading-relaxed max-w-[280px] mx-auto">{popBody}</p>
                </div>
                <button className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl">
                   {popCta}
                </button>
                <button className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] hover:text-slate-900 transition-colors">No me interesa ahora</button>
             </div>
             <div className="absolute top-6 right-6 w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center font-black text-white text-xl cursor-pointer">×</div>
          </div>
        );

      default:
        return <p className="text-center text-slate-400 font-black uppercase text-[10px]">Mockup no disponible para esta plataforma</p>;
    }
  };

  const renderContent = (v: CopyVariation) => {
    if (editingId === v.id) {
      return (
        <div className="space-y-4 animate-in fade-in duration-300">
          <textarea 
            className="w-full p-4 bg-slate-50 border border-slate-900 rounded-2xl text-sm font-bold text-slate-800 outline-none min-h-[150px] resize-none"
            value={editBuffer}
            onChange={(e) => setEditBuffer(e.target.value)}
            autoFocus
          />
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{editBuffer.length} Caracteres</span>
            <div className="flex gap-2">
              <button onClick={() => setEditingId(null)} className="px-4 py-2 text-[9px] font-black uppercase text-slate-400 hover:text-slate-900 transition-colors">Cancelar</button>
              <button onClick={() => saveEdit(v.id)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">Aplicar Cambio</button>
            </div>
          </div>
        </div>
      );
    }

    const visualIdeaMatch = v.content.match(/\[IDEA VISUAL:? (.*?)\]/i);
    const contentWithoutVisual = v.content.replace(/\[IDEA VISUAL:? (.*?)\]/i, '').trim();

    // Re-using the logic for internal consistency
    const splitFn = (text: string) => {
      if (text.includes('|')) return text.split('|').map(s => s.trim());
      if (text.includes(' - ')) return text.split(' - ').map(s => s.trim());
      return [text];
    };

    const isSegmented = [Platform.PUSH, Platform.GOOGLE_ADS, Platform.POP_UP].includes(v.platform as Platform);
    
    return (
      <div className="space-y-4 group/content relative">
        <button 
          onClick={() => startEditing(v)} 
          className="absolute -right-2 -top-2 flex items-center gap-2 px-3 py-2 bg-slate-900 shadow-xl shadow-slate-900/10 rounded-xl text-white hover:bg-black transition-all z-10 group/editbtn"
          title="Editar Contenido"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover/editbtn:block animate-in fade-in slide-in-from-right-1 duration-200">Editar</span>
        </button>
        {isSegmented ? (
          <div className="space-y-4">
            {splitFn(contentWithoutVisual).map((part, i) => {
              let label = i === 0 ? "Título" : i === 1 ? "Cuerpo" : "CTA";
              if (v.platform === Platform.GOOGLE_ADS) label = i === 0 ? "Título" : "Descripción";
              
              return (
                <div key={i} className="space-y-1">
                  <span className="text-[7px] font-black uppercase text-slate-300 tracking-[0.2em]">{label}</span>
                  <p className="text-slate-800 font-bold text-sm leading-relaxed">{cleanText(part)}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-800 text-sm font-bold leading-relaxed whitespace-pre-wrap">
            {cleanText(contentWithoutVisual)}
          </p>
        )}

        {visualIdeaMatch && (
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
             <span className="text-[7px] font-black uppercase text-slate-400 tracking-[0.2em] block mb-2">Sugerencia Visual IA</span>
             <p className="text-[10px] text-slate-500 italic font-medium leading-relaxed">
               "{visualIdeaMatch[1]}"
             </p>
          </div>
        )}
        
        {v.scoreRationale && (
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
             <span className="text-[7px] font-black uppercase text-slate-400 tracking-[0.2em] block mb-2">Autoevaluación IA ({v.score}/10)</span>
             <p className="text-[10px] text-slate-500 italic font-medium leading-relaxed">
               "{v.scoreRationale}"
             </p>
          </div>
        )}
      </div>
    );
  };

  const groupedVariations = localVariations.reduce((acc, curr) => {
    const platformKey = String(curr.platform);
    if (!acc[platformKey]) acc[platformKey] = [];
    acc[platformKey].push(curr);
    return acc;
  }, {} as Record<string, CopyVariation[]>);

  const SLOT_ORDER = ['hook', 'narrative', 'narrativa', 'opening', 'caption', 'cta', 'title', 'titulo', 'subject', 'asunto', 'body', 'cuerpo', 'description', 'descripcion', 'header'];

  const groupByVariationIndex = (items: CopyVariation[]): { variationIndex: number; type: string; slots: CopyVariation[] }[] => {
    const map = new Map<number, CopyVariation[]>();
    items.forEach(v => {
      const idx = v.variationIndex ?? 0;
      if (!map.has(idx)) map.set(idx, []);
      map.get(idx)!.push(v);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([variationIndex, slots]) => ({
        variationIndex,
        type: slots[0]?.type || 'Standard',
        slots: [...slots].sort((a, b) => {
          const ai = SLOT_ORDER.findIndex(s => (a.slot || '').toLowerCase().includes(s));
          const bi = SLOT_ORDER.findIndex(s => (b.slot || '').toLowerCase().includes(s));
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        }),
      }));
  };

  const renderVariationCard = (v: CopyVariation, idx: number) => {
    const saved = isSaved(v.content);
    const hasIssue = v.budgetOk === false || (v.prohibitionsHit && v.prohibitionsHit.length > 0);
    return (
      <div key={`${v.id}-${idx}`} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col group overflow-hidden">
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {typeof v.variationIndex === 'number' && (
                <span className="text-[11px] font-medium text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                  #{v.variationIndex}
                </span>
              )}
              <span className="text-[11px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                {v.type}
              </span>
              {v.budget !== undefined && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                  v.budgetOk === false
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {v.charCount}/{v.budget} {v.budgetUnit === 'word' ? 'pal' : 'car'}
                </span>
              )}
              {v.prohibitionsHit && v.prohibitionsHit.length > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-red-50 text-red-700 border-red-200" title={`Prohibición detectada: ${v.prohibitionsHit.join(', ')}`}>
                  ⚠ Prohibición
                </span>
              )}
              {v.editorFlags && v.editorFlags.length > 0 && v.editorFlags.map(flag => (
                <span key={flag} className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-200" title="Detectado por el editor IA">
                  {flag}
                </span>
              ))}
              {typeof v.writerScore === 'number' && typeof v.score === 'number' && v.writerScore !== v.score && (
                <span className="text-[10px] font-medium text-gray-500" title={`Writer score: ${v.writerScore} → Editor score: ${v.score}`}>
                  ✎ {v.writerScore}→{v.score}
                </span>
              )}
              {v.autofixed && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200" title="Auto-corregida después de detectar violación de regla">
                  🔧 auto-fix
                </span>
              )}
              {isLocked(v) && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-200 inline-flex items-center gap-1" title="Esta variación está lockeada">
                  <Lock className="w-2.5 h-2.5" /> lockeada
                </span>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
               <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${hasIssue ? 'bg-red-500' : 'bg-green-500'}`}></div>
                  <span className="text-gray-500 font-medium text-[10px]">{hasIssue ? 'Revisar' : 'Verificado'}</span>
               </div>
               {v.score !== undefined && (
                 <div
                   className={`w-7 h-7 rounded-full flex items-center justify-center mt-1 ${
                     v.score >= 7 ? 'bg-emerald-500' : v.score >= 5 ? 'bg-amber-400' : 'bg-red-500'
                   }`}
                   title={`Score: ${v.score}/10`}
                 >
                   <span className="text-[10px] font-bold text-white">{v.score}</span>
                 </div>
               )}
            </div>
          </div>

          <div className="flex-1">
            {renderContent(v)}
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4 flex gap-2">
            <button
              onClick={() => toggleLock(v)}
              className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors border ${
                isLocked(v)
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  : 'bg-white text-gray-400 border-gray-200 hover:text-gray-700 hover:bg-gray-50'
              }`}
              title={isLocked(v) ? 'Lockeada — protegida en próxima regeneración' : 'Lockear esta variación'}
            >
              {isLocked(v) ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => { setNegativeFeedbackTarget(v); setNegativeReason(''); }}
              className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors border text-[14px] ${
                negativeSavedIds.has(v.id)
                  ? 'bg-red-50 text-red-500 border-red-200'
                  : 'bg-white text-gray-400 border-gray-200 hover:text-red-500 hover:bg-red-50 hover:border-red-200'
              }`}
              title={negativeSavedIds.has(v.id) ? 'Feedback negativo enviado' : 'Marcar como mala variación (enseña al motor qué evitar)'}
              disabled={negativeSavedIds.has(v.id)}
            >
              👎
            </button>
            <button
              onClick={() => setMockupId(mockupId === v.id ? null : v.id)}
              className={`flex-1 py-2 rounded-lg text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 border ${mockupId === v.id ? 'bg-gray-100 text-gray-900 border-gray-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Mockup
            </button>

            {saved ? (
              <div className="flex-1 flex items-center justify-center gap-1.5 bg-gray-50 text-gray-500 font-medium text-[12px] py-2 rounded-lg border border-gray-200">
                <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                Guardado
              </div>
            ) : (
              <button
                onClick={() => setSavingId(v.id)}
                className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-[12px] font-medium hover:bg-gray-800 transition-colors flex items-center justify-center shadow-sm"
              >
                Guardar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const totalAlerts = localVariations.filter(
    v => v.budgetOk === false || (v.prohibitionsHit?.length ?? 0) > 0 || (v.editorFlags?.length ?? 0) > 0
  ).length

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {spine && <SpineHero spine={spine} client={activeClient} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          {activeClient && (
            <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 p-1 flex items-center justify-center overflow-hidden shrink-0">
              {activeClient.logo ? (
                <img src={activeClient.logo} alt={activeClient.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-sm font-medium text-gray-400">{activeClient.name.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
          )}
          <div>
            <h2 className="text-[18px] font-medium text-gray-900 leading-tight">Resultados de Campaña</h2>
            <p className="text-gray-500 text-[12px] mt-0.5">Generaciones del Motor IA</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button
              onClick={() => onRegenerate(lockedKeys)}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors border ${
                isLoading
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : lockedKeys.size > 0
                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              title={lockedKeys.size > 0 ? `Regenerar manteniendo ${lockedKeys.size} lockeada${lockedKeys.size === 1 ? '' : 's'}` : 'Regenerar deck completo'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {lockedKeys.size > 0 ? `Regenerar (${lockedKeys.size} 🔒)` : 'Regenerar'}
            </button>
          )}
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[13px] font-medium transition-colors border border-emerald-200"
            title="Excel multi-hoja: Resumen + 1 hoja por canal con slots, char counts, scores y flags"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>
      </div>

      {coherence && <CoherenceBanner report={coherence} />}

      {usage && <UsageBadge usage={usage} />}

      {totalAlerts > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-[12px] text-amber-800">
          <svg className="w-4 h-4 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          <span className="font-medium">{totalAlerts} variación{totalAlerts !== 1 ? 'es' : ''} necesitan revisión</span>
          <span className="text-amber-600">— budget excedido, prohibición detectada o flag del editor</span>
        </div>
      )}

      <div className="space-y-8">
        {(Object.entries(groupedVariations) as [string, CopyVariation[]][]).map(([platform, items]) => {
          const variationGroups = groupByVariationIndex(items);
          const totalIssues = items.filter(v => v.budgetOk === false || (v.prohibitionsHit && v.prohibitionsHit.length > 0) || (v.editorFlags && v.editorFlags.length > 0)).length;
          const scored = items.filter(v => typeof v.score === 'number');
          const avgScore = scored.length > 0 ? scored.reduce((a, v) => a + (v.score || 0), 0) / scored.length : 0;
          const slotsPerVariation = variationGroups[0]?.slots.length ?? 1;
          return (
            <section key={platform} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              {/* PLATFORM HEADER */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/40">
                <PlatformIcon platform={platform} size="md" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-medium text-gray-900 leading-tight truncate">{platform}</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {variationGroups.length} variación{variationGroups.length !== 1 ? 'es' : ''}
                    {slotsPerVariation > 1 ? ` · ${slotsPerVariation} componentes` : ''}
                  </p>
                </div>
                {totalIssues > 0 && (
                  <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                    {totalIssues} a revisar
                  </span>
                )}
                {scored.length > 0 && <ScoreCircle score={avgScore} size="sm" />}
              </div>

              {/* VARIATION CARDS — agrupadas por variationIndex */}
              <div className="p-4 space-y-3 bg-gray-50/30">
                {variationGroups.map(({ variationIndex, type, slots }) => {
                  const hasAnyIssue = slots.some(v => v.budgetOk === false || (v.prohibitionsHit?.length ?? 0) > 0);
                  const vScores = slots.filter(v => typeof v.score === 'number').map(v => v.score!);
                  const vAvg = vScores.length ? vScores.reduce((a, b) => a + b, 0) / vScores.length : null;
                  const rationaleSlots = slots.filter(v => v.scoreRationale);
                  const visualIdea = slots.flatMap(v => { const m = v.content.match(/\[IDEA VISUAL:? (.*?)\]/i); return m ? [m[1]] : []; })[0];
                  const hasIA = rationaleSlots.length > 0 || !!visualIdea;

                  return (
                    <div key={`vi-${variationIndex}`} className="bg-white border border-gray-200 rounded-xl overflow-hidden">

                      {/* VARIATION HEADER */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/70 border-b border-gray-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-semibold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">
                            #{variationIndex}
                          </span>
                          {type && type !== 'Standard' && (
                            <span className="text-[12px] font-medium text-gray-800">{type}</span>
                          )}
                          {hasAnyIssue && (
                            <span className="text-[10px] font-medium text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Revisar</span>
                          )}
                          {slots.some(v => v.autofixed) && (
                            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">🔧 auto-fix</span>
                          )}
                          {slots.some(v => isLocked(v)) && (
                            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> lockeada
                            </span>
                          )}
                        </div>
                        {vAvg !== null && <ScoreCircle score={vAvg} size="sm" />}
                      </div>

                      {/* SLOTS — PROPUESTA */}
                      <div className="divide-y divide-gray-50">
                        {slots.map(v => {
                          const contentWithoutVisual = v.content.replace(/\[IDEA VISUAL:? (.*?)\]/i, '').trim();
                          const hasSlotIssue = v.budgetOk === false || (v.prohibitionsHit?.length ?? 0) > 0;
                          const slotSaved = isSaved(v.content);
                          return (
                            <div key={v.id} className="px-4 py-3 group/slot">
                              {/* ETIQUETA DE HERRAMIENTA — slot label + métricas */}
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">
                                    {v.slot || 'copy'}
                                  </span>
                                  {v.budget !== undefined && (
                                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                                      hasSlotIssue ? 'text-red-600 bg-red-50 border border-red-200' : 'text-gray-400 bg-gray-50'
                                    }`}>
                                      {v.charCount}/{v.budget} {v.budgetUnit === 'word' ? 'pal' : 'car'}
                                    </span>
                                  )}
                                  {v.prohibitionsHit && v.prohibitionsHit.length > 0 && (
                                    <span className="text-[9px] text-red-600 font-medium" title={v.prohibitionsHit.join(', ')}>⚠ prohibición</span>
                                  )}
                                  {v.editorFlags && v.editorFlags.length > 0 && (
                                    <span className="text-[9px] text-amber-700 font-medium">{v.editorFlags.join(', ')}</span>
                                  )}
                                </div>
                                {/* PER-SLOT ACTIONS */}
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => toggleLock(v)}
                                    className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                                      isLocked(v) ? 'text-amber-600 bg-amber-50' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-50'
                                    }`}
                                    title={isLocked(v) ? 'Desbloquear slot' : 'Lockear slot'}
                                  >
                                    {isLocked(v) ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                  </button>
                                  {slotSaved ? (
                                    <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium px-2 py-0.5 bg-green-50 rounded border border-green-200">
                                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                      Guardado
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => setSavingId(v.id)}
                                      className="text-[10px] font-medium text-gray-500 hover:text-gray-900 px-2 py-0.5 bg-white border border-gray-200 rounded hover:border-gray-400 transition-colors"
                                    >
                                      Guardar
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* PROPUESTA — el copy */}
                              {editingId === v.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-[13px] font-medium text-gray-900 outline-none min-h-[80px] resize-none"
                                    value={editBuffer}
                                    onChange={e => setEditBuffer(e.target.value)}
                                    autoFocus
                                  />
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-gray-400">{editBuffer.length} car</span>
                                    <div className="flex gap-2">
                                      <button onClick={() => setEditingId(null)} className="text-[11px] text-gray-400 hover:text-gray-700 px-2 py-1">Cancelar</button>
                                      <button onClick={() => saveEdit(v.id)} className="text-[11px] font-medium text-white bg-gray-900 px-3 py-1 rounded-md">Aplicar</button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative group/copy">
                                  <p className="text-[14px] font-medium text-gray-900 leading-relaxed pr-6">
                                    {cleanText(contentWithoutVisual)}
                                  </p>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(cleanText(contentWithoutVisual))
                                    }}
                                    className="absolute top-0 right-7 p-1 bg-white border border-gray-200 text-gray-500 rounded-md opacity-0 group-hover/copy:opacity-100 transition-opacity hover:bg-gray-50"
                                    title="Copiar al portapapeles"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                                  </button>
                                  <button
                                    onClick={() => startEditing(v)}
                                    className="absolute top-0 right-0 p-1 bg-gray-900 text-white rounded-md opacity-0 group-hover/copy:opacity-100 transition-opacity"
                                    title="Editar"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* RECOMENDACIÓN DEL MOTOR — visualmente separada de la propuesta */}
                      {hasIA && (
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 mb-2">
                            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Evaluación del motor</span>
                          </div>
                          {visualIdea && (
                            <p className="text-[11px] text-slate-500 leading-relaxed mb-1.5">
                              <span className="font-semibold text-slate-600">Visual sugerido:</span> {visualIdea}
                            </p>
                          )}
                          {rationaleSlots.map(v => (
                            <p key={v.id} className="text-[11px] text-slate-500 leading-relaxed mb-1">
                              {slots.length > 1 && (
                                <span className="text-[9px] font-semibold uppercase text-slate-400 mr-1.5">{v.slot}:</span>
                              )}
                              {v.scoreRationale}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* FOOTER — acciones a nivel de variación */}
                      <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-2 bg-white">
                        <button
                          onClick={() => { setNegativeFeedbackTarget(slots[0]); setNegativeReason(''); }}
                          disabled={slots.some(v => negativeSavedIds.has(v.id))}
                          className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors border text-[12px] ${
                            slots.some(v => negativeSavedIds.has(v.id))
                              ? 'bg-red-50 text-red-500 border-red-200'
                              : 'bg-white text-gray-400 border-gray-200 hover:text-red-500 hover:bg-red-50 hover:border-red-200'
                          }`}
                          title="Marcar variación como mala — enseña al motor qué evitar"
                        >
                          👎
                        </button>
                        {[Platform.PUSH, Platform.INSTAGRAM_POST, Platform.GOOGLE_ADS, Platform.POP_UP].includes(platform as Platform) && (
                          <button
                            onClick={() => setMockupId(slots[0].id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            Mockup
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* MODAL PARA MOCKUP */}
      {mockupId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={() => setMockupId(null)}></div>
           <div className="relative z-10 w-full max-w-4xl bg-white p-8 rounded-2xl border border-gray-200 shadow-xl animate-in zoom-in-95 duration-300">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                 <div className="flex-1 w-full flex items-center justify-center bg-gray-50 rounded-xl p-6 border border-gray-100">
                    {renderMockup(localVariations.find(v => v.id === mockupId)!)}
                 </div>
                 <div className="md:w-1/3 space-y-6">
                    <div>
                       <h3 className="text-[20px] font-medium text-gray-900">Simulador de Interfaz</h3>
                       <p className="text-[13px] text-gray-500 mt-1">
                         Previsualización del contenido en la interfaz nativa del canal seleccionado.
                       </p>
                    </div>
                    <button onClick={() => setMockupId(null)} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-[13px] hover:bg-gray-200 transition-colors">
                       Cerrar Simulador
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL NEGATIVE FEEDBACK */}
      {negativeFeedbackTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setNegativeFeedbackTarget(null)} />
          <div className="relative z-10 w-full max-w-sm bg-white p-6 rounded-xl shadow-xl border border-gray-200 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-[15px] font-medium text-gray-900">¿Por qué no sirve?</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">El motor evitará este patrón en próximas generaciones</p>
              </div>
              <button onClick={() => setNegativeFeedbackTarget(null)} className="p-1 text-gray-400 hover:text-gray-900 rounded-md transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {['Muy genérico', 'Tono equivocado', 'Fuera de marca', 'Idea ya usada', 'No conecta con la audiencia'].map(r => (
                <button
                  key={r}
                  onClick={() => setNegativeReason(r)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium border transition-colors ${
                    negativeReason === r
                      ? 'bg-red-50 text-red-700 border-red-300'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {r}
                </button>
              ))}
              <input
                type="text"
                placeholder="Otro motivo..."
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-gray-400 transition-colors"
                value={['Muy genérico', 'Tono equivocado', 'Fuera de marca', 'Idea ya usada', 'No conecta con la audiencia'].includes(negativeReason) ? '' : negativeReason}
                onChange={e => setNegativeReason(e.target.value)}
              />
            </div>

            <button
              disabled={!negativeReason.trim() || negativeSaving}
              onClick={async () => {
                if (!negativeReason.trim() || !negativeFeedbackTarget || !activeClient) return;
                setNegativeSaving(true);
                try {
                  await negativeFeedbackApi.save({
                    clientId: activeClient.id,
                    platform: String(negativeFeedbackTarget.platform),
                    content: negativeFeedbackTarget.content,
                    reason: negativeReason,
                  });
                  setNegativeSavedIds(prev => new Set(prev).add(negativeFeedbackTarget.id));
                  setNegativeFeedbackTarget(null);
                } catch {
                  // silently fail — UX not blocked
                } finally {
                  setNegativeSaving(false);
                }
              }}
              className="w-full bg-red-600 text-white py-2 rounded-lg text-[13px] font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {negativeSaving ? 'Guardando...' : 'Enviar feedback al motor'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL PARA GUARDAR */}
      {savingId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSavingId(null)}></div>
           <div className="relative z-10 w-full max-w-md bg-white p-6 rounded-xl shadow-xl border border-gray-200 animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-6">
                <div>
                   <h3 className="text-[16px] font-medium text-gray-900">Guardar en Biblioteca</h3>
                   <p className="text-gray-500 text-[12px] mt-0.5">Selecciona el proyecto de destino</p>
                </div>
                <button onClick={() => setSavingId(null)} className="p-1 text-gray-400 hover:text-gray-900 rounded-md transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar mb-6 pr-2">
                {projects.length === 0 && (
                  <p className="text-center py-6 text-gray-400 text-[12px] border border-dashed border-gray-200 rounded-lg">No hay proyectos activos</p>
                )}
                {projects.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => handleSave(localVariations.find(v => v.id === savingId)!, p.id)}
                    className="w-full text-left p-3 hover:bg-gray-50 rounded-lg text-[13px] font-medium text-gray-700 transition-colors flex items-center justify-between border border-gray-200"
                  >
                    <span>{p.name}</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-6 space-y-4">
                <div>
                   <label className="block text-[12px] font-medium text-gray-700 mb-1">O crear nuevo proyecto</label>
                   <input 
                      type="text" 
                      placeholder="Nombre del proyecto..."
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-gray-400 transition-colors"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                   />
                </div>
                <button 
                  onClick={() => handleCreateAndSave(localVariations.find(v => v.id === savingId)!)}
                  disabled={!newProjectName.trim()}
                  className="w-full bg-gray-900 text-white py-2 rounded-lg text-[13px] font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Confirmar y Guardar
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ResultsTable;
