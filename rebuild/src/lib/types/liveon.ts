import type { TrainableStat, SparkQuality, RunGrade, StreamOutcome, CheckpointOutcome, LiveonPhase, LiveonStage, Rarity, Sparks } from './common';
import type { CharacterStats, TrainedStats, RosterEntry } from './character';

// ─── Live!ON Run State ───

/** Inspiration VTuber — a trained roster entry supporting the lead */
export interface Inspiration {
	rosterId: string;
	slug: string;
	stats: TrainedStats;
	grade: RunGrade;
	sparks: Sparks | null;
}

/** The active Live!ON training run */
export interface LiveonRun {
	id: string;
	scenarioId: string;
	leadSlug: string;
	inspirations: Inspiration[];

	// Stats
	baseStats: CharacterStats;   // original base stats of lead
	currentStats: TrainedStats; // current training stats (base + sparks + gains)
	inheritedSparks: Sparks | null; // sparks from previous run

	// Resources
	ps: number;     // Passion — starts at 30, persists entire run
	shield: number; // Shield — absorbs PS costs first

	// Progress
	phase: LiveonPhase;
	cycle: number;     // 1-4
	stage: LiveonStage;
	hype: number;      // total hype accumulated this run
	trainingCount: number; // how many trainings completed (scales difficulty)

	// Current activity
	activity: LiveonActivity | null;

	// Completed cycle results
	cycles: CycleResult[];

	// Final result
	result: RunResult | null;
}

// ─── Activities (launched from stage selection) ───

export type LiveonActivity =
	| TrainingActivity
	| ExcursionActivity
	| ShopActivity
	| CheckpointActivity;

// ─── Training (Solo Stream) ───

export interface TrainingActivity {
	type: 'training';
	stat: TrainableStat;
	turnsTotal: number;
	turnsRemaining: number;
	hypeGoal: number;
	currentHype: number;
	isExtraRound: boolean;
	extraHypeGoal: number | null;
	stackBonus: number;       // additive bonus from Additional Stack
	stackMultiplier: number;  // multiplier from Multiply Stack
	currentTurn: TurnState | null;
}

export interface TurnState {
	options: TurnOption[];
	rainbowIndex: number; // -1 if no raid
}

/** A single choice presented during a turn */
export interface TurnOption {
	kind: TurnOptionKind;
	hype: number;
	psCost: number;
	label: string;
	description: string;
}

export type TurnOptionKind =
	| 'high'       // high hype, high PS
	| 'medium'      // medium hype, medium PS
	| 'low'         // low hype, low PS
	| 'stack-add'   // +bonus hype next turn, costs PS
	| 'stack-mul'   // ×multiply hype next turn, costs PS
	| 'shield-high' // add shield
	| 'shield-low'  // add shield
	| 'skip';       // 0 hype, recovers 2 PS

export interface TrainingResult {
	stat: TrainableStat;
	statGain: number;
	hypeGenerated: number;
	psSpent: number;
	outcome: StreamOutcome;
	turnsUsed: number;
}

// ─── Excursion ───

export interface ExcursionActivity {
	type: 'excursion';
	eventId: string;
	narrative: string;
	choices: ExcursionChoice[];
}

export interface ExcursionChoice {
	stat: TrainableStat;
	statGain: number;
	psCost: number;
	bondGain: number;
	label: string;
	narrative: string;
}

export interface ExcursionResult {
	choice: ExcursionChoice;
	bondGain: number;
}

// ─── Shop ───

export interface ShopActivity {
	type: 'shop';
	items: ShopItem[];
}

export interface ShopItem {
	id: string;
	name: string;
	description: string;
	cost: number; // PS cost
	effect: ShopEffect;
	purchased: boolean;
}

export type ShopEffect =
	| { type: 'stat-boost'; stat: TrainableStat; value: number }
	| { type: 'ps-boost'; value: number }
	| { type: 'shield'; value: number }
	| { type: 'hype-bonus'; value: number };

// ─── Checkpoint ───

export interface CheckpointActivity {
	type: 'checkpoint';
	opponent: CheckpointOpponent;
	turnsTotal: number;     // always 20
	turnsRemaining: number;
	playerHype: number;
	opponentHype: number;    // target to beat
	currentTurn: CheckpointTurnState | null;
}

export interface CheckpointOpponent {
	name: string;
	slug: string;
	rarity: Rarity;
	stats: CharacterStats;
}

export interface CheckpointTurnState {
	focusStat: TrainableStat;
	options: TurnOption[];
}

export interface CheckpointResult {
	opponent: CheckpointOpponent;
	playerHype: number;
	opponentHype: number;
	won: boolean;
	outcome: CheckpointOutcome;
}

// ─── Cycle Results ───

export interface CycleResult {
	cycle: number;
	training: TrainingResult | null;
	excursion: ExcursionResult | null;
	freeChoice: FreeChoiceResult | null;
	checkpoint: CheckpointResult | null;
}

export interface FreeChoiceResult {
	action: 'training' | 'excursion' | 'shop' | 'rest';
	trainingResult?: TrainingResult;
	excursionResult?: ExcursionResult;
	purchasedItems?: string[];
	psRecovered?: number;
}

// ─── Run Results ───

export interface RunResult {
	grade: RunGrade;
	ending: 'perfect' | 'good' | 'decent';
	totalHype: number;
	rewards: RunRewards;
	sparksOut: Sparks | null;
	quality: SparkQuality;
}

export interface RunRewards {
	vgems: number;
	vringgit: number;
	livecache: number;
}
