import { useNavigate } from 'react-router-dom';
import { ImportError, exportCampaign, importCampaign, parseBackup } from '../../db/backup';
import type { Campaign } from '../../db/types';
import { backupFilename, downloadJson } from '../../lib/files';
import { useUi } from '../../store/ui';

export function useBackupActions() {
  const toast = useUi((s) => s.toast);
  const navigate = useNavigate();

  async function exportOne(campaign: Campaign) {
    try {
      downloadJson(backupFilename(campaign.name, 'campaña'), await exportCampaign(campaign.id));
    } catch (e) {
      toast(`No se pudo exportar: ${(e as Error).message}`, 'error');
    }
  }

  async function importFile(file: File) {
    try {
      const bundle = parseBackup(await file.text());
      if (bundle.format === 'grimorio-character') {
        toast('Es un respaldo de personaje: impórtalo desde la sección Personajes de una campaña.', 'error');
        return;
      }
      const campaign = await importCampaign(bundle);
      toast(`Campaña "${campaign.name}" importada.`);
      navigate(`/c/${campaign.id}`);
    } catch (e) {
      toast(e instanceof ImportError ? e.message : `Error al importar: ${(e as Error).message}`, 'error');
    }
  }

  return { exportOne, importFile };
}
