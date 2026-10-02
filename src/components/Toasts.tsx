import { useUi } from '../store/ui';

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={t.kind === 'error' ? 'toast toast-error' : 'toast'}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
