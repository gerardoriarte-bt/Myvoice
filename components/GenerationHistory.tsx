import React, { useState, useEffect } from 'react';
import { Client, ContentDNAProfile, CopyVariation } from '../types';
import { generationApi } from '../services/api';

interface GenerationLog {
  id: string;
  clientId: string;
  dnaProfileId: string;
  platforms: string[];
  funnelStage?: string;
  spineJson?: { concept?: string; keyMessage?: string; tone?: string; heroCTA?: string } | null;
  outputJson?: CopyVariation[] | null;
  createdAt: string;
}

interface GenerationHistoryProps {
  clients?: Client[];
  dnaProfiles?: ContentDNAProfile[];
  initialClientId?: string;
}

const FUNNEL_COLORS: Record<string, string> = {
  Awareness:       'bg-blue-50 text-blue-700 border-blue-200',
  Consideración:   'bg-purple-50 text-purple-700 border-purple-200',
  Conversión:      'bg-orange-50 text-orange-700 border-orange-200',
  Retención:       'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const PLATFORM_COLORS: Record<string, string> = {
  'Instagram Post':    'bg-pink-50 text-pink-700',
  'Instagram Historia':'bg-purple-50 text-purple-700',
  'Instagram Carrusel':'bg-fuchsia-50 text-fuchsia-700',
  'Instagram Reel':    'bg-violet-50 text-violet-700',
  'TikTok':            'bg-gray-800 text-white',
  'YouTube':           'bg-red-50 text-red-700',
  'Email':             'bg-blue-50 text-blue-700',
  'WhatsApp':          'bg-green-50 text-green-700',
  'Google Ads':        'bg-yellow-50 text-yellow-700',
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Ahora mismo';
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `Hace ${d}d`;
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function groupByDate(logs: GenerationLog[]): [string, GenerationLog[]][] {
  const map = new Map<string, GenerationLog[]>();
  logs.forEach(log => {
    const key = new Date(log.createdAt).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(log);
  });
  return Array.from(map.entries());
}

export default function GenerationHistory({ clients = [], dnaProfiles = [], initialClientId }: GenerationHistoryProps) {
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState(initialClientId ?? '');

  useEffect(() => {
    setIsLoading(true);
    generationApi.history(clientFilter || undefined)
      .then((data: GenerationLog[]) => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setIsLoading(false));
  }, [clientFilter]);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name ?? id;
  const dnaName = (id: string) => dnaProfiles.find(p => p.id === id)?.name ?? 'Perfil ADN';
  const grouped = groupByDate(logs);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900">Historial de Generaciones</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">Últimas 50 campañas generadas con spine y variaciones.</p>
        </div>
        <select
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-md text-[12px] bg-white focus:outline-none focus:border-gray-400"
        >
          <option value="">Todas las marcas</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <p className="text-[13px] text-gray-400">
            {clientFilter ? 'No hay generaciones para esta marca.' : 'Aún no hay generaciones registradas.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([date, dayLogs]) => (
            <div key={date}>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3 capitalize">{date}</p>
              <div className="space-y-3">
                {dayLogs.map(log => {
                  const isExpanded = expandedId === log.id;
                  const variations: CopyVariation[] = Array.isArray(log.outputJson) ? log.outputJson : [];
                  const funnelCls = FUNNEL_COLORS[log.funnelStage ?? ''] ?? 'bg-gray-50 text-gray-600 border-gray-200';

                  return (
                    <div key={log.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="w-full flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                      >
                        <svg className={`w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-[13px] font-semibold text-gray-900">{clientName(log.clientId)}</span>
                            <span className="text-[11px] text-gray-400">·</span>
                            <span className="text-[11px] text-gray-500">{dnaName(log.dnaProfileId)}</span>
                            <span className="text-[11px] text-gray-300 ml-auto shrink-0">{formatRelative(log.createdAt)}</span>
                          </div>

                          {log.spineJson?.concept && (
                            <p className="text-[12px] text-gray-500 mb-2 line-clamp-1 italic">"{log.spineJson.concept}"</p>
                          )}

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {log.funnelStage && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${funnelCls}`}>
                                {log.funnelStage}
                              </span>
                            )}
                            {log.platforms.map(p => (
                              <span key={p} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${PLATFORM_COLORS[p] ?? 'bg-gray-100 text-gray-500'}`}>
                                {p}
                              </span>
                            ))}
                            {variations.length > 0 && (
                              <span className="text-[10px] text-gray-400 ml-1">{variations.length} variaciones</span>
                            )}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50/50 p-5 space-y-4">
                          {log.spineJson && (log.spineJson.concept || log.spineJson.keyMessage) && (
                            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-1.5">
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Campaign Spine</p>
                              {log.spineJson.concept    && <p className="text-[12px] text-gray-800"><span className="font-medium">Concepto:</span> {log.spineJson.concept}</p>}
                              {log.spineJson.keyMessage && <p className="text-[12px] text-gray-700"><span className="font-medium">Mensaje clave:</span> {log.spineJson.keyMessage}</p>}
                              {log.spineJson.tone       && <p className="text-[12px] text-gray-700"><span className="font-medium">Tono:</span> {log.spineJson.tone}</p>}
                              {log.spineJson.heroCTA    && <p className="text-[12px] text-gray-700"><span className="font-medium">CTA:</span> {log.spineJson.heroCTA}</p>}
                            </div>
                          )}

                          {variations.length > 0 && (
                            <div className="space-y-3">
                              {Object.entries(
                                variations.reduce((acc, v) => {
                                  if (!acc[v.platform]) acc[v.platform] = [];
                                  acc[v.platform].push(v);
                                  return acc;
                                }, {} as Record<string, CopyVariation[]>)
                              ).map(([platform, pvs]) => (
                                <div key={platform}>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium mb-2 ${PLATFORM_COLORS[platform] ?? 'bg-gray-100 text-gray-600'}`}>
                                    {platform}
                                  </span>
                                  <div className="space-y-1.5">
                                    {pvs.map((v, i) => (
                                      <div key={i} className="bg-white border border-gray-100 rounded-lg px-3 py-2">
                                        {v.slot && <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 block mb-0.5">{v.slot}</span>}
                                        <p className="text-[12px] text-gray-700 leading-snug line-clamp-2">{v.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
