
import React from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationSystemProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ notifications, onDismiss }) => {
  return (
    <div className="fixed bottom-10 right-10 z-[1000] flex flex-col gap-4 pointer-events-none">
      {notifications.map((n) => (
        <div 
          key={n.id}
          className={`pointer-events-auto flex items-center gap-5 px-6 py-5 rounded-[1.75rem] shadow-2xl border animate-in slide-in-from-right-10 duration-500 min-w-[340px] max-w-md ${
            n.type === 'success' ? 'bg-slate-900 border-white/10 text-white' :
            'bg-white border-slate-100 text-slate-900'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            n.type === 'success' ? 'bg-white text-slate-900' :
            n.type === 'error' ? 'bg-red-50 text-red-500' :
            'bg-slate-50 text-slate-400'
          }`}>
            {n.type === 'success' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
            {n.type === 'error' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>}
            {(n.type === 'info' || n.type === 'warning') && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-tight mb-1">{n.type === 'error' ? 'ALERTA DE SISTEMA' : 'NOTIFICACIÓN'}</p>
            <p className="text-[11px] font-bold tracking-tight opacity-90">{n.message}</p>
          </div>
          <button onClick={() => onDismiss(n.id)} className="text-slate-300 hover:text-slate-900 transition-colors p-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
