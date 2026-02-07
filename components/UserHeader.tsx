
import React from 'react';
import { User, Role } from '../types';

interface UserHeaderProps {
  currentUser: User;
  onLogout: () => void;
}

const UserHeader: React.FC<UserHeaderProps> = ({ currentUser, onLogout }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="glass-header text-slate-900 px-8 py-4 flex justify-between items-center sticky top-0 z-[100] border-b border-slate-100">
      <div className="flex items-center gap-4">
        <div className="bg-slate-900 p-2.5 rounded-xl shadow-lg shadow-slate-900/10">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 block leading-none mb-1">GRUPO LOBUENO</span>
          <span className="text-xs font-black uppercase tracking-[0.1em] text-slate-900">MY VOICE <span className="text-slate-400">STRATEGIC</span></span>
        </div>
      </div>

      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-4 bg-white hover:bg-slate-50 transition-all px-5 py-2.5 rounded-2xl border border-slate-200 group shadow-sm"
        >
          <div className="text-right hidden md:block">
            <p className="text-[11px] font-black uppercase leading-none mb-1 text-slate-900">{currentUser.name}</p>
            <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${currentUser.role === Role.ADMIN ? 'text-slate-400' : 'text-slate-300'}`}>
              {currentUser.role}
            </p>
          </div>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${currentUser.role === Role.ADMIN ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
            {currentUser.name[0]}
          </div>
          <svg className={`w-3 h-3 text-slate-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-4 w-56 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-2">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-red-50 text-red-600 rounded-2xl transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserHeader;
