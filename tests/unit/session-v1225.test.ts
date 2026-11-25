import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { districtNpcs } from '../../src/systems/interaction';
import { buildDistrictMap, isWalkable } from '../../src/world/maps';
import { setLocale, t } from '../../src/i18n';
import { SKILL_PHASE_TABLE } from '../../src/content/skill-phases';
import {
  attemptSkill,
  judgePhase,
  skillForBet,
  startSkill,
} from '../../src/systems/minigame';
import {
  AVENIDA_DRONE_STEALTH,
  anyDroneSpots,
  startStealth,
} from '../../src/systems/stealth';

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

describe('v1.22.5 reputation clamp', () => {
  beforeEach(stubStorage);

  it('never goes below 0 on repeated losses', () => {
    const session = new GameSession(3101);
    session.startNew();
    session.player.addReputation(5);
    for (let i = 0; i < 40; i += 1) session.player.addReputation(-1);
    expect(session.player.getStats().reputation).toBe(0);
  });
});

describe('v1.22.5 Enter never starts dialogue', () => {
  beforeEach(stubStorage);

  it('Enter/Space interact from input is ignored for talk', () => {
    const session = new GameSession(3102);
    session.startNew();
    const nair = session.npcs.find((n) => n.id === 'dona-nair')!;
    session.player.setPosition(nair.x, nair.y + 1);
    session.noteInteractPressed('Enter');
    expect(session.interact(true)).toBe(false);
    session.noteInteractRelease();
    session.noteInteractPressed('Space');
    expect(session.interact(true)).toBe(false);
    session.noteInteractRelease();
    session.noteInteractPressed('KeyE');
    expect(session.interact(true)).toBe(true);
  });

  it('continueExploring sets rematchNeedsKeyE so Enter stays blocked', () => {
    const session = new GameSession(3103);
    session.startNew();
    session.story.setFlag('casa_quebrada', true);
    (session as unknown as { creditsRoll: boolean }).creditsRoll = true;
    session.ui.go('ending');
    expect(session.continueExploring()).toBe(true);
    session.noteInteractPressed('Enter');
    expect(session.allowInteractInput()).toBe(false);
  });

  it('60ms Enter mash after hold-through-arm never clears the confirm gate', () => {
    const session = new GameSession(3104);
    session.startNew();
    session.runStoryBeat('boteco-nair');
    const t0 = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(t0);
    session.noteModalOpened(false);
    session.noteInteractPressed('Enter');
    session.bumpModalConfirmArm();
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 700);
    expect(session.allowModalConfirm()).toBe(false);
    session.noteInteractRelease();
    // Quiet period after hold-through — mash every 60ms stays blocked.
    for (let i = 0; i < 20; i += 1) {
      const t = t0 + 700 + i * 60;
      vi.spyOn(Date, 'now').mockReturnValue(t);
      session.noteInteractPressed('Enter');
      expect(session.allowModalConfirm()).toBe(false);
      session.bumpModalConfirmArm();
      session.noteInteractRelease();
    }
    // Last bump arm + flush quiet (arm expiry + 400ms).
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 700 + 20 * 60 + 900);
    expect(session.allowModalConfirm()).toBe(true);
    vi.spyOn(Date, 'now').mockRestore();
  });
});

describe('v1.22.5 minigame fairness', () => {
  beforeEach(stubStorage);

  it('sequence phases flash (maxMisses) and negotiate is target-only', () => {
    const atm = SKILL_PHASE_TABLE['avenida-atm']!;
    expect(atm.maxMisses).toBeGreaterThanOrEqual(2);
    expect(atm.sequence?.length).toBeGreaterThanOrEqual(3);
    const neg = SKILL_PHASE_TABLE['torre-negotiate']!;
    expect(judgePhase(neg, 0)).toBe(true);
    expect(judgePhase(neg, 1)).toBe(false);
    expect(judgePhase(neg, 2)).toBe(false);
  });

  it('choice clues do not echo option tokens', () => {
    setLocale('pt-BR');
    const checks: [string, RegExp][] = [
      ['avenida-betrayal', /burner|culpar o contato/i],
      ['audiencia-publica', /carimb|livro do morro/i],
      ['torre-foyer', /vazamento do escândalo/i],
      ['torre-pit', /orelha de cachorro/i],
    ];
    for (const [id, re] of checks) {
      expect(t(`skill.${id}.clue`), id).not.toMatch(re);
      for (const i of [0, 1, 2]) {
        const opt = t(`skill.${id}.option.${i}`);
        if (opt.startsWith('skill.')) continue;
        expect(opt, `${id} option ${i}`).not.toMatch(re);
      }
    }
    expect(t('skill.duelo-casa.phase.1.clue')).not.toMatch(/tremor entrega/i);
    expect(t('skill.duelo-casa.phase.1.option.1')).not.toMatch(/sacode o livro|tremor/i);
  });

  it('Neon Snap column drones cover the mid-lane east sprint', () => {
    const midY = AVENIDA_DRONE_STEALTH.start.y;
    const progress = startStealth(AVENIDA_DRONE_STEALTH);
    // Pin each drone on its column at midY so the dx column-gate fires.
    progress.drones = progress.drones.map((d) => ({
      ...d,
      x: d.path[0]!.x,
      y: midY,
      facing: Math.PI / 2,
    }));
    let spotted = 0;
    for (let x = 13; x <= 33; x += 1) {
      if (anyDroneSpots(progress, { x, y: midY })) spotted += 1;
    }
    // Straight east sprint must be blocked on multiple column tiles (not free).
    expect(spotted).toBeGreaterThanOrEqual(3);
  });

  it('lockpick miss does not advance; cage has pin clue hooks', () => {
    const cage = SKILL_PHASE_TABLE['avenida-server']!;
    expect(cage.clue ?? '').toMatch(/posts|seat|click|flush|stack/i);
    const def = skillForBet('avenida-server', 'lockpick')!;
    const prog = startSkill(def);
    const wrong = attemptSkill(prog, { phaseIndex: 0, value: 0 });
    expect(wrong.done).toBe(false);
    expect(wrong.misses).toBe(1);
  });
});

describe('v1.22.5 Avenida shoulder + NPC spacing', () => {
  beforeEach(stubStorage);

  it('south shoulder y=13 is continuous between column gates', () => {
    const map = buildDistrictMap('avenida-odds');
    for (const x of [14, 15, 16, 18, 22, 24, 26, 30, 32]) {
      expect(isWalkable(map, x, 13), `y13 ${x}`).toBe(true);
    }
    for (const x of [12, 20, 28, 34]) {
      expect(isWalkable(map, x, 13), `column ${x}`).toBe(false);
    }
  });

  it('Odds NPCs stay off each other’s tile (tags show nearest only)', () => {
    const odds = districtNpcs().filter((n) => n.districtId === 'avenida-odds');
    const keys = new Set(odds.map((n) => `${n.x},${n.y}`));
    expect(keys.size).toBe(odds.length);
    for (let i = 0; i < odds.length; i += 1) {
      for (let j = i + 1; j < odds.length; j += 1) {
        const a = odds[i]!;
        const b = odds[j]!;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        expect(d, `${a.id}↔${b.id}`).toBeGreaterThanOrEqual(1.4);
      }
    }
  });
});

describe('v1.22.5 elevator + miss copy pt-BR', () => {
  beforeEach(() => {
    stubStorage();
    setLocale('pt-BR');
  });

  it('elevator card and miss story are localized', () => {
    expect(t('ui.elevatorCard.vip')).toMatch(/Elevador.*Salão VIP.*Andar 42/);
    expect(t('ui.elevatorCard.foyer')).toMatch(/Elevador/);
    expect(t('ui.toast.missedStory')).not.toMatch(/cena continua aberta/);
    expect(t('ui.credits.line.4')).toMatch(/a reviravolta/);
  });
});
