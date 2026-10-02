import { newCharacter } from '../db/factories';
import type { Character, CharacterClass } from '../db/types';
import { getClass } from '../rules/classes';

/** Personaje de prueba: `classes` como [['wizard', 5], ['fighter', 3, 'eldritch-knight']]. */
export function pc(classes: [string, number, string?][] = [], patch: Partial<Character> = {}): Character {
  const c = newCharacter('camp', { name: 'Test' });
  c.classes = classes.map(
    ([classId, level, subclassId]): CharacterClass => ({ classId, level, subclassId, hitDie: getClass(classId)?.hitDie ?? 8 }),
  );
  return { ...c, ...patch };
}
