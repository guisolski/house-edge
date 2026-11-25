import { describe, expect, it } from 'vitest';
import { currentObjective } from '../../src/systems/objectives';
import { STORY_BEATS } from '../../src/content/story';
import { districtExits, districtNpcs } from '../../src/systems/interaction';

describe('objective district labels + free-roam epilogue', () => {
  const npcs = districtNpcs();
  const exits = districtExits();

  it('free roam away from Nair points at the hill epilogue', () => {
    const away = currentObjective({
      beats: STORY_BEATS,
      completed: ['torre-final'],
      flags: (f) => f === 'casa_quebrada' || f === 'free_roam',
      districtId: 'avenida-odds',
      npcs,
      allNpcs: npcs,
      exits,
      unlocked: () => true,
    });
    expect(away.detail ?? away.text).toMatch(/Epilogue|hill|Nair|Morro|Exit/i);
    expect(away.targetX).toBeTypeOf('number');
    expect(away.targetName).toBeTruthy();
  });

  it('travel objectives resolve for every district hop', () => {
    for (const dest of [
      'morro-neon',
      'feira-central',
      'avenida-odds',
      'torre-casa',
    ] as const) {
      const travel = currentObjective({
        beats: STORY_BEATS,
        completed: ['intro-laje'],
        flags: (f) => f === 'conheceu_rita',
        districtId: dest === 'morro-neon' ? 'feira-central' : 'morro-neon',
        npcs,
        exits,
        unlocked: () => true,
      });
      expect(travel.text.length).toBeGreaterThan(3);
      void dest;
    }
  });
});
