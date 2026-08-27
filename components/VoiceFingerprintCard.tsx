import React from 'react';
import { Fingerprint, Loader2, RefreshCw, Sparkles, MessageSquareQuote, Type, Smile } from 'lucide-react';

interface Props {
  fingerprint: any;
  computedAt?: string | number | null;
  computing: boolean;
  error: string | null;
  onCompute: () => void;
}

const Bar: React.FC<{ label: string; value: number; max: number; suffix?: string }> = ({ label, value, max, suffix = '' }) => {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
        <span>{label}</span>
        <span className="font-medium text-gray-700 tabular-nums">{value}{suffix}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gray-700 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const VoiceFingerprintCard: React.FC<Props> = ({ fingerprint, computedAt, computing, error, onCompute }) => {
  if (!fingerprint) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 shrink-0">
            <Fingerprint className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-[13px] font-medium text-gray-900">Voice Fingerprint</h4>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
              Señales medibles extraídas del copy aprobado. Necesita ≥3 ejemplos.
            </p>
          </div>
        </div>
        <button
          onClick={onCompute}
          disabled={computing}
          className={`w-full py-2 rounded-lg text-[12px] font-medium transition-colors border flex items-center justify-center gap-2 ${
            computing
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-ink text-white border-gray-900 hover:bg-ink-hover'
          }`}
        >
          {computing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analizando…</> : <><Sparkles className="w-3.5 h-3.5" />Calcular fingerprint</>}
        </button>
        {error && <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-ink flex items-center justify-center text-white shrink-0">
          <Fingerprint className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-medium text-gray-900">Voice Fingerprint</h4>
          {computedAt && (
            <p className="text-[10px] text-gray-500">Generado {new Date(computedAt as any).toLocaleDateString()}</p>
          )}
        </div>
        <button
          onClick={onCompute}
          disabled={computing}
          className="text-[10px] font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          {computing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {computing ? 'Recalculando' : 'Recalcular'}
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-700 text-white rounded-xl p-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/50 mb-1">Arquetipo</div>
          <div className="text-[18px] font-medium tracking-tight">{fingerprint.archetype}</div>
          {fingerprint.archetypeRationale && (
            <p className="text-[11px] text-white/70 mt-1.5 leading-relaxed">{fingerprint.archetypeRationale}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1">Persona</div>
            <p className="text-[12px] text-gray-900 leading-snug">{fingerprint.personaGramatical}</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1">Long. media</div>
            <p className="text-[16px] font-medium text-gray-900 leading-none">{fingerprint.avgSentenceLength}<span className="text-[11px] text-gray-500 font-normal ml-1">pal/oración</span></p>
            <p className="text-[10px] text-gray-500 mt-1">rango {fingerprint.sentenceLengthRange?.[0]}-{fingerprint.sentenceLengthRange?.[1]}</p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-gray-500 mb-2">
            <Type className="w-3 h-3" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Tono observado</span>
          </div>
          <p className="text-[12px] text-gray-900 leading-relaxed italic">"{fingerprint.toneSummary}"</p>
        </div>

        {fingerprint.punctuationDensity && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-gray-500">
              <Smile className="w-3 h-3" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Densidad de signos (por 1000)</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Bar label="!" value={fingerprint.punctuationDensity.exclamation} max={20} />
              <Bar label="?" value={fingerprint.punctuationDensity.question} max={20} />
              <Bar label="—" value={fingerprint.punctuationDensity.dash} max={20} />
              <Bar label="…" value={fingerprint.punctuationDensity.ellipsis} max={20} />
            </div>
          </div>
        )}

        {fingerprint.linguisticTics?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-gray-500 mb-2">
              <MessageSquareQuote className="w-3 h-3" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Tics lingüísticos</span>
            </div>
            <div className="space-y-1.5">
              {fingerprint.linguisticTics.map((t: string, i: number) => (
                <div key={i} className="text-[11px] text-gray-700 bg-amber-50 border-l-2 border-amber-400 px-3 py-1.5 rounded-r leading-relaxed">
                  {t}
                </div>
              ))}
            </div>
          </div>
        )}

        {(fingerprint.favoriteWords?.length > 0 || fingerprint.avoidWords?.length > 0) && (
          <div className="space-y-2 pt-1">
            {fingerprint.favoriteWords?.length > 0 && (
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-700 mb-1.5">Léxico favorecido</div>
                <div className="flex flex-wrap gap-1">
                  {fingerprint.favoriteWords.map((w: string, i: number) => (
                    <span key={i} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">{w}</span>
                  ))}
                </div>
              </div>
            )}
            {fingerprint.avoidWords?.length > 0 && (
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-red-700 mb-1.5">Léxico a evitar</div>
                <div className="flex flex-wrap gap-1">
                  {fingerprint.avoidWords.map((w: string, i: number) => (
                    <span key={i} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-100">{w}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>
        )}
      </div>
    </div>
  );
};

export default VoiceFingerprintCard;
