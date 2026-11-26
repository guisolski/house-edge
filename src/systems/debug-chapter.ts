/** QA / playtest: jump a new game to a late story beat via `?chapter=`. */

import type { DistrictId } from '../core/types';

export type DebugChapterId = 'feira' | 'avenida' | 'torre' | 'vip' | 'epilogue';

export type DebugChapterPreset = {
  /** Complete story beats in order through this id (inclusive). */
  completeThrough: string;
  district: DistrictId;
  credits: number;
  reputation: number;
  /** Land on VIP salon after elevator. */
  vipFloor?: boolean;
  /** Extra flags after beat completion (avoids ending UI for epilogue). */
  extraFlags?: string[];
  /** Skip completing the ending beat; set flags instead. */
  skipEndingBeat?: boolean;
};

export const DEBUG_CHAPTERS: Record<DebugChapterId, DebugChapterPreset> = {
  feira: {
    completeThrough: 'seu-ze-banca',
    district: 'feira-central',
    credits: 280,
    reputation: 14,
  },
  avenida: {
    completeThrough: 'prova-luna',
    district: 'avenida-odds',
    credits: 360,
    reputation: 24,
  },
  torre: {
    completeThrough: 'lobby-margin',
    district: 'torre-casa',
    credits: 480,
    reputation: 36,
  },
  vip: {
    completeThrough: 'torre-elevator',
    district: 'torre-casa',
    credits: 540,
    reputation: 42,
    vipFloor: true,
  },
  epilogue: {
    // Avoid torre-final isEnding emit — set victory flags manually.
    completeThrough: 'torre-negotiate',
    district: 'morro-neon',
    credits: 640,
    reputation: 55,
    skipEndingBeat: true,
    extraFlags: ['casa_quebrada', 'final_bom', 'free_roam'],
  },
};

export function parseDebugChapter(raw: string | null | undefined): DebugChapterId | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (key in DEBUG_CHAPTERS) return key as DebugChapterId;
  return null;
}
