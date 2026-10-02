import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ConfirmDialog } from '../../components/Dialog';
import { deleteCampaign, updateCampaign } from '../../db/campaigns';
import { useUi } from '../../store/ui';
import { useBackupActions } from '../campaigns/useBackupActions';
import type { WorkspaceContext } from './CampaignLayout';

export function SettingsPage() {
  const { campaign } = useOutletContext<WorkspaceContext>();
  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { exportOne } = useBackupActions();
  const toast = useUi((s) => s.toast);
  const navigate = useNavigate();

  const dirty = name !== campaign.name || description !== campaign.description;

  async function save() {
    try {
      await updateCampaign(campaign.id, { name, description });
      toast('Cambios guardados.');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <div className="settings">
      <h2>Ajustes de la campaña</h2>

      <section className="settings-card">
        <h3>General</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="field">
            <label htmlFor="s-name">Nombre</label>
            <input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="s-desc">Descripción</label>
            <textarea
              id="s-desc"
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={campaign.settings.variantEncumbrance}
              onChange={(e) =>
                void updateCampaign(campaign.id, {
                  settings: { ...campaign.settings, variantEncumbrance: e.target.checked },
                })
              }
            />
            Usar la regla variante de carga (PHB p. 176)
          </label>
          <div className="settings-actions">
            <button type="submit" className="btn btn-primary" disabled={!dirty || !name.trim()}>
              Guardar
            </button>
          </div>
        </form>
      </section>

      <section className="settings-card">
        <h3>Respaldo</h3>
        <p className="muted">
          Descarga toda la campaña (personajes, notas, encuentros y homebrew) en un archivo JSON que puedes importar en
          otro dispositivo.
        </p>
        <button className="btn" onClick={() => exportOne(campaign)}>
          ⬇️ Exportar campaña
        </button>
      </section>

      <section className="settings-card settings-danger">
        <h3>Zona peligrosa</h3>
        <p className="muted">Eliminar la campaña borra todo su contenido de este navegador.</p>
        <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
          Eliminar campaña
        </button>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar campaña"
        danger
        confirmLabel="Eliminar"
        message={
          <p>
            Se eliminará <strong>{campaign.name}</strong> con todo su contenido. Esta acción no se puede deshacer.
          </p>
        }
        onConfirm={() => {
          navigate('/');
          void deleteCampaign(campaign.id);
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
