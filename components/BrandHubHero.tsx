import React from 'react';
import { ArrowLeft, Briefcase, Layers, BookmarkCheck, Activity } from 'lucide-react';
import { Client, ContentDNAProfile, SavedVariation } from '../types';

interface Props {
  client: Client;
  profilesCount: number;
  approvedCount: number;
  generationCount: number;
  onBack: () => void;
}

const BrandHubHero: React.FC<Props> = ({ client, profilesCount, approvedCount, generationCount, onBack }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-7 py-6 flex flex-col md:flex-row md:items-center gap-5">
        <button
          onClick={onBack}
          className="absolute md:relative -mt-12 md:mt-0 inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Clientes</span>
        </button>

        <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 p-1.5 flex items-center justify-center overflow-hidden shrink-0">
          {client.logo
            ? <img src={client.logo} className="w-full h-full object-contain" alt={client.name} />
            : <span className="text-[18px] font-medium text-gray-400">{client.name.substring(0, 2).toUpperCase()}</span>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500">Brand Hub</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
              <Briefcase className="w-3 h-3" />
              {client.industry}
            </span>
          </div>
          <h2 className="text-[24px] font-medium text-gray-900 tracking-tight leading-tight truncate">
            {client.name}
          </h2>
          {client.valueProposition && (
            <p className="text-[12px] text-gray-500 mt-1 leading-relaxed line-clamp-2">{client.valueProposition}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-gray-100 bg-gray-50/40">
        <Stat icon={<Layers className="w-4 h-4" />} label="Campañas" value={profilesCount} />
        <Stat icon={<BookmarkCheck className="w-4 h-4" />} label="Aprobadas" value={approvedCount} />
        <Stat icon={<Activity className="w-4 h-4" />} label="Generaciones" value={generationCount} hint="histórico" />
      </div>
    </div>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string }> = ({ icon, label, value, hint }) => (
  <div className="px-5 py-4 border-r border-gray-100 last:border-r-0">
    <div className="flex items-center gap-2 text-gray-400">
      {icon}
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-[20px] font-medium text-gray-900 mt-1 leading-none">{value}</div>
    {hint && <div className="text-[10px] text-gray-500 mt-1">{hint}</div>}
  </div>
);

export default BrandHubHero;
