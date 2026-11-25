import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../../src/systems/session';
import {
  arrivalSpawnFromPad,
  districtExits,
  districtNpcs,
} from '../../src/systems/interaction';
import { buildDistrictMap, isWalkable } from '../../src/world/maps';
import { fontCoversText, PT_BR_ACCENTS } from '../../src/rendering/pixel-font';
import { setLocale, t } from '../../src/i18n';
import { ptBR } from '../../src/i18n/pt-BR';
import { currentObjective } from '../../src/systems/objectives';
import { STORY_BEATS } from '../../src/content/story';
import { SKILL_PHASE_TABLE } from '../../src/content/skill-phases';

function stubStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  });
}

describe('v1.22.4 Fair→Odds arrival east lane', () => {
  beforeEach(stubStorage);

  it('Fair arrival has ≥2 empty walkable tiles east and cardinals open', () => {
    const pad = districtExits().find((e) => e.id === 'avenida-to-feira')!;
    const spawn = arrivalSpawnFromPad(pad);
    expect(spawn).toEqual({ x: 9, y: 12, dx: 1, dy: 0 });
    const map = buildDistrictMap('avenida-odds');
    const homes = new Set(
      districtNpcs()
        .filter((n) => n.districtId === 'avenida-odds')
        .map((n) => `${n.x},${n.y}`),
    );
    for (const dx of [1, 2]) {
      const x = spawn.x + dx;
      const y = spawn.y;
      expect(isWalkable(map, x, y), `east lane ${x},${y}`).toBe(true);
      expect(homes.has(`${x},${y}`), `NPC home on east lane ${x},${y}`).toBe(false);
    }
    const session = new GameSession(3001);
    session.startNew();
    session.world.unlock('avenida-odds');
    session.player.setDistrict('avenida-odds');
    for (const [dx, dy, dir] of [
      [0, -1, 'N'],
      [0, 1, 'S'],
      [-1, 0, 'W'],
      [1, 0, 'E'],
    ] as const) {
      session.player.setPosition(spawn.x, spawn.y);
      expect(session.move(dx, dy), `arrival ${dir}`).toBe(true);
      const s = session.player.getStats();
      expect(s.x).toBe(spawn.x + dx);
      expect(s.y).toBe(spawn.y + dy);
    }
  });
});

describe('v1.22.4 Enter swallow + bet confirm', () => {
  beforeEach(stubStorage);

  it('continueExploring arms interact lock so Enter cannot reopen Nair', () => {
    const session = new GameSession(3002);
    session.startNew();
    session.story.setFlag('casa_quebrada', true);
    (session as unknown as { creditsRoll: boolean }).creditsRoll = true;
    session.ui.go('ending');
    expect(session.continueExploring()).toBe(true);
    expect(session.ui.is('play')).toBe(true);
    expect(session.allowInteractInput()).toBe(false);
  });

  it('noteModalOpened requires release when Interact was held', () => {
    const session = new GameSession(3003);
    session.startNew();
    session.noteInteractPressed('Enter');
    session.noteModalOpened(true);
    expect(session.allowModalConfirm()).toBe(false);
  });
});

describe('v1.22.4 pixel font pt-BR coverage', () => {
  it('covers ÃÕÇÁÉÍÓÚÂÊÔÀ and every pt-BR catalog character', () => {
    for (const ch of PT_BR_ACCENTS) {
      expect(fontCoversText(ch), `missing glyph ${ch}`).toBe(true);
    }
    const joined = Object.values(ptBR).join('\n');
    // Letters, digits, pt-BR accents, space, >, - (exclude × and other Latin-1 symbols).
    const filtered = [...joined]
      .filter((ch) => /[0-9A-Za-zÃÕÇÁÉÍÓÚÂÊÔÀãõçáéíóúâêôààáâãçéêíóôõú>\- ]/i.test(ch))
      .join('');
    expect(fontCoversText(filtered)).toBe(true);
  });
});

describe('v1.22.4 Torre elevator-first objective', () => {
  beforeEach(stubStorage);

  it('foyer → VIP target pins elevator, not VIP coords', () => {
    const session = new GameSession(3004);
    session.startNew();
    session.world.unlock('torre-casa');
    session.player.setDistrict('torre-casa');
    const prior = STORY_BEATS.filter(
      (b) =>
        !b.optional &&
        b.id !== 'torre-vip' &&
        b.id !== 'torre-negotiate' &&
        b.id !== 'torre-final' &&
        b.id !== 'epilogue-laje',
    ).map((b) => b.id);
    session.story.hydrate(
      {
        elevator_ok: true,
        unlocked_torre: true,
        escandalo_aberto: true,
        pit_ok: true,
        foyer_ok: true,
      },
      prior,
    );
    const elev = session.npcs.find((n) => n.id === 'elevator')!;
    const obj = currentObjective({
      beats: STORY_BEATS,
      completed: session.story.getCompleted(),
      flags: (f) => session.story.getFlag(f),
      districtId: 'torre-casa',
      npcs: session.floorNpcs(),
      allNpcs: session.npcs,
      vipFloor: false,
      exits: session.exits,
      unlocked: (id) => session.world.isUnlocked(id as never),
    });
    expect(obj.targetX).toBe(elev.x);
    expect(obj.targetY).toBe(elev.y);
    expect(obj.targetName).toBe(elev.name);
  });
});

describe('v1.22.4 clues + miss hints', () => {
  beforeEach(() => {
    stubStorage();
    setLocale('pt-BR');
  });

  it('Cage / Maquinista clues avoid pin maps; miss hints exist per bet', () => {
    const cage = SKILL_PHASE_TABLE['avenida-server']!.clue ?? '';
    expect(cage).not.toMatch(/esquerda|direita|terceiro|floor plate|left hinge/i);
    const lock = SKILL_PHASE_TABLE['feira-lockbox']!.clue ?? '';
    expect(lock.length).toBeGreaterThan(40);
    for (const id of [
      'avenida-server',
      'feira-lockbox',
      'avenida-betrayal',
      'audiencia-publica',
      'torre-foyer',
      'torre-pit',
    ]) {
      const key = `ui.toast.missHint.${id}`;
      expect(t(key)).not.toBe(key);
      expect(t(key)).not.toBe(t('ui.toast.missHint.default'));
    }
  });
});
