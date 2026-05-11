import React from 'react';

interface Props {
  score: number;        // 1-10
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const ScoreCircle: React.FC<Props> = ({ score, size = 'md', label }) => {
  const safe = Math.max(0, Math.min(10, Math.round(score)));
  const dim = size === 'sm' ? 36 : size === 'lg' ? 64 : 48;
  const stroke = size === 'sm' ? 3 : size === 'lg' ? 5 : 4;
  const fontSize = size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-[16px]' : 'text-[13px]';
  const r = (dim - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (safe / 10) * c;

  const colorRing =
    safe >= 8 ? 'stroke-emerald-500' :
    safe >= 6 ? 'stroke-amber-500' :
    'stroke-red-500';

  const colorText =
    safe >= 8 ? 'text-emerald-700' :
    safe >= 6 ? 'text-amber-700' :
    'text-red-700';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={r} strokeWidth={stroke} className="stroke-gray-100 fill-transparent" />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          strokeWidth={stroke}
          className={`${colorRing} fill-transparent transition-all duration-500`}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center ${fontSize} font-medium ${colorText}`}>
        {safe}
        {label && <span className="text-gray-400 text-[9px] font-medium ml-0.5">{label}</span>}
      </div>
    </div>
  );
};

export default ScoreCircle;
