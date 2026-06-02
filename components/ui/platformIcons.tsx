import React from 'react';
import {
  Camera, Music2, PlayCircle, Radio, MonitorSmartphone, Image as ImageIcon,
  Film, Bell, Mail, MessageCircle, MousePointerClick, AppWindow,
  Hash, Type
} from 'lucide-react';

interface IconStyle {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  bg: string;
  fg: string;
  label: string;
}

const STYLES: Record<string, IconStyle> = {
  'Instagram Post':       { Icon: Camera,             bg: 'bg-fuchsia-50',  fg: 'text-fuchsia-600', label: 'IG Post' },
  'Instagram Historia':   { Icon: Camera,             bg: 'bg-fuchsia-50',  fg: 'text-fuchsia-700', label: 'Historia' },
  'Instagram Carrusel':   { Icon: ImageIcon,          bg: 'bg-fuchsia-50',  fg: 'text-fuchsia-600', label: 'Carrusel' },
  'Instagram Reel':       { Icon: Film,               bg: 'bg-fuchsia-50',  fg: 'text-fuchsia-700', label: 'Reel' },
  'TikTok':               { Icon: Music2,             bg: 'bg-gray-900',    fg: 'text-white',       label: 'TikTok' },
  'YouTube':              { Icon: PlayCircle,         bg: 'bg-red-50',      fg: 'text-red-600',     label: 'YouTube' },
  'Cuña de Radio':        { Icon: Radio,              bg: 'bg-amber-50',    fg: 'text-amber-700',   label: 'Radio' },
  'Google Ads':           { Icon: Type,               bg: 'bg-blue-50',     fg: 'text-blue-600',    label: 'Google Ads' },
  'Google Display':       { Icon: MonitorSmartphone,  bg: 'bg-blue-50',     fg: 'text-blue-700',    label: 'Display' },
  'Rich Media':           { Icon: AppWindow,          bg: 'bg-indigo-50',   fg: 'text-indigo-600',  label: 'Rich Media' },
  'Pop up':               { Icon: MousePointerClick,  bg: 'bg-purple-50',   fg: 'text-purple-600',  label: 'Pop up' },
  'Push Notification':    { Icon: Bell,               bg: 'bg-emerald-50',  fg: 'text-emerald-600', label: 'Push' },
  'Email':                { Icon: Mail,               bg: 'bg-sky-50',      fg: 'text-sky-600',     label: 'Email' },
  'WhatsApp':             { Icon: MessageCircle,      bg: 'bg-green-50',    fg: 'text-green-600',   label: 'WhatsApp' },
};

const FALLBACK: IconStyle = { Icon: Hash, bg: 'bg-gray-100', fg: 'text-gray-600', label: '' };

export const PlatformIcon: React.FC<{ platform: string; size?: 'sm' | 'md' | 'lg' }> = ({ platform, size = 'md' }) => {
  const style = STYLES[platform] || FALLBACK;
  const sizeClass = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
  return (
    <div className={`${sizeClass} rounded-lg ${style.bg} ${style.fg} flex items-center justify-center shrink-0`}>
      <style.Icon className={iconSize} strokeWidth={2} />
    </div>
  );
};

export const getPlatformLabel = (platform: string): string => STYLES[platform]?.label || platform;
