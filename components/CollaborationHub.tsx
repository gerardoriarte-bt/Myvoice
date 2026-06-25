import React, { useState, useEffect } from 'react';
import { SavedVariation, Client, ReviewSession } from '../types';
import { reviewApi } from '../services/api';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface CollaborationHubProps {
  savedVariations: SavedVariation[];
  clients: Client[];
  addNotification: (message: string, type: NotificationType) => void;
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

export default function CollaborationHub({ savedVariations, clients, addNotification }: CollaborationHubProps) {
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clientFilter, setClientFilter] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await reviewApi.list();
      if (Array.isArray(data)) setSessions(data);
    } catch {
      addNotification('Error al cargar sesiones de revisión', 'error');
    } finally {
      setIsLoading(false);
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
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Título', 'Estado', 'Variaciones', 'Vence', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sessions.map(s => {
                const statusInfo = STATUS_LABELS[s.status] ?? STATUS_LABELS.PENDING;
                const expiresAt = new Date(s.expiresAt);
                const isExpired = expiresAt < new Date();
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-medium text-gray-800">{s.title}</span>
                      {s.submission && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Revisado por: {s.submission.reviewerName || 'Anónimo'}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-600">
                      {s._count?.items ?? s.items?.length ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[12px] ${isExpired ? 'text-red-500' : 'text-gray-500'}`}>
                        {isExpired ? 'Vencido' : expiresAt.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyLink(s.token)}
                          title="Copiar link"
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          title="Eliminar"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
