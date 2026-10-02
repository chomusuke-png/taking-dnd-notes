import { Navigate, RouterProvider, createHashRouter } from 'react-router-dom';
import { useApplyTheme } from './components/Theme';
import { Toasts } from './components/Toasts';
import { HomePage } from './features/campaigns/HomePage';
import { CharacterSheet } from './features/characters/CharacterSheet';
import { CharactersPage } from './features/characters/CharactersPage';
import { PartyPage } from './features/party/PartyPage';
import { CampaignLayout } from './features/workspace/CampaignLayout';
import { SectionPlaceholder } from './features/workspace/SectionPlaceholder';
import { SettingsPage } from './features/workspace/SettingsPage';
import { SECTIONS } from './features/workspace/sections';

// Hash router: la app es estática (PWA) y no necesita reescrituras en el servidor.
const router = createHashRouter([
  { path: '/', element: <HomePage /> },
  {
    path: '/c/:campaignId',
    element: <CampaignLayout />,
    children: [
      { index: true, element: <Navigate to="personajes" replace /> },
      { path: 'personajes', element: <CharactersPage /> },
      { path: 'personajes/:characterId', element: <CharacterSheet /> },
      // El editor (TipTap) es la dependencia más pesada: se descarga solo al abrir notas.
      { path: 'diario/:noteId?', lazy: async () => ({ Component: (await import('./features/notes/NotesPage')).JournalPage }) },
      { path: 'grupo', element: <PartyPage /> },
      { path: 'encuentros/:encounterId?', lazy: async () => ({ Component: (await import('./features/encounters/EncountersPage')).EncountersPage }) },
      { path: 'compendio/:kind?/:id?', lazy: async () => ({ Component: (await import('./features/compendium/CompendiumPage')).CompendiumPage }) },
      { path: 'wiki/:noteId?', lazy: async () => ({ Component: (await import('./features/notes/NotesPage')).WikiPage }) },
      ...SECTIONS.filter((s) => s.phase).map((s) => ({
        path: s.path,
        element: <SectionPlaceholder section={s} />,
      })),
      { path: 'ajustes', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function App() {
  useApplyTheme();
  return (
    <>
      <RouterProvider router={router} />
      <Toasts />
    </>
  );
}
