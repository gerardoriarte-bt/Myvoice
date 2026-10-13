import React, { useState, useEffect } from 'react';
import { SCREENS, screenName } from '../screens';
import { Client, ReviewSession, ReviewItemFeedbackDetail, ReviewSessionItem } from '../types';
import { reviewApi } from '../services/api';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

/**
 * Las revisiones de la marca activa: lo que se le mandó al cliente y lo que
 * respondió.
 *
 * Ya no crea revisiones. Había dos caminos —esta pantalla y la barra de Copy—
 * con resultados distintos (uno entregaba el enlace y el otro no, uno dejaba
 * mezclar marcas y fallaba con un error genérico). Se crean desde Copy, donde
 * se ve en qué paso está cada copy y qué campaña se aprueba con el cliente.
 */
interface CollaborationHubProps {
  clients: Client[];
  /** La marca activa, la del encabezado. */
  clientId: string;
  addNotification: (message: string, type: NotificationType) => void;
  onSessionsLoaded?: (sessions: ReviewSession[]) => void;
  onIrACopy: () => void;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING:   { label: 'Pendiente',    className: 'bg-gray-100 text-gray-600 border-gray-200' },
  IN_REVIEW: { label: 'En revisión',  className: 'bg-blue-50 text-blue-700 border-blue-200' },
  COMPLETED: { label: 'Completado',   className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const PLATFORM_COLORS: Record<string, string> = {
  'Instagram Post': 'bg-pink-50 text-pink-700',
  'Instagram Historia': 'bg-purple-50 text-purple-700',
  'TikTok': 'bg-ink text-white',
  'Email': 'bg-blue-50 text-blue-700',
  'WhatsApp': 'bg-green-50 text-green-700',
};

/** La clave de un item: el copy en la ronda COPY, la pieza en la ronda PIEZA. */
const claveDeItem = (item: ReviewSessionItem): string => item.savedVariation?.id ?? item.pieza?.id ?? item.id;

/** Lo que se muestra de un item, sea copy o pieza. */
const vistaDeItem = (item: ReviewSessionItem) =>
  item.savedVariation
    ? { platform: item.savedVariation.platform, tipo: item.savedVariation.type, texto: item.savedVariation.content ?? '' }
    : { platform: item.pieza?.platform ?? 'Pieza', tipo: item.pieza?.formato ?? '', texto: item.pieza?.titulo ?? '' };

/**
 * En la ronda de copy todo comentario es sobre el mensaje y va solo. En la de
 * piezas el cliente comenta el mensaje y el arte por separado, y se rotulan.
 */
const textoDeFeedback = (fb: ReviewItemFeedbackDetail): string => {
  if (!fb.feedbackDiseno) return fb.feedbackCopy ? `«${fb.feedbackCopy}»` : '';
  return [fb.feedbackCopy && `Mensaje: «${fb.feedbackCopy}»`, `Arte: «${fb.feedbackDiseno}»`].filter(Boolean).join(' · ');
};

export default function CollaborationHub({ clients, clientId, addNotification, onSessionsLoaded, onIrACopy }: CollaborationHubProps) {
  const [todas, setSessions] = useState<ReviewSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, ReviewSession>>({});
  const [showRejections, setShowRejections] = useState<Record<string, boolean>>({});

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
      addNotification('No se pudieron cargar las revisiones', 'error');
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

  const handleCopyLink = async (token: string) => {
    const link = `${window.location.origin}/?review=${token}`;
    await navigator.clipboard.writeText(link);
    addNotification('Link copiado al portapapeles', 'success');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta revisión? El enlace deja de funcionar.')) return;
    try {
      await reviewApi.delete(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      addNotification('Revisión eliminada', 'info');
    } catch {
      addNotification('No se pudo eliminar la revisión', 'error');
    }
  };

  const marca = clients.find(c => c.id === clientId);
  const sessions = todas.filter(s => s.clientId === clientId);

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
          <h2 className="text-[20px] font-semibold text-[#1D1D1F] tracking-[-0.01em]">
            {SCREENS.collaboration.name}
            {marca && <span className="text-gray-400"> · {marca.name}</span>}
          </h2>
          <p className="text-[12px] text-gray-500 mt-0.5">{SCREENS.collaboration.description}</p>
        </div>
        <button
          onClick={onIrACopy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-white rounded-md text-[12px] font-medium hover:bg-gray-700 transition-colors"
        >
          Enviar copy desde {screenName('saved')}
        </button>
      </div>

      {/* Lista de sesiones */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Revisiones enviadas</span>
        </div>
        {isLoading ? (
          <p className="p-6 text-[12px] text-gray-400 text-center">Cargando...</p>
        ) : sessions.length === 0 ? (
          <p className="p-8 text-[12px] text-gray-400 text-center">
            {marca?.name ?? 'Esta marca'} no tiene revisiones. Se arman desde {screenName('saved')}: elegí el copy
            de una campaña que aprueba el cliente y usá «Enviar al cliente».
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {sessions.map(s => {
              const statusInfo = STATUS_LABELS[s.status] ?? STATUS_LABELS.PENDING;
              const expiresAt = new Date(s.expiresAt);
              const isExpired = expiresAt < new Date();
              const isExpanded = expandedId === s.id;
              const detail = detailCache[s.id];
              // Una sola clave por item: el copy en la ronda COPY, la pieza en la
              // ronda PIEZA. Leer solo savedVariation rompía con las de piezas.
              const feedbackMap = new Map<string, ReviewItemFeedbackDetail>(
                (detail?.submission?.feedbacks ?? []).map(f => [f.savedVariationId ?? f.piezaId ?? '', f])
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
                      {/*
                        La marca antes del título. Una lista de revisiones sin
                        marca obliga a abrir cada una para saber de quién es, y
                        es el dato que más se busca al mirar la lista.
                      */}
                      {s.marca && (
                        <span className="mr-2 inline-flex items-center rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold text-white align-middle">
                          {s.marca}
                        </span>
                      )}
                      <span className="text-[13px] font-medium text-gray-800">{s.title}</span>
                      {s.submission?.reviewerName && (
                        <span className="ml-2 text-[10px] text-gray-400">· {s.submission.reviewerName}</span>
                      )}
                    </div>

                    {/* Estado */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border shrink-0 ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>

                    {/* Resumen compacto aprobadas/rechazadas (solo COMPLETED con detalle cargado) */}
                    {s.status === 'COMPLETED' && s.submission && detail && (() => {
                      const feedbacks = detail.submission?.feedbacks ?? [];
                      const approvedCount = feedbacks.filter(f => f.decision === 'APPROVED').length;
                      const rejectedCount = feedbacks.filter(f => f.decision === 'REJECTED').length;
                      return (
                        <span className="inline-flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-semibold text-emerald-600">V {approvedCount}</span>
                          <span className="text-[10px] text-gray-300">·</span>
                          <span className="text-[11px] font-semibold text-red-500">X {rejectedCount}</span>
                        </span>
                      );
                    })()}

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
                        <p className="text-[12px] text-gray-400 text-center py-2">El cliente todavía no respondió.</p>
                      ) : (
                        <div className="space-y-2">
                          {/* Resumen de revision (solo COMPLETED) */}
                          {s.status === 'COMPLETED' && (() => {
                            const feedbacks = detail.submission?.feedbacks ?? [];
                            const approvedCount = feedbacks.filter(f => f.decision === 'APPROVED').length;
                            const rejectedCount = feedbacks.filter(f => f.decision === 'REJECTED').length;
                            const rejectedFeedbacks = feedbacks.filter(f => f.decision === 'REJECTED');
                            const isShowingRejections = showRejections[s.id] ?? false;
                            return (
                              <div className="mb-4 p-4 bg-white border border-gray-100 rounded-xl shadow-sm space-y-3">
                                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Resumen de revision</p>
                                {detail.submission?.reviewerName && (
                                  <p className="text-[12px] text-gray-600">
                                    Revisado por: <span className="font-semibold text-gray-800">{detail.submission.reviewerName}</span>
                                  </p>
                                )}
                                <div className="flex gap-3">
                                  <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 text-center">
                                    <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide mb-1">Aprobadas</p>
                                    <p className="text-[22px] font-bold text-emerald-700 leading-none">{approvedCount}</p>
                                  </div>
                                  <div className="flex-1 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-center">
                                    <p className="text-[10px] font-medium text-red-500 uppercase tracking-wide mb-1">Rechazadas</p>
                                    <p className="text-[22px] font-bold text-red-600 leading-none">{rejectedCount}</p>
                                  </div>
                                </div>
                                {rejectedCount > 0 && (
                                  <div>
                                    <button
                                      onClick={() => setShowRejections(prev => ({ ...prev, [s.id]: !isShowingRejections }))}
                                      className="flex items-center gap-1.5 text-[11px] font-medium text-red-500 hover:text-red-700 transition-colors"
                                    >
                                      <svg className={`w-3 h-3 transition-transform ${isShowingRejections ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                      </svg>
                                      Ver motivos de rechazo
                                    </button>
                                    {isShowingRejections && (
                                      <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-red-100">
                                        {rejectedFeedbacks.map(fb => {
                                          const clave = fb.savedVariationId ?? fb.piezaId ?? '';
                                          const matchedItem = (detail.items ?? []).find(it => claveDeItem(it) === clave);
                                          const platformLabel = matchedItem ? vistaDeItem(matchedItem).platform : clave;
                                          return (
                                            <div key={clave} className="flex items-start gap-2">
                                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${PLATFORM_COLORS[platformLabel] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {platformLabel}
                                              </span>
                                              <span className="text-[11px] text-gray-600 italic">
                                                {textoDeFeedback(fb) || 'Sin comentario'}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            Revisado por <span className="text-gray-700 normal-case font-semibold">{detail.submission.reviewerName || 'Anónimo'}</span>
                            {' '}· {new Date(detail.submission.submittedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          {(detail.items ?? []).map(item => {
                            const fb = feedbackMap.get(claveDeItem(item));
                            const vista = vistaDeItem(item);
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
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PLATFORM_COLORS[vista.platform] ?? 'bg-gray-100 text-gray-600'}`}>
                                      {vista.platform}
                                    </span>
                                    <span className="text-[10px] text-gray-400">{vista.tipo}</span>
                                  </div>
                                  <p className="text-[12px] text-gray-700 truncate">{vista.texto.slice(0, 100)}</p>
                                  {fb && textoDeFeedback(fb) && (
                                    <p className="text-[11px] text-red-600 mt-1 italic">{textoDeFeedback(fb)}</p>
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
