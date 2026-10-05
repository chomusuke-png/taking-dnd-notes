import { useNavigate } from 'react-router-dom';
import { ImportError, exportAll, exportCampaign, importCampaign, markExported, parseBackup } from '../../db/backup';
import type { Campaign } from '../../db/types';
import { backupFilename, downloadJson } from '../../lib/files';
import { useUi } from '../../store/ui';

export function useBackupActions() {
  const toast = useUi((s) => s.toast);
  const navigate = useNavigate();

  async function exportOne(campaign: Campaign) {
    try {
      downloadJson(backupFilename(campaign.name, 'campaña'), await exportCampaign(campaign.id));
      await markExported([campaign.id]);
    } catch (e) {
      toast(`No se pudo exportar: ${(e as Error).message}`, 'error');
    }
  }

  async function exportEverything() {
    try {
      const bundle = await exportAll();
      if (bundle.campaigns.length === 0) return toast('No hay campañas para respaldar.', 'error');
      downloadJson(`taking-dnd-notes-respaldo-completo-${new Date().toISOString().slice(0, 10)}.json`, bundle);
      await markExported(bundle.campaigns.map((b) => b.campaign.id));
      toast(`Respaldo de ${bundle.campaigns.length} campañas descargado.`);
    } catch (e) {
      toast(`No se pudo exportar: ${(e as Error).message}`, 'error');
    }
  }

  async function importFile(file: File) {
    try {
      const bundle = parseBackup(await file.text());
      if (bundle.format === 'taking-dnd-notes-character') {
        toast('Es un respaldo de personaje: impórtalo desde la sección Personajes de una campaña.', 'error');
        return;
      }
      if (bundle.format === 'taking-dnd-notes-backup') {
        for (const b of bundle.campaigns) await importCampaign(b);
        toast(`${bundle.campaigns.length} campañas importadas.`);
        return;
      }
      const campaign = await importCampaign(bundle);
      toast(`Campaña "${campaign.name}" importada.`);
      navigate(`/c/${campaign.id}`);
    } catch (e) {
      toast(e instanceof ImportError ? e.message : `Error al importar: ${(e as Error).message}`, 'error');
    }
  }

  return { exportOne, exportEverything, importFile };
}
