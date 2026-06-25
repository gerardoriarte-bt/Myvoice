import React from "react";
import { CopyVariation } from "../types";

interface SpineData {
  concept?: string;
  keyMessage?: string;
  tone?: string;
  heroCTA?: string;
}

interface Props {
  title: string;
  clientName?: string;
  spine?: SpineData | null;
  variations: CopyVariation[];
  onClose: () => void;
}

const PrintPreview: React.FC<Props> = ({
  title,
  clientName,
  spine,
  variations,
  onClose,
}) => {
  const today = new Date().toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Group variations by platform
  const grouped: Record<string, CopyVariation[]> = variations.reduce(
    (acc: Record<string, CopyVariation[]>, v: CopyVariation) => {
      const key = v.platform as string;
      if (!acc[key]) acc[key] = [];
      acc[key].push(v);
      return acc;
    },
    {} as Record<string, CopyVariation[]>
  );

  const hasSpine =
    spine &&
    (spine.concept || spine.keyMessage || spine.tone || spine.heroCTA);

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-modal { display: block !important; position: static !important; background: white !important; }
          .no-print { display: none !important; }
          .print-page { page-break-after: always; }
          .print-page:last-child { page-break-after: avoid; }
        }
      `}</style>

      {/* Overlay */}
      <div className="print-modal fixed inset-0 z-50 bg-black/50 overflow-y-auto flex items-start justify-center p-10">
        <div className="max-w-3xl w-full bg-white rounded-xl p-16 shadow-2xl">

          {/* Action bar — hidden when printing */}
          <div className="no-print flex items-center justify-between mb-10">
            <p className="text-[13px] font-semibold text-gray-700 tracking-wide">
              My Voice — Vista previa
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-[12px] font-medium hover:bg-gray-700 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Imprimir / Guardar como PDF
              </button>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-[12px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>

          {/* Document content */}
          <div>
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-200 pb-6 mb-8">
              <div className="flex items-center gap-3">
                {/* Simple My Voice SVG logo */}
                <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    My Voice
                  </p>
                  <h1 className="text-[20px] font-bold text-gray-900 leading-tight">
                    {title}
                  </h1>
                  {clientName && (
                    <p className="text-[12px] text-gray-500 mt-0.5">{clientName}</p>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-1 shrink-0">{today}</p>
            </div>

            {/* Spine box */}
            {hasSpine && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400 mb-3">
                  Espina de campaña
                </p>
                <div className="space-y-2">
                  {spine!.concept && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Concepto
                      </span>
                      <p className="text-[13px] font-semibold text-gray-800 mt-0.5">
                        {spine!.concept}
                      </p>
                    </div>
                  )}
                  {spine!.keyMessage && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Mensaje clave
                      </span>
                      <p className="text-[12px] text-gray-700 mt-0.5">
                        {spine!.keyMessage}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-6 pt-1">
                    {spine!.tone && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          Tono
                        </span>
                        <p className="text-[12px] text-gray-700 mt-0.5">
                          {spine!.tone}
                        </p>
                      </div>
                    )}
                    {spine!.heroCTA && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          Hero CTA
                        </span>
                        <p className="text-[12px] text-gray-700 mt-0.5">
                          {spine!.heroCTA}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Variations grouped by platform */}
            {Object.entries(grouped).map(([platform, items], groupIdx) => (
              <div
                key={platform}
                className={`print-page mb-8 ${
                  groupIdx < Object.keys(grouped).length - 1 ? "pb-4" : ""
                }`}
              >
                {/* Platform heading */}
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-[14px] font-bold text-gray-900 uppercase tracking-wide">
                    {platform}
                  </h2>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[10px] text-gray-400">
                    {items.length}{" "}
                    {items.length === 1 ? "variación" : "variaciones"}
                  </span>
                </div>

                {/* Variation cards */}
                <div className="space-y-3">
                  {items.map((v) => (
                    <div
                      key={v.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {v.type}
                          </span>
                          {v.slot && (
                            <span className="text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                              {v.slot}
                            </span>
                          )}
                          {v.variationIndex !== undefined && (
                            <span className="text-[10px] text-gray-400">
                              #{v.variationIndex + 1}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {v.charCount} car.
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {v.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Footer */}
            <div className="border-t border-gray-100 pt-5 mt-4 flex items-center justify-between">
              <p className="text-[10px] text-gray-400">
                Generado con My Voice · myvoice.lobueno.co
              </p>
              <p className="text-[10px] text-gray-300">{today}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrintPreview;
