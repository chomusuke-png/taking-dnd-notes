import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../../components/Dialog';
import { ThemeToggle } from '../../components/Theme';
import { countCampaignContent, createCampaign, deleteCampaign } from '../../db/campaigns';
import { db } from '../../db/db';
import type { Campaign } from '../../db/types';
import { useInstallPrompt } from '../pwa/useInstallPrompt';
import { CampaignFormDialog } from './CampaignFormDialog';
import { DataCard } from './DataCard';
import { useBackupActions } from './useBackupActions';
import './home.css';

const dateFmt = new Intl.DateTimeFormat('es', { dateStyle: 'medium' });

export function HomePage() {
  const campaigns = useLiveQuery(() => db.campaigns.orderBy('updatedAt').reverse().toArray(), []);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Campaign | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { exportOne, exportEverything, importFile } = useBackupActions();
  const { canInstall, install } = useInstallPrompt();

  return (
    <div className="home">
      <header className="home-header">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={32} height={32} />
          <h1>Taking D&D Notes</h1>
        </div>
        <div className="home-header-actions">
          {canInstall && (
            <button className="btn btn-sm" onClick={() => void install()} title="Instalar Taking D&D Notes como app en este dispositivo">
              📲 Instalar app
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className="home-main">
        <div className="home-toolbar">
          <h2>Campañas</h2>
          <div className="home-actions">
            <button className="btn" onClick={() => fileInput.current?.click()}>
              ⬆️ Importar
            </button>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              ＋ Nueva campaña
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void importFile(file);
            }}
          />
        </div>

        {campaigns === undefined ? null : campaigns.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">📜</p>
            <h3>Aún no hay campañas</h3>
            <p className="muted">Crea una para empezar a llevar personajes y notas, o importa un respaldo.</p>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              ＋ Crear la primera campaña
            </button>
          </div>
        ) : (
          <ul className="campaign-grid">
            {campaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} onExport={() => exportOne(c)} onDelete={() => setToDelete(c)} />
            ))}
          </ul>
        )}

        <DataCard onExportAll={() => void exportEverything()} />
      </main>

      <CampaignFormDialog
        open={creating}
        title="Nueva campaña"
        submitLabel="Crear"
        onClose={() => setCreating(false)}
        onSubmit={async (v) => {
          await createCampaign(v);
        }}
      />
      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar campaña"
        danger
        confirmLabel="Eliminar"
        message={
          <p>
            Se eliminará <strong>{toDelete?.name}</strong> con todos sus personajes, notas y encuentros. Esta acción no
            se puede deshacer; exporta un respaldo antes si lo necesitas.
          </p>
        }
        onConfirm={() => toDelete && void deleteCampaign(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

function CampaignCard({ campaign, onExport, onDelete }: { campaign: Campaign; onExport: () => void; onDelete: () => void }) {
  const counts = useLiveQuery(() => countCampaignContent(campaign.id), [campaign.id]);
  return (
    <li className="campaign-card">
      <Link to={`/c/${campaign.id}`} className="campaign-card-link">
        <h3>{campaign.name}</h3>
        {campaign.description && <p className="campaign-desc">{campaign.description}</p>}
        <p className="campaign-meta muted">
          {counts ? `${counts.characters} personajes · ${counts.notes} notas · ` : ''}
          editada {dateFmt.format(campaign.updatedAt)}
        </p>
      </Link>
      <div className="campaign-card-actions">
        <button className="btn btn-ghost btn-sm" onClick={onExport} title="Descargar respaldo JSON">
          ⬇️ Exportar
        </button>
        <button className="btn btn-ghost btn-sm btn-danger" onClick={onDelete}>
          Eliminar
        </button>
      </div>
    </li>
  );
}
