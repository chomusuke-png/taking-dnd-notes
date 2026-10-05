import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { ConfirmDialog } from '../../components/Dialog';
import { exportCharacter } from '../../db/backup';
import { deleteCharacter, updateCharacter } from '../../db/characters';
import { db } from '../../db/db';
import { className } from '../../rules/classes';
import { totalLevel } from '../../rules/derive';
import { backupFilename, downloadJson } from '../../lib/files';
import { useUi } from '../../store/ui';
import { useDice } from '../dice/diceStore';
import type { WorkspaceContext } from '../workspace/CampaignLayout';
import { AbilitiesPanel } from './sheet/AbilitiesPanel';
import { ActionsTab } from './sheet/ActionsTab';
import { FeaturesTab } from './sheet/FeaturesTab';
import { IdentityEditor } from './sheet/IdentityEditor';
import { InventoryTab } from './sheet/InventoryTab';
import { NotesTab } from './sheet/NotesTab';
import { SheetContext, type SheetContextValue } from './sheet/SheetContext';
import { SpellsTab } from './sheet/SpellsTab';
import { StatusPanel } from './sheet/StatusPanel';
import './sheet/sheet.css';

const TABS = [
  { id: 'actions', label: 'Acciones', Component: ActionsTab },
  { id: 'spells', label: 'Conjuros', Component: SpellsTab },
  { id: 'inventory', label: 'Inventario', Component: InventoryTab },
  { id: 'features', label: 'Rasgos', Component: FeaturesTab },
  { id: 'notes', label: 'Notas', Component: NotesTab },
] as const;
type TabId = (typeof TABS)[number]['id'];

/** En pantallas angostas las tres columnas se muestran de a una. */
type MobilePane = 'stats' | 'main' | 'status';

export function CharacterSheet() {
  const { campaign } = useOutletContext<WorkspaceContext>();
  const { characterId = '' } = useParams();
  const c = useLiveQuery(async () => (await db.characters.get(characterId)) ?? null, [characterId]);
  const [edit, setEdit] = useState(false);
  const [tab, setTab] = useState<TabId>('actions');
  const [pane, setPane] = useState<MobilePane>('status');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const navigate = useNavigate();
  const toast = useUi((s) => s.toast);

  const ctx = useMemo<SheetContextValue | null>(() => {
    if (!c) return null;
    const dice = useDice.getState();
    return {
      c,
      campaign,
      edit,
      update: (change) => void updateCharacter(c.id, change),
      check: (label, bonus) => dice.check(c.name, label, bonus),
      rollExpr: (label, expression) => void dice.expr(c.name, label, expression),
    };
  }, [c, campaign, edit]);

  if (c === undefined) return null;
  if (c === null || !ctx) {
    return (
      <div className="not-found">
        <h2>Personaje no encontrado</h2>
        <Link to=".." relative="path" className="btn">
          ← Volver a personajes
        </Link>
      </div>
    );
  }

  const level = totalLevel(c);
  const classes = c.classes.map((cls) => `${className(cls)} ${cls.level}`).join(' / ');
  const ActiveTab = TABS.find((t) => t.id === tab)!.Component;

  return (
    <SheetContext.Provider value={ctx}>
      <div className={`sheet${edit ? ' sheet-editing' : ''}`}>
        <header className="sheet-header">
          <Link to=".." relative="path" className="sheet-back muted">
            ← Personajes
          </Link>
          <div className="sheet-title">
            <h1>
              {c.name}
              {c.kind === 'npc' && <span className="kind-badge">PNJ</span>}
            </h1>
            <p className="muted">
              {[c.race && `${c.race}${c.subrace ? ` (${c.subrace})` : ''}`, classes, level > 0 && `Nivel ${level}`, c.background, c.alignment]
                .filter(Boolean)
                .join(' · ') || 'Completa raza y clase en modo edición'}
              {c.player && <> · Jugador: {c.player}</>}
            </p>
          </div>
          <div className="sheet-actions">
            <button
              type="button"
              className={edit ? 'btn btn-primary' : 'btn'}
              onClick={() => setEdit((e) => !e)}
              aria-pressed={edit}
            >
              {edit ? '✓ Listo' : <><Icon name="edit" /> Editar</>}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              title="Descargar el personaje como JSON para compartirlo"
              onClick={async () => downloadJson(backupFilename(c.name, 'personaje'), await exportCharacter(c.id))}
            >
              <Icon name="export" /> Exportar
            </button>
            {edit && (
              <button type="button" className="btn btn-ghost btn-danger" onClick={() => setConfirmDelete(true)}>
                Eliminar
              </button>
            )}
          </div>
        </header>

        {edit && <IdentityEditor />}

        <div className="seg sheet-pane-switch" role="tablist" aria-label="Sección de la hoja">
          {(
            [
              ['stats', 'Atributos'],
              ['main', 'Hoja'],
              ['status', 'Estado'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={pane === id}
              className={pane === id ? 'seg-item seg-on' : 'seg-item'}
              onClick={() => setPane(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="sheet-grid" data-pane={pane}>
          <section className="sheet-col sheet-col-stats" aria-label="Atributos">
            <AbilitiesPanel />
          </section>

          <section className="sheet-col sheet-col-main" aria-label="Hoja">
            <div className="tabs" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={tab === t.id ? 'tab tab-on' : 'tab'}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="tab-panel" role="tabpanel">
              <ActiveTab />
            </div>
          </section>

          <section className="sheet-col sheet-col-status" aria-label="Estado">
            <StatusPanel />
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar personaje"
        danger
        confirmLabel="Eliminar"
        message={
          <p>
            Se eliminará <strong>{c.name}</strong>. Si lo necesitas después, exporta antes su archivo.
          </p>
        }
        onConfirm={() => {
          navigate('..', { relative: 'path' });
          void deleteCharacter(c.id).then(() => toast(`"${c.name}" eliminado.`));
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </SheetContext.Provider>
  );
}
