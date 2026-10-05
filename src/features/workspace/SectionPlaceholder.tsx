import { Icon } from '../../components/Icon';
import type { Section } from './sections';

/** Pantalla provisional para secciones que llegan en fases posteriores. */
export function SectionPlaceholder({ section }: { section: Section }) {
  return (
    <div className="placeholder">
      <p className="placeholder-icon" aria-hidden>
        <Icon name={section.icon} />
      </p>
      <h2>{section.label}</h2>
      <p className="muted">{section.summary}</p>
      <span className="phase-badge">Llega en {section.phase}</span>
    </div>
  );
}
