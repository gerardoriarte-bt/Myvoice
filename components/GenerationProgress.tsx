import React from 'react';
import { Check, Loader2, X, Sparkles, Layers, ScanSearch, GitMerge } from 'lucide-react';
import { PlatformIcon } from './ui/platformIcons';

export type StageStatus = 'pending' | 'active' | 'done' | 'error';

interface Stage {
  id: string;
  label: string;
  status: StageStatus;
  icon: React.ReactNode;
  meta?: string;
}

interface Props {
  selectedPlatforms: string[];
  spineDone: boolean;
  channelStatus: Record<string, StageStatus>;
  channelMeta?: Record<string, string>;
  coherenceStatus: StageStatus;
}

const StageRow: React.FC<{ stage: Stage }> = ({ stage }) => {
  const ringColor =
    stage.status === 'done'   ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
    stage.status === 'active' ? 'border-blue-300 bg-blue-50 text-blue-700' :
    stage.status === 'error'  ? 'border-red-300 bg-red-50 text-red-700' :
    'border-gray-200 bg-gray-50 text-gray-400';

  const indicator =
    stage.status === 'done'   ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> :
    stage.status === 'active' ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.5} /> :
    stage.status === 'error'  ? <X className="w-3.5 h-3.5" strokeWidth={3} /> :
    <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />;

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${ringColor}`}>
      <div className="shrink-0">{stage.icon}</div>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-[12px] font-medium truncate">{stage.label}</span>
        {stage.meta && <span className="text-[10px] opacity-70 truncate">{stage.meta}</span>}
      </div>
      <div className="w-5 h-5 rounded-full border border-current/30 flex items-center justify-center shrink-0">
        {indicator}
      </div>
    </div>
  );
};

const GenerationProgress: React.FC<Props> = ({
  selectedPlatforms,
  spineDone,
  channelStatus,
  channelMeta = {},
  coherenceStatus,
}) => {
  const directorStage: Stage = {
    id: 'director',
    label: 'Director estratégico',
    status: spineDone ? 'done' : 'active',
    icon: <Sparkles className="w-4 h-4" />,
    meta: spineDone ? 'Espina lista' : 'Derivando concepto + ángulos',
  };

  const channelStages: Stage[] = selectedPlatforms.map(p => ({
    id: p,
    label: p,
    status: channelStatus[p] || 'pending',
    icon: <PlatformIcon platform={p} size="sm" />,
    meta: channelMeta[p],
  }));

  const allChannelsDone = selectedPlatforms.every(p => channelStatus[p] === 'done' || channelStatus[p] === 'error');

  const coherenceStage: Stage = {
    id: 'coherence',
    label: 'Auditoría cross-channel',
    status: coherenceStatus,
    icon: <GitMerge className="w-4 h-4" />,
    meta: selectedPlatforms.length < 2 ? 'No aplica con 1 canal' : undefined,
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-gray-700" />
        <h3 className="text-[14px] font-medium text-gray-900">Generando campaña</h3>
        <div className="ml-auto text-[11px] text-gray-500">
          {selectedPlatforms.filter(p => channelStatus[p] === 'done').length}/{selectedPlatforms.length} canales
        </div>
      </div>

      <div className="space-y-3">
        <StageRow stage={directorStage} />

        {spineDone && (
          <div className="pl-3 border-l-2 border-gray-200 ml-2 space-y-1.5">
            {channelStages.map(s => (
              <StageRow key={s.id} stage={s} />
            ))}
          </div>
        )}

        {spineDone && allChannelsDone && selectedPlatforms.length >= 2 && (
          <StageRow stage={coherenceStage} />
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-gray-400 pt-3 border-t border-gray-100">
        <ScanSearch className="w-3 h-3" />
        <span>Cada canal pasa por: writer → validador → editor IA → autocorrección si rompe reglas.</span>
      </div>
    </div>
  );
};

export default GenerationProgress;
