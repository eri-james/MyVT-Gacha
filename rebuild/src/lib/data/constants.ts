// ─── Game Constants ────────────────────────────────────
// All numeric constants as typed const values.
// Extracted from the vanilla JS codebase for type safety.

export const SAVE_KEY = 'myvt_gacha_save';
export const SAVE_VERSION = 8;
export const VGEM_PER_TICKET = 150;
export const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds
export const OFFLINE_EARNINGS_CAP_HOURS = 12;

// ─── Station Definitions ──────────────────────────────

export const STATION_DEFS = {
	streamRoom: { name: 'Stream Room', resource: 'vgems' as const, unlockLv: 1 },
	creativeCorner: { name: 'Creative Corner', resource: 'vringgit' as const, unlockLv: 3 },
	practiceHall: { name: 'Practice Hall', resource: 'liveCache' as const, unlockLv: 5 },
	lounge: { name: 'Lounge', resource: 'vringgit' as const, unlockLv: 7 }
} as const;

export const STATION_UPGRADE_COSTS = [0, 200, 800, 2500, 8000] as const;
export const STATION_MULTIPLIERS = [1, 1.5, 2, 3, 5] as const;
export const STUDIO_EXP_RATES = { streamRoom: 1, creativeCorner: 5, practiceHall: 10, lounge: 15 } as const;
export const STUDIO_EXP_RARITY_MULT = { R: 1.0, SR: 1.2, SSR: 1.5, UR: 1.5 } as const;
export const STUDIO_FLAT_BONUS_PER_LEVEL = 5;
export const STUDIO_FLAT_BONUS_PRACTICE_HALL = 1;

// ─── Content System ───────────────────────────────────

export const CONTENT_INTERVAL = 60; // seconds
export const TRENDING_ROTATION_MS = 2 * 60 * 60 * 1000; // 2 hours
export const CONTENT_LOG_MAX = 20;
export const STAMINA_COSTS = [2, 2, 1, 1, 1] as const;

export const CONTENT_TYPES = {
	streamRoom: {
		primary: 'ch' as const,
		secondary: 'vc' as const,
		resource: 'vgems' as const,
		baseReward: 2
	},
	creativeCorner: {
		primary: 'tc' as const,
		secondary: 'mg' as const,
		resource: 'vringgit' as const,
		baseReward: 3
	},
	practiceHall: {
		primary: 'st' as const,
		secondary: 'ps' as const,
		resource: 'liveCache' as const,
		baseReward: 0.5
	},
	lounge: {
		primary: 'ps' as const,
		secondary: 'ch' as const,
		resource: 'vringgit' as const,
		baseReward: 2,
		bonusResource: 'liveCache' as const,
		bonusAmount: 0.2
	}
} as const;

export const QUALITY_TIERS = [
	{ tier: 'SS', minScore: 100, multiplier: 5.0, color: '#ffd700', label: 'Masterpiece' },
	{ tier: 'S', minScore: 75, multiplier: 2.5, color: '#c77dff', label: 'Excellent' },
	{ tier: 'A', minScore: 50, multiplier: 1.5, color: '#42a5f5', label: 'Great' },
	{ tier: 'B', minScore: 30, multiplier: 1.0, color: '#66bb6a', label: 'Good' },
	{ tier: 'C', minScore: 15, multiplier: 0.5, color: '#b0bec5', label: 'Normal' },
	{ tier: 'D', minScore: 0, multiplier: 0.1, color: '#616161', label: 'Poor' }
] as const;

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

// ─── Studio Levels ────────────────────────────────────

export const STATION_LEVELS = [
	{ level: 1, exp: 0, unlocks: 'Stream Room + 2 slots' },
	{ level: 2, exp: 200, unlocks: '+5 flat bonus to all stations' },
	{ level: 3, exp: 600, unlocks: 'Creative Corner' },
	{ level: 4, exp: 1500, unlocks: '+5 flat bonus (total +10)' },
	{ level: 5, exp: 3500, unlocks: 'Practice Hall' },
	{ level: 6, exp: 7000, unlocks: '+5 flat bonus (total +15)' },
	{ level: 7, exp: 12000, unlocks: 'Lounge' },
	{ level: 8, exp: 20000, unlocks: '+5 flat bonus (total +20)' },
	{ level: 9, exp: 35000, unlocks: '+5 flat bonus (total +25)' },
	{ level: 10, exp: 60000, unlocks: '+5 flat bonus (total +30)' }
] as const;

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

// ─── Live!ON Constants ────────────────────────────────

export const LIVEON_MAX_TURNS = 20;
export const LIVEON_AGENCY_VISIT_TURNS = [5, 10, 15] as const;
export const LIVEON_COACH_SLOTS = ['streamer', 'performance', 'stage'] as const;
export const LIVEON_COACH_STAT_MAP = {
	streamer: ['tc', 'ch'],
	performance: ['ch', 'vc'],
	stage: ['vc', 'mg']
} as const;
export const LIVEON_COACH_BASE_BONUS = 10;
export const LIVEON_COACH_RARITY_MULT = { R: 1, SR: 1.5, SSR: 2, UR: 3 } as const;
export const LIVEON_RUN_PS_CAP = 70;
export const LIVEON_CHOICE_TIERS = {
	best: { mult: 1.0, psCost: 2 },
	good: { mult: 0.6, psCost: 5 },
	neutral: { mult: 0.4, psCost: 8 }
} as const;
export const LIVEON_SKIP_SUB_LOSS_PCT = 0.05;
export const LIVEON_SKIP_PS_LOSS = 10;
export const LIVEON_FINALE_COMEBACK_BONUS = 20;
export const LIVEON_FINALE_BASE_TARGET = 1100;
export const LIVEON_FINALE_DIFFICULTY_MULT = 100;
export const LIVEON_ENDING_MULT = { bad: 0.6, neutral: 1.0, good: 1.2 } as const;

// ─── Superchat Toss Constants ─────────────────────────

export const TOSS_BASE_ROUND_DURATION = 30;
export const TOSS_SUPER_MODE_DURATION = 5;
export const TOSS_BOOST_DECAY_RATE = 1;
export const TOSS_BUBBLE_BASE_SPEED = 120;
export const TOSS_GEM_REWARD_THRESHOLDS = [250, 500, 1000] as const;
export const TOSS_LIVECACHE_RATIO = 0.1;
export const TOSS_VRINGGIT_RATIO = 0.15;
export const TOSS_CHALLENGE_SCORE_THRESHOLD = 300;
