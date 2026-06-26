
import React from 'react';
import { Plus, Search, Copy, Pencil, CheckCircle2, Trash2, Check, BookmarkCheck, Tag, X, Square, CheckSquare } from 'lucide-react';
import { SavedVariation, Project, Client, Platform } from '../types';
import { PlatformIcon } from './ui/platformIcons';
import { libraryApi, reviewApi } from '../services/api';

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
  addNotification?: (message: string, type?: string) => void;
  onRefreshSaved?: () => void;
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
  addNotification,
  onRefreshSaved,
  readOnly = false
}) => {
  const [activeProjectFilter, setActiveProjectFilter] = React.useState<string | 'all'>('all');
  const [activeClientFilter, setActiveClientFilter] = React.useState<string | 'all'>('all');
  const [activeStatusFilter, setActiveStatusFilter] = React.useState<'all' | 'approved' | 'pending'>('all');
  const [activePlatformFilter, setActivePlatformFilter] = React.useState<string | 'all'>('all');
  const [activeTagFilter, setActiveTagFilter] = React.useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isCreatingProject, setIsCreatingProject] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState('');
  const [copyStatus, setCopyStatus] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editBuffer, setEditBuffer] = React.useState('');
  const [sortOrder, setSortOrder] = React.useState<'newest' | 'oldest' | 'approved'>('newest');

  // 2A: Batch selection state
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // 2B: Tag editing state per card
  const [addingTagId, setAddingTagId] = React.useState<string | null>(null);
  const [tagInputValue, setTagInputValue] = React.useState('');

  // Version history modal state
  const [versionModal, setVersionModal] = React.useState<{ variation: SavedVariation; versions: Array<{ content: string; charCount: number; editedAt: string }> } | null>(null);

  // Local copy of variations for in-place updates (tags, bulk delete)
  const [localVariations, setLocalVariations] = React.useState<SavedVariation[]>(saved);

  // Sync local when parent `saved` changes (e.g. after initial load)
  React.useEffect(() => {
    setLocalVariations(saved);
  }, [saved]);

  // All unique tags across current local variations
  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    localVariations.forEach(v => (v.tags || []).forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [localVariations]);

  const filteredVariations = React.useMemo(() => {
    const base = localVariations.filter(v => {
      const matchesProject = activeProjectFilter === 'all' || v.projectId === activeProjectFilter;
      const matchesClient = readOnly || activeClientFilter === 'all' || v.clientId === activeClientFilter;
      const matchesStatus = activeStatusFilter === 'all' ||
                           (activeStatusFilter === 'approved' && v.isApproved) ||
                           (activeStatusFilter === 'pending' && !v.isApproved);
      const matchesPlatform = activePlatformFilter === 'all' || v.platform === activePlatformFilter;
      const matchesTag = activeTagFilter === 'all' || (v.tags || []).includes(activeTagFilter);
      const matchesSearch = !searchQuery || v.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesProject && matchesClient && matchesStatus && matchesPlatform && matchesTag && matchesSearch;
    });
    if (sortOrder === 'oldest')   return [...base].sort((a, b) => (a.savedAt ?? 0) - (b.savedAt ?? 0));
    if (sortOrder === 'approved') return [...base].sort((a, b) => (b.isApproved ? 1 : 0) - (a.isApproved ? 1 : 0));
    return [...base].sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  }, [localVariations, activeProjectFilter, activeClientFilter, activeStatusFilter, activePlatformFilter, activeTagFilter, searchQuery, sortOrder]);

  const hasActiveFilters = activeProjectFilter !== 'all' || activeClientFilter !== 'all' || activeStatusFilter !== 'all' || activePlatformFilter !== 'all' || activeTagFilter !== 'all' || !!searchQuery;

  const clearFilters = () => {
    setActiveProjectFilter('all');
    setActiveClientFilter('all');
    setActiveStatusFilter('all');
    setActivePlatformFilter('all');
    setActiveTagFilter('all');
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

  // ── 2A: Batch selection helpers ────────────────────────────────────────────

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filteredVariations.map(v => v.id)));
  const selectNone = () => setSelectedIds(new Set());

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`¿Eliminar ${selectedIds.size} elemento(s) de la biblioteca?`)) return;
    try {
      await libraryApi.bulkDelete(Array.from(selectedIds));
      const deletedIds = new Set(selectedIds);
      setLocalVariations(prev => prev.filter(v => !deletedIds.has(v.id)));
      exitSelectionMode();
      addNotification?.('Elementos eliminados', 'success');
      onRefreshSaved?.();
    } catch {
      addNotification?.('Error al eliminar los elementos', 'error');
    }
  };

  const handleCreateReviewSession = async () => {
    if (selectedIds.size === 0) return;
    try {
      await reviewApi.create({
        title: 'Revision ' + new Date().toLocaleDateString('es-CO'),
        variationIds: Array.from(selectedIds),
      });
      addNotification?.('Sesion de revision creada', 'success');
      selectNone();
    } catch {
      addNotification?.('Error al crear la sesion de revision', 'error');
    }
  };

  // ── 2B: Tag helpers ────────────────────────────────────────────────────────

  const handleAddTag = async (v: SavedVariation) => {
    const newTag = tagInputValue.trim();
    if (!newTag) { setAddingTagId(null); setTagInputValue(''); return; }
    const currentTags = v.tags || [];
    if (currentTags.includes(newTag)) { setAddingTagId(null); setTagInputValue(''); return; }
    const updatedTags = [...currentTags, newTag];
    try {
      await libraryApi.updateVariation(v.id, { ...v, tags: updatedTags });
      setLocalVariations(prev => prev.map(item => item.id === v.id ? { ...item, tags: updatedTags } : item));
    } catch {
      addNotification?.('Error al guardar etiqueta', 'error');
    }
    setAddingTagId(null);
    setTagInputValue('');
  };

  const handleRemoveTag = async (v: SavedVariation, tag: string) => {
    const updatedTags = (v.tags || []).filter(t => t !== tag);
    try {
      await libraryApi.updateVariation(v.id, { ...v, tags: updatedTags });
      setLocalVariations(prev => prev.map(item => item.id === v.id ? { ...item, tags: updatedTags } : item));
    } catch {
      addNotification?.('Error al eliminar etiqueta', 'error');
    }
  };

  // ── Shared styles ──────────────────────────────────────────────────────────

  const tableHeaderStyle = "px-4 py-3 text-left text-[12px] font-medium text-gray-500 border-b border-gray-200 bg-gray-50/50";
  const selectStyle = "px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 outline-none focus:border-gray-400 transition-colors appearance-none cursor-pointer pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m19.5%208.25-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1em_1em] bg-[right_0.5rem_center] bg-no-repeat min-w-[140px]";

  // ── Content preview (with tags) ────────────────────────────────────────────

  const renderTagPills = (v: SavedVariation) => {
    const tags = v.tags || [];
    const visibleTags = tags.slice(0, 3);
    const extraCount = tags.length - visibleTags.length;

    return (
      <div className="flex flex-wrap items-center gap-1 mt-1.5">
        {visibleTags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-600 text-[10px] rounded px-1.5 py-0.5 border border-blue-100 group/tag"
          >
            {tag}
            {!readOnly && (
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveTag(v, tag); }}
                className="ml-0.5 text-blue-400 hover:text-blue-700 opacity-0 group-hover/tag:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </span>
        ))}
        {extraCount > 0 && (
          <span className="bg-blue-50 text-blue-600 text-[10px] rounded px-1.5 py-0.5 border border-blue-100">
            +{extraCount} mas
          </span>
        )}
        {!readOnly && (
          addingTagId === v.id ? (
            <input
              autoFocus
              className="text-[11px] border border-gray-300 rounded px-1.5 py-0.5 outline-none focus:border-blue-400 w-24"
              value={tagInputValue}
              onChange={e => setTagInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(v); } if (e.key === 'Escape') { setAddingTagId(null); setTagInputValue(''); } }}
              onBlur={() => handleAddTag(v)}
              placeholder="etiqueta"
            />
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setAddingTagId(v.id); setTagInputValue(''); }}
              className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-blue-500 transition-colors"
            >
              <Tag className="w-2.5 h-2.5" />
              + etiqueta
            </button>
          )
        )}
      </div>
    );
  };

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

    return (
      <div>
        {v.content.includes('|') ? (
          <div className="space-y-1.5">
            {v.content.split('|').map((p, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-[10px] font-medium text-gray-400 mt-0.5">[{i === 0 ? 'H' : i === 1 ? 'B' : 'C'}]</span>
                <p className="text-[13px] font-medium text-gray-800 line-clamp-1">{p.trim()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-[13px] font-medium leading-relaxed max-w-2xl line-clamp-2 ${v.isApproved ? 'text-gray-500' : 'text-gray-800'}`}>{v.content}</p>
        )}
        {renderTagPills(v)}
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      {/* Header card */}
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
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                onClick={() => { setSelectionMode(s => !s); if (selectionMode) exitSelectionMode(); }}
                className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors border flex items-center gap-2 ${selectionMode ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'}`}
              >
                {selectionMode ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                {selectionMode ? 'Cancelar' : 'Seleccionar'}
              </button>
            )}
            {!readOnly && (
              <button onClick={() => setIsCreatingProject(!isCreatingProject)} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-black transition-colors shadow-sm flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" />
                {isCreatingProject ? 'Cancelar' : 'Nuevo Proyecto'}
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-gray-100 bg-gray-50/40">
          <div className="px-5 py-3 border-r border-gray-100">
            <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Total</div>
            <div className="text-[18px] font-medium text-gray-900 mt-0.5">{localVariations.length}</div>
          </div>
          <div className="px-5 py-3 border-r border-gray-100">
            <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-700">Aprobados</div>
            <div className="text-[18px] font-medium text-emerald-700 mt-0.5">{localVariations.filter(s => s.isApproved).length}</div>
          </div>
          <div className="px-5 py-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Pendientes</div>
            <div className="text-[18px] font-medium text-gray-900 mt-0.5">{localVariations.filter(s => !s.isApproved).length}</div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar contenidos…"
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-shadow placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="flex gap-3 flex-wrap">
          <select value={activePlatformFilter} onChange={(e) => setActivePlatformFilter(e.target.value)} className={selectStyle}>
            <option value="all">Plataforma</option>
            {Object.values(Platform).map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {!readOnly && (
            <select value={activeClientFilter} onChange={(e) => setActiveClientFilter(e.target.value)} className={selectStyle}>
              <option value="all">Marca</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          <select value={activeStatusFilter} onChange={(e) => setActiveStatusFilter(e.target.value as any)} className={selectStyle}>
            <option value="all">Estado</option>
            <option value="approved">Aprobados</option>
            <option value="pending">Pendientes</option>
          </select>

          {/* 2B: Tag filter */}
          <select value={activeTagFilter} onChange={(e) => setActiveTagFilter(e.target.value)} className={selectStyle}>
            <option value="all">Etiqueta</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className={selectStyle}>
            <option value="newest">Mas reciente</option>
            <option value="oldest">Mas antiguo</option>
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
            Mostrando <span className="font-semibold text-gray-600">{filteredVariations.length}</span> de <span className="font-semibold text-gray-600">{localVariations.length}</span> variaciones
          </p>
        </div>
      )}

      {/* Select-all bar (visible in selection mode) */}
      {selectionMode && (
        <div className="flex items-center gap-4 px-1">
          <span className="text-[12px] text-gray-500">{selectedIds.size} seleccionadas</span>
          <button onClick={selectAll} className="text-[12px] text-blue-600 hover:underline">Seleccionar todo</button>
          <button onClick={selectNone} className="text-[12px] text-gray-500 hover:underline">Ninguno</button>
        </div>
      )}

      {/* Variations table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                {selectionMode && <th className={tableHeaderStyle + " w-10"}></th>}
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
                const isSelected = selectedIds.has(v.id);
                return (
                  <tr
                    key={v.id}
                    className={`group hover:bg-gray-50/50 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}
                    onClick={selectionMode ? () => toggleSelection(v.id) : undefined}
                    style={selectionMode ? { cursor: 'pointer' } : undefined}
                  >
                    {selectionMode && (
                      <td className="px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(v.id)}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                        />
                      </td>
                    )}
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
                      {!selectionMode && (
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {v.previousVersions && v.previousVersions.length > 0 && (
                            <button
                              onClick={() => setVersionModal({ variation: v, versions: v.previousVersions! })}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                              title="Ver historial de versiones"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {v.previousVersions.length}v
                            </button>
                          )}
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
                            title={v.isApproved ? 'Revocar Aprobacion' : 'Aprobar'}
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
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredVariations.length === 0 && (
                <tr>
                  <td colSpan={selectionMode ? (readOnly ? 5 : 6) : (readOnly ? 4 : 5)} className="px-4 py-8 text-center text-gray-500 text-[13px]">
                    No se encontraron activos que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Version history modal */}
      {versionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setVersionModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="text-[13px] font-semibold text-gray-900">Historial de versiones</p>
                <p className="text-[11px] text-gray-400">{versionModal.variation.platform} · {versionModal.versions.length} versión(es) anterior(es)</p>
              </div>
              <button onClick={() => setVersionModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-1">Versión actual</p>
                <p className="text-[12px] text-gray-800 leading-snug">{versionModal.variation.content}</p>
              </div>
              {[...versionModal.versions].reverse().map((v, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Versión {versionModal.versions.length - i}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">{new Date(v.editedAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      <button
                        onClick={() => {
                          if (window.confirm("¿Restaurar esta versión?")) {
                            onUpdate(versionModal.variation.id, { content: v.content, charCount: v.charCount });
                            setLocalVariations(prev => prev.map(item => item.id === versionModal.variation.id ? { ...item, content: v.content, charCount: v.charCount } : item));
                            setVersionModal(null);
                          }
                        }}
                        className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-[10px] font-medium text-gray-600 rounded transition-colors"
                      >Restaurar</button>
                    </div>
                  </div>
                  <p className="text-[12px] text-gray-700 leading-snug">{v.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2A: Sticky batch action bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="pointer-events-auto mb-4 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-gray-700">
            <span className="text-[13px] font-medium text-gray-300">{selectedIds.size} seleccionadas</span>
            <div className="w-px h-4 bg-gray-600" />
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-[12px] font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>
            <button
              onClick={handleCreateReviewSession}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-[12px] font-medium transition-colors"
            >
              Crear sesion de revision
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedManager;
