import type { Campaign } from './types';

const DAY = 24 * 60 * 60 * 1000;

/** Días sin respaldo a partir de los cuales se sugiere exportar. */
export const BACKUP_REMINDER_DAYS = 7;

/** Cuánto se pospone el recordatorio con "Más tarde". */
export const SNOOZE_MS = 3 * DAY;

/**
 * ¿Conviene recordar un respaldo? Sí, si hay cambios desde la última exportación y pasaron
 * al menos BACKUP_REMINDER_DAYS desde esa exportación (o desde la creación, si nunca se exportó).
 */
export function backupReminder(c: Campaign, now = Date.now(), snoozedUntil = 0): { due: boolean; days: number } {
  const since = c.lastExportedAt ?? c.createdAt;
  const days = Math.floor((now - since) / DAY);
  const changed = c.updatedAt > (c.lastExportedAt ?? 0);
  return { due: changed && days >= BACKUP_REMINDER_DAYS && now >= snoozedUntil, days };
}
