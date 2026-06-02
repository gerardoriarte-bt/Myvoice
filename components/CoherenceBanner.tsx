import React from 'react';
import { CoherenceReport } from '../types';

interface Props {
  report: CoherenceReport;
}

const severityStyle = {
  low: 'bg-amber-50 text-amber-800 border-amber-200',
  medium: 'bg-orange-50 text-orange-800 border-orange-200',
  high: 'bg-red-50 text-red-800 border-red-200',
};

const CoherenceBanner: React.FC<Props> = ({ report }) => {
  const [open, setOpen] = React.useState(false);
  const score = report.coherenceScore;

  const ringColor =
    score >= 8 ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
    : score >= 6 ? 'text-amber-700 border-amber-200 bg-amber-50'
    : 'text-red-700 border-red-200 bg-red-50';

  const ringLabel =
    score >= 9 ? 'Campaña perfectamente unificada'
    : score >= 7 ? 'Coherente con desviaciones menores'
    : score >= 4 ? 'Desviaciones serias'
    : 'Incoherencia: parecen N campañas';

  return (
    <div className={`rounded-xl border ${ringColor} border p-4`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`shrink-0 w-12 h-12 rounded-full border-2 ${ringColor.split(' ').filter(c => c.startsWith('border')).join(' ')} flex items-center justify-center font-medium text-[14px]`}>
            {score}/10
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-medium">Coherencia de campaña</span>
              <span className="text-[11px] opacity-70">— {ringLabel}</span>
            </div>
            <p className="text-[12px] mt-0.5 leading-relaxed opacity-90">{report.summary}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {report.flags.length > 0 && (
            <span className="text-[11px] font-medium opacity-70">{report.flags.length} flag{report.flags.length === 1 ? '' : 's'}</span>
          )}
          {report.issues.length > 0 && (
            <span className="text-[11px] font-medium opacity-70">· {report.issues.length} issue{report.issues.length === 1 ? '' : 's'}</span>
          )}
          <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (report.flags.length > 0 || report.issues.length > 0) && (
        <div className="mt-4 pt-4 border-t border-current/10 space-y-3">
          {report.flags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {report.flags.map(f => (
                <span key={f} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/60 border border-current/20">
                  {f}
                </span>
              ))}
            </div>
          )}
          {report.issues.map((issue, i) => (
            <div key={i} className={`text-[12px] rounded-lg border p-3 ${severityStyle[issue.severity] || severityStyle.low}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">{issue.severity}</span>
                <span className="text-[11px] font-medium">{issue.channels.join(' ↔ ')}</span>
              </div>
              <p className="leading-relaxed">{issue.problem}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CoherenceBanner;
