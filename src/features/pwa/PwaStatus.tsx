import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useUi } from '../../store/ui';
import './pwa.css';

/**
 * Registra el service worker. Avisa cuando la app queda lista sin conexión y, si hay una
 * versión nueva, la ofrece sin recargar a la fuerza (podría estar en medio de una sesión).
 */
export function PwaStatus() {
  const toast = useUi((s) => s.toast);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Busca actualizaciones cada hora mientras la app está abierta.
      if (registration) setInterval(() => void registration.update(), 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    toast('Taking D&D Notes está listo para usarse sin conexión.');
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady, toast]);

  if (!needRefresh) return null;
  return (
    <div className="update-banner" role="alert">
      <span>Hay una versión nueva de Taking D&D Notes.</span>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => void updateServiceWorker(true)}>
        Actualizar
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNeedRefresh(false)}>
        Más tarde
      </button>
    </div>
  );
}
