import React from 'react';

interface Props {
  label: string;
  value: React.ReactNode;
  hint?: string;
  trend?: 'up' | 'down' | 'flat';
  icon?: React.ReactNode;
}

const StatBlock: React.FC<Props> = ({ label, value, hint, icon }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
    {icon && (
      <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 shrink-0">
        {icon}
      </div>
    )}
    <div className="min-w-0 flex-1">
      <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-[18px] font-medium text-gray-900 leading-tight mt-1 truncate">{value}</div>
      {hint && <div className="text-[11px] text-gray-500 mt-0.5">{hint}</div>}
    </div>
  </div>
);

export default StatBlock;
