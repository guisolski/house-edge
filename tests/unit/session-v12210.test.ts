import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ptBR } from '../../src/i18n/pt-BR';
import { setLocale, t } from '../../src/i18n';
import { districtNpcs } from '../../src/systems/interaction';
import { GameSession } from '../../src/systems/session';

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

describe('v1.22.10 memory + i18n + world', () => {
  beforeEach(stubStorage);

  it('travel cycles do not grow EventBus listeners', () => {
    const session = new GameSession();
    session.startNew();
    for (const id of ['feira-central', 'avenida-odds', 'torre-casa'] as const) {
      session.world.unlock(id);
    }
    const baseline = session.bus.totalListeners();
    for (let i = 0; i < 50; i += 1) {
      session.travelTo('feira-central');
      session.travelTo('avenida-odds');
      session.travelTo('morro-neon');
    }
    expect(session.bus.totalListeners()).toBe(baseline);
  });

  it('skill offer/cancel cycles leave listener count stable', () => {
    const session = new GameSession();
    session.startNew();
    session.player.addCredits(500);
    session.story.setFlag('conheceu_rita', true);
    session.story.setFlag('falou_nair', true);
    const baseline = session.bus.totalListeners();
    for (let i = 0; i < 50; i += 1) {
      expect(session.offerBet('agua-gelada')).toBe(true);
      session.cancelBet();
    }
    expect(session.bus.totalListeners()).toBe(baseline);
  });

  it('pt-BR miss hints drop English Host/Cam/sweep tokens', () => {
    setLocale('pt-BR');
    expect(t('ui.toast.missHint.torre-vip')).not.toMatch(/\bHost\b|\bsweep\b/i);
    expect(t('ui.toast.missHint.avenida-stealth')).not.toMatch(/\bCam Tech\b/i);
    expect(t('ui.toast.missHint.torre-vip')).toMatch(/Anfitrião|varredura/);
    expect(t('ui.toast.missHint.avenida-stealth')).toMatch(/Tech das Câmeras/);
  });

  it('pt-BR catalog rejects common English leftover tokens', () => {
    const banned =
      /\b(Host|Cam Tech|sweep|oddsmom|deadman|Lotaria de rua morreu|tá no folha)\b/;
    const hits: string[] = [];
    for (const [key, value] of Object.entries(ptBR)) {
      if (typeof value !== 'string') continue;
      if (banned.test(value)) hits.push(`${key}: ${value}`);
    }
    expect(hits, hits.join('\n')).toEqual([]);
  });

  it('Luna tip and elevator panel speakers are localized', () => {
    setLocale('pt-BR');
    expect(t('ui.minigameTip.lajeLottery')).toMatch(/chuva de laje/i);
    expect(t('story.torre-elevator.0.speaker')).toBe('Painel');
    expect(t('story.torre-elevator.2.speaker')).toBe('Painel');
    expect(t('story.morro-fios.0.text')).not.toMatch(/mãe das odds/i);
    expect(t('story.avenida-twist.4.text')).toMatch(/na folha/);
  });

  it('Feira Lavador and Pirateiro sit on open plaza asphalt', () => {
    const lav = districtNpcs().find((n) => n.id === 'lavador-feira')!;
    const radio = districtNpcs().find((n) => n.id === 'radio-pirate')!;
    expect(lav.y).toBeLessThan(16);
    expect(radio.y).toBeLessThan(16);
    expect(Math.abs(lav.x - radio.x)).toBeGreaterThan(4);
  });
});
