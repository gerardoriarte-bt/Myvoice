import React from 'react';
import { Coins, Database } from 'lucide-react';
import { UsageReport } from '../types';

interface Props {
  usage: UsageReport;
}

const fmtUsd = (n: number) => `$${n.toFixed(4)}`;
const fmtTokens = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

const UsageBadge: React.FC<Props> = ({ usage }) => {
  const [open, setOpen] = React.useState(false);
  const cachedPct = usage.promptTokens > 0
    ? Math.round((usage.cachedTokens / usage.promptTokens) * 100)
    : 0;

  const stages = (Object.entries(usage.byStage) as [string, { tokens: number; costUsd: number }][])
    .sort(([, a], [, b]) => b.costUsd - a.costUsd);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 shrink-0">
          <Coins className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-medium text-gray-900">{fmtUsd(usage.costUsd)}</span>
            <span className="text-[11px] text-gray-500">·</span>
            <span className="text-[11px] text-gray-500">{fmtTokens(usage.promptTokens + usage.completionTokens)} tokens</span>
            {cachedPct > 0 && (
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                <Database className="w-2.5 h-2.5" />
                {cachedPct}% cache
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {fmtTokens(usage.promptTokens)} input · {fmtTokens(usage.completionTokens)} output · {Object.keys(usage.byStage).length} llamadas
          </div>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50/40 p-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-2">
            Por etapa (ordenado por costo)
          </div>
          <div className="space-y-1">
            {stages.map(([stage, info]) => (
              <div key={stage} className="flex items-center justify-between gap-3 text-[11px] py-1 px-2 bg-white border border-gray-100 rounded">
                <span className="font-medium text-gray-700 truncate">{stage}</span>
                <span className="text-gray-500 shrink-0">{fmtTokens(info.tokens)} · {fmtUsd(info.costUsd)}</span>
              </div>
            ))}
          </div>
          <p className="text-[9.5px] text-gray-400 mt-2 leading-relaxed">
            Tokens de input cacheados pagan 50% del precio normal. Cuanto más cache, más barato.
          </p>
        </div>
      )}
    </div>
  );
};

export default UsageBadge;
