// ─── Character Stats ───────────────────────────────────

export enum Stat {
	Stamina = 'st',
	Passion = 'ps',
	Tech = 'tc',
	Charisma = 'ch',
	Voice = 'vc',
	Mgmt = 'mg'
}

export type StatMap = Record<Stat, number>;

export type StatKey = keyof typeof Stat;

export enum Rarity {
	R = 'R',
	SR = 'SR',
	SSR = 'SSR',
	UR = 'UR'
}

export interface CharacterStats {
	st: number; // Stamina (HP-equivalent, consumed by stations & minigame)
	ps: number; // Passion (SP-equivalent, consumed by Live!ON)
	tc: number; // Tech
	ch: number; // Charisma
	vc: number; // Voice
	mg: number; // Management
}

// ─── Character Data (per-player, persisted) ───────────

export interface CharacterData {
	owned: boolean;
	rarity: Rarity;
	echo: number; // 0-6, dupe merge count
	level: number;
	variants: string[]; // ['r'] or ['r','sr'] etc.
	shards: number;
	stats: CharacterStats; // current stats (modified by echo/level/bond)
	baseStats: CharacterStats; // max stat caps (for stamina recovery ceiling)
	bondPoints: number;
	bondLevel: number; // 0-8
	lastDateCooldown: number; // timestamp ms
	lastStaminaRecovery: number; // timestamp ms
}

// ─── Character Roster Entry (from characters.json) ───

export interface CharacterRecord {
	name: string;
	slug: string;
	url: string;
	image: string;
	agency: string;
	rarity: Rarity;
	stats: CharacterStats;
	power: number;
	rarity_data?: {
		debut: string;
		status: string;
		subscribers: number;
		longevity_pts: number;
		follower_pts: number;
		status_pts: number;
		total_pts: number;
	};
}

// ─── Currency ─────────────────────────────────────────

export interface Currencies {
	vgems: number;
	vringgit: number;
	myTicket: { blue: number; red: number };
	liveCache: number;
	// Legacy (preserved for migration, no longer generated)
	stars: number;
	starDust: number;
	starFragments: number;
	bondPoints: number;
	gems: number;
}

// ─── Studio ───────────────────────────────────────────

export type StationId = 'streamRoom' | 'creativeCorner' | 'practiceHall' | 'lounge';

export interface Station {
	level: number;
	assigned: string | null; // character slug
}

export interface ContentEntry {
	timestamp: number;
	stationId: StationId | 'offline';
	stationName: string;
	charSlug: string | null;
	charName: string;
	charImage: string;
	quality: string;
	qualityColor: string;
	qualityLabel: string;
	qualityMultiplier: number;
	rewards: Record<string, number>;
	trendingMatch: boolean;
	staminaCost: number;
	flatBonus?: number;
	isOffline?: boolean;
	contentPieces?: number;
}

export interface StudioState {
	level: number;
	exp: number;
	stations: Record<StationId, Station>;
	contentLog: ContentEntry[];
	lastContentTick: number;
	trendingStat: string | null;
	trendingExpires: number;
}

// ─── Quality Tier ─────────────────────────────────────

export interface QualityTier {
	tier: string;
	minScore: number;
	multiplier: number;
	color: string;
	label: string;
}

// ─── Gacha ────────────────────────────────────────────

export type BannerType = 'standard' | 'featured';

export interface PullResult {
	character: CharacterRecord;
	rarity: Rarity;
	isNew: boolean;
	echo: number;
	liveCacheGained: number;
	vgemsBought?: number;
}

export interface GachaRates {
	R: number;
	SR: number;
	SSR: number;
	UR: number;
}

// ─── Live!ON ──────────────────────────────────────────

export type ChoiceTier = 'best' | 'good' | 'neutral';
export type EndingType = 'good' | 'neutral' | 'bad';
export type CoachSlot = 'streamer' | 'performance' | 'stage';

export interface LiveONChoice {
	label: string;
	stat: string;
	tier: ChoiceTier;
}

export interface LiveONEvent {
	id: string;
	title: string;
	description: string;
	choices: LiveONChoice[];
}

export interface LiveONUpgrade {
	id: string;
	label: string;
	description: string;
	effect: Record<string, unknown>;
	repeatable: boolean;
}

export interface LiveONScenario {
	id: string;
	title: string;
	description: string;
	difficulty: number;
	icon: string;
	unlockCondition: string | null;
}

export interface LiveONRunState {
	active: boolean;
	scenario: LiveONScenario | null;
	lead: string | null;
	coaches: Record<CoachSlot, string | null>;
	coachBonuses: Record<CoachSlot, number>;
	turn: number;
	maxTurns: number;
	ps: number;
	maxPS: number;
	subscribers: number;
	subscriberLog: TurnLogEntry[];
	upgrades: LiveONUpgrade[];
	consumedUpgrades: string[];
	chaosUpgrades: { subBoost: number; psPenalty: number }[];
	targetSubs: number;
	currentEvent: LiveONEvent | null;
	ending: EndingType | null;
	rewards: LiveONRewards | null;
}

export interface TurnLogEntry {
	turn: number;
	eventId: string;
	eventTitle: string;
	choiceLabel: string;
	choiceStat: string | null;
	choiceTier: string;
	subGain: number;
	psCost: number;
	psRemaining: number;
	coachBonus: number;
	comebackBonus?: number;
}

export interface LiveONRewards {
	vgems: number;
	vringgit: number;
	liveCache: number;
	bondExp: number;
}

// ─── Superchat Toss (Minigame) ───────────────────────

export interface MinigameState {
	dailyPlays: number;
	lastPlayDate: string;
	highScore: number;
}

export interface ChallengeInfo {
	name: string;
	desc: string;
	completed: boolean;
	weekKey: string;
}

// ─── Quests ───────────────────────────────────────────

export interface QuestDef {
	id: string;
	label: string;
	target: number;
	reward: {
		vgems: number;
		tickets?: number;
		streakScaled?: boolean;
	};
	desc: string;
	meta?: boolean;
}

export interface QuestProgress {
	date: string;
	progress: Record<string, number>;
	claimed: Record<string, boolean>;
}

export interface QuestState {
	daily: QuestProgress;
	weekly: QuestProgress;
}

// ─── Producer ─────────────────────────────────────────

export interface ProducerLevel {
	level: number;
	exp: number;
}

// ─── Game State (root) ────────────────────────────────

export interface GameState {
	version: number;
	playerId: string;
	username: string;
	producerLevel: ProducerLevel;
	currencies: Currencies;
	characters: Record<string, CharacterData>;
	oshiList: string[];
	featuredVtuber: string | null;
	studio: StudioState;
	pity: { count: number };
	stats: {
		totalPulls: number;
		ssrStreak: number;
		bestSsrStreak: number;
	};
	pullHistory: Record<string, { firstPullDate: string; totalPulls: number }>;
	milestones: string[];
	dailyLogin: {
		streak: number;
		lastClaim: string | null;
	};
	quests: QuestState;
	stamina: {
		current: number;
		lastRecovery: number;
	};
	minigame: MinigameState;
	lastOnline: number;
	// Internal (not saved)
	_blueTicketRemainder?: number;
}
