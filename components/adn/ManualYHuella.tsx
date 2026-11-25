import React from 'react';
import VoiceFingerprintCard from '../VoiceFingerprintCard';
import { clientApi } from '../../services/api';
import type { Client } from '../../types';

/**
 * El manual de marca en PDF y el Voice Fingerprint (2026-11-24, «un solo ADN»): salieron de la columna del detalle de la
 * marca para vivir con el resto del ADN. Desde el 2026-11-25 lo que la IA saca del PDF queda como propuesta en cada
 * sección, para aprobar; el fingerprint mide cómo suena lo aprobado.
 */
export default function ManualYHuella({
  client,
  onActualizado,
  enFila = false,
}: {
  client: Client;
  onActualizado: (u: Partial<Client>) => void;
  /** Lado a lado (la pantalla ADN) o uno sobre otro (la columna del detalle de la marca). */
  enFila?: boolean;
}) {
  const [uploadingGuideline, setUploadingGuideline] = React.useState(false);
  const [deletingGuideline, setDeletingGuideline] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [extractedSummary, setExtractedSummary] = React.useState<string | null>(null);
  const [computingFingerprint, setComputingFingerprint] = React.useState(false);
  const [fingerprintError, setFingerprintError] = React.useState<string | null>(null);

  const handleComputeFingerprint = async (clientId: string) => {
    setFingerprintError(null);
    setComputingFingerprint(true);
    try {
      const result = await clientApi.computeFingerprint(clientId);
      onActualizado({
        brandFingerprint: result.client.brandFingerprint,
        brandFingerprintAt: result.client.brandFingerprintAt,
      } as Partial<Client>);
    } catch (err: any) {
      setFingerprintError(err?.message || 'Error calculando fingerprint');
    } finally {
      setComputingFingerprint(false);
    }
  };

  const handleDeleteGuideline = async (clientId: string) => {
    if (!window.confirm('¿Eliminar el manual de marca? Se perderá la extracción de IA guardada.')) return;
    setDeletingGuideline(true);
    setUploadError(null);
    setExtractedSummary(null);
    try {
      await clientApi.deleteBrandGuideline(clientId);
      onActualizado({
        brandGuidelinePdfUrl: null,
        brandGuidelineFileName: null,
        brandGuidelineExtractedAt: null,
      } as Partial<Client>);
    } catch (err: any) {
      setUploadError(err?.message || 'Error al eliminar el manual');
    } finally {
      setDeletingGuideline(false);
    }
  };

  const handleUploadGuideline = async (clientId: string, file: File) => {
    setUploadError(null);
    setExtractedSummary(null);

    const MAX_MB = 15;
    const IDEAL_MB = 5;
    if (file.type !== 'application/pdf') {
      setUploadError(`Formato no válido: "${file.name}" no es un PDF. Solo se aceptan archivos .pdf.`);
      return;
    }
    const fileMb = file.size / 1024 / 1024;
    if (fileMb > MAX_MB) {
      setUploadError(`El archivo pesa ${fileMb.toFixed(1)} MB y supera el límite de ${MAX_MB} MB. Comprime el PDF antes de subirlo.`);
      return;
    }
    if (fileMb > IDEAL_MB) {
      // Warn but allow — just clear previous error
      setUploadError(null);
    }

    setUploadingGuideline(true);
    try {
      const result = await clientApi.uploadBrandGuideline(clientId, file);
      // Sync local state through the existing onUpdate prop (server already persisted).
      const c = result.client as Partial<Client>;
      onActualizado({
        voice: c.voice,
        valueProposition: c.valueProposition,
        brandVoiceGuidelines: c.brandVoiceGuidelines,
        brandKeywords: c.brandKeywords,
        brandProhibitions: c.brandProhibitions,
        brandGuidelinePdfUrl: c.brandGuidelinePdfUrl,
        brandGuidelineFileName: c.brandGuidelineFileName,
        brandGuidelineExtractedAt: c.brandGuidelineExtractedAt,
      } as Partial<Client>);
      // Desde el 2026-11-25 el PDF no escribe el ADN: deja propuestas para aprobar en cada sección.
      const n = (result.propuestas?.secciones?.length ?? 0) + (result.propuestas?.audiencias ?? 0);
      setExtractedSummary(
        `${result.extracted?.summary ? `${result.extracted.summary}\n\n` : ''}${
          n ? `La IA dejó ${n} ${n === 1 ? 'propuesta' : 'propuestas'} en el ADN: revísalas arriba y apruébalas, corrígelas o descártalas.` : 'El manual no trajo nada nuevo para el ADN.'
        }`
      );
    } catch (err: any) {
      setUploadError(err?.message || 'Error procesando el PDF');
    } finally {
      setUploadingGuideline(false);
    }
  };


  return (
    <div className={enFila ? 'grid items-start gap-4 lg:grid-cols-2' : 'space-y-4'}>
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-3">
         <div>
            <h4 className="text-[13px] font-medium text-gray-900">Manual de Marca</h4>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Solo PDF · Ideal: menos de 5 MB · Máximo: 15 MB
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              La IA lee el manual y propone cada sección del ADN; nada entra hasta que alguien lo aprueba.
            </p>
         </div>

         {client.brandGuidelineFileName ? (
            <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
               <svg className="w-4 h-4 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM9.5 17l-1.5-1.5L10.5 13 8 10.5 9.5 9l2.5 2.5L14.5 9l1.5 1.5L13.5 13l2.5 2.5-1.5 1.5L12 14.5 9.5 17z" opacity=".3"/><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM13 3.5L18.5 9H13V3.5zM15 17h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
               <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-gray-700 truncate">{client.brandGuidelineFileName}</p>
                  {client.brandGuidelineExtractedAt && (
                    <p className="text-[10px] text-gray-400">
                      Extraído {new Date(client.brandGuidelineExtractedAt as any).toLocaleString()}
                    </p>
                  )}
               </div>
               {client.brandGuidelinePdfUrl && (
                 <a
                   href={client.brandGuidelinePdfUrl}
                   target="_blank"
                   rel="noreferrer"
                   title="Ver PDF"
                   className="p-1 text-blue-500 hover:text-blue-700 shrink-0"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                 </a>
               )}
               <button
                 onClick={() => handleDeleteGuideline(client.id)}
                 disabled={deletingGuideline || uploadingGuideline}
                 title="Eliminar manual"
                 className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0 disabled:opacity-40"
               >
                 {deletingGuideline
                   ? <span className="w-4 h-4 border-2 border-gray-300 border-t-red-400 rounded-full animate-spin block" />
                   : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 }
               </button>
            </div>
         ) : (
            <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-[11px] text-gray-400">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              Sin manual cargado
            </div>
         )}

         <label className={`block w-full py-2 rounded-lg font-medium text-[12px] text-center cursor-pointer transition-colors border ${
           uploadingGuideline
             ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
             : 'bg-ink text-white border-gray-900 hover:bg-ink-hover'
         }`}>
            {uploadingGuideline ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Procesando…
              </span>
            ) : (
              client.brandGuidelinePdfUrl ? 'Reemplazar PDF' : 'Subir PDF y procesar'
            )}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={uploadingGuideline || deletingGuideline}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleUploadGuideline(client.id, file);
                e.target.value = '';
              }}
            />
         </label>

         {uploadError && (
           <div className="flex items-start gap-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
             <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
             <span>{uploadError}</span>
           </div>
         )}
         {extractedSummary && !uploadError && (
           <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 leading-relaxed">
             <span className="font-medium block mb-1">Síntesis IA</span>
             <span className="whitespace-pre-line">{extractedSummary}</span>
           </div>
         )}
      </div>

      <VoiceFingerprintCard
        fingerprint={client.brandFingerprint}
        computedAt={client.brandFingerprintAt}
        computing={computingFingerprint}
        error={fingerprintError}
        onCompute={() => handleComputeFingerprint(client.id)}
      />
    </div>
  );
}
