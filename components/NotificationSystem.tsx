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

const icons = {
  success: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const colors = {
  success: { dot: 'bg-emerald-500', icon: 'text-emerald-600' },
  error:   { dot: 'bg-red-500',     icon: 'text-red-600'     },
  warning: { dot: 'bg-amber-500',   icon: 'text-amber-600'   },
  info:    { dot: 'bg-blue-500',    icon: 'text-[#0071E3]'   },
};

const NotificationSystem: React.FC<NotificationSystemProps> = ({ notifications, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[1000] flex flex-col gap-2.5 pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] border border-[rgba(0,0,0,0.07)] bg-white min-w-[280px] max-w-sm"
          style={{ animation: 'slideIn 0.2s ease' }}
        >
          <span className={`shrink-0 ${colors[n.type].icon}`}>{icons[n.type]}</span>
          <p className="flex-1 text-[13px] font-medium text-[#1D1D1F] leading-snug">{n.message}</p>
          <button
            onClick={() => onDismiss(n.id)}
            className="text-[#86868B] hover:text-[#1D1D1F] transition-colors shrink-0 p-1 rounded-md hover:bg-[rgba(0,0,0,0.05)]"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default NotificationSystem;
