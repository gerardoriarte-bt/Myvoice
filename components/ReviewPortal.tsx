import React, { useState, useEffect } from 'react';
import { ReviewSession, ReviewFeedback, ReviewDecision } from '../types';
import { reviewApi } from '../services/api';

interface ReviewPortalProps {
  token: string;
  onBack: () => void;
}

type Phase = 'loading' | 'reviewing' | 'submitted' | 'expired' | 'error';

const PLATFORM_COLORS: Record<string, string> = {
  'Instagram Post': 'bg-pink-50 text-pink-700 border-pink-200',
  'Instagram Historia': 'bg-purple-50 text-purple-700 border-purple-200',
  'Instagram Carrusel': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  'Instagram Reel': 'bg-violet-50 text-violet-700 border-violet-200',
  'TikTok': 'bg-gray-900 text-white border-gray-700',
  'YouTube': 'bg-red-50 text-red-700 border-red-200',
  'Email': 'bg-blue-50 text-blue-700 border-blue-200',
  'WhatsApp': 'bg-green-50 text-green-700 border-green-200',
  'Google Ads': 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

export default function ReviewPortal({ token, onBack }: ReviewPortalProps) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [decisions, setDecisions] = useState<Record<string, ReviewDecision>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [reviewerName, setReviewerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    reviewApi.getByToken(token).then((data: ReviewSession & { error?: string }) => {
      if (data?.error) {
        if (data.error.includes('expirado') || data.error.includes('expirada')) {
          setPhase('expired');
        } else if (data.error.includes('no encontrada')) {
          setPhase('expired');
        } else {
          setPhase('error');
        }
        return;
      }
      if (data.status === 'COMPLETED') {
        setSession(data);
        setPhase('submitted');
        return;
      }
      setSession(data);
      const defaults: Record<string, ReviewDecision> = {};
      (data.items ?? []).forEach(item => {
        defaults[item.savedVariation.id] = 'APPROVED';
      });
      setDecisions(defaults);
      setPhase('reviewing');
    }).catch(() => setPhase('error'));
  }, [token]);

  const handleDecision = (variationId: string, decision: ReviewDecision) => {
    setDecisions(prev => ({ ...prev, [variationId]: decision }));
    if (decision === 'APPROVED') {
      setComments(prev => { const next = { ...prev }; delete next[variationId]; return next; });
    }
  };

  const handleSubmit = async () => {
    if (!session) return;
    setIsSubmitting(true);
    try {
      const feedbacks: ReviewFeedback[] = (session.items ?? []).map(item => ({
        savedVariationId: item.savedVariation.id,
        decision: decisions[item.savedVariation.id] ?? 'APPROVED',
        comment: comments[item.savedVariation.id] || undefined,
      }));
      const result = await reviewApi.submit(token, { reviewerName: reviewerName.trim() || undefined, feedbacks });
      if (result?.error) throw new Error(result.error);
      setPhase('submitted');
    } catch {
      setPhase('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = Object.values(decisions).length;
  const itemCount = session?.items?.length ?? 0;
  const allDecided = pendingCount >= itemCount;

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">Cargando revisión...</p>
        </div>
      </div>
    );
  }

  if (phase === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-[17px] font-semibold text-gray-800 mb-2">Link vencido o no válido</h2>
          <p className="text-[13px] text-gray-500">Este link de revisión ha expirado o no existe. Solicita un nuevo link al equipo de contenido.</p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-[17px] font-semibold text-gray-800 mb-2">Error inesperado</h2>
          <p className="text-[13px] text-gray-500">Ocurrió un error al procesar la revisión. Intenta recargar la página.</p>
        </div>
      </div>
    );
  }

  if (phase === 'submitted') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-[17px] font-semibold text-gray-800 mb-2">
            {session?.submission ? 'Revisión ya enviada' : '¡Gracias por tu revisión!'}
          </h2>
          <p className="text-[13px] text-gray-500">
            {session?.submission
              ? `Esta revisión fue enviada el ${new Date(session.submission.submittedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}.`
              : 'Tu revisión fue recibida. El equipo de contenido aplicará los cambios.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header fijo */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Revisión de contenido</p>
            <h1 className="text-[14px] font-semibold text-gray-900 leading-tight">{session?.title}</h1>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span>{itemCount} pieza{itemCount !== 1 ? 's' : ''}</span>
            <span className="text-gray-200">·</span>
            <span>
              {Object.values(decisions).filter(d => d === 'APPROVED').length} aprobadas,{' '}
              {Object.values(decisions).filter(d => d === 'REJECTED').length} rechazadas
            </span>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-3xl mx-auto px-5 py-8 space-y-5">
        <p className="text-[12px] text-gray-500">
          Revisa cada pieza y marca tu decisión. Puedes dejar un comentario si rechazas alguna.
        </p>

        {(session?.items ?? []).map((item, idx) => {
          const v = item.savedVariation;
          const decision = decisions[v.id];
          const platformCls = PLATFORM_COLORS[v.platform] ?? 'bg-gray-100 text-gray-600 border-gray-200';
          const isApproved = decision === 'APPROVED';
          const isRejected = decision === 'REJECTED';

          return (
            <div
              key={v.id}
              className={`bg-white rounded-xl border transition-all ${
                isRejected ? 'border-red-200 shadow-sm shadow-red-50' : isApproved ? 'border-emerald-200 shadow-sm shadow-emerald-50' : 'border-gray-200'
              }`}
            >
              <div className="p-5">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-medium text-gray-400">#{idx + 1}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${platformCls}`}>
                      {v.platform}
                    </span>
                    <span className="text-[11px] text-gray-400">{v.type}</span>
                  </div>
                  <span className="text-[10px] text-gray-300 whitespace-nowrap">{v.charCount} chars</span>
                </div>

                {/* Content */}
                <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap mb-4">{v.content}</p>

                {/* Decision buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDecision(v.id, 'APPROVED')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium border transition-all ${
                      isApproved
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-600'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleDecision(v.id, 'REJECTED')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium border transition-all ${
                      isRejected
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Rechazar
                  </button>
                </div>
              </div>

              {/* Textarea cuando rechaza */}
              {isRejected && (
                <div className="border-t border-red-100 px-5 py-3 bg-red-50 rounded-b-xl">
                  <label className="block text-[11px] font-medium text-red-600 mb-1">¿Por qué la rechazas? (opcional)</label>
                  <textarea
                    value={comments[v.id] ?? ''}
                    onChange={e => setComments(prev => ({ ...prev, [v.id]: e.target.value }))}
                    rows={2}
                    placeholder="Ej: El tono no corresponde, cambiar el CTA..."
                    className="w-full px-3 py-2 border border-red-200 rounded-md text-[12px] bg-white focus:outline-none focus:border-red-400 resize-none"
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Footer de envío */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Tu nombre (opcional)</label>
            <input
              type="text"
              value={reviewerName}
              onChange={e => setReviewerName(e.target.value)}
              placeholder="Ej: María López"
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-[12px] focus:outline-none focus:border-gray-400"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!allDecided || isSubmitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-md text-[13px] font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                Enviar revisión
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
