import { useState } from 'react';

/** Campo + botones para aplicar daño o curación rápidamente (encuentros, vista de grupo). */
export function QuickHp({ onDamage, onHeal, label }: { onDamage: (n: number) => void; onHeal: (n: number) => void; label: string }) {
  const [value, setValue] = useState('');
  const n = parseInt(value, 10);
  const valid = Number.isFinite(n) && n > 0;
  const apply = (fn: (n: number) => void) => {
    if (!valid) return;
    fn(n);
    setValue('');
  };
  return (
    <form
      className="quick-hp"
      onSubmit={(e) => {
        e.preventDefault();
        apply(onDamage);
      }}
    >
      <input
        className="input input-xs"
        inputMode="numeric"
        placeholder="±"
        aria-label={`Cantidad para ${label}`}
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ''))}
      />
      <button type="submit" className="btn btn-sm btn-danger" disabled={!valid} title="Daño (Enter)" aria-label={`Daño a ${label}`}>
        −
      </button>
      <button type="button" className="btn btn-sm btn-heal" disabled={!valid} onClick={() => apply(onHeal)} title="Curar" aria-label={`Curar a ${label}`}>
        +
      </button>
    </form>
  );
}
