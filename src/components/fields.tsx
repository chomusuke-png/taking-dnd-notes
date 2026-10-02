import { useEffect, useState, type InputHTMLAttributes } from 'react';

// Campos que guardan al salir (blur) o con Enter. Mantienen un borrador local para que
// la escritura no salte mientras la base de datos responde de forma asíncrona.

type BaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>;

interface NumberFieldProps extends BaseProps {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
}

export function NumberField({ value, onCommit, min, max, className = 'input', ...rest }: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  function commit() {
    const n = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(n)) return setDraft(String(value));
    const clamped = Math.round(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n)));
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  }

  return (
    <input
      {...rest}
      className={className}
      type="text"
      inputMode="numeric"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(String(value));
      }}
    />
  );
}

interface TextFieldProps extends BaseProps {
  value: string;
  onCommit: (value: string) => void;
}

export function TextField({ value, onCommit, className = 'input', ...rest }: TextFieldProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <input
      {...rest}
      className={className}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onCommit(draft.trim())}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(value);
      }}
    />
  );
}

/** Lista separada por comas ("Común, Élfico") editada como texto. */
export function ListField({ value, onCommit, ...rest }: Omit<TextFieldProps, 'value' | 'onCommit'> & {
  value: string[];
  onCommit: (value: string[]) => void;
}) {
  return (
    <TextField
      {...rest}
      value={value.join(', ')}
      onCommit={(text) => onCommit(text.split(',').map((s) => s.trim()).filter(Boolean))}
    />
  );
}

/** Fila de casillas para contadores (espacios de conjuro, usos de rasgos, salvaciones de muerte). */
export function Pips({
  total,
  used,
  onChange,
  label,
  variant = 'default',
}: {
  total: number;
  used: number;
  onChange: (used: number) => void;
  label: string;
  variant?: 'default' | 'success' | 'fail';
}) {
  return (
    <span className={`pips pips-${variant}`} role="group" aria-label={label}>
      {Array.from({ length: total }, (_, i) => {
        const filled = i < used;
        return (
          <button
            key={i}
            type="button"
            className={filled ? 'pip pip-on' : 'pip'}
            aria-pressed={filled}
            aria-label={`${label} ${i + 1}`}
            // Clic en la última marcada la desmarca; en otra, marca hasta ahí.
            onClick={() => onChange(filled && i === used - 1 ? i : i + 1)}
          />
        );
      })}
    </span>
  );
}
