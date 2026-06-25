import React, { useState, useEffect } from 'react';
import { SavedVariation, Client, ReviewSession, ReviewItemFeedbackDetail } from '../types';
import { reviewApi } from '../services/api';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface CollaborationHubProps {
  savedVariations: SavedVariation[];
  clients: Client[];
  addNotification: (message: string, type: NotificationType) => void;
  onSessionsLoaded?: (sessions: ReviewSession[]) => void;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING:   { label: 'Pendiente',    className: 'bg-gray-100 text-gray-600 border-gray-200' },
  IN_REVIEW: { label: 'En revisión',  className: 'bg-blue-50 text-blue-700 border-blue-200' },
  COMPLETED: { label: 'Completado',   className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const PLATFORM_COLORS: Record<string, string> = {
  'Instagram Post': 'bg-pink-50 text-pink-700',
  'Instagram Historia': 'bg-purple-50 text-purple-700',
  'TikTok': 'bg-gray-900 text-white',
  'Email': 'bg-blue-50 text-blue-700',
  'WhatsApp': 'bg-green-50 text-green-700',
};

export default function CollaborationHub({ savedVariations, clients, addNotification, onSessionsLoaded }: CollaborationHubProps) {
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clientFilter, setClientFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, ReviewSession>>({});

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await reviewApi.list();
      if (Array.isArray(data)) {
        setSessions(data);
        onSessionsLoaded?.(data);
      }
    } catch {
      addNotification('Error al cargar sesiones de revisión', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpandSession = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (detailCache[id]) return;
    try {
      const detail = await reviewApi.getDetail(id);
      setDetailCache(prev => ({ ...prev, [id]: detail }));
    } catch {
      addNotification('Error al cargar el detalle', 'error');
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || selectedIds.size === 0) return;
    setIsSaving(true);
    try {
      const session = await reviewApi.create({
        title: newTitle.trim(),
        variationIds: Array.from(selectedIds),
        expiresInDays,
      });
      if (session?.token) {
        const link = `${window.location.origin}/?review=${session.token}`;
        await navigator.clipboard.writeText(link);
        addNotification('Sesión creada — link copiado al portapapeles', 'success');
      }
      setIsCreating(false);
      setNewTitle('');
      setSelectedIds(new Set());
      setExpiresInDays(7);
      loadSessions();
    } catch {
      addNotification('Error al crear la sesión', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = async (token: string) => {
    const link = `${window.location.origin}/?review=${token}`;
    await navigator.clipboard.writeText(link);
    addNotification('Link copiado al portapapeles', 'success');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta sesión de revisión?')) return;
    try {
      await reviewApi.delete(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      addNotification('Sesión eliminada', 'info');
    } catch {
      addNotification('Error al eliminar la sesión', 'error');
    }
  };

  const toggleVariation = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredVariations = clientFilter
    ? savedVariations.filter(v => v.clientId === clientFilter)
    : savedVariations;

  const clientName = (clientId?: string) =>
    clients.find(c => c.id === clientId)?.name ?? clientId ?? '';

  const platformBadge = (platform: string) => {
    const cls = PLATFORM_COLORS[platform] ?? 'bg-gray-100 text-gray-600';
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${cls}`}>
        {platform}
      </span>
    );
  };

  return (
    <div className="p-7 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900">Collaboration Hub</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Crea sesiones de revisión, comparte links con clientes y cierra el bucle de aprobación.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-md text-[12px] font-medium hover:bg-gray-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva sesión
        </button>
      </div>

      {/* Panel de creación */}
      {isCreating && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-[13px] font-semibold text-gray-800">Nueva sesión de revisión</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Título</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Ej: Revisión campaña Agosto"
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-[12px] focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Vence en</label>
              <select
                value={expiresInDays}
                onChange={e => setExpiresInDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-[12px] bg-white focus:outline-none focus:border-gray-400"
              >
                <option value={3}>3 días</option>
                <option value={7}>7 días</option>
                <option value={14}>14 días</option>
                <option value={30}>30 días</option>
              </select>
            </div>
          </div>

          {/* Filtro + lista de variaciones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-medium text-gray-500">
                Seleccionar variaciones ({selectedIds.size} seleccionadas)
              </label>
              <select
                value={clientFilter}
                onChange={e => setClientFilter(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded text-[11px] bg-white focus:outline-none"
              >
                <option value="">Todos los clientes</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
              {filteredVariations.length === 0 && (
                <p className="p-4 text-[12px] text-gray-400 text-center">No hay variaciones guardadas</p>
              )}
              {filteredVariations.map(v => (
                <label
                  key={v.id}
                  className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedIds.has(v.id!) ? 'bg-blue-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(v.id!)}
                    onChange={() => toggleVariation(v.id!)}
                    className="mt-0.5 accent-gray-900"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {platformBadge(v.platform)}
                      <span className="text-[10px] text-gray-400">{v.type}</span>
                      <span className="text-[10px] text-gray-400">· {clientName(v.clientId)}</span>
                    </div>
                    <p className="text-[12px] text-gray-700 truncate">{v.content?.slice(0, 90)}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-[12px] text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={!newTitle.trim() || selectedIds.size === 0 || isSaving}
              className="px-4 py-1.5 bg-gray-900 text-white rounded-md text-[12px] font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Creando...' : 'Crear y copiar link'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de sesiones */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Sesiones de revisión</span>
        </div>
        {isLoading ? (
          <p className="p-6 text-[12px] text-gray-400 text-center">Cargando...</p>
        ) : sessions.length === 0 ? (
          <p className="p-8 text-[12px] text-gray-400 text-center">
            No hay sesiones creadas. Crea una para empezar a colaborar con tus clientes.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {sessions.map(s => {
              const statusInfo = STATUS_LABELS[s.status] ?? STATUS_LABELS.PENDING;
              const expiresAt = new Date(s.expiresAt);
              const isExpired = expiresAt < new Date();
              const isExpanded = expandedId === s.id;
              const detail = detailCache[s.id];
              const feedbackMap = new Map<string, ReviewItemFeedbackDetail>(
                (detail?.submission?.feedbacks ?? []).map(f => [f.savedVariationId, f])
              );

              return (
                <div key={s.id}>
                  {/* Fila principal */}
                  <div className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50' : ''}`}>
                    {/* Expand toggle */}
                    <button
                      onClick={() => handleExpandSession(s.id)}
                      className="p-0.5 text-gray-300 hover:text-gray-600 transition-colors shrink-0"
                    >
                      <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>

                    {/* Título */}
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-medium text-gray-800">{s.title}</span>
                      {s.submission?.reviewerName && (
                        <span className="ml-2 text-[10px] text-gray-400">· {s.submission.reviewerName}</span>
                      )}
                    </div>

                    {/* Estado */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border shrink-0 ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>

                    {/* # variaciones */}
                    <span className="text-[12px] text-gray-400 w-8 text-center shrink-0">
                      {s._count?.items ?? s.items?.length ?? '—'}
                    </span>

                    {/* Vence */}
                    <span className={`text-[12px] w-16 text-right shrink-0 ${isExpired ? 'text-red-500' : 'text-gray-400'}`}>
                      {isExpired ? 'Vencido' : expiresAt.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </span>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleCopyLink(s.token)} title="Copiar link"
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(s.id)} title="Eliminar"
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Panel de detalle expandido */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/60 px-6 py-4">
                      {!detail ? (
                        <p className="text-[12px] text-gray-400 text-center py-2">Cargando detalle...</p>
                      ) : !detail.submission ? (
                        <p className="text-[12px] text-gray-400 text-center py-2">Aún no hay revisión enviada.</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            Revisado por <span className="text-gray-700 normal-case font-semibold">{detail.submission.reviewerName || 'Anónimo'}</span>
                            {' '}· {new Date(detail.submission.submittedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          {(detail.items ?? []).map(item => {
                            const fb = feedbackMap.get(item.savedVariation.id);
                            const isApproved = fb?.decision === 'APPROVED';
                            const isRejected = fb?.decision === 'REJECTED';
                            return (
                              <div key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border ${isApproved ? 'bg-emerald-50 border-emerald-100' : isRejected ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                                {/* Decisión icon */}
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isApproved ? 'bg-emerald-100' : isRejected ? 'bg-red-100' : 'bg-gray-100'}`}>
                                  {isApproved && (
                                    <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                  )}
                                  {isRejected && (
                                    <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PLATFORM_COLORS[item.savedVariation.platform] ?? 'bg-gray-100 text-gray-600'}`}>
                                      {item.savedVariation.platform}
                                    </span>
                                    <span className="text-[10px] text-gray-400">{item.savedVariation.type}</span>
                                  </div>
                                  <p className="text-[12px] text-gray-700 truncate">{item.savedVariation.content?.slice(0, 100)}</p>
                                  {fb?.comment && (
                                    <p className="text-[11px] text-red-600 mt-1 italic">"{fb.comment}"</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
