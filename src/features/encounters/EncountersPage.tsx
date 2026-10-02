import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { db } from '../../db/db';
import { createEncounter } from '../../db/encounters';
import type { Encounter } from '../../db/types';
import type { WorkspaceContext } from '../workspace/CampaignLayout';
import { EncounterView } from './EncounterView';
import './encounters.css';

const status = (e: Encounter) => (e.ended ? 'Terminado' : e.round > 0 ? `En curso · ronda ${e.round}` : 'En preparación');

export function EncountersPage() {
  const { campaign } = useOutletContext<WorkspaceContext>();
  const { encounterId } = useParams();
  const navigate = useNavigate();
  const encounters = useLiveQuery(
    async () => (await db.encounters.where('campaignId').equals(campaign.id).toArray()).sort((a, b) => b.updatedAt - a.updatedAt),
    [campaign.id],
  );

  return (
    <div className={`encounters-page${encounterId ? ' has-encounter' : ''}`}>
      <aside className="notes-list-pane encounters-list-pane">
        <div className="notes-list-head">
          <h2>Encuentros</h2>
          <button
            className="btn btn-primary btn-sm"
            onClick={async () => {
              const e = await createEncounter(campaign.id, '');
              navigate(`/c/${campaign.id}/encuentros/${e.id}`);
            }}
          >
            ＋ Nuevo
          </button>
        </div>
        <ul className="notes-list">
          {encounters?.map((e) => (
            <li key={e.id}>
              <Link to={`/c/${campaign.id}/encuentros/${e.id}`} className={`notes-item${e.id === encounterId ? ' is-active' : ''}`}>
                <span className="notes-item-icon" aria-hidden>
                  {e.ended ? '🏁' : e.round > 0 ? '⚔️' : '📋'}
                </span>
                <span className="notes-item-body">
                  <span className="notes-item-title">{e.name}</span>
                  <span className="muted small">
                    {status(e)} · {e.combatants.length} combatientes
                  </span>
                </span>
              </Link>
            </li>
          ))}
          {encounters?.length === 0 && <li className="muted small notes-empty">Prepara encuentros antes de la sesión o créalos al vuelo.</li>}
        </ul>
      </aside>

      <section className="encounters-main">
        {encounterId ? (
          <EncounterView key={encounterId} encounterId={encounterId} campaignId={campaign.id} />
        ) : (
          <div className="placeholder">
            <p className="placeholder-icon" aria-hidden>
              ⚔️
            </p>
            <h2>Tracker de iniciativa</h2>
            <p className="muted">
              Arma encuentros con monstruos del SRD y los personajes del grupo, calcula su dificultad, tira iniciativa y
              lleva PG, condiciones y turnos.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
