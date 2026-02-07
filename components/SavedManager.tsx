
import React from 'react';
import { SavedVariation, Project, Client, Platform } from '../types';

interface SavedManagerProps {
  saved: SavedVariation[];
  projects: Project[];
  clients: Client[];
  onRemove: (variationId: string) => void;
  onUpdate: (variationId: string, updates: Partial<SavedVariation>) => void;
  onAddTag: (variationId: string, tag: string) => void;
  onRemoveTag: (variationId: string, tag: string) => void;
  onDeleteProject: (projectId: string) => void;
  onCreateProject: (name: string) => string;
  readOnly?: boolean;
}

const SavedManager: React.FC<SavedManagerProps> = ({ 
  saved, 
  projects, 
  clients,
  onRemove, 
  onUpdate,
  onAddTag, 
  onRemoveTag, 
  onDeleteProject,
  onCreateProject,
  readOnly = false
}) => {
  const [activeProjectFilter, setActiveProjectFilter] = React.useState<string | 'all'>('all');
  const [activeClientFilter, setActiveClientFilter] = React.useState<string | 'all'>('all');
  const [activeStatusFilter, setActiveStatusFilter] = React.useState<'all' | 'approved' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isCreatingProject, setIsCreatingProject] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState('');
  const [copyStatus, setCopyStatus] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editBuffer, setEditBuffer] = React.useState('');
  
  const filteredVariations = saved.filter(v => {
    const matchesProject = activeProjectFilter === 'all' || v.projectId === activeProjectFilter;
    const matchesClient = readOnly || activeClientFilter === 'all' || v.clientId === activeClientFilter;
    const matchesStatus = activeStatusFilter === 'all' || 
                         (activeStatusFilter === 'approved' && v.isApproved) ||
                         (activeStatusFilter === 'pending' && !v.isApproved);
    const matchesSearch = v.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProject && matchesClient && matchesStatus && matchesSearch;
  });

  const getProjectName = (id?: string) => projects.find(p => p.id === id)?.name || 'Sin Proyecto';
  const getClientInfo = (id?: string) => clients.find(c => c.id === id);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(id);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const toggleApproval = (id: string, currentState: boolean) => {
    onUpdate(id, { isApproved: !currentState });
  };

  const startEditing = (v: SavedVariation) => {
    setEditingId(v.id);
    setEditBuffer(v.content);
  };

  const confirmEdit = (id: string) => {
    onUpdate(id, { content: editBuffer, charCount: editBuffer.length });
    setEditingId(null);
  };

  const tableHeaderStyle = "px-8 py-6 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]";

  const renderContentPreview = (v: SavedVariation) => {
    if (editingId === v.id) {
      return (
        <div className="space-y-3 py-2 animate-in fade-in slide-in-from-top-1 duration-300">
          <textarea 
            className="w-full p-4 bg-slate-50 border border-slate-900 rounded-xl text-xs font-bold text-slate-800 outline-none min-h-[100px] resize-y"
            value={editBuffer}
            onChange={(e) => setEditBuffer(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
             <button onClick={() => setEditingId(null)} className="px-3 py-1 text-[9px] font-black uppercase text-slate-400">Cancelar</button>
             <button onClick={() => confirmEdit(v.id)} className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">Guardar Cambios</button>
          </div>
        </div>
      );
    }

    if (v.content.includes('|')) {
      const parts = v.content.split('|').map(p => p.trim());
      return (
        <div className="space-y-2">
          {parts.map((p, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-[7px] font-black text-slate-300 uppercase mt-1">[{i === 0 ? "H" : i === 1 ? "B" : "C"}]</span>
              <p className="text-xs font-bold text-slate-800 line-clamp-1">{p}</p>
            </div>
          ))}
        </div>
      );
    }
    return <p className={`text-sm font-bold leading-relaxed max-w-lg line-clamp-2 ${v.isApproved ? 'text-slate-500' : 'text-slate-800'}`}>{v.content}</p>;
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 space-y-12">
        <div className="flex flex-col lg:flex-row gap-10 justify-between items-start lg:items-center">
          <div className="flex-1">
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2">
              Biblioteca de <span className="text-gradient">Activos</span>
            </h2>
            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.3em]">{readOnly ? 'CENTRO DE CONTROL DE MARCA' : 'ARCHIVADO ESTRATÉGICO GLOBAL'}</p>
          </div>
          {!readOnly && (
            <button onClick={() => setIsCreatingProject(!isCreatingProject)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95">
              {isCreatingProject ? 'CANCELAR' : 'NUEVO PROYECTO'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative group">
            <input type="text" placeholder="Buscar contenidos..." className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-slate-900 focus:bg-white transition-all text-sm placeholder:text-slate-300" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          {!readOnly ? (
            <select value={activeClientFilter} onChange={(e) => setActiveClientFilter(e.target.value)} className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-slate-900 transition-all text-xs appearance-none cursor-pointer">
              <option value="all">TODAS LAS MARCAS</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <div className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-400 text-[10px] tracking-widest flex items-center gap-3 uppercase">
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
               FILTRO DE MARCA ACTIVO
            </div>
          )}
          <select value={activeStatusFilter} onChange={(e) => setActiveStatusFilter(e.target.value as any)} className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-slate-900 transition-all text-xs appearance-none cursor-pointer">
            <option value="all">TODOS LOS ESTADOS</option>
            <option value="approved">LISTOS PARA PUBLICAR</option>
            <option value="pending">REVISIÓN PENDIENTE</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden bg-white rounded-[3rem] shadow-sm border border-slate-100">
        <table className="min-w-full divide-y divide-slate-50">
          <thead className="bg-slate-50/50">
            <tr>
              {!readOnly && <th className={tableHeaderStyle}>Identidad</th>}
              <th className={tableHeaderStyle}>Estructura</th>
              <th className={tableHeaderStyle}>Contenido Estratégico</th>
              {!readOnly && <th className={tableHeaderStyle}>Contexto</th>}
              <th className={tableHeaderStyle + " text-center"}>Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-50">
            {filteredVariations.map((v) => {
              const client = getClientInfo(v.clientId);
              return (
                <tr key={v.id} className={`hover:bg-slate-50/30 transition-colors ${v.isApproved ? 'bg-slate-50/20' : ''}`}>
                  {!readOnly && (
                    <td className="px-8 py-8 align-top">
                      {client ? (
                        <div className="flex flex-col gap-3 group">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 p-1 flex items-center justify-center overflow-hidden shadow-sm group-hover:border-slate-900 transition-colors">
                            {client.logo ? (
                              <img src={client.logo} alt={client.name} className="w-full h-full object-contain grayscale opacity-80 group-hover:opacity-100" />
                            ) : (
                              <span className="text-[9px] font-black text-slate-300">{client.name[0]}</span>
                            )}
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900 truncate w-10">{client.name}</span>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 animate-pulse"></div>
                      )}
                    </td>
                  )}
                  <td className="px-8 py-8 align-top">
                    <div className="flex flex-col gap-2">
                      <span className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] w-fit bg-slate-900 text-white">
                        {v.platform}
                      </span>
                      <span className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] w-fit bg-white text-slate-400 border border-slate-100">
                        {v.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-8 align-top">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        {v.isApproved ? (
                          <span className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-900 text-slate-900 text-[8px] font-black uppercase tracking-widest rounded-full shadow-sm">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                            Certificado
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 px-3 py-1 bg-slate-50 text-slate-300 text-[8px] font-black uppercase tracking-widest rounded-full border border-slate-100">
                            ⏳ Pendiente
                          </span>
                        )}
                      </div>
                      {renderContentPreview(v)}
                    </div>
                  </td>
                  {!readOnly && (
                    <td className="px-8 py-8 align-top">
                      <div className="flex items-center gap-3 group">
                         <div className={`w-1.5 h-1.5 rounded-full ${v.isApproved ? 'bg-slate-900' : 'bg-slate-200'}`}></div>
                         <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-slate-900 tracking-[0.1em] transition-colors">{getProjectName(v.projectId)}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-8 py-8 align-top whitespace-nowrap">
                    <div className="flex items-center justify-center gap-3">
                      <button 
                        onClick={() => startEditing(v)}
                        className={`p-3 rounded-2xl transition-all border ${editingId === v.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-200 border-slate-100 hover:text-slate-900 hover:border-slate-900'} active:scale-95`}
                        title="Editar Contenido"
                      >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button 
                        onClick={() => toggleApproval(v.id, !!v.isApproved)}
                        className={`p-3 rounded-2xl transition-all border ${v.isApproved ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-200 border-slate-100 hover:text-slate-900 hover:border-slate-900'} active:scale-95`}
                        title={v.isApproved ? "Retirar Certificación" : "Certificar Contenido"}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                      </button>
                      <button onClick={() => copyToClipboard(v.content, v.id)} className={`p-3 rounded-2xl transition-all border ${copyStatus === v.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-200 border-slate-100 hover:text-slate-900 hover:border-slate-900'} active:scale-95`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                      </button>
                      {!readOnly && (
                        <button disabled={v.isApproved} onClick={() => onRemove(v.id)} className={`p-3 rounded-2xl transition-all border ${v.isApproved ? 'bg-slate-50 text-slate-100 border-slate-50 cursor-not-allowed' : 'bg-white text-slate-200 border-slate-100 hover:text-red-500 hover:bg-red-50 hover:border-red-100'} active:scale-95`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SavedManager;
