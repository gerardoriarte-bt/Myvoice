import React from 'react';
import { AlertTriangle, RefreshCw, Ban } from 'lucide-react';
import { PlatformIcon } from './ui/platformIcons';

export interface CanalFallido {
  message: string;
  terminal: boolean;
}

interface Props {
  canales: Record<string, CanalFallido>;
  onReintentar: (platform: string) => Promise<void>;
  disabled?: boolean;
}

/**
 * Panel de canales que no produjeron copy. Vive FUERA del guard de isLoading:
 * GenerationProgress se desmonta al terminar la generación y ResultsTable solo
 * agrupa las plataformas presentes en `variations`, así que sin este panel un
 * canal fallido desaparece de la pantalla con la cuota ya gastada.
 */
const FailedChannelsPanel: React.FC<Props> = ({ canales, onReintentar, disabled = false }) => {
  const [enCurso, setEnCurso] = React.useState<Set<string>>(new Set());
  const [reintentandoTodos, setReintentandoTodos] = React.useState(false);

  const plataformas = Object.keys(canales);
  if (plataformas.length === 0) return null;

  const reintentables = plataformas.filter(p => !canales[p].terminal);

  const reintentar = async (platform: string) => {
    setEnCurso(prev => new Set(prev).add(platform));
    try {
      await onReintentar(platform);
    } finally {
      setEnCurso(prev => {
        const siguiente = new Set(prev);
        siguiente.delete(platform);
        return siguiente;
      });
    }
  };

  // En serie, nunca con Promise.all: estos canales fallaron mayoritariamente
  // por rate limit y dispararlos en paralelo reproduce lo que los tumbó.
  const reintentarTodos = async () => {
    setReintentandoTodos(true);
    try {
      for (const platform of reintentables) {
        await reintentar(platform);
      }
    } finally {
      setReintentandoTodos(false);
    }
  };

  const bloqueado = disabled || reintentandoTodos;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <h3 className="text-[14px] font-medium text-gray-900">
          {plataformas.length === 1 ? '1 canal no se generó' : `${plataformas.length} canales no se generaron`}
        </h3>
        {reintentables.length > 0 && (
          <button
            onClick={reintentarTodos}
            disabled={bloqueado}
            className="ml-auto text-[11px] font-medium text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3 h-3 ${reintentandoTodos ? 'animate-spin' : ''}`} />
            Reintentar todos
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {plataformas.map(platform => {
          const canal = canales[platform];
          const ocupado = enCurso.has(platform);
          return (
            <div
              key={platform}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/60"
            >
              <PlatformIcon platform={platform} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-gray-900 truncate">{platform}</div>
                <div className="text-[11px] text-gray-500 truncate" title={canal.message}>
                  {canal.terminal
                    ? 'Sin créditos en la cuenta de IA o API key inválida — reintentar no ayuda'
                    : canal.message}
                </div>
              </div>
              {canal.terminal ? (
                <span
                  title="El error no se resuelve reintentando: revisá los créditos o la API key en Ajustes."
                  className="flex items-center gap-1.5 text-[11px] text-gray-400 border border-gray-200 rounded-lg px-2.5 py-1.5 cursor-not-allowed"
                >
                  <Ban className="w-3 h-3" />
                  Reintentar
                </span>
              ) : (
                <button
                  onClick={() => reintentar(platform)}
                  disabled={ocupado || bloqueado}
                  title={`Reintentar ${platform}`}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-gray-700 border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3 h-3 ${ocupado ? 'animate-spin' : ''}`} />
                  Reintentar
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-400 pt-3 border-t border-gray-100">
        Reintentar un canal genera solo ese canal sobre la misma espina de campaña; no vuelve a
        correr el director ni los canales que sí salieron.
      </p>
    </div>
  );
};

export default FailedChannelsPanel;
