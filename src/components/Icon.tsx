import type { IconType } from 'react-icons';
import {
  GiBookCover, GiBookshelf, GiCampfire, GiCastle, GiCheckedShield, GiCheckeredFlag, GiCloudDownload, GiCloudUpload, GiCog,
  GiCrossedSwords, GiCutDiamond, GiDeathSkull, GiDiceTwentyFacesTwenty, GiDragonHead, GiDramaMasks, GiFlagObjective, GiHazardSign,
  GiHearts, GiKnapsack, GiKnightBanner, GiLaptop, GiMagicSwirl, GiMagnifyingGlass, GiMeepleGroup, GiMoon, GiNightSleep, GiNotebook,
  GiPadlock, GiPerson, GiQuillInk, GiRollingDices, GiRun, GiSave, GiScrollUnfurled, GiSemiClosedEye, GiSmartphone, GiSparkles,
  GiSpellBook, GiSprint, GiStarSwirl, GiSun, GiTreasureMap, GiTrophyCup, GiWizardFace,
} from 'react-icons/gi';

// Íconos de game-icons.net (CC BY 3.0, autores: Lorc, Delapouite y colaboradores) vía react-icons.
// La app usa nombres semánticos: la capa de datos guarda el nombre, nunca el componente.
export const ICONS = {
  // Secciones
  party: GiMeepleGroup,
  characters: GiWizardFace,
  journal: GiBookCover,
  wiki: GiTreasureMap,
  encounters: GiCrossedSwords,
  compendium: GiBookshelf,
  settings: GiCog,
  // Acciones
  search: GiMagnifyingGlass,
  import: GiCloudUpload,
  export: GiCloudDownload,
  edit: GiQuillInk,
  install: GiSmartphone,
  backup: GiSave,
  // Tema
  themeSystem: GiLaptop,
  themeDark: GiMoon,
  themeLight: GiSun,
  // Tipos de nota
  session: GiScrollUnfurled,
  npc: GiDramaMasks,
  location: GiCastle,
  quest: GiFlagObjective,
  faction: GiKnightBanner,
  item: GiCutDiamond,
  note: GiNotebook,
  // Combate y personaje
  monster: GiDragonHead,
  custom: GiPerson,
  dice: GiRollingDices,
  d20: GiDiceTwentyFacesTwenty,
  armorClass: GiCheckedShield,
  initiative: GiSprint,
  speed: GiRun,
  perception: GiSemiClosedEye,
  hp: GiHearts,
  dead: GiDeathSkull,
  inspiration: GiSparkles,
  attuned: GiStarSwirl,
  shortRest: GiCampfire,
  longRest: GiNightSleep,
  trophy: GiTrophyCup,
  finished: GiCheckeredFlag,
  // Compendio
  spells: GiSpellBook,
  items: GiKnapsack,
  conditions: GiMagicSwirl,
  // Estado
  lock: GiPadlock,
  warning: GiHazardSign,
} satisfies Record<string, IconType>;

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  className?: string;
  /** Texto accesible; si no se pasa, el ícono es decorativo (aria-hidden). */
  label?: string;
}

export function Icon({ name, className, label }: Props) {
  const Component = ICONS[name];
  return (
    <Component
      className={className ? `gi ${className}` : 'gi'}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable="false"
    />
  );
}
