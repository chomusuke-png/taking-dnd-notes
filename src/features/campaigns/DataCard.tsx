import { useEffect, useState } from 'react';
import { useUi } from '../../store/ui';

type Persist = 'unsupported' | 'persisted' | 'best-effort';

const formatBytes = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

/** Estado del almacenamiento local y respaldo de todas las campañas. */
export function DataCard({ onExportAll }: { onExportAll: () => void }) {
  const [persist, setPersist] = useState<Persist>('unsupported');
  const [usage, setUsage] = useState<number | null>(null);
  const toast = useUi((s) => s.toast);

  useEffect(() => {
    const storage = navigator.storage;
    if (!storage?.persisted) return;
    void storage.persisted().then((p) => setPersist(p ? 'persisted' : 'best-effort'));
    void storage.estimate?.().then((e) => setUsage(e.usage ?? null));
  }, []);

  async function requestPersist() {
    const ok = await navigator.storage.persist();
    setPersist(ok ? 'persisted' : 'best-effort');
    toast(
      ok
        ? 'Listo: el navegador no borrará los datos de Taking D&D Notes para liberar espacio.'
        : 'El navegador no concedió el almacenamiento persistente. Instalar la app suele ayudar; mientras, exporta respaldos.',
      ok ? 'info' : 'error',
    );
  }

  return (
    <section className="data-card card">
      <div>
        <h3>Tus datos</h3>
        <p className="muted small">
          Todo se guarda solo en este navegador. Si borras los datos del sitio o cambias de dispositivo, necesitarás un
          respaldo.{usage !== null && ` Espacio usado (incluida la app sin conexión): ${formatBytes(usage)}.`}
        </p>
        {persist === 'persisted' && <p className="small ok-text">🔒 Almacenamiento protegido: el navegador no lo borrará automáticamente.</p>}
        {persist === 'best-effort' && (
          <p className="small warning">
            ⚠️ El navegador podría borrar los datos si le falta espacio.{' '}
            <button type="button" className="btn btn-sm" onClick={() => void requestPersist()}>
              Proteger datos
            </button>
          </p>
        )}
      </div>
      <button type="button" className="btn" onClick={onExportAll}>
        ⬇️ Respaldar todo
      </button>
    </section>
  );
}
