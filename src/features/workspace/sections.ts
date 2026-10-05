import type { IconName } from '../../components/Icon';

export interface Section {
  path: string;
  label: string;
  icon: IconName;
  /** Fase del plan (DESIGN.md §7) en que se implementa; vacío si ya está implementada. */
  phase: string;
  summary: string;
}

export const SECTIONS: Section[] = [
  { path: 'grupo', label: 'Grupo', icon: 'party', phase: '', summary: 'Pantalla del DM: PG, CA, pasivas y condiciones de todos los PJ de un vistazo.' },
  { path: 'personajes', label: 'Personajes', icon: 'characters', phase: '', summary: 'Hojas de PJ y PNJ con cálculos automáticos de 5e 2014.' },
  { path: 'diario', label: 'Diario', icon: 'journal', phase: '', summary: 'Notas de cada sesión con [[enlaces]] a la wiki.' },
  { path: 'wiki', label: 'Wiki', icon: 'wiki', phase: '', summary: 'PNJ, lugares, misiones, facciones y objetos, enlazados entre sí con backlinks.' },
  { path: 'encuentros', label: 'Encuentros', icon: 'encounters', phase: '', summary: 'Tracker de iniciativa con monstruos del SRD, PG y condiciones.' },
  { path: 'compendio', label: 'Compendio', icon: 'compendium', phase: '', summary: 'Conjuros, monstruos, objetos y reglas del SRD 5.1.' },
];
