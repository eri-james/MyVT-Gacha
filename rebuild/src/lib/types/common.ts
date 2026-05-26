// ─── Common type aliases ───

/** Character rarity tiers */
export type Rarity = 'R' | 'SR' | 'SSR' | 'UR';

/** The 4 trainable stats in Live!ON */
export type TrainableStat = 'tc' | 'ch' | 'vc' | 'mg';

/** All 6 character stats (including stamina & passion) */
export type AllStat = 'st' | 'ps' | 'tc' | 'ch' | 'vc' | 'mg';

/** Primary navigation pages */
export type PageId = 'home' | 'liveon' | 'gacha' | 'collection' | 'roster' | 'settings';

/** Live!ON run ending */
export type RunEnding = 'perfect' | 'good' | 'decent';

/** Training/outcome grade */
export type RunGrade = 'S' | 'A' | 'B' | 'C';

/** Training outcome per session */
export type StreamOutcome = 'perfect' | 'great' | 'subpar';

/** Checkpoint performance */
export type CheckpointOutcome = 'great' | 'decent';

/** Spark quality (star rating) */
export type SparkQuality = 1 | 2 | 3;

/** Live!ON top-level phase */
export type LiveonPhase = 'setup' | 'running' | 'summary';

/** Cycle stages in order */
export type LiveonStage = 'training' | 'excursion' | 'free-choice' | 'checkpoint';

/** Free choice actions */
export type FreeChoiceAction = 'training' | 'excursion' | 'shop' | 'rest';

// ─── Constants ───

/** The order stages play out in a cycle */
export const CYCLE_STAGES: LiveonStage[] = ['training', 'excursion', 'free-choice', 'checkpoint'];

/** All trainable stat keys for iteration */
export const TRAINABLE_STATS: TrainableStat[] = ['tc', 'ch', 'vc', 'mg'];

/** Full stat labels for display */
export const STAT_LABELS: Record<TrainableStat, string> = {
	tc: 'Tech',
	ch: 'Charisma',
	vc: 'Vocal',
	mg: 'Management'
};

/** Rarity order for sorting (lowest to highest) */
export const RARITY_ORDER: Record<Rarity, number> = { R: 0, SR: 1, SSR: 2, UR: 3 };

/** Rarity display names */
export const RARITY_LABELS: Record<Rarity, string> = {
	R: 'Rare',
	SR: 'Super Rare',
	SSR: 'S-Super Rare',
	UR: 'Ultra Rare'
};

/** Opponent rarity per cycle */
export const CYCLE_OPPONENT_RARITY: Record<number, Rarity> = {
	1: 'R',
	2: 'SR',
	3: 'SSR',
	4: 'UR'
};

/** Training config scaling per training count */
export function getTrainingConfig(trainingCount: number): { hypeGoal: number; turnsTotal: number } {
	return {
		hypeGoal: 25 + trainingCount * 10,
		turnsTotal: 4 + trainingCount * 2
	};
}
