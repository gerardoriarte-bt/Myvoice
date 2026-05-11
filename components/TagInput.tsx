import React from 'react';

type Variant = 'neutral' | 'danger';

interface TagInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  variant?: Variant;
  ariaLabel?: string;
}

const splitTags = (raw: string): string[] =>
  raw
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  placeholder = 'Escribe y presiona Enter o ","',
  variant = 'neutral',
  ariaLabel,
}) => {
  const [draft, setDraft] = React.useState('');
  const tags = React.useMemo(() => splitTags(value || ''), [value]);

  const commit = (raw: string) => {
    const cleaned = raw.trim().replace(/,+$/, '').trim();
    if (!cleaned) return;
    if (tags.includes(cleaned)) {
      setDraft('');
      return;
    }
    onChange([...tags, cleaned].join(', '));
    setDraft('');
  };

  const removeAt = (idx: number) => {
    const next = tags.filter((_, i) => i !== idx);
    onChange(next.join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      removeAt(tags.length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted.includes(',')) {
      e.preventDefault();
      const next = Array.from(new Set([...tags, ...splitTags(pasted)]));
      onChange(next.join(', '));
      setDraft('');
    }
  };

  const chipStyle =
    variant === 'danger'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-gray-100 text-gray-700 border-gray-200';

  const chipRemoveStyle =
    variant === 'danger'
      ? 'text-red-400 hover:text-red-700'
      : 'text-gray-400 hover:text-gray-700';

  const containerFocusStyle =
    variant === 'danger'
      ? 'focus-within:border-red-300'
      : 'focus-within:border-gray-400';

  return (
    <div
      className={`w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg flex flex-wrap items-center gap-1.5 transition-colors ${containerFocusStyle}`}
      onClick={(e) => {
        const input = (e.currentTarget.querySelector('input') as HTMLInputElement | null);
        input?.focus();
      }}
    >
      {tags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${chipStyle}`}
        >
          {tag}
          <button
            type="button"
            aria-label={`Quitar ${tag}`}
            onClick={(e) => { e.stopPropagation(); removeAt(i); }}
            className={`leading-none ${chipRemoveStyle}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <input
        aria-label={ariaLabel}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-[12px] text-gray-900 placeholder:text-gray-400 px-1 py-1"
        placeholder={tags.length === 0 ? placeholder : ''}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => draft && commit(draft)}
      />
    </div>
  );
};

export default TagInput;
