import React, { useState, useEffect } from 'react';
import { ReviewSession } from '../types';
import { reviewApi } from '../services/api';
import RevisionDePiezas from './RevisionDePiezas';
import RevisionDeCopy from './RevisionDeCopy';
import RevisionDeSabana from '../src/cdm/RevisionDeSabana';

interface ReviewPortalProps {
  token: string;
  onBack: () => void;
}

type Phase = 'loading' | 'reviewing' | 'submitted' | 'expired' | 'error';


export default function ReviewPortal({ token, onBack }: ReviewPortalProps) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<ReviewSession | null>(null);

  useEffect(() => {
    reviewApi.getByToken(token).then((data: ReviewSession & { error?: string }) => {
      if (data?.error) {
        setPhase(data.error.includes('expirad') || data.error.includes('no encontrada') ? 'expired' : 'error');
        return;
      }
      setSession(data);
      if (data.status === 'COMPLETED') {
        setPhase('submitted');
      } else {
        setPhase('reviewing');
      }
    }).catch(() => setPhase('error'));
  }, [token]);

  /**
   * La ronda 2 tiene su propia pantalla (H2.E). Se delega en vez de ramificar
   * acá adentro: la ronda de copy funciona y está en producción, y lo que se
   * muestra es tan distinto que compartir el armado dejaría un componente
   * lleno de condicionales.
   */
  // La ronda de la sábana (F3b) es de CDM: el portal es de la plataforma y compone las tres rondas.
  if (phase === 'reviewing' && session?.ronda === 'SABANA' && session.sabana) {
    return (
      <RevisionDeSabana token={token} sesion={session} onEnviada={() => setPhase('submitted')} onError={() => setPhase('error')} />
    );
  }

  if (phase === 'reviewing' && session?.ronda === 'PIEZA') {
    return (
      <RevisionDePiezas
        token={token}
        sesion={session}
        onEnviada={() => setPhase('submitted')}
        onError={() => setPhase('error')}
      />
    );
  }

  // La ronda de copy (2026-11-23): por pieza y por medio, con contexto e instrucciones.
  if (phase === 'reviewing' && session && (session.ronda ?? 'COPY') === 'COPY') {
    return <RevisionDeCopy token={token} sesion={session} onEnviada={() => setPhase('submitted')} onError={() => setPhase('error')} />;
  }

  /* ---------- Estados de pantalla ---------- */

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

  return null;
}
