import React, { useState } from 'react';

const WorkflowHelpSidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* TRIGGER BUTTON (Question Mark FAB) */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`fixed right-8 bottom-8 z-50 w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl shadow-2xl transition-all hover:scale-110 active:scale-95 ${isOpen ? 'bg-slate-900 text-white rotate-45' : 'bg-white text-slate-900 border-2 border-slate-900 group'}`}
        // Remove individual title attribute to use a custom tooltip if needed, or rely on browser
        title={isOpen ? "Cerrar Ayuda" : "Ver Guía de Uso"}
      >
        <span className="group-hover:animate-pulse">?</span>
      </button>

      {/* OVERLAY BACKDROP */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 animate-in fade-in duration-300"
        />
      )}

      {/* SIDEBAR PANEL */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white border-l border-slate-200 shadow-2xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-8 space-y-10">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Guía de Flujo</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Paso a paso para crear contenido</p>
          </div>

          <div className="space-y-8 relative">
             {/* Vertical Line */}
             <div className="absolute top-4 bottom-4 left-[19px] w-0.5 bg-slate-100 -z-10"></div>

             {/* Step 1 */}
             <div className="flex gap-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center font-black border border-slate-200 shrink-0 text-sm shadow-sm">1</div>
                <div>
                   <p className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-1">Registrar Marca</p>
                   <p className="text-[10px] text-slate-500 leading-relaxed">
                     Registra tu cliente o marca en el sistema. Sube su logo y define su sector.
                   </p>
                </div>
             </div>

             {/* Step 2 */}
             <div className="flex gap-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black border border-slate-900 shrink-0 text-sm shadow-lg">2</div>
                <div>
                   <p className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-1">Configurar ADN</p>
                   <p className="text-[10px] text-slate-500 leading-relaxed">
                     Define la <strong>Voz</strong>, <strong>Propuesta de Valor</strong> y <strong>Guidelines</strong> globales. Esto asegura consistencia en todas las campañas.
                   </p>
                   <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 mt-2">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Tip: Se configura una sola vez por marca.</p>
                   </div>
                </div>
             </div>

             {/* Step 3 */}
             <div className="flex gap-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center font-black border border-slate-200 shrink-0 text-sm shadow-sm">3</div>
                <div>
                   <p className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-1">Crear Campaña</p>
                   <p className="text-[10px] text-slate-500 leading-relaxed">
                     Define los detalles específicos: <strong>Producto</strong>, <strong>Objetivo</strong> y <strong>Tema</strong> de la campaña actual.
                   </p>
                </div>
             </div>

             {/* Step 4 */}
             <div className="flex gap-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black border border-indigo-100 shrink-0 text-sm shadow-sm">4</div>
                <div>
                   <p className="text-[11px] font-black uppercase tracking-widest text-indigo-600 mb-1">Generar Contenido</p>
                   <p className="text-[10px] text-slate-500 leading-relaxed">
                     Usa el motor de IA para generar copys que combinan el ADN de la marca con los objetivos de la campaña.
                   </p>
                </div>
             </div>
          </div>

          <div className="bg-slate-100 p-6 rounded-[2rem]">
             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide text-center">
               ¿Dudas adicionales? Contacta a soporte técnico.
             </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default WorkflowHelpSidebar;
