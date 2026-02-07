
import React from 'react';
import { BrandConfig } from '../types';

interface SettingsManagerProps {
  voices: BrandConfig[];
  goals: BrandConfig[];
  onUpdateVoices: (voices: BrandConfig[]) => void;
  onUpdateGoals: (goals: BrandConfig[]) => void;
  onResetDefaults: () => void;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ 
  voices, 
  goals, 
  onUpdateVoices, 
  onUpdateGoals,
  onResetDefaults
}) => {
  const [newVoice, setNewVoice] = React.useState('');
  const [newGoal, setNewGoal] = React.useState('');
  const [editingItem, setEditingItem] = React.useState<{ type: 'voice' | 'goal', id: string, value: string } | null>(null);

  const addItem = (type: 'voice' | 'goal') => {
    const value = type === 'voice' ? newVoice : newGoal;
    if (!value.trim()) return;

    const newItem = { id: Math.random().toString(36).substr(2, 9), name: value.trim() };
    if (type === 'voice') {
      onUpdateVoices([...voices, newItem]);
      setNewVoice('');
    } else {
      onUpdateGoals([...goals, newItem]);
      setNewGoal('');
    }
  };

  const removeItem = (type: 'voice' | 'goal', id: string) => {
    if (type === 'voice') {
      onUpdateVoices(voices.filter(v => v.id !== id));
    } else {
      onUpdateGoals(goals.filter(g => g.id !== id));
    }
  };

  const startEditing = (type: 'voice' | 'goal', item: BrandConfig) => {
    setEditingItem({ type, id: item.id, value: item.name });
  };

  const saveEdit = () => {
    if (!editingItem || !editingItem.value.trim()) return;
    if (editingItem.type === 'voice') {
      onUpdateVoices(voices.map(v => v.id === editingItem.id ? { ...v, name: editingItem.value } : v));
    } else {
      onUpdateGoals(goals.map(g => g.id === editingItem.id ? { ...g, name: editingItem.value } : g));
    }
    setEditingItem(null);
  };

  const renderSection = (title: string, items: BrandConfig[], type: 'voice' | 'goal', inputValue: string, setInput: (v: string) => void, icon: React.ReactNode) => (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 h-full flex flex-col overflow-hidden">
      {/* Card Header */}
      <div className="p-10 border-b border-slate-50 bg-slate-50/30">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-white border border-slate-100 text-slate-900 rounded-2xl shadow-sm">
            {icon}
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
            {title}
          </h3>
        </div>
        
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder={`Nueva ${title.toLowerCase()}...`}
            className="flex-1 px-5 py-4 border border-slate-200 rounded-2xl focus:border-slate-900 outline-none font-bold text-slate-800 transition-all bg-white placeholder-slate-300 text-sm"
            value={inputValue}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem(type)}
          />
          <button 
            onClick={() => addItem(type)}
            className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black hover:bg-black transition-all active:scale-95 flex items-center justify-center shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* List Area */}
      <div className="p-8 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar bg-white">
        <div className="space-y-3">
          {items.map(item => (
            <div 
              key={item.id} 
              className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 hover:border-slate-900 hover:shadow-md transition-all group"
            >
              {editingItem?.id === item.id ? (
                <div className="flex gap-2 w-full">
                  <input 
                    autoFocus
                    className="flex-1 px-4 py-2 border border-slate-900 rounded-xl outline-none font-bold text-slate-800"
                    value={editingItem.value}
                    onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  />
                  <div className="flex gap-1">
                      <button onClick={saveEdit} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">OK</button>
                      <button onClick={() => setEditingItem(null)} className="bg-slate-100 text-slate-400 px-3 py-2 rounded-xl text-[9px] font-black">✕</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-1.5 bg-slate-200 rounded-full group-hover:bg-slate-900 transition-colors"></div>
                    <span className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors text-sm uppercase tracking-tight">{item.name}</span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <button 
                      onClick={() => startEditing(type, item)}
                      className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => removeItem(type, item.id)}
                      className="p-2 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-center py-16 border border-dashed border-slate-100 rounded-[2rem] bg-slate-50/20">
              <p className="text-slate-300 font-black uppercase tracking-widest text-[9px]">Sin registros activos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Page Header */}
      <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="text-center md:text-left">
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2">
              Arquitectura de <span className="text-gradient">ADN</span>
            </h2>
            <p className="text-slate-400 font-bold max-w-md text-xs uppercase tracking-widest leading-relaxed">Personaliza la lógica estratégica que alimenta el motor de inteligencia artificial.</p>
        </div>

        <button 
            onClick={() => {
                if (window.confirm('¿Deseas restablecer los valores estratégicos predeterminados?')) {
                    onResetDefaults();
                }
            }}
            className="flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-900 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 group"
        >
            <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Restaurar Valores
        </button>
      </div>

      {/* Configuration Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {renderSection(
            "Voces Estratégicas", 
            voices, 
            'voice', 
            newVoice, 
            setNewVoice,
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
        )}
        {renderSection(
            "Objetivos de Negocio", 
            goals, 
            'goal', 
            newGoal, 
            setNewGoal,
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )}
      </div>

      {/* Info Tip */}
      <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row gap-8 items-center border border-white/10">
        <div className="p-4 bg-white/10 rounded-2xl shrink-0">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        </div>
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] mb-2">Impacto Directo</h4>
          <p className="text-slate-400 font-bold text-sm leading-relaxed tracking-tight max-w-2xl">
              Cualquier cambio estructural en estas categorías se verá reflejado instantáneamente en el motor de generación IA para todas las marcas del portfolio.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsManager;
