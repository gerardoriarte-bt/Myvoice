
import React from 'react';
import { CopyVariation, Project, Platform, Client } from '../types';

interface ResultsTableProps {
  variations: CopyVariation[];
  projects: Project[];
  activeClient?: Client;
  onSave: (variation: CopyVariation, projectId: string) => void;
  onCreateProject: (name: string) => string;
  savedContentList: string[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ variations, projects, activeClient, onSave, onCreateProject, savedContentList }) => {
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [mockupId, setMockupId] = React.useState<string | null>(null);
  const [editBuffer, setEditBuffer] = React.useState('');
  const [localVariations, setLocalVariations] = React.useState<CopyVariation[]>(variations);
  const [newProjectName, setNewProjectName] = React.useState('');

  React.useEffect(() => {
    setLocalVariations(variations);
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

  // Fix: Added missing exportToCSV function
  const exportToCSV = () => {
    const headers = ['Plataforma', 'Tipo', 'Contenido', 'Caracteres'];
    const rows = localVariations.map(v => [
      v.platform,
      v.type,
      `"${v.content.replace(/"/g, '""')}"`,
      v.charCount
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `estrategia_${activeClient?.name?.replace(/\s+/g, '_') || 'myvoice'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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

      case Platform.WHATSAPP:
        return (
          <div className="bg-[#efe7dd] p-4 rounded-[3rem] w-full max-w-[320px] mx-auto shadow-2xl border-[12px] border-slate-800 h-[600px] flex flex-col relative pt-16">
            <div className="absolute top-0 left-0 right-0 h-16 bg-[#075e54] rounded-t-xl flex items-center px-6 gap-3">
               <div className="w-8 h-8 rounded-full bg-slate-200"></div>
               <div className="flex-1">
                  <p className="text-white font-black text-[12px] uppercase">{activeClient?.name || 'Marca'}</p>
                  <p className="text-white/60 text-[8px] font-bold uppercase tracking-widest">en línea</p>
               </div>
            </div>
            <div className="flex-1 flex flex-col justify-end gap-4 p-4">
              <div className="bg-white rounded-2xl rounded-tr-none p-4 shadow-md relative animate-in zoom-in-95 self-end max-w-[90%]">
                <p className="text-[12px] font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">{cleanText(contentWithoutVisual)}</p>
                <div className="flex items-center justify-end gap-1 mt-2">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">10:45</span>
                  <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7m-14 6l4 4L19 7" /></svg>
                </div>
                <div className="absolute top-0 -right-2 w-3 h-3 bg-white" style={{ clipPath: 'polygon(0 0, 0% 100%, 100% 0)' }}></div>
              </div>
            </div>
          </div>
        );

      case Platform.INSTAGRAM:
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

      case Platform.EMAIL:
        const emailParts = splitContent(contentWithoutVisual);
        const [subject, header, body, cta] = emailParts;
        return (
          <div className="bg-white rounded-[3rem] w-full max-w-[480px] mx-auto shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[600px] animate-in fade-in zoom-in-95 duration-700">
            <div className="bg-slate-900 p-8 flex items-center gap-6 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800"></div>
               <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-white text-xl border border-white/20 relative z-10">
                 {activeClient?.name[0]}
               </div>
               <div className="flex-1 overflow-hidden relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="bg-white/10 text-white/60 px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest">Asunto</span>
                     <p className="text-[14px] font-black text-white truncate tracking-tight">{subject || 'Sin Asunto'}</p>
                  </div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">{activeClient?.name} <span className="lowercase">&lt;info@{activeClient?.name?.toLowerCase().replace(/\s/g, '')}.com&gt;</span></p>
               </div>
            </div>
            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex flex-col">
               <div className="flex-1 space-y-10 py-6">
                  <div className="space-y-4 text-center md:text-left">
                     <h5 className="text-3xl font-black text-slate-900 leading-[1.1] tracking-tighter uppercase italic">{header}</h5>
                     <div className="w-12 h-1 bg-slate-900 rounded-full"></div>
                  </div>
                  <p className="text-[14px] font-bold text-slate-600 leading-[1.6] whitespace-pre-wrap">{body}</p>
               </div>
               <div className="pt-8 mt-auto">
                  <button className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-slate-900/40 hover:scale-[1.02] active:scale-95 transition-all">
                    {cta || 'Hacer click aquí'}
                  </button>
               </div>
            </div>
            <div className="p-8 bg-slate-50 text-center border-t border-slate-100">
               <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">© 2025 {activeClient?.name} • Propiedad de Grupo LoBueno</p>
            </div>
          </div>
        );

      case Platform.POPUP:
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

    if (v.platform === Platform.EMAIL) {
      const parts = splitFn(contentWithoutVisual);
      const labels = ["Asunto", "Header", "Body", "CTA"];
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
          {parts.map((part, i) => (
            <div key={i} className="space-y-1">
              {labels[i] && (
                <span className="text-[7px] font-black uppercase text-slate-300 tracking-[0.2em]">{labels[i]}</span>
              )}
              <p className="text-slate-800 font-bold text-sm leading-relaxed">{cleanText(part)}</p>
            </div>
          ))}
        </div>
      );
    }

    const isSegmented = [Platform.PUSH, Platform.GOOGLE_ADS, Platform.POPUP].includes(v.platform);
    
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
      </div>
    );
  };

  const groupedVariations = localVariations.reduce((acc, curr) => {
    const platformKey = String(curr.platform);
    if (!acc[platformKey]) acc[platformKey] = [];
    acc[platformKey].push(curr);
    return acc;
  }, {} as Record<string, CopyVariation[]>);

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          {activeClient && (
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 p-1 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
              {activeClient.logo ? (
                <img src={activeClient.logo} alt={activeClient.name} className="w-full h-full object-contain grayscale" />
              ) : (
                <span className="text-lg font-black text-slate-200">{activeClient.name[0]}</span>
              )}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">Resultados <span className="text-gradient">Estratégicos</span></h2>
            <p className="text-slate-500 font-bold uppercase text-[8px] tracking-[0.3em]">IA Engine Output • ADN Strict Mode</p>
          </div>
        </div>
        
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-3 px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Exportar Estrategia
        </button>
      </div>

      <div className="space-y-20">
        {(Object.entries(groupedVariations) as [string, CopyVariation[]][]).map(([platform, items]) => (
          <div key={platform} className="space-y-10">
            <div className="flex items-center gap-6">
              <span className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-slate-900 text-white">
                {platform}
              </span>
              <div className="h-px flex-1 bg-slate-200"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {items.map((v, idx) => {
                const saved = isSaved(v.content);
                return (
                  <div key={`${v.id}-${idx}`} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-500 flex flex-col group overflow-hidden">
                    <div className="p-8 flex-1 flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                          {v.type}
                        </span>
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                           <span className="text-slate-500 font-bold text-[8px] uppercase tracking-widest">DNA Verified</span>
                        </div>
                      </div>

                      <div className="flex-1">
                        {renderContent(v)}
                      </div>

                      <div className="pt-6 border-t border-slate-50 mt-6 grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setMockupId(mockupId === v.id ? null : v.id)}
                          className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 border ${mockupId === v.id ? 'bg-slate-100 text-slate-900 border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-900 hover:text-slate-900'}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          Mockup
                        </button>
                        
                        {saved ? (
                          <div className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-600 font-black text-[9px] uppercase py-4 rounded-xl border border-slate-200 italic">
                            ✓ Guardado
                          </div>
                        ) : (
                          <div className="relative flex-1">
                            <button 
                              onClick={() => setSavingId(v.id)}
                              className="w-full bg-slate-900 text-white py-4 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-slate-900/10"
                            >
                              Guardar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL PARA MOCKUP */}
      {mockupId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl" onClick={() => setMockupId(null)}></div>
           <div className="relative z-10 w-full max-w-4xl bg-slate-50/10 p-4 md:p-12 rounded-[4rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-500">
              <div className="flex flex-col md:flex-row gap-12 items-center">
                 <div className="flex-1 w-full flex items-center justify-center">
                    {renderMockup(localVariations.find(v => v.id === mockupId)!)}
                 </div>
                 <div className="md:w-1/3 space-y-8 text-center md:text-left">
                    <div className="space-y-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Simulator v1.0</span>
                       <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Realidad <span className="text-slate-400">Estratégica</span></h3>
                    </div>
                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                       <p className="text-xs font-bold text-slate-300 leading-relaxed italic opacity-80">
                         "Esta previsualización muestra cómo se renderizará el contenido en la interfaz nativa del canal seleccionado."
                       </p>
                       <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                          <span className="text-[9px] font-black text-white uppercase tracking-widest">Contraste Certificado</span>
                       </div>
                    </div>
                    <button onClick={() => setMockupId(null)} className="w-full py-5 bg-white text-slate-900 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-all shadow-xl">
                       Cerrar Simulador
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL PARA GUARDAR */}
      {savingId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSavingId(null)}></div>
           <div className="relative z-10 w-full max-w-md bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-500">
              <div className="flex justify-between items-center mb-8">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">BIBLIOTECA</h3>
                   <p className="text-slate-500 font-bold uppercase text-[8px] tracking-[0.3em]">Seleccionar Proyecto Destino</p>
                </div>
                <button onClick={() => setSavingId(null)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 hover:text-slate-900 transition-colors">×</button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar mb-8 pr-2">
                {projects.length === 0 && (
                  <p className="text-center py-8 text-slate-300 font-bold uppercase text-[9px] tracking-widest border-2 border-dashed border-slate-50 rounded-2xl">No hay proyectos activos</p>
                )}
                {projects.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => handleSave(localVariations.find(v => v.id === savingId)!, p.id)}
                    className="w-full text-left p-5 hover:bg-slate-900 hover:text-white rounded-2xl text-[12px] font-black text-slate-500 transition-all flex items-center justify-between group/project border border-slate-50 hover:border-slate-900 shadow-sm hover:shadow-xl"
                  >
                    <span className="uppercase tracking-tight">{p.name}</span>
                    <svg className="w-4 h-4 opacity-0 group-hover/project:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-8 space-y-4">
                <div className="relative">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.25em] mb-3 ml-1">O crear nuevo proyecto</p>
                   <input 
                      type="text" 
                      placeholder="Nombre del proyecto..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                   />
                </div>
                <button 
                  onClick={() => handleCreateAndSave(localVariations.find(v => v.id === savingId)!)}
                  disabled={!newProjectName.trim()}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl disabled:opacity-30 disabled:pointer-events-none"
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
