import React from 'react';
import { ExternalLink, X } from 'lucide-react';

/**
 * La previa en grande.
 *
 * Aprobar una pieza mirando una miniatura de 88 px es aprobar a ciegas. Acá se
 * ve al tamaño que da la pantalla, sin salir de la herramienta —que es todo el
 * punto de la previa— y con el enlace a mano para abrir el original cuando hace
 * falta el archivo de verdad.
 *
 * El fondo es un damero claro y no un velo negro: sobre negro, una pieza con
 * fondo transparente o muy claro se lee mal, y estas piezas suelen tener los dos.
 */

interface Props {
  url: string;
  titulo: string;
  formato: string;
  enlace: string | null;
  onCerrar: () => void;
}

const DAMERO =
  'repeating-conic-gradient(#F0F1F3 0% 25%, #FFFFFF 0% 50%) 50% / 20px 20px';

export default function PreviaGrande({ url, titulo, formato, enlace, onCerrar }: Props) {
  // Escape cierra: es lo que espera cualquiera que abrió una imagen en grande.
  React.useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-ink/80 p-6"
      onClick={onCerrar}
    >
      <div
        className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-apple-border px-5 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold text-apple-text">{titulo}</h3>
            <p className="text-[11px] text-apple-secondary">{formato}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {enlace && (
              <a
                href={enlace}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[11px] font-medium text-apple-blue hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir el original
              </a>
            )}
            <button onClick={onCerrar} className="rounded-lg p-1 text-apple-secondary hover:bg-apple-fill">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center p-4" style={{ background: DAMERO }}>
          <img src={url} alt={`Previa de ${titulo}`} className="max-h-[70vh] max-w-full object-contain" />
        </div>

        <footer className="border-t border-apple-border px-5 py-2.5">
          <p className="text-[10px] text-apple-tertiary">
            Es la previa del enlace entregado, no el archivo final. La imagen que sirve de evidencia de qué se
            aprobó llega cuando la pieza se sube a la herramienta.
          </p>
        </footer>
      </div>
    </div>
  );
}
