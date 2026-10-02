import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { ThemeToggle } from '../../components/Theme';
import { db } from '../../db/db';
import type { Campaign } from '../../db/types';
import { DiceTray } from '../dice/DiceTray';
import { SearchPalette } from '../search/SearchPalette';
import { SECTIONS } from './sections';
import './workspace.css';

export interface WorkspaceContext {
  campaign: Campaign;
}

export function CampaignLayout() {
  const { campaignId = '' } = useParams();
  // null = no existe; undefined = cargando.
  const campaign = useLiveQuery(async () => (await db.campaigns.get(campaignId)) ?? null, [campaignId]);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (campaign === undefined) return null;
  if (campaign === null) {
    return (
      <div className="not-found">
        <h2>Campaña no encontrada</h2>
        <p className="muted">Puede que se haya eliminado.</p>
        <Link to="/" className="btn">
          ← Volver a campañas
        </Link>
      </div>
    );
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link to="/" className="sidebar-back" title="Todas las campañas">
          ← Campañas
        </Link>
        <div className="sidebar-campaign" title={campaign.name}>
          {campaign.name}
        </div>
        <nav className="sidebar-nav" aria-label="Secciones de la campaña">
          {SECTIONS.map((s) => (
            <NavLink key={s.path} to={s.path} className="nav-item">
              <span className="nav-icon" aria-hidden>
                {s.icon}
              </span>
              <span className="nav-label">{s.label}</span>
            </NavLink>
          ))}
          <NavLink to="ajustes" className="nav-item nav-settings">
            <span className="nav-icon" aria-hidden>
              ⚙️
            </span>
            <span className="nav-label">Ajustes</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <ThemeToggle />
        </div>
      </aside>

      <div className="workspace-main">
        <header className="topbar">
          <Link to="/" className="topbar-back" aria-label="Todas las campañas">
            ←
          </Link>
          <span className="topbar-title">{campaign.name}</span>
          <button className="search-trigger" onClick={() => setSearchOpen(true)} title="Buscar en la campaña (Ctrl+K)">
            🔍 Buscar… <kbd>Ctrl K</kbd>
          </button>
        </header>
        <main className="workspace-content" key={campaign.id}>
          <Outlet context={{ campaign } satisfies WorkspaceContext} />
        </main>
      </div>
      <DiceTray />
      <SearchPalette campaignId={campaign.id} open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
