// ─── Game Constants ────────────────────────────────────
// All numeric constants as typed const values.
// Extracted from the vanilla JS codebase for type safety.

export const SAVE_KEY = 'myvt_gacha_save';
export const SAVE_VERSION = 9;
export const VGEM_PER_TICKET = 150;
export const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds
export const OFFLINE_EARNINGS_CAP_HOURS = 12;
export const TRAINED_ARCHIVE_CAP = 70;

// ─── Gacha Rates ──────────────────────────────────────

export const BASE_RATES = { R: 0.70, SR: 0.22, SSR: 0.07, UR: 0.01 } as const;
export const SOFT_PITY_SSR = 40;
export const SOFT_PITY_UR = 80;
export const HARD_PITY = 90;
export const FEATURED_CHARACTERS = ['liliana-vampaia', 'lunaris-urufi'] as const;
export const FEATURED_RATE_UP = 0.75;
export const ECHO_MAX = 6;
export const ECHO_GAINS = {
        R: { primary: 20, secondary: 10 },
        SR: { primary: 23, secondary: 15 },
        SSR: { primary: 25, secondary: 18 },
        UR: { primary: 25, secondary: 18 }
} as const;
export const E6_LIVECACHE = { R: 20, SR: 50, SSR: 100, UR: 200 } as const;
export const RARITY_MULTIPLIERS = { R: 1, SR: 2, SSR: 5, UR: 10 } as const;

// ─── Level Caps ───────────────────────────────────────

export const LEVEL_CAPS = { R: 20, SR: 35, SSR: 50, UR: 70 } as const;

// ─── Stamina System ───────────────────────────────────

export const STAMINA_MAX = 180;
export const STAMINA_RECOVERY_INTERVAL_MS = 4 * 60 * 1000; // 1 point every 4 minutes
export const LIVEON_STAMINA_COST = 30;
export const MINIGAME_STAMINA_COST = 15;

// ─── Bond System ──────────────────────────────────────

export const BOND_LEVELS = [
        { level: 1, bpRequired: 100, statBonus: 2 },
        { level: 2, bpRequired: 250, statBonus: 3 },
        { level: 3, bpRequired: 500, statBonus: 3 },
        { level: 4, bpRequired: 800, statBonus: 4 },
        { level: 5, bpRequired: 1200, statBonus: 4 },
        { level: 6, bpRequired: 1800, statBonus: 5 },
        { level: 7, bpRequired: 2500, statBonus: 5 },
        { level: 8, bpRequired: 3500, statBonus: 6 }
] as const;
export const BOND_MAX_LEVEL = 8;
export const BOND_DATE_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours
export const BOND_DATE_BOND_REQ = 4;

// ─── Producer System ──────────────────────────────────

export const PRODUCER_MAX_LEVEL = 30;
export const PRODUCER_INITIAL_EXP_CAP = 10;
export const PRODUCER_EXP_CAP_GROWTH = 1.2;
export const PRODUCER_REWARD_LEVELS = [10, 15, 20, 25, 30] as const;
export const PRODUCER_REWARD_TICKETS = 10;

// ─── Daily Login ──────────────────────────────────────

export const DAILY_BASE_VGEMS = 100;
export const DAILY_INCREMENT_VGEMS = 50;
export const DAILY_CAP_VGEMS = 500;
export const DAILY_BASE_TICKETS = 1;
export const DAILY_CAP_TICKETS = 3;
export const OSHI_MAX = 6;

// ═══════════════════════════════════════════════════════
// Live!ON — Training Simulator Constants
// ═══════════════════════════════════════════════════════
//
// 16-turn roguelite campaign: 4 Cycles × 4 Turns.
// Cycle focus order: C1=MG, C2=VC, C3=TC, C4=CH.
//
// Turn layout per cycle:
//   T1  Practice Stream   (3-round minigame, earn hype → stat gain)
//   T2  Excursion         (VN event, 3 choices: tryhard/normal/chill)
//   T3  Free Schedule     (rest/train/shop)
//   T4  Algorithm War     (5-round checkpoint boss, beat rival CCV)

// ── Cycle & Turn Structure ────────────────────────────

export const LIVEON_CYCLES = 4;
export const LIVEON_TURNS_PER_CYCLE = 4;
export const LIVEON_MAX_TURNS = LIVEON_CYCLES * LIVEON_TURNS_PER_CYCLE; // 16

/** Cycle number → focus stat: C1=MG, C2=VC, C3=TC, C4=CH */
export const CYCLE_FOCUS_ORDER = ['mg', 'vc', 'tc', 'ch'] as const;

// ── PS (Passion) System ───────────────────────────────
// PS is the in-run "battery." Capped at LIVEON_BASE_PS (100).
// Spending PS to 0 triggers "Dead Air" (forced 0-hype action).

export const LIVEON_BASE_PS = 100;

/** Hydration Break button recovers this much PS */
export const LIVEON_PS_RECOVERY_HYDRATION = 15;
/** Free Schedule → Rest action recovers this much PS */
export const LIVEON_PS_RECOVERY_REST = 50;

/** Excursion choice PS costs / gains */
export const LIVEON_PS_COST_EXCURSION = {
        tryhard: -30,
        normal: -10,
        chill: 20
} as const;

// ── Practice Stream (Turn 1, 3 rounds) ────────────────

export const PRACTICE_STREAM_ROUNDS = 3;

/** Stat gain on success (hype >= target) or fail */
export const PRACTICE_STAT_GAIN = {
        success: 30,
        fail: 10
} as const;

// ── Algorithm War (Turn 4, 5 rounds) ──────────────────

export const ALGORITHM_WAR_ROUNDS = 5;

/** Chat Trends: random stat per round, matching actions get +50% hype */
export const ALGORITHM_WAR_CHAT_TREND_CHANCE = 0.5;
export const ALGORITHM_WAR_CHAT_TREND_HYPE_MULT = 1.5;

// ── Climax Round (Round 5 of Algorithm War) ───────────
// All hype ×2.0 AND all PS costs ×2.0.

export const CLIMAX_ROUND_HYPE_MULT = 2.0;
export const CLIMAX_ROUND_PS_COST_MULT = 2.0;

// ── Coach Assists ─────────────────────────────────────
// 15% chance per round for a coach to "raid."
// Turns one RNG button gold: 0 PS, ignores requirements, 2.0× hype.

export const COACH_ASSIST_CHANCE = 0.15;
export const COACH_ASSIST_HYPE_MULT = 2.0;
export const COACH_ASSIST_PS_COST = 0;

// ── Coach Inspiration Formula ─────────────────────────
// Each coach donates: (Coach Final Stat / 10) × Grade Multiplier
// Applied to the lead VTuber's starting stats at Turn 1.

export const COACH_INSPIRATION_DIVISOR = 10;
export const COACH_GRADE_MULTIPLIER = { B: 0.5, A: 1.0, S: 1.5 } as const;

// ── Minigame Button Formulas ──────────────────────────
// 3 RNG buttons + 1 permanent recovery button per round.
// "Requirement" = minimum focus-stat value to unlock.
// "Hype" = base hype generated (before multipliers).
// "Cost" = PS change (negative = spend, positive = recover).

/** Button 1: "Clip It!" — High tier */
export const BTN_CLIP_IT_REQUIREMENT = (cycle: number): number => 50 * cycle;
export const BTN_CLIP_IT_HYPE = (stat: number, cycle: number): number =>
        Math.floor(stat * 1.5) + 50 * cycle;
export const BTN_CLIP_IT_COST = -10;

/** Button 2: "Standard" — Mid tier */
export const BTN_STANDARD_REQUIREMENT = (cycle: number): number => 20 * cycle;
export const BTN_STANDARD_HYPE = (stat: number, cycle: number): number =>
        Math.floor(stat * 1.0) + 20 * cycle;
export const BTN_STANDARD_COST = -20;

/** Button 3: "Scuffed" — Low tier (always unlocked) */
export const BTN_SCUFFED_REQUIREMENT = 0;
export const BTN_SCUFFED_HYPE = (stat: number): number =>
        Math.floor(stat * 0.2) + 10;
export const BTN_SCUFFED_COST = -35;

/** Button 4: "Hydration Break" — Recovery (always unlocked) */
export const BTN_HYDRATION_REQUIREMENT = 0;
export const BTN_HYDRATION_HYPE = 0;
export const BTN_HYDRATION_COST = 15; // positive = recover PS

// ── Hype Targets (lookup by cycle) ────────────────────
// Formula: Practice = (100 × C) × 1.5 | Algorithm War = (300 × C) × 1.5

export const PRACTICE_HYPE_TARGETS = [0, 150, 300, 450, 600] as const;
export const ALGORITHM_WAR_HYPE_TARGETS = [0, 450, 900, 1350, 1800] as const;

// ── Subscriber Gain Formulas ──────────────────────────
// Mid-turn streams: Total Hype × 2
// Excursion: tryhard=500, normal=200, chill=0
// Checkpoint win: Rival CCV × 5 × C

export const SUB_GAIN_MIDTURN_HYPE_MULT = 2;
export const SUB_GAIN_EXCURSION = { tryhard: 500, normal: 200, chill: 0 } as const;
export const CHECKPOINT_WIN_SUB_GAINS = [0, 2250, 9000, 20250, 36000] as const;

// ── Grade System (Turn 16 / End of Run) ───────────────
// B: Fail checkpoint 4 → subs × 1.0
// A: Pass checkpoint 4 → subs × 1.2
// S: Exceed checkpoint 4 by ≥20% → subs × 1.5

export const RUN_GRADE_SUB_MULTIPLIER = { B: 1.0, A: 1.2, S: 1.5 } as const;
export const RUN_GRADE_S_EXCEED_THRESHOLD = 0.20; // 20% over checkpoint 4 target

// ── Excursion Stat Gains (for cycle focus stat) ───────

export const EXCURSION_STAT_GAIN = { tryhard: 30, normal: 15, chill: 5 } as const;

// ── In-Run Currency ───────────────────────────────────
// Earned during streams, spent at the shop on Turn 3.

export const INRUN_CURRENCY_BASE_EARN = 50;
export const INRUN_CURRENCY_PER_HYPE = 0.1;
export const SHOP_ITEM_COST_RANGE = [30, 150] as const;

// ─── Onboarding ──────────────────────────────────────

export const ONBOARDING_SCREENS = [
        {
                title: 'Welcome, Producer!',
                body: 'Your VTuber agency just received its license. The algorithm is hungry, the chat is waiting, and your talents are ready to debut. As the Producer, it\'s your job to scout, train, and guide them to stardom.',
                icon: 'star'
        },
        {
                title: 'Training Simulator',
                body: 'Live!ON is a training campaign — 4 cycles, 16 turns. Each cycle focuses on one skill: Management, Vocal, Tech, and Charisma. Practice streams build hype, excursions unlock events, and Algorithm Wars test your progress against rival streamers.',
                icon: 'campaign'
        },
        {
                title: 'Your Mentor Team',
                body: 'Every great agency starts somewhere. You\'ve been assigned three trainee coaches — a variety streamer, a gaming specialist, and a vocal talent. They\'ll inspire your lead VTuber with stat bonuses during training runs.',
                icon: 'team'
        },
        {
                title: 'Know Your Resources',
                body: 'VGems are your premium currency — spend them on gacha pulls to scout new VTubers. Blue Tickets guarantee a pull. Stamina recharges over time and fuels your training runs. LiveCache accumulates from dupes and is used for upgrades.',
                icon: 'resources'
        },
        {
                title: 'Your Journey Starts Now',
                body: 'Pull your first VTubers, build your roster, and dive into training. The algorithm favours the bold — and you\'ve got this, Producer.',
                icon: 'rocket'
        }
] as const;

/** Starter coach definitions — granted to every new player */
export const STARTER_COACHES = [
        {
                slug: 'starter-mina',
                name: 'Mina',
                rarity: 'SR' as const,
                title: 'Variety Streamer',
                tagline: 'Jack of all trades, master of chat.',
                stats: { st: 25, ps: 30, tc: 22, ch: 28, vc: 22, mg: 25 },
                grade: 'B' as const,
                passive: { stat: 'ch', label: 'Zatsudan Pro', desc: '+3 Charisma to lead' }
        },
        {
                slug: 'starter-rex',
                name: 'Rex',
                rarity: 'SR' as const,
                title: 'Gaming Specialist',
                tagline: 'Frame-perfect plays, zero chill.',
                stats: { st: 20, ps: 25, tc: 38, ch: 18, vc: 18, mg: 42 },
                grade: 'B' as const,
                passive: { stat: 'mg', label: 'Speedrun Mentality', desc: '+5 Management to lead' }
        },
        {
                slug: 'starter-luna',
                name: 'Luna',
                rarity: 'SR' as const,
                title: 'Vocal Talent',
                tagline: 'Golden pipes and silver notes.',
                stats: { st: 20, ps: 25, tc: 18, ch: 22, vc: 42, mg: 18 },
                grade: 'B' as const,
                passive: { stat: 'vc', label: 'Golden Pipes', desc: '+3 Vocal to lead' }
        }
] as const;

// ─── Superchat Toss Constants ─────────────────────────

export const TOSS_BASE_ROUND_DURATION = 30;
export const TOSS_SUPER_MODE_DURATION = 5;
export const TOSS_BOOST_DECAY_RATE = 1;
export const TOSS_BUBBLE_BASE_SPEED = 120;
export const TOSS_GEM_REWARD_THRESHOLDS = [250, 500, 1000] as const;
export const TOSS_LIVECACHE_RATIO = 0.1;
export const TOSS_VRINGGIT_RATIO = 0.15;
export const TOSS_CHALLENGE_SCORE_THRESHOLD = 300;
