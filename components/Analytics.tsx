import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../services/api';

interface AnalyticsSummary {
  totalSaved: number;
  totalApproved: number;
  totalRejected: number;
  approvalRate: number;
}

interface ClientStat {
  clientId: string;
  clientName: string;
  saved: number;
  approved: number;
  rejected: number;
  approvalRate: number;
}

interface PlatformStat {
  platform: string;
  saved: number;
  approved: number;
  rejected: number;
}

interface RecentRejection {
  platform: string;
  reason: string;
  clientName: string;
  createdAt: string;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  byClient: ClientStat[];
  byPlatform: PlatformStat[];
  recentRejections: RecentRejection[];
}

const PLATFORM_COLORS: Record<string, string> = {
  'Instagram Post': 'bg-pink-400',
  'Instagram Historia': 'bg-purple-400',
  'Instagram Carrusel': 'bg-fuchsia-400',
  'Instagram Reel': 'bg-violet-400',
  'TikTok': 'bg-gray-800',
  'YouTube': 'bg-red-400',
  'Email': 'bg-blue-400',
  'WhatsApp': 'bg-green-400',
  'Google Ads': 'bg-yellow-400',
  'Google Display': 'bg-amber-400',
  'Push Notification': 'bg-orange-400',
  'Pop up': 'bg-teal-400',
  'Cuña de Radio': 'bg-indigo-400',
  'Rich Media': 'bg-cyan-400',
};

function SummaryCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-[28px] font-bold leading-none ${accent ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function BarRow({ label, value, max, color, count }: { label: string; value: number; max: number; color: string; count: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-gray-600 w-36 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: 'width 0.6s ease' }} />
      </div>
      <span className="text-[11px] font-medium text-gray-500 w-6 text-right shrink-0">{count}</span>
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    analyticsApi.get()
      .then((d: AnalyticsData) => setData(d))
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-48 text-[13px] text-gray-400">
        Error al cargar analytics. Recarga la página.
      </div>
    );
  }

  const { summary, byClient, byPlatform, recentRejections } = data;
  const maxRejected = Math.max(...byPlatform.map(p => p.rejected), 1);
  const maxSaved = Math.max(...byPlatform.map(p => p.saved), 1);

  const isEmpty = summary.totalSaved === 0 && summary.totalRejected === 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h2 className="text-[15px] font-semibold text-gray-900">Analytics de Copy</h2>
        <p className="text-[12px] text-gray-500 mt-0.5">Métricas de aprobación y rechazo por cliente y plataforma.</p>
      </div>

      {isEmpty ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <p className="text-[13px] text-gray-400">Aún no hay datos. Genera y guarda copy para ver tus métricas aquí.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Guardadas" value={summary.totalSaved} sub="variaciones totales" />
            <SummaryCard label="Aprobadas" value={summary.totalApproved} accent="text-emerald-600" sub="por el cliente" />
            <SummaryCard label="Rechazadas" value={summary.totalRejected} accent="text-red-500" sub="feedback negativo" />
            <SummaryCard
              label="Tasa de aprobación"
              value={`${summary.approvalRate}%`}
              accent={summary.approvalRate >= 70 ? 'text-emerald-600' : summary.approvalRate >= 40 ? 'text-amber-500' : 'text-red-500'}
              sub="sobre variaciones guardadas"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por plataforma — rechazadas */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Rechazos por plataforma</span>
              </div>
              <div className="p-5 space-y-3">
                {byPlatform.filter(p => p.rejected > 0).length === 0 ? (
                  <p className="text-[12px] text-gray-400 text-center py-4">Sin rechazos registrados</p>
                ) : (
                  byPlatform.filter(p => p.rejected > 0).map((p: PlatformStat) => (
                    <BarRow
                      key={p.platform}
                      label={p.platform}
                      value={p.rejected}
                      max={maxRejected}
                      color={PLATFORM_COLORS[p.platform] ?? 'bg-gray-400'}
                      count={p.rejected}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Por plataforma — guardadas */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Variaciones guardadas por plataforma</span>
              </div>
              <div className="p-5 space-y-3">
                {byPlatform.filter(p => p.saved > 0).length === 0 ? (
                  <p className="text-[12px] text-gray-400 text-center py-4">Sin variaciones guardadas</p>
                ) : (
                  byPlatform.filter(p => p.saved > 0).map((p: PlatformStat) => (
                    <BarRow
                      key={p.platform}
                      label={p.platform}
                      value={p.saved}
                      max={maxSaved}
                      color={PLATFORM_COLORS[p.platform] ?? 'bg-gray-400'}
                      count={p.saved}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Por cliente */}
          {byClient.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Rendimiento por cliente</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Cliente', 'Guardadas', 'Aprobadas', 'Rechazadas', 'Tasa de aprobación'].map(h => (
                      <th key={h} className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {byClient.map(c => (
                    <tr key={c.clientId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-[13px] font-medium text-gray-800">{c.clientName}</td>
                      <td className="px-5 py-3 text-[12px] text-gray-600">{c.saved}</td>
                      <td className="px-5 py-3 text-[12px] text-emerald-600 font-medium">{c.approved}</td>
                      <td className="px-5 py-3 text-[12px] text-red-500 font-medium">{c.rejected}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                            <div
                              className={`h-full rounded-full ${c.approvalRate >= 70 ? 'bg-emerald-400' : c.approvalRate >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${c.approvalRate}%` }}
                            />
                          </div>
                          <span className={`text-[12px] font-semibold ${c.approvalRate >= 70 ? 'text-emerald-600' : c.approvalRate >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                            {c.approvalRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Últimos rechazos */}
          {recentRejections.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Últimos rechazos</span>
              </div>
              <div className="divide-y divide-gray-50">
                {recentRejections.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                    <span className={`inline-flex items-center shrink-0 px-2 py-0.5 rounded text-[10px] font-medium border mt-0.5 ${
                      PLATFORM_COLORS[r.platform] ? PLATFORM_COLORS[r.platform].replace('bg-', 'bg-').replace('400', '50') + ' text-gray-700 border-gray-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {r.platform}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-gray-700 leading-snug">{r.reason}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {r.clientName} · {new Date(r.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
