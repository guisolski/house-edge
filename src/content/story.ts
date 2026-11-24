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
        text: 'Luna’s been sniffing around the LED antenna. Pirate signal nonsense. Ask the tech on the hill first.',
      },
    ],
  },
  {
    id: 'morro-antena',
    title: 'Climb the LED antenna',
    districtId: 'morro-neon',
    requiredFlags: ['falou_nair'],
    setsFlags: ['antena_ok'],
    betId: 'antena-sinal',
    dialogue: [
      {
        speaker: 'Antena Tech',
        text: 'Casa chopped the hill’s Wi‑Fi and sold it back drip by drip. I can jack a pirate feed off the LED tower — if you bet the climb.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Up the rust ladder, past the neon cross. Let’s see if this hill still hears the street.',
      },
      {
        speaker: 'Antena Tech',
        text: 'Signal’s clean, you hear Luna on the beco. If you wipe out, I catch the antenna — not you.',
      },
    ],
  },
  {
    id: 'luna-beco',
    title: 'Pixo alley',
    districtId: 'morro-neon',
    requiredFlags: ['antena_ok'],
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
    id: 'morro-fios',
    title: 'Wire chase on the lajes',
    districtId: 'morro-neon',
    requiredFlags: ['conheceu_luna'],
    setsFlags: ['fios_ok'],
    betId: 'fio-corrida',
    dialogue: [
      {
        speaker: 'Fio Ladrão',
        text: 'Your chip’s on my line, oddsmom. I sprint the lajes faster than Casa billing.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Thief! Every meter of copper on this hill is community property.',
      },
      {
        speaker: 'Fio Ladrão',
        text: 'Bet the chase. Catch me and Seu Zé gets his wire back. Lose and I vanish into the neon.',
      },
    ],
  },
  {
    id: 'seu-ze-banca',
    title: "Seu Zé's booth",
    districtId: 'morro-neon',
    requiredFlags: ['fios_ok'],
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
        text: 'Talk to the catador by the stalls. He sees everything tossed in the calçadão trash.',
      },
    ],
  },
  {
    id: 'feira-catador',
    title: 'Bottle scavenger',
    districtId: 'feira-central',
    requiredFlags: ['falou_kiko'],
    setsFlags: ['catador_ok'],
    betId: 'feira-garrafa',
    dialogue: [
      {
        speaker: 'Catador da Feira',
        text: 'Corp bottle deposit pays pennies. I bet the sack weight — you help me sift the plaza before militia sweeps.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Fine. If your pile hits quota, what do I get?',
      },
      {
        speaker: 'Catador da Feira',
        text: 'Rumor Bia’s forró set is tonight. Win the garrafa odd and I point you to the speakers.',
      },
    ],
  },
  {
    id: 'bia-set',
    title: 'Pirate synth-forró set',
    districtId: 'feira-central',
    requiredFlags: ['catador_ok'],
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
    id: 'feira-forro',
    title: 'Crowd surge on the calçadão',
    districtId: 'feira-central',
    requiredFlags: ['festa_rolando'],
    setsFlags: ['forro_ok'],
    betId: 'forro-crowd',
    dialogue: [
      {
        speaker: 'DJ Forró',
        text: 'Corpo wants a static crowd — easy to count, easy to tax. Bet whether this square erupts into dance.',
      },
      {
        speaker: 'Rita Odds',
        text: 'If the calçadão moves, militia gets nervous. I’m wagering on sweat and sax.',
      },
      {
        speaker: 'DJ Forró',
        text: 'Party peaks, Luna slides the pendrive handoff. Miss the beat and we try again.',
      },
    ],
  },
  {
    id: 'feira-courier',
    title: 'Calçadão courier tip',
    districtId: 'feira-central',
    requiredFlags: ['forro_ok'],
    setsFlags: ['courier_ok'],
    dialogue: [
      {
        speaker: 'Lavador da Feira',
        text: 'Party’s loud enough. Luna’s waiting with the pendrive — but militia sniffs USB heat.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Then I need a clean walk to her. Any cover?',
      },
      {
        speaker: 'Lavador da Feira',
        text: 'Stay on the asphalt strip. Stalls block the side alleys. She’s east of the FEIRA sign.',
      },
    ],
  },
  {
    id: 'prova-luna',
    title: 'Pendrive on a freela',
    districtId: 'feira-central',
    requiredFlags: ['courier_ok'],
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
    id: 'avenida-twist',
    title: 'Leak or plant?',
    districtId: 'avenida-odds',
    requiredFlags: ['unlocked_avenida'],
    setsFlags: ['twist_visto'],
    betId: 'twist-vazamento',
    dialogue: [
      {
        speaker: 'Mole Contact',
        text: 'Your “leak” smells like Casa bait. I heard whispers — could be a mole feeding Luna bad bytes.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Luna wouldn’t… would she? I need truth before I march on the boulevard.',
      },
      {
        speaker: 'Mole Contact',
        text: 'Bet the twist. Win and we know if the vazamento is real. Lose and assume the corp wrote the script.',
      },
    ],
  },
  {
    id: 'avenida-checkpoint',
    title: "Captain's checkpoint",
    districtId: 'avenida-odds',
    requiredFlags: ['twist_visto'],
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
    id: 'avenida-influencer',
    title: 'Influencer duel',
    districtId: 'avenida-odds',
    requiredFlags: ['passou_checkpoint'],
    setsFlags: ['influencer_ok'],
    betId: 'influencer-duelo',
    dialogue: [
      {
        speaker: 'Odds Influencer',
        text: 'Live from Odds Avenue! Casa pays me per view. Bet whether street pixo beats my sponsored glow.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Your audience is rented. Mine grew up on this asphalt.',
      },
    ],
  },
  {
    id: 'avenida-atm',
    title: 'ATM glitch hunt',
    districtId: 'avenida-odds',
    requiredFlags: ['influencer_ok'],
    setsFlags: ['atm_ok'],
    betId: 'avenida-atm',
    dialogue: [
      {
        speaker: 'ATM Hacker',
        text: 'Casa ATMs round down to the centavo and pocket the drift. Bet you can trigger the glitch before lockout.',
      },
      {
        speaker: 'Rita Odds',
        text: 'Every chipped coin buys time. Run the exploit.',
      },
    ],
  },
  {
    id: 'lobby-margin',
    title: 'Coffee with Dr. Margin',
    districtId: 'avenida-odds',
    requiredFlags: ['atm_ok'],
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
    id: 'torre-vip',
    title: 'VIP floor',
    districtId: 'torre-casa',
    requiredFlags: ['unlocked_torre', 'escandalo_aberto'],
    setsFlags: ['vip_ok'],
    betId: 'torre-vip',
    dialogue: [
      {
        speaker: 'VIP Host',
        text: 'Elevator’s open but the high rollers want entertainment. Skim the VIP table — bet the rake before security blinks.',
      },
      {
        speaker: 'Rita Odds',
        text: 'One quiet hand at the top, then I face Augusto himself.',
      },
    ],
  },
  {
    id: 'torre-final',
    title: 'Duel at Casa Suprema Tower',
    districtId: 'torre-casa',
    requiredFlags: ['vip_ok'],
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
