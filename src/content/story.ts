import type { StoryBeat } from '../core/types';

/** Main story (~20 min) — English text, Brazilian cyberpunk flavor. */
export const STORY_BEATS: readonly StoryBeat[] = [
  {
    id: 'intro-laje',
    title: 'Wake up on the laje',
    districtId: 'morro-neon',
    requiredFlags: [],
    setsFlags: ['conheceu_rita'],
    dialogue: [
      {
        speaker: 'Rita Odds',
        text: 'Another day, another odd. Even the sun over Morro Neon looks sponsored.',
      },
      {
        speaker: 'Rita Odds',
        text: 'My debt to Casa Suprema is due at midnight. I need a plan — or a miracle.',
      },
    ],
  },
  {
    id: 'boteco-nair',
    title: "Dona Nair's boteco",
    districtId: 'morro-neon',
    requiredFlags: ['conheceu_rita'],
    setsFlags: ['falou_nair'],
    betId: 'agua-gelada',
    dialogue: [
      {
        speaker: 'Dona Nair',
        text: 'E aí, Rita? Face of someone who owes the corp. Want water? You have to bet — city law.',
      },
      {
        speaker: 'Rita Odds',
        text: 'What a country. Hit me with the ice-water odd.',
      },
      {
        speaker: 'Dona Nair',
        text: 'Luna was here. Said she found a leak in the Casa RNG. Look for her in the pixo alley.',
      },
    ],
  },
  {
    id: 'luna-beco',
    title: 'Pixo alley',
    districtId: 'morro-neon',
    requiredFlags: ['falou_nair'],
    setsFlags: ['conheceu_luna'],
    betId: 'laje-lottery',
    dialogue: [
      {
        speaker: 'Luna Pixel',
        text: 'Rita… I pulled a slice of their algorithm. But Seu Zé only trades the pendrive if you beat the rooftop draw.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Street lotteries got wiped when the corps took over. Now even the laje plays by Casa rules.',
      },
    ],
  },
  {
    id: 'seu-ze-banca',
    title: "Seu Zé's booth",
    districtId: 'morro-neon',
    requiredFlags: ['conheceu_luna'],
    setsFlags: ['unlocked_feira'],
    betId: 'corrida-moto',
    unlocksDistrict: 'feira-central',
    dialogue: [
      {
        speaker: 'Seu Zé',
        text: 'Everything’s licensed now, kid. Want Luna’s chip? Win the rooftop moto race.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Deal. Let’s see if this race is enough to buy Luna’s chip.',
      },
      {
        speaker: 'Seu Zé',
        text: 'Pode crer. Win first — routes come after.',
      },
    ],
  },
  {
    id: 'feira-kiko',
    title: 'Sidewalk of odds',
    districtId: 'feira-central',
    requiredFlags: ['unlocked_feira'],
    setsFlags: ['falou_kiko'],
    betId: 'pastel-surpresa',
    dialogue: [
      {
        speaker: 'Kiko Calçadão',
        text: 'Olha o pastel! Olha a odd! The calçadão shines like Copacabana, except every stone is a market.',
      },
      {
        speaker: 'Rita Odds',
        text: 'I need Odds Avenue. The Casa is hiding the code.',
      },
      {
        speaker: 'Kiko Calçadão',
        text: 'Bia Forró runs the pirate set. If the crowd dances, corp militia opens the gate — scared of the party.',
      },
    ],
  },
  {
    id: 'bia-set',
    title: 'Pirate synth-forró set',
    districtId: 'feira-central',
    requiredFlags: ['falou_kiko'],
    setsFlags: ['festa_rolando'],
    betId: 'samba-odds',
    dialogue: [
      {
        speaker: 'Bia Forró',
        text: 'If the bass doesn’t shake the laje, the revolution won’t stick. Bet on samba against the corp jingle.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Bet. Tonight the floor is ours.',
      },
    ],
  },
  {
    id: 'prova-luna',
    title: 'Pendrive on a freela',
    districtId: 'feira-central',
    requiredFlags: ['festa_rolando'],
    setsFlags: ['unlocked_avenida', 'tem_prova'],
    betId: 'prova-vazamento',
    unlocksDistrict: 'avenida-odds',
    dialogue: [
      {
        speaker: 'Luna Pixel',
        text: 'While the party rolls, we slip the leak through. Bet whether the file opens.',
      },
      {
        speaker: 'Rita Odds',
        text: 'If it opens, Odds Avenue is next — and I’m bringing the whole city on my back.',
      },
    ],
  },
  {
    id: 'avenida-checkpoint',
    title: "Captain's checkpoint",
    districtId: 'avenida-odds',
    requiredFlags: ['unlocked_avenida'],
    setsFlags: ['passou_checkpoint'],
    betId: 'pixo-challenge',
    dialogue: [
      {
        speaker: 'Captain Vespera',
        text: 'Papers and chips. No odd, no passage. Or… paint the facade and prove you’ve got street blood.',
      },
      {
        speaker: 'Rita Odds',
        text: 'I’ll take pixo over a stamp. Send the odd.',
      },
    ],
  },
  {
    id: 'lobby-margin',
    title: 'Coffee with Dr. Margin',
    districtId: 'avenida-odds',
    requiredFlags: ['passou_checkpoint'],
    setsFlags: ['escandalo_aberto', 'unlocked_torre'],
    betId: 'audiencia-publica',
    unlocksDistrict: 'torre-casa',
    dialogue: [
      {
        speaker: 'Dr. Margin',
        text: 'Regulation is just another table. Want a public hearing? Wager. Win, and the scandal trends.',
      },
      {
        speaker: 'Rita Odds',
        text: 'People will see the house edge eating schools, hospitals, and water.',
      },
      {
        speaker: 'Dr. Margin',
        text: 'The hearing decides everything. Place your chips — the mic is already bought.',
      },
    ],
  },
  {
    id: 'torre-final',
    title: 'Duel at Casa Suprema Tower',
    districtId: 'torre-casa',
    requiredFlags: ['unlocked_torre', 'escandalo_aberto'],
    setsFlags: ['casa_quebrada', 'final_bom'],
    betId: 'duelo-casa',
    isEnding: true,
    endingId: 'povo-no-controle',
    dialogue: [
      {
        speaker: 'Augusto Casa',
        text: 'All of Brazil is my casino. You’re just another chip.',
      },
      {
        speaker: 'Rita Odds',
        text: 'A chip? I’m the hill, the fair, the calçadão, and the pixo. Roll the dice.',
      },
      {
        speaker: 'Augusto Casa',
        text: 'One last odd, then. High stakes. No appeals.',
      },
    ],
  },
] as const;

export function getBeat(id: string): StoryBeat | undefined {
  return STORY_BEATS.find((b) => b.id === id);
}
