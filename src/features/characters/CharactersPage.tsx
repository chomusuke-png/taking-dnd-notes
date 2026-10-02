import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { ImportError, importCharacter, parseBackup } from '../../db/backup';
import { createCharacter } from '../../db/characters';
import { db } from '../../db/db';
import type { Character } from '../../db/types';
import { className } from '../../rules/classes';
import { armorClass, totalLevel } from '../../rules/derive';
import { useUi } from '../../store/ui';
import type { WorkspaceContext } from '../workspace/CampaignLayout';
import { NewCharacterDialog } from './NewCharacterDialog';
import './characters.css';

type Filter = 'pc' | 'npc';

export function CharactersPage() {
  const { campaign } = useOutletContext<WorkspaceContext>();
  const [filter, setFilter] = useState<Filter>('pc');
  const [creating, setCreating] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const toast = useUi((s) => s.toast);

  const characters = useLiveQuery(
    () => db.characters.where('campaignId').equals(campaign.id).sortBy('name'),
    [campaign.id],
  );
  const visible = characters?.filter((c) => c.kind === filter) ?? [];
  const count = (k: Filter) => characters?.filter((c) => c.kind === k).length ?? 0;

  async function importFile(file: File) {
    try {
      const bundle = parseBackup(await file.text());
      if (bundle.format !== 'taking-dnd-notes-character') {
        toast('Es un respaldo de campaña: impórtalo desde la pantalla de inicio.', 'error');
        return;
      }
      const c = await importCharacter(bundle, campaign.id);
      toast(`"${c.name}" importado.`);
      navigate(c.id);
    } catch (e) {
      toast(e instanceof ImportError ? e.message : `Error al importar: ${(e as Error).message}`, 'error');
    }
  }

  return (
    <div className="characters">
      <div className="page-toolbar">
        <div className="seg" role="tablist">
          {(['pc', 'npc'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={filter === k}
              className={filter === k ? 'seg-item seg-on' : 'seg-item'}
              onClick={() => setFilter(k)}
            >
              {k === 'pc' ? 'Jugadores' : 'PNJ'} <span className="muted">{count(k)}</span>
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          <button className="btn" onClick={() => fileInput.current?.click()}>
            ⬆️ Importar
          </button>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            ＋ Nuevo {filter === 'pc' ? 'personaje' : 'PNJ'}
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

      {characters !== undefined && visible.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">{filter === 'pc' ? '🧙' : '🎭'}</p>
          <h3>{filter === 'pc' ? 'Aún no hay personajes jugadores' : 'Aún no hay PNJ con hoja'}</h3>
          <p className="muted">
            {filter === 'pc'
              ? 'Crea uno o importa el archivo que te compartió un jugador.'
              : 'Crea PNJ con estadísticas completas para tenerlos a mano en combate.'}
          </p>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            ＋ Crear
          </button>
        </div>
      ) : (
        <ul className="character-grid">
          {visible.map((c) => (
            <CharacterCard key={c.id} c={c} />
          ))}
        </ul>
      )}

      <NewCharacterDialog
        open={creating}
        defaultKind={filter}
        onClose={() => setCreating(false)}
        onSubmit={async (input) => {
          const c = await createCharacter(campaign.id, input);
          navigate(c.id);
        }}
      />
    </div>
  );
}

function CharacterCard({ c }: { c: Character }) {
  const level = totalLevel(c);
  const hpPct = c.hp.max > 0 ? Math.max(0, Math.min(100, (c.hp.current / c.hp.max) * 100)) : 0;
  const subtitle = [c.race, c.classes.map((cls) => `${className(cls)} ${cls.level}`).join(' / ')].filter(Boolean).join(' · ');

  return (
    <li>
      <Link to={c.id} className="character-card">
        <div className="character-card-head">
          <div>
            <h3>{c.name}</h3>
            <p className="muted small">{subtitle || 'Sin raza ni clase'}</p>
          </div>
          {level > 0 && <span className="level-badge">Nv {level}</span>}
        </div>
        <div className="character-card-stats">
          <span title="Clase de armadura">🛡️ {armorClass(c)}</span>
          <span title="Puntos de golpe">
            ❤️ {c.hp.current}/{c.hp.max}
            {c.hp.temp > 0 && <span className="temp"> +{c.hp.temp}</span>}
          </span>
          {c.player && <span className="muted small">{c.player}</span>}
        </div>
        <div className="hp-bar" aria-hidden>
          <div className="hp-bar-fill" style={{ width: `${hpPct}%` }} data-low={hpPct <= 25} />
        </div>
      </Link>
    </li>
  );
}
