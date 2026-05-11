import React from 'react';
import { generationApi } from '../services/api';

interface HistoryEntry {
  id: string;
  clientId: string;
  dnaProfileId: string;
  platforms: string[];
  funnelStage?: string | null;
  spineJson?: { concept?: string; tone?: string } | null;
  outputJson?: { variations: any[] } | null;
  createdAt: string;
}

interface Props {
  clientId: string;
  reloadKey?: number;
}

const GenerationHistory: React.FC<Props> = ({ clientId, reloadKey }) => {
  const [entries, setEntries] = React.useState<HistoryEntry[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const fetchHistory = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generationApi.history(clientId);
      setEntries(data);
    } catch (err: any) {
      setError(err?.message || 'Error cargando historial');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  React.useEffect(() => {
    fetchHistory();
  }, [fetchHistory, reloadKey]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h4 className="text-[14px] font-medium text-gray-900">Historial de Generaciones</h4>
          <p className="text-[12px] text-gray-500 mt-0.5">Últimas 50 corridas para esta marca.</p>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="text-[11px] font-medium text-gray-500 hover:text-gray-900 disabled:opacity-50"
        >
          {loading ? '…' : 'Refrescar'}
        </button>
      </div>

      <div className="p-5 space-y-2">
        {error && <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
        {!error && entries && entries.length === 0 && (
          <div className="text-center py-6 text-[12px] text-gray-400 border border-dashed border-gray-200 rounded-lg">
            Sin generaciones registradas todavía.
          </div>
        )}
        {entries && entries.map(entry => {
          const isExpanded = expandedId === entry.id;
          const variations = entry.outputJson?.variations || [];
          const dt = new Date(entry.createdAt);
          return (
            <div key={entry.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-gray-900 truncate">
                      {entry.spineJson?.concept || '— sin concepto —'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                      <span>{dt.toLocaleString()}</span>
                      <span>·</span>
                      <span>{entry.platforms.length} canal{entry.platforms.length === 1 ? '' : 'es'}</span>
                      <span>·</span>
                      <span>{variations.length} piezas</span>
                      {entry.funnelStage && (
                        <>
                          <span>·</span>
                          <span className="font-medium">{entry.funnelStage}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/40 p-4 space-y-3">
                  {entry.spineJson?.tone && (
                    <div className="text-[11px] text-gray-600">
                      <span className="font-medium">Tono:</span> {entry.spineJson.tone}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {entry.platforms.map(p => (
                      <span key={p} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-700">
                        {p}
                      </span>
                    ))}
                  </div>
                  <details className="text-[11px] text-gray-600">
                    <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">Ver variaciones ({variations.length})</summary>
                    <div className="mt-2 space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                      {variations.map((v: any, i: number) => (
                        <div key={i} className="p-2 bg-white border border-gray-100 rounded text-[11px]">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="font-medium text-gray-700">{v.platform}</span>
                            {v.slot && <span className="text-gray-500">· {v.slot} #{v.variationIndex}</span>}
                            {typeof v.score === 'number' && <span className="text-gray-500">· {v.score}/10</span>}
                          </div>
                          <p className="text-gray-700 leading-relaxed">{v.content}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GenerationHistory;
