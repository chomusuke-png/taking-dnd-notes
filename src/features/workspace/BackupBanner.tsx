import { useState } from 'react';
import { SNOOZE_MS, backupReminder } from '../../db/backupReminder';
import type { Campaign } from '../../db/types';
import { useBackupActions } from '../campaigns/useBackupActions';

const snoozeKey = (id: string) => `taking-dnd-notes-backup-snooze-${id}`;

function readSnooze(id: string): number {
  try {
    return Number(localStorage.getItem(snoozeKey(id))) || 0;
  } catch {
    return 0;
  }
}

/** Recordatorio de respaldo cuando hay cambios sin exportar hace más de una semana. */
export function BackupBanner({ campaign }: { campaign: Campaign }) {
  const [snoozedUntil, setSnoozedUntil] = useState(() => readSnooze(campaign.id));
  const { exportOne } = useBackupActions();
  const { due, days } = backupReminder(campaign, Date.now(), snoozedUntil);
  if (!due) return null;

  function snooze() {
    const until = Date.now() + SNOOZE_MS;
    try {
      localStorage.setItem(snoozeKey(campaign.id), String(until));
    } catch {
      // Sin almacenamiento local: se pospone solo en esta sesión.
    }
    setSnoozedUntil(until);
  }

  return (
    <div className="backup-banner" role="status">
      <span>
        💾 {campaign.lastExportedAt ? `Hace ${days} días que no respaldas esta campaña` : 'Esta campaña nunca se ha respaldado'} y tiene
        cambios nuevos.
      </span>
      <span className="backup-banner-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => void exportOne(campaign)}>
          Exportar ahora
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={snooze}>
          Más tarde
        </button>
      </span>
    </div>
  );
}
