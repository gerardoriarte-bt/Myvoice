
import React from 'react';
import { Plus, Search, Copy, Pencil, CheckCircle2, Trash2, Check, BookmarkCheck } from 'lucide-react';
import { SavedVariation, Project, Client, Platform } from '../types';
import { PlatformIcon } from './ui/platformIcons';

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
  const [activePlatformFilter, setActivePlatformFilter] = React.useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isCreatingProject, setIsCreatingProject] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState('');
  const [copyStatus, setCopyStatus] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editBuffer, setEditBuffer] = React.useState('');
  const [sortOrder, setSortOrder] = React.useState<'newest' | 'oldest' | 'approved'>('newest');

  const filteredVariations = React.useMemo(() => {
    const base = saved.filter(v => {
      const matchesProject = activeProjectFilter === 'all' || v.projectId === activeProjectFilter;
      const matchesClient = readOnly || activeClientFilter === 'all' || v.clientId === activeClientFilter;
      const matchesStatus = activeStatusFilter === 'all' ||
                           (activeStatusFilter === 'approved' && v.isApproved) ||
                           (activeStatusFilter === 'pending' && !v.isApproved);
      const matchesPlatform = activePlatformFilter === 'all' || v.platform === activePlatformFilter;
      const matchesSearch = !searchQuery || v.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesProject && matchesClient && matchesStatus && matchesSearch && matchesPlatform;
    });
    if (sortOrder === 'oldest')  return [...base].sort((a, b) => (a.savedAt ?? 0) - (b.savedAt ?? 0));
    if (sortOrder === 'approved') return [...base].sort((a, b) => (b.isApproved ? 1 : 0) - (a.isApproved ? 1 : 0));
    return [...base].sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  }, [saved, activeProjectFilter, activeClientFilter, activeStatusFilter, activePlatformFilter, searchQuery, sortOrder]);

  const hasActiveFilters = activeProjectFilter !== 'all' || activeClientFilter !== 'all' || activeStatusFilter !== 'all' || activePlatformFilter !== 'all' || !!searchQuery;

  const clearFilters = () => {
    setActiveProjectFilter('all');
    setActiveClientFilter('all');
    setActiveStatusFilter('all');
    setActivePlatformFilter('all');
    setSearchQuery('');
  };

  const getProjectName = (id?: string) => projects.find(p => p.id === id)?.name || 'Sin Proyecto';
  const getClientInfo = (id?: string) => clients.find(c => c.id === id);

  const copyToClipboard = (v: SavedVariation) => {
    const jsonStr = JSON.stringify(v, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopyStatus(v.id);
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

  const tableHeaderStyle = "px-4 py-3 text-left text-[12px] font-medium text-gray-500 border-b border-gray-200 bg-gray-50/50";

  const renderContentPreview = (v: SavedVariation) => {
    if (editingId === v.id) {
      return (
        <div className="space-y-2 py-1 animate-in fade-in duration-200">
          <textarea 
            className="w-full p-3 bg-white border border-gray-300 rounded-md text-[13px] font-medium text-gray-900 outline-none min-h-[80px] resize-y focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
            value={editBuffer}
            onChange={(e) => setEditBuffer(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
             <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-[12px] font-medium text-gray-500 hover:text-gray-900">Cancelar</button>
             <button onClick={() => confirmEdit(v.id)} className="px-3 py-1.5 bg-gray-900 text-white rounded-md text-[12px] font-medium hover:bg-gray-800">Guardar Cambios</button>
          </div>
        </div>
      );
    }

    if (v.content.includes('|')) {
      const parts = v.content.split('|').map(p => p.trim());
      return (
        <div className="space-y-1.5">
          {parts.map((p, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-[10px] font-medium text-gray-400 mt-0.5">[{i === 0 ? "H" : i === 1 ? "B" : "C"}]</span>
              <p className="text-[13px] font-medium text-gray-800 line-clamp-1">{p}</p>
            </div>
          ))}
        </div>
      );
    }
    return <p className={`text-[13px] font-medium leading-relaxed max-w-2xl line-clamp-2 ${v.isApproved ? 'text-gray-500' : 'text-gray-800'}`}>{v.content}</p>;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0">
              <BookmarkCheck className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[20px] font-medium text-gray-900 leading-tight tracking-tight">Biblioteca de Activos</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">{readOnly ? 'Centro de control de marca' : 'Archivo estratégico global'}</p>
            </div>
          </div>
          {!readOnly && (
            <button onClick={() => setIsCreatingProject(!isCreatingProject)} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-black transition-colors shadow-sm flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              {isCreatingProject ? 'Cancelar' : 'Nuevo Proyecto'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 border-t border-gray-100 bg-gray-50/40">
          <div className="px-5 py-3 border-r border-gray-100">
            <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Total</div>
            <div className="text-[18px] font-medium text-gray-900 mt-0.5">{saved.length}</div>
          </div>
          <div className="px-5 py-3 border-r border-gray-100">
            <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-700">Aprobados</div>
            <div className="text-[18px] font-medium text-emerald-700 mt-0.5">{saved.filter(s => s.isApproved).length}</div>
          </div>
          <div className="px-5 py-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Pendientes</div>
            <div className="text-[18px] font-medium text-gray-900 mt-0.5">{saved.filter(s => !s.isApproved).length}</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <input type="text" placeholder="Buscar contenidos…" className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-shadow placeholder:text-gray-400" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        
        <div className="flex gap-3 flex-wrap">
          <select value={activePlatformFilter} onChange={(e) => setActivePlatformFilter(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 outline-none focus:border-gray-400 transition-colors appearance-none cursor-pointer pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%22%20d%3D%22m19.5%208.25-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1em_1em] bg-[right_0.5rem_center] bg-no-repeat min-w-[140px]">
            <option value="all">Plataforma</option>
            {Object.values(Platform).map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {!readOnly ? (
            <select value={activeClientFilter} onChange={(e) => setActiveClientFilter(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 outline-none focus:border-gray-400 transition-colors appearance-none cursor-pointer pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%22%20d%3D%22m19.5%208.25-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1em_1em] bg-[right_0.5rem_center] bg-no-repeat min-w-[140px]">
              <option value="all">Marca</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : null}

          <select value={activeStatusFilter} onChange={(e) => setActiveStatusFilter(e.target.value as any)} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 outline-none focus:border-gray-400 transition-colors appearance-none cursor-pointer pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%22%20d%3D%22m19.5%208.25-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1em_1em] bg-[right_0.5rem_center] bg-no-repeat min-w-[140px]">
            <option value="all">Estado</option>
            <option value="approved">Aprobados</option>
            <option value="pending">Pendientes</option>
          </select>
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 outline-none focus:border-gray-400 transition-colors appearance-none cursor-pointer pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%22%20d%3D%22m19.5%208.25-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1em_1em] bg-[right_0.5rem_center] bg-no-repeat min-w-[140px]">
            <option value="newest">Más reciente</option>
            <option value="oldest">Más antiguo</option>
            <option value="approved">Aprobadas primero</option>
          </select>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="px-3 py-2 text-[13px] font-medium text-gray-400 hover:text-gray-700 transition-colors whitespace-nowrap">
              Limpiar
            </button>
          )}
        </div>
      </div>
      {hasActiveFilters && (
        <div className="px-6 pb-3 -mt-2">
          <p className="text-[11px] text-gray-400">
            Mostrando <span className="font-semibold text-gray-600">{filteredVariations.length}</span> de <span className="font-semibold text-gray-600">{saved.length}</span> variaciones
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                {!readOnly && <th className={tableHeaderStyle + " w-48"}>Cliente</th>}
                <th className={tableHeaderStyle + " w-48"}>Plataforma / Tipo</th>
                <th className={tableHeaderStyle + " min-w-[300px]"}>Contenido</th>
                <th className={tableHeaderStyle + " w-40"}>Estado</th>
                <th className={tableHeaderStyle + " w-24"}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVariations.map((v) => {
                const client = getClientInfo(v.clientId);
                return (
                  <tr key={v.id} className="group hover:bg-gray-50/50 transition-colors">
                    {!readOnly && (
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                            {client?.logo ? (
                              <img src={client.logo} alt={client?.name} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-[10px] font-medium text-gray-500">{client?.name?.[0]}</span>
                            )}
                          </div>
                          <span className="text-[13px] font-medium text-gray-900 truncate">{client?.name || 'Desconocido'}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-start gap-2.5">
                        <PlatformIcon platform={v.platform} size="sm" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-gray-900 leading-tight truncate">{v.platform}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{v.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {renderContentPreview(v)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1.5">
                         {v.isApproved ? (
                           <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-green-50 text-green-700 border border-green-200 w-fit">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                             Aprobado
                           </span>
                         ) : (
                           <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200 w-fit">
                             <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                             Pendiente
                           </span>
                         )}
                         <span className="text-[11px] text-gray-400 truncate max-w-[120px]" title={getProjectName(v.projectId)}>
                           {getProjectName(v.projectId)}
                         </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      {/* QuickActions (Hover) */}
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyToClipboard(v)}
                          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                          title="Copiar JSON"
                        >
                          {copyStatus === v.id ? <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={3} /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => startEditing(v)}
                          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleApproval(v.id, !!v.isApproved)}
                          className={`p-1.5 rounded-md transition-colors ${v.isApproved ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
                          title={v.isApproved ? "Revocar Aprobación" : "Aprobar"}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        {!readOnly && (
                          <button
                            disabled={v.isApproved}
                            onClick={() => onRemove(v.id)}
                            className={`p-1.5 rounded-md transition-colors ${v.isApproved ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredVariations.length === 0 && (
                <tr>
                  <td colSpan={readOnly ? 4 : 5} className="px-4 py-8 text-center text-gray-500 text-[13px]">
                    No se encontraron activos que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SavedManager;
