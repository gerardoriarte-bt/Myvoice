
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

  const renderMockup = (v: CopyVariation) => {
    const visualIdeaMatch = v.content.match(/\[IDEA VISUAL:? (.*?)\]/i);
    const visualIdea = visualIdeaMatch ? visualIdeaMatch[1] : "Imagen de campaña estratégica";
    const contentWithoutVisual = v.content.replace(/\[IDEA VISUAL:? (.*?)\]/i, '').trim();

    switch (v.platform) {
      case Platform.PUSH:
        const [pTitle, pBody] = contentWithoutVisual.split('|').map(s => s.trim());
        return (
          <div className="bg-slate-900 p-8 rounded-[2rem] w-full max-w-[320px] mx-auto shadow-2xl border-4 border-slate-800">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-white/20 animate-in slide-in-from-top-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 bg-slate-900 rounded-md flex items-center justify-center">
                  {activeClient?.logo ? <img src={activeClient.logo} className="w-3 h-3 object-contain" /> : <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
                <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{activeClient?.name || 'MY VOICE'}</span>
                <span className="text-[8px] text-slate-500 ml-auto font-bold">ahora</span>
              </div>
              <p className="text-[11px] font-black text-slate-900 leading-tight mb-0.5">{pTitle}</p>
              <p className="text-[10px] font-medium text-slate-700 leading-snug">{pBody}</p>
            </div>
          </div>
        );

      case Platform.WHATSAPP:
        return (
          <div className="bg-[#E5DDD5] p-6 rounded-[2rem] w-full max-w-[320px] mx-auto shadow-2xl border-4 border-slate-800 h-[400px] flex flex-col justify-end">
            <div className="bg-white rounded-2xl rounded-tr-none p-4 shadow-sm relative animate-in zoom-in-95 self-end max-w-[85%]">
              <p className="text-[11px] font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">{contentWithoutVisual}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[8px] text-slate-400 font-bold">10:45 AM</span>
                <svg className="w-3 h-3 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7m-14 6l4 4L19 7" /></svg>
              </div>
              <div className="absolute top-0 -right-2 w-3 h-3 bg-white" style={{ clipPath: 'polygon(0 0, 0% 100%, 100% 0)' }}></div>
            </div>
          </div>
        );

      case Platform.INSTAGRAM:
        return (
          <div className="bg-white border border-slate-200 rounded-[2.5rem] w-full max-w-[340px] mx-auto shadow-2xl overflow-hidden">
            <div className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-[10px]">
                {activeClient?.logo ? <img src={activeClient.logo} className="w-full h-full object-cover rounded-full" /> : activeClient?.name[0]}
              </div>
              <span className="text-[10px] font-black text-slate-900">{activeClient?.name || 'brand_name'}</span>
            </div>
            <div className="aspect-square bg-slate-50 flex items-center justify-center p-8 text-center border-y border-slate-100 relative group">
              <div className="absolute inset-0 bg-slate-900/5 transition-opacity opacity-100 group-hover:opacity-0"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] relative z-10 px-4 leading-relaxed">
                {visualIdea}
              </p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-4">
                <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <p className="text-[10px] font-bold text-slate-900"><span className="font-black mr-2">{activeClient?.name?.toLowerCase().replace(/\s/g, '') || 'brand'}</span>{contentWithoutVisual}</p>
            </div>
          </div>
        );

      case Platform.GOOGLE_ADS:
        const [gTitle, gDesc] = contentWithoutVisual.split('|').map(s => s.trim());
        return (
          <div className="bg-white p-8 rounded-[2rem] w-full max-w-[400px] mx-auto shadow-2xl border border-slate-100">
             <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-slate-900">Anuncio</span>
                <span className="text-[10px] text-slate-400 font-bold">www.{activeClient?.name?.toLowerCase().replace(/\s/g, '') || 'empresa'}.com</span>
             </div>
             <h4 className="text-xl font-medium text-blue-700 hover:underline cursor-pointer mb-1 leading-tight">{gTitle}</h4>
             <p className="text-[12px] text-slate-600 leading-relaxed">{gDesc}</p>
          </div>
        );

      case Platform.EMAIL:
        const parts = contentWithoutVisual.split('-').map(p => p.trim());
        const [subject, header, body, cta] = parts;
        return (
          <div className="bg-white rounded-[2rem] w-full max-w-[450px] mx-auto shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[500px]">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center font-black text-white text-xs">
                 {activeClient?.name[0]}
               </div>
               <div className="flex-1 overflow-hidden">
                  <p className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight">{subject || 'Sin Asunto'}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{activeClient?.name} &lt;noreply@vive.terpel&gt;</p>
               </div>
            </div>
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-8">
               <div className="space-y-4">
                  <h5 className="text-lg font-black text-slate-900 leading-tight">{header}</h5>
                  <p className="text-xs font-bold text-slate-600 leading-relaxed">{body}</p>
               </div>
               <button className="w-full py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                 {cta || 'Hacer click aquí'}
               </button>
            </div>
            <div className="p-6 bg-slate-50 text-center border-t border-slate-100">
               <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">© 2025 {activeClient?.name} • Todos los derechos reservados</p>
            </div>
          </div>
        );

      case Platform.POPUP:
        const [popTitle, popBody, popCta] = contentWithoutVisual.split('|').map(s => s.trim());
        return (
          <div className="bg-slate-900/10 p-12 rounded-[3rem] w-full max-w-[400px] mx-auto shadow-2xl relative flex items-center justify-center overflow-hidden">
             <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-center space-y-6 relative z-10 animate-in zoom-in duration-500">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl mx-auto flex items-center justify-center border border-slate-100">
                   {activeClient?.logo ? <img src={activeClient.logo} className="w-10 h-10 object-contain" /> : <div className="w-8 h-8 bg-slate-900 rounded-lg"></div>}
                </div>
                <div className="space-y-2">
                   <h5 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tighter">{popTitle}</h5>
                   <p className="text-xs font-bold text-slate-500 leading-relaxed">{popBody}</p>
                </div>
                <button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl">
                   {popCta}
                </button>
                <button className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] hover:text-slate-900 transition-colors">Cerrar esta ventana</button>
             </div>
             <div className="absolute top-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center font-black text-slate-200">×</div>
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

    if (v.platform === Platform.EMAIL) {
      const parts = contentWithoutVisual.split('-').map(p => p.trim());
      const labels = ["Asunto", "Header", "Body", "CTA"];
      return (
        <div className="space-y-4 group/content relative">
          <button onClick={() => startEditing(v)} className="absolute -right-2 -top-2 p-2 bg-white border border-slate-100 rounded-lg shadow-sm opacity-0 group-hover/content:opacity-100 transition-all text-slate-400 hover:text-slate-900 z-10">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          {parts.map((part, i) => (
            <div key={i} className="space-y-1">
              {labels[i] && (
                <span className="text-[7px] font-black uppercase text-slate-300 tracking-[0.2em]">{labels[i]}</span>
              )}
              <p className="text-slate-800 font-bold text-sm leading-relaxed">{part}</p>
            </div>
          ))}
        </div>
      );
    }

    const isSegmented = [Platform.PUSH, Platform.GOOGLE_ADS, Platform.POPUP].includes(v.platform);
    
    return (
      <div className="space-y-4 group/content relative">
        <button onClick={() => startEditing(v)} className="absolute -right-2 -top-2 p-2 bg-white border border-slate-100 rounded-lg shadow-sm opacity-0 group-hover/content:opacity-100 transition-all text-slate-400 hover:text-slate-900 z-10">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
        {isSegmented ? (
          <div className="space-y-4">
            {contentWithoutVisual.split('|').map((part, i) => {
              let label = i === 0 ? "Título" : i === 1 ? "Cuerpo" : "CTA";
              if (v.platform === Platform.GOOGLE_ADS) label = i === 0 ? "Título" : "Descripción";
              
              return (
                <div key={i} className="space-y-1">
                  <span className="text-[7px] font-black uppercase text-slate-300 tracking-[0.2em]">{label}</span>
                  <p className="text-slate-800 font-bold text-sm leading-relaxed">{part.trim()}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-800 text-sm font-bold leading-relaxed whitespace-pre-wrap">
            {contentWithoutVisual}
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
            <p className="text-slate-400 font-bold uppercase text-[8px] tracking-[0.3em]">IA Engine Output • ADN Strict Mode</p>
          </div>
        </div>
        
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-3 px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-100"
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
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {items.map((v, idx) => {
                const saved = isSaved(v.content);
                return (
                  <div key={`${v.id}-${idx}`} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-500 flex flex-col group overflow-hidden">
                    <div className="p-8 flex-1 flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-lg">
                          {v.type}
                        </span>
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                           <span className="text-slate-300 font-bold text-[8px] uppercase tracking-widest">DNA Verified</span>
                        </div>
                      </div>

                      <div className="flex-1">
                        {renderContent(v)}
                      </div>

                      <div className="pt-6 border-t border-slate-50 mt-6 grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setMockupId(mockupId === v.id ? null : v.id)}
                          className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 border ${mockupId === v.id ? 'bg-slate-100 text-slate-900 border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-900 hover:text-slate-900'}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          Mockup
                        </button>
                        
                        {saved ? (
                          <div className="flex-1 flex items-center justify-center gap-2 bg-slate-50 text-slate-400 font-black text-[9px] uppercase py-4 rounded-xl border border-slate-100 italic">
                            ✓ Guardado
                          </div>
                        ) : (
                          <div className="relative flex-1">
                            <button 
                              onClick={() => setSavingId(savingId === v.id ? null : v.id)}
                              className="w-full bg-slate-900 text-white py-4 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-slate-900/10"
                            >
                              Guardar
                            </button>
                            {savingId === v.id && (
                              <div className="absolute z-[60] bottom-full right-0 mb-4 w-64 bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 animate-in slide-in-from-bottom-2 duration-300">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Proyecto Destino</h4>
                                <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar mb-5 pr-1 text-left">
                                  {projects.map(p => (
                                    <button 
                                      key={p.id}
                                      onClick={() => handleSave(v, p.id)}
                                      className="w-full text-left px-4 py-3 hover:bg-slate-50 hover:text-slate-900 rounded-xl text-[11px] font-bold text-slate-500 transition-colors flex items-center gap-3"
                                    >
                                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                      {p.name}
                                    </button>
                                  ))}
                                </div>
                                <div className="border-t border-slate-50 pt-5 flex flex-col gap-3 text-left">
                                  <input 
                                    type="text" 
                                    placeholder="Nuevo proyecto..."
                                    className="w-full text-[10px] font-bold border border-slate-200 rounded-xl px-4 py-3 focus:border-slate-900 outline-none transition-all"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                  />
                                  <button onClick={() => handleCreateAndSave(v)} className="w-full bg-slate-100 text-slate-900 text-[9px] py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">Confirmar</button>
                                </div>
                              </div>
                            )}
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
    </div>
  );
};

export default ResultsTable;
