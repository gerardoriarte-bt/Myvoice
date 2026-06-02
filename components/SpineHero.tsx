import React from 'react';
import { Quote, Target, Mic, MousePointerClick, Layers } from 'lucide-react';
import { CampaignSpine, Client } from '../types';

interface Props {
  spine: CampaignSpine;
  client?: Client;
}

const SpineHero: React.FC<Props> = ({ spine, client }) => {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl text-white overflow-hidden">
      <div className="px-7 py-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
              {client?.logo ? (
                <img src={client.logo} className="w-full h-full object-contain p-1" alt={client.name} />
              ) : (
                <span className="text-[12px] font-medium text-white/80">{client?.name.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/50">Espina de campaña</p>
              <p className="text-[13px] font-medium text-white truncate">{client?.name || 'Marca'}</p>
            </div>
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 px-2 py-1 rounded border border-white/10">
            Director · gpt-4o-mini
          </span>
        </div>

        <div className="relative pt-2">
          <Quote className="absolute -top-1 -left-1 w-6 h-6 text-white/15" strokeWidth={2} />
          <p className="text-[24px] md:text-[28px] leading-tight font-medium tracking-tight pl-7">
            {spine.concept}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
          <SpineSlot icon={<Target className="w-3.5 h-3.5" />} label="Mensaje clave" value={spine.keyMessage} />
          <SpineSlot icon={<Mic className="w-3.5 h-3.5" />} label="Tono" value={spine.tone} />
          <SpineSlot icon={<MousePointerClick className="w-3.5 h-3.5" />} label="Hero CTA" value={spine.heroCTA} />
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-sm px-7 py-5 border-t border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-3.5 h-3.5 text-white/50" />
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/50">3 ángulos narrativos</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {spine.angles.map((a, i) => (
            <div key={i} className="bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-xl p-4">
              <div className="text-[10px] font-medium uppercase tracking-wider text-white/50 mb-1">{i + 1}. {a.name}</div>
              <p className="text-[12px] text-white leading-relaxed mb-2">{a.premise}</p>
              <p className="text-[10px] text-white/60 italic">{a.register}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SpineSlot: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
    <div className="flex items-center gap-1.5 text-white/60 mb-1.5">
      {icon}
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-[12px] leading-relaxed text-white">{value}</p>
  </div>
);

export default SpineHero;
