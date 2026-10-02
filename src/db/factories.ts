import { newId } from '../lib/id';
import type { Campaign, Character, Id } from './types';

export function newCampaign(input: { name: string; description?: string }): Campaign {
  const now = Date.now();
  return {
    id: newId(),
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    settings: { variantEncumbrance: false },
    createdAt: now,
    updatedAt: now,
  };
}

export function newCharacter(campaignId: Id, input: { name: string; kind?: Character['kind'] }): Character {
  const now = Date.now();
  return {
    id: newId(),
    campaignId,
    kind: input.kind ?? 'pc',
    name: input.name.trim(),
    player: '',
    race: '',
    subrace: '',
    background: '',
    alignment: '',
    classes: [],
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    proficiencies: { saves: [], skills: {}, armor: [], weapons: [], tools: [], languages: [] },
    hp: { max: 0, current: 0, temp: 0 },
    hitDiceUsed: {},
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    exhaustion: 0,
    inspiration: false,
    speed: 30,
    inventory: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    features: [],
    attacks: [],
    createdAt: now,
    updatedAt: now,
  };
}
