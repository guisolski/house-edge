import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../../src/systems/session';
import {
  districtNpcs,
  EXIT_DWELL_MS,
  INTERACT_RANGE,
} from '../../src/systems/interaction';
import { buildDistrictMap, buildTorreVip, isWalkable } from '../../src/world/maps';
import { setLocale, t } from '../../src/i18n';
import { SKILL_PHASE_TABLE } from '../../src/content/skill-phases';
import { getBet } from '../../src/content/bets';
import { STORY_BEATS } from '../../src/content/story';

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

describe('v1.22.3 NPC corridor softlock', () => {
  beforeEach(stubStorage);

  it('every NPC home has walkable N/S/E/W neighbors (no pen)', () => {
    const maps = new Map(
      (['morro-neon', 'feira-central', 'avenida-odds', 'torre-casa'] as const).map(
        (id) => [id, buildDistrictMap(id)] as const,
      ),
    );
    const vip = buildTorreVip();
    for (const npc of districtNpcs()) {
      if (npc.id.startsWith('elevator')) continue;
      const map = npc.floor === 'vip' ? vip : maps.get(npc.districtId)!;
      const x = npc.homeX ?? npc.x;
      const y = npc.homeY ?? npc.y;
      for (const [dx, dy, dir] of [
        [0, -1, 'N'],
        [0, 1, 'S'],
        [-1, 0, 'W'],
        [1, 0, 'E'],
      ] as const) {
        expect(
          isWalkable(map, x + dx, y + dy),
          `${npc.id} @${x},${y} blocked ${dir} (${x + dx},${y + dy})`,
        ).toBe(true);
      }
    }
  });

  it('player can walk through NPCs and step out all 4 dirs from each home', () => {
    const session = new GameSession(2901);
    session.startNew();
    session.world.unlock('feira-central');
    session.world.unlock('avenida-odds');
    session.world.unlock('torre-casa');
    for (const npc of session.npcs) {
      if (npc.id.startsWith('elevator')) continue;
      session.player.setDistrict(npc.districtId);
      if (npc.floor === 'vip') {
        (session as unknown as { vipFloor: boolean }).vipFloor = true;
      } else if (npc.districtId === 'torre-casa') {
        (session as unknown as { vipFloor: boolean }).vipFloor = false;
      }
      const x = npc.homeX ?? npc.x;
      const y = npc.homeY ?? npc.y;
      for (const [dx, dy, dir] of [
        [0, -1, 'N'],
        [0, 1, 'S'],
        [-1, 0, 'W'],
        [1, 0, 'E'],
      ] as const) {
        session.player.setPosition(x, y);
        expect(session.move(dx, dy), `${npc.id} walk ${dir}`).toBe(true);
        const s = session.player.getStats();
        expect(s.x).toBe(x + dx);
        expect(s.y).toBe(y + dy);
      }
    }
  });
});

describe('v1.22.3 Esc release + exits E-only', () => {
  beforeEach(stubStorage);

  it('Esc cancelBet returns to play and clears pending bet/skill', () => {
    const session = new GameSession(2902);
    session.startNew();
    session.player.addCredits(100);
    session.world.unlock('avenida-odds');
    session.player.setDistrict('avenida-odds');
    expect(session.offerBet('side-avenida-neon')).toBe(true);
    expect(session.ui.is('bet')).toBe(true);
    session.cancelBet();
    expect(session.ui.is('play')).toBe(true);
    expect(session.getPendingBet()).toBeNull();
    session.player.setPosition(16, 12);
    expect(session.move(1, 0)).toBe(true);
  });

  it('Esc on Neon Snap dialogue declines bet and restores movement', () => {
    const session = new GameSession(2903);
    session.startNew();
    session.player.addCredits(200);
    session.world.unlock('feira-central');
    session.world.unlock('avenida-odds');
    session.player.setDistrict('avenida-odds');
    session.story.setFlag('influencer_ok', true);
    expect(session.runStoryBeat('avenida-drone')).toBe(true);
    expect(session.ui.is('dialogue')).toBe(true);
    expect(session.hasPendingStoryBet()).toBe(true);
    session.closeModal();
    expect(session.ui.is('play')).toBe(true);
    expect(session.hasPendingStoryBet()).toBe(false);
    expect(session.getPendingStoryBeat()).toBeNull();
    session.player.setPosition(16, 12);
    expect(session.move(1, 0)).toBe(true);
  });

  it('district exits never auto-travel on dwell — E required', () => {
    vi.useFakeTimers();
    const session = new GameSession(2904);
    session.startNew();
    session.world.unlock('feira-central');
    session.world.unlock('avenida-odds');
    session.player.setDistrict('feira-central');
    const exit = session.exits.find(
      (e) => e.districtId === 'feira-central' && e.toDistrict === 'avenida-odds',
    )!;
    session.player.setPosition(exit.x, exit.y);
    session.player.setFacing(1, 0);
    session.move(0, 0);
    vi.advanceTimersByTime(EXIT_DWELL_MS + 100);
    session.move(0, 0);
    session.move(1, 0);
    expect(session.player.getStats().districtId).toBe('feira-central');
    expect(session.nearbyExit()?.id).toBe(exit.id);
    expect(session.interact()).toBe(true);
    expect(session.player.getStats().districtId).toBe('avenida-odds');
    vi.useRealTimers();
  });
});

describe('v1.22.3 objective E-target', () => {
  beforeEach(stubStorage);

  it('objective NPC wins E-prompt when dancer/catador share range', () => {
    const session = new GameSession(2905);
    session.startNew();
    session.world.unlock('feira-central');
    session.player.setDistrict('feira-central');
    for (const id of [
      'intro-laje',
      'boteco-nair',
      'side-morro-copper',
      'morro-antena',
      'luna-beco',
      'morro-fios',
      'seu-ze-banca',
      'feira-kiko',
    ]) {
      session.story.completeBeat(id);
    }
    for (const f of [
      'conheceu_rita',
      'falou_nair',
      'copper_weighed',
      'antena_ok',
      'conheceu_luna',
      'fios_ok',
      'ze_ok',
      'pastel_ok',
    ]) {
      session.story.setFlag(f, true);
    }
    const catador = session.npcs.find((n) => n.id === 'catador-feira')!;
    const dancer = session.npcs.find((n) => n.id === 'dancer-feira')!;
    const mx = (catador.x + dancer.x) / 2;
    const my = (catador.y + dancer.y) / 2;
    expect(Math.hypot(catador.x - mx, catador.y - my)).toBeLessThanOrEqual(
      INTERACT_RANGE,
    );
    expect(Math.hypot(dancer.x - mx, dancer.y - my)).toBeLessThanOrEqual(INTERACT_RANGE);
    session.player.setPosition(mx, my);
    expect(session.objective().targetName).toBe(catador.name);
    expect(session.nearbyNpc()?.id).toBe('catador-feira');
  });
});

describe('v1.22.3 content pt-BR + clues', () => {
  beforeEach(stubStorage);

  it('Seu Zé and Luna use distinct gate bets', () => {
    const luna = STORY_BEATS.find((b) => b.id === 'luna-beco')!;
    const ze = STORY_BEATS.find((b) => b.id === 'seu-ze-banca')!;
    expect(luna.betId).toBeTruthy();
    expect(ze.betId).toBeTruthy();
    expect(luna.betId).not.toBe(ze.betId);
    expect(getBet(luna.betId!)?.id).toBe(luna.betId);
    expect(getBet(ze.betId!)?.id).toBe(ze.betId);
  });

  it('pt-BR Influencer + Kiko tags match dialog speakers', () => {
    setLocale('pt-BR');
    expect(t('npc.influencer.name')).toMatch(/Influenciador/i);
    expect(t('npc.influencer.name')).not.toBe('Influencer Odds');
    expect(t('npc.kiko.name')).toBe('Kiko Calçadão');
    expect(t('story.feira-kiko.0.speaker')).toBe(t('npc.kiko.name'));
    expect(t('ui.skill.matchNext')).not.toMatch(/\bMatch\b/);
    setLocale('en');
  });

  it('clues do not echo correct option tokens for giveaway gates', () => {
    const checks: { id: string; banned: RegExp }[] = [
      {
        id: 'side-morro-copper',
        banned:
          /\blight bright\b|\bheavy rust\b|\bwet coil\b|\bflutua\b|\bhonest spare floats\b/i,
      },
      {
        id: 'feira-garrafa',
        banned:
          /\bgreen glass\b|\bcorp clear\b|\bneon pink\b|\bvidro verde\b|\balley stamp\b/i,
      },
      {
        id: 'feira-lockbox',
        banned: /\bhalfway\b|\briser\b|\bsunk\b|\bafundado\b|\bshoulder plate\b/i,
      },
      {
        id: 'prova-vazamento',
        banned:
          /\bpit ledger\b|\blivro do sal[aã]o\b|\bkill shot\b|\bquiet arithmetic\b/i,
      },
      {
        id: 'laje-lottery',
        banned: /\bhill chalk\b|\bgiz do morro\b|\bunmarked\b|\bcommunity sack\b/i,
      },
    ];
    for (const { id, banned } of checks) {
      const clue = SKILL_PHASE_TABLE[id]?.clue ?? '';
      expect(clue.length, id).toBeGreaterThan(12);
      expect(clue, id).not.toMatch(banned);
      const opts = SKILL_PHASE_TABLE[id]?.options ?? [];
      for (const opt of opts) {
        const token = opt.split(/\s+/)[0]!;
        if (token.length >= 4) {
          expect(clue.toLowerCase()).not.toContain(token.toLowerCase());
        }
      }
    }
  });
});
