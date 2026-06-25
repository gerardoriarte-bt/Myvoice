import React, { useState } from 'react';
import { SavedVariation, User, Client } from '../types';

interface ClientPortalProps {
  currentUser: User;
  savedVariations: SavedVariation[];
  clients: Client[];
  onLogout: () => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  'Instagram Post':    'bg-pink-50 text-pink-700 border-pink-200',
  'Instagram Historia':'bg-purple-50 text-purple-700 border-purple-200',
  'Instagram Carrusel':'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  'Instagram Reel':    'bg-violet-50 text-violet-700 border-violet-200',
  'TikTok':            'bg-gray-900 text-white border-gray-700',
  'YouTube':           'bg-red-50 text-red-700 border-red-200',
  'Email':             'bg-blue-50 text-blue-700 border-blue-200',
  'WhatsApp':          'bg-green-50 text-green-700 border-green-200',
  'Google Ads':        'bg-yellow-50 text-yellow-700 border-yellow-200',
};

export default function ClientPortal({ currentUser, savedVariations, clients, onLogout }: ClientPortalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const myClient = clients.find(c => c.id === currentUser.clientId);

  const filtered = savedVariations.filter(v => {
    const matchesPlatform = !platformFilter || v.platform === platformFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'approved' ? v.isApproved : !v.isApproved);
    const matchesSearch = !searchQuery || v.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlatform && matchesStatus && matchesSearch;
  });

  const approvedCount = savedVariations.filter(v => v.isApproved).length;
  const pendingCount  = savedVariations.filter(v => !v.isApproved).length;

  const platforms = Array.from(new Set(savedVariations.map(v => v.platform)));

  const hasActiveFilters = !!platformFilter || statusFilter !== 'all' || !!searchQuery;

  const copyContent = (v: SavedVariation) => {
    navigator.clipboard.writeText(v.content);
    setCopiedId(v.id!);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setPlatformFilter('');
    setStatusFilter('all');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-[6px] bg-[#1D1D1F] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <span className="text-[14px] font-semibold text-gray-900">My Voice</span>
              {myClient?.name && (
                <span className="ml-2 text-[12px] text-gray-400">· {myClient.name}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-[11px] font-semibold">
              {currentUser.name[0].toUpperCase()}
            </div>
            <span className="text-[12px] text-gray-600 hidden sm:block">{currentUser.name}</span>
            <button
              onClick={onLogout}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Cerrar sesión"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Summary */}
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 mb-1">Biblioteca de contenido</h1>
          <p className="text-[13px] text-gray-500">Variaciones de copy generadas para tu marca.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Total</p>
            <p className="text-[26px] font-bold text-gray-900 mt-0.5">{savedVariations.length}</p>
          </div>
          <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">Aprobadas</p>
            <p className="text-[26px] font-bold text-emerald-600 mt-0.5">{approvedCount}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Pendientes</p>
            <p className="text-[26px] font-bold text-gray-900 mt-0.5">{pendingCount}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col sm:flex-row gap-2 shadow-sm">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar contenidos..."
              className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:border-gray-400"
            />
            <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-[12px] bg-white focus:outline-none focus:border-gray-400">
            <option value="">Plataforma</option>
            {platforms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-[12px] bg-white focus:outline-none focus:border-gray-400">
            <option value="all">Estado</option>
            <option value="approved">Aprobadas</option>
            <option value="pending">Pendientes</option>
          </select>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="px-3 py-2 text-[12px] text-gray-500 hover:text-gray-800 transition-colors whitespace-nowrap">
              Limpiar
            </button>
          )}
        </div>

        {/* Resultado count */}
        {hasActiveFilters && (
          <p className="text-[11px] text-gray-400">
            Mostrando <span className="font-semibold text-gray-600">{filtered.length}</span> de {savedVariations.length} variaciones
          </p>
        )}

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            <p className="text-[13px] text-gray-400">No hay variaciones que coincidan con los filtros.</p>
            {hasActiveFilters && <button onClick={clearFilters} className="mt-2 text-[12px] text-gray-500 underline">Limpiar filtros</button>}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(v => {
              const platformCls = PLATFORM_COLORS[v.platform] ?? 'bg-gray-100 text-gray-600 border-gray-200';
              const isCopied = copiedId === v.id;
              return (
                <div key={v.id} className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${v.isApproved ? 'border-emerald-200' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${platformCls}`}>
                        {v.platform}
                      </span>
                      <span className="text-[11px] text-gray-400">{v.type}</span>
                      {v.isApproved && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Aprobada
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => copyContent(v)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-all shrink-0 ${
                        isCopied
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Copiado
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap">{v.content}</p>
                  <p className="text-[10px] text-gray-300 mt-2 text-right">{v.charCount} caracteres</p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
