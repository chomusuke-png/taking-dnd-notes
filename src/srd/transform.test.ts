import { describe, expect, it } from 'vitest';
import { transformEquipment, transformMagicItem, transformMonster, transformSpell } from './transform';

const ref = (index: string, name = index) => ({ index, name, url: '' });

describe('transformación del SRD', () => {
  it('conjuro con daño en lista, salvación y componentes materiales', () => {
    const s = transformSpell({
      index: 'fireball', name: 'Fireball', level: 3, desc: ['Boom.', 'Corners.'], higher_level: ['More.'],
      range: '150 feet', components: ['V', 'S', 'M'], material: 'Bat guano.', ritual: false, duration: 'Instantaneous',
      concentration: false, casting_time: '1 action', school: ref('evocation'), classes: [ref('wizard')],
      dc: { dc_type: ref('dex'), dc_success: 'half' },
      damage: [{ damage_type: ref('fire'), damage_at_slot_level: { 3: '8d6' } }],
    });
    expect(s).toMatchObject({
      components: 'V, S, M (Bat guano)', desc: 'Boom.\n\nCorners.', higherLevel: 'More.', classes: ['wizard'],
      save: { ability: 'dex', success: 'half' }, damageType: 'fire', damageAtSlot: { 3: '8d6' },
    });
  });

  it('conjuro con daño como objeto (formato antiguo)', () => {
    const s = transformSpell({ index: 'x', name: 'X', level: 0, damage: { damage_type: ref('cold'), damage_at_character_level: { 1: '1d8' } } });
    expect(s.damageType).toBe('cold');
    expect(s.damageAtCharLevel).toEqual({ 1: '1d8' });
    expect(s.higherLevel).toBeUndefined();
  });

  it('monstruo: CA, velocidades, salvaciones, habilidades y acciones', () => {
    const m = transformMonster({
      index: 'goblin', name: 'Goblin', size: 'Small', type: 'humanoid', alignment: 'neutral evil',
      armor_class: [{ type: 'armor', value: 15, armor: [ref('leather-armor', 'Leather Armor'), ref('shield', 'Shield')] }],
      hit_points: 7, hit_dice: '2d6', speed: { walk: '30 ft.', climb: '20 ft.' },
      strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8,
      proficiencies: [
        { value: 6, proficiency: ref('skill-stealth', 'Skill: Stealth') },
        { value: 2, proficiency: ref('saving-throw-dex', 'Saving Throw: DEX') },
      ],
      senses: { darkvision: '60 ft.', passive_perception: 9 }, languages: 'Common', challenge_rating: 0.25, xp: 50,
      actions: [{ name: 'Scimitar', desc: '...', attack_bonus: 4, damage: [{ damage_dice: '1d6+2', damage_type: ref('slashing') }] }],
    });
    expect(m).toMatchObject({
      ac: 15, acNote: 'leather armor, shield', hpRoll: '2d6', speed: '30 ft., climb 20 ft.',
      skills: 'Stealth +6', saves: 'DEX +2', senses: 'darkvision 60 ft., passive perception 9',
      actions: [{ name: 'Scimitar', attackBonus: 4, damage: ['1d6+2 slashing'] }],
    });
    expect(m.traits).toEqual([]);
  });

  it('armas, armaduras y objetos mágicos', () => {
    const sword = transformEquipment({
      index: 'longsword', name: 'Longsword', equipment_category: ref('weapon'), weapon_category: 'Martial', weapon_range: 'Melee',
      category_range: 'Martial Melee', damage: { damage_dice: '1d8', damage_type: ref('slashing') }, weight: 3,
      properties: [ref('versatile')], two_handed_damage: { damage_dice: '1d10' }, cost: { quantity: 15, unit: 'gp' },
    });
    expect(sword.weapon).toEqual({
      simple: false, ranged: false, damage: '1d8', damageType: 'slashing', properties: ['versatile'], range: undefined, versatile: '1d10',
    });
    expect(sword.cost).toBe('15 gp');

    const mail = transformEquipment({
      index: 'chain-mail', name: 'Chain Mail', equipment_category: ref('armor'), armor_category: 'Heavy',
      armor_class: { base: 16, dex_bonus: false }, str_minimum: 13, stealth_disadvantage: true, weight: 55,
    });
    expect(mail.armor).toEqual({ kind: 'heavy', base: 16, strMin: 13, stealthDisadvantage: true });

    const ring = transformMagicItem({
      index: 'ring-of-protection', name: 'Ring of Protection', equipment_category: { name: 'Ring' }, rarity: { name: 'Rare' },
      desc: ['Ring, rare (requires attunement)', 'You gain a +1 bonus.'],
    });
    expect(ring).toMatchObject({ id: 'magic-ring-of-protection', category: 'magic', rarity: 'Rare', attunement: true });
  });
});
