// ─── Live!ON Engine: Run Management ───
// Handles run creation, stage transitions, and cycle progression.

import type {
        LiveonRun, LiveonActivity, LiveonPhase, LiveonStage,
        TrainingActivity, ExcursionActivity, ShopActivity, CheckpointActivity,
        TurnState, TurnOption, TurnOptionKind,
        CheckpointTurnState, CheckpointOpponent,
        CycleResult, FreeChoiceResult, RunResult,
        TrainableStat, CharacterStats, TrainedStats, Sparks,
        RunGrade, SparkQuality, StreamOutcome, CheckpointOutcome,
        ShopItem, CheckpointResult, ShopEffect
} from '$lib/types';
import {
        CYCLE_STAGES, TRAINABLE_STATS, STAT_LABELS, CYCLE_OPPONENT_RARITY,
        getTrainingConfig
} from '$lib/types';
import type { CharacterData } from '$lib/types';
import { clamp, randInt, pickRandom, uniqueId } from '$lib/utils/format';
import { getRandomCharacter, getCharacter } from '$lib/data/characters';
import { SCENARIOS } from './scenarios';
import { pickRandomEvent } from './excursions';
import { generateShopItems } from './shop';

// ─── Constants ───

const MAX_PS = 30;
const TOTAL_CYCLES = 4;
const REST_RECOVERY_RATE = 0.8; // 80% of missing PS recovered
const CHECKPOINT_AUTO_RECOVERY = 0.6; // 60% of current PS recovered
const TRAINING_TURN_OPTIONS = 3; // number of choices per turn

// ─── Run Creation ───

/**
 * Create a brand new Live!ON run
 * @param lead - The lead VTuber character data
 * @param inspirations - Optional array of roster entries supporting the lead
 * @param scenarioId - Which scenario to play
 * @param inheritedSparks - Sparks from a previous run (for spark inheritance)
 * @param inheritedFromRosterId - Roster entry ID whose sparks were inherited (lineage tracking)
 */
export function createRun(
        lead: CharacterData,
        inspirations: { rosterId: string; slug: string; stats: TrainedStats; grade: RunGrade; sparks: Sparks | null }[],
        scenarioId: string,
        inheritedSparks: Sparks | null,
        inheritedFromRosterId?: string
): LiveonRun {
        // Calculate starting stats: base + inherited sparks
        const startStats: TrainedStats = {
                tc: lead.stats.tc,
                ch: lead.stats.ch,
                vc: lead.stats.vc,
                mg: lead.stats.mg
        };

        if (inheritedSparks) {
                startStats[inheritedSparks.stat1] += inheritedSparks.value1;
                startStats[inheritedSparks.stat2] += inheritedSparks.value2;
        }

        return {
                id: uniqueId(),
                scenarioId,
                leadSlug: lead.slug,
                inspirations,
                inheritedFromRosterId,
                baseStats: { ...lead.stats },
                currentStats: startStats,
                inheritedSparks,
                ps: MAX_PS,
                shield: 0,
                phase: 'running',
                cycle: 1,
                stage: 'training',
                hype: 0,
                trainingCount: 0,
                activity: null,
                cycles: [],
                result: null
        };
}

// ─── PS Management ───

/** Spend PS, using shield first */
export function spendPS(run: LiveonRun, amount: number): { psSpent: number; shieldUsed: number } {
        let shieldUsed = 0;
        let psSpent = amount;

        // Shield absorbs first
        if (run.shield > 0) {
                shieldUsed = Math.min(run.shield, amount);
                psSpent = amount - shieldUsed;
                run.shield -= shieldUsed;
        }

        run.ps = Math.max(0, run.ps - psSpent);
        return { psSpent, shieldUsed };
}

/** Recover PS (from rest) — 80% of missing PS */
export function recoverPS(run: LiveonRun): number {
        const missing = MAX_PS - run.ps;
        const recovered = Math.ceil(missing * REST_RECOVERY_RATE);
        run.ps = Math.min(MAX_PS, run.ps + recovered);
        return recovered;
}

/** Checkpoint auto-recovery — 60% of current PS */
export function checkpointRecoverPS(run: LiveonRun): number {
        const recovered = Math.ceil(run.ps * CHECKPOINT_AUTO_RECOVERY);
        run.ps = Math.min(MAX_PS, run.ps + recovered);
        return recovered;
}

// ─── Stage Transitions ───

/** Advance to the next stage in the current cycle */
export function advanceStage(run: LiveonRun): LiveonStage | null {
        const currentIdx = CYCLE_STAGES.indexOf(run.stage);
        const nextIdx = currentIdx + 1;

        if (nextIdx < CYCLE_STAGES.length) {
                run.stage = CYCLE_STAGES[nextIdx];
                run.activity = null;
                return run.stage;
        }

        // Cycle complete — move to next cycle or finish
        return advanceCycle(run);
}

/** Advance to the next cycle, or finish the run */
export function advanceCycle(run: LiveonRun): LiveonStage | null {
        // Checkpoint auto-recovery happens between cycles
        checkpointRecoverPS(run);

        if (run.cycle >= TOTAL_CYCLES) {
                // Run is complete
                finishRun(run);
                return null;
        }

        run.cycle += 1;
        run.stage = CYCLE_STAGES[0]; // back to training
        run.activity = null;
        return run.stage;
}

// ─── Activity Starters ───

/** Start a training session for a given stat */
export function startTraining(run: LiveonRun, stat: TrainableStat): TrainingActivity {
        const config = getTrainingConfig(run.trainingCount);
        const activity: TrainingActivity = {
                type: 'training',
                stat,
                turnsTotal: config.turnsTotal,
                turnsRemaining: config.turnsTotal,
                hypeGoal: config.hypeGoal,
                currentHype: 0,
                isExtraRound: false,
                extraHypeGoal: null,
                stackBonus: 0,
                stackMultiplier: 1,
                currentTurn: null
        };

        // Generate first turn options
        activity.currentTurn = generateTurnOptions(activity, run);

        run.activity = activity;
        return activity;
}

/** Start an excursion event */
export async function startExcursion(run: LiveonRun): Promise<ExcursionActivity> {
        const event = pickRandomEvent(run.scenarioId, []);
        const activity: ExcursionActivity = {
                type: 'excursion',
                eventId: event.id,
                narrative: event.narrative,
                choices: event.choices.map(c => ({
                        stat: c.stat,
                        statGain: c.statGain,
                        psCost: c.psCost,
                        bondGain: c.bondGain,
                        label: c.label,
                        narrative: c.narrative,
                        statRequirement: c.statRequirement,
                        lockoutLabel: c.lockoutLabel
                }))
        };

        run.activity = activity;
        return activity;
}

/** Start a free choice shop */
export function startShop(run: LiveonRun): ShopActivity {
        const activity: ShopActivity = {
                type: 'shop',
                items: generateShopItems(run.cycle)
        };

        run.activity = activity;
        return activity;
}

/** Start a checkpoint battle */
export async function startCheckpoint(run: LiveonRun): Promise<CheckpointActivity> {
        const rarity = CYCLE_OPPONENT_RARITY[run.cycle];
        const opponent = await getRandomCharacter(rarity);
        const activity: CheckpointActivity = {
                type: 'checkpoint',
                opponent: {
                        name: opponent.name,
                        slug: opponent.slug,
                        rarity: opponent.rarity,
                        stats: { ...opponent.stats }
                },
                turnsTotal: 20,
                turnsRemaining: 20,
                playerHype: 0,
                opponentHype: calculateOpponentHype(opponent.stats, run.cycle),
                currentTurn: null
        };

        // Generate first turn
        activity.currentTurn = generateCheckpointTurn(activity, run);

        run.activity = activity;
        return activity;
}

// ─── Training Turn Logic ───

/** Generate turn options for a training turn */
function generateTurnOptions(activity: TrainingActivity, run: LiveonRun): TurnState {
        const options: TurnOption[] = [];

        // High option — big hype, big PS cost
        options.push(createOption('high', activity.stackMultiplier));

        // Medium option — balanced
        options.push(createOption('medium', activity.stackMultiplier));

        // Low option — safe
        options.push(createOption('low', activity.stackMultiplier));

        // Check if PS is critically low — add skip option
        if (run.ps + run.shield <= 5) {
                options.push({
                        kind: 'skip',
                        hype: 0,
                        psCost: -2, // recovers PS
                        label: 'Skip Turn',
                        description: 'Take a breather. Recover 2 PS.'
                });
        }

        return { options, rainbowIndex: -1 };
}

/** Create a turn option based on kind */
function createOption(kind: TurnOptionKind, multiplier: number): TurnOption {
        switch (kind) {
                case 'high':
                        return {
                                kind: 'high',
                                hype: Math.round(randInt(8, 12) * multiplier),
                                psCost: randInt(4, 6),
                                label: 'Go All Out',
                                description: `Push hard for big hype!${multiplier > 1 ? ` (×${multiplier} bonus!)` : ''}`
                        };
                case 'medium':
                        return {
                                kind: 'medium',
                                hype: Math.round(randInt(4, 7) * multiplier),
                                psCost: randInt(2, 3),
                                label: 'Steady Performance',
                                description: 'Balanced approach. Consistent hype gain.'
                        };
                case 'low':
                        return {
                                kind: 'low',
                                hype: Math.round(randInt(2, 4) * multiplier),
                                psCost: randInt(1, 2),
                                label: 'Play It Safe',
                                description: 'Conservative play. Low risk, low reward.'
                        };
                case 'skip':
                        return {
                                kind: 'skip',
                                hype: 0,
                                psCost: -2,
                                label: 'Skip Turn',
                                description: 'Take a breather. Recover 2 PS.'
                        };
                default:
                        // Stack options — shouldn't appear in initial generation
                        return {
                                kind: 'low',
                                hype: 0,
                                psCost: 1,
                                label: '?',
                                description: 'Unknown option'
                        };
        }
}

/** Select a turn option during training */
export function selectTurnOption(
        run: LiveonRun,
        activity: TrainingActivity,
        option: TurnOption
): { continue: boolean; outcome: StreamOutcome | null } {
        const spent = spendPS(run, Math.max(0, option.psCost));

        // Handle skip (recovery)
        if (option.kind === 'skip') {
                run.ps = Math.min(MAX_PS, run.ps + 2);
                activity.turnsRemaining--;
                if (activity.turnsRemaining > 0) {
                        activity.currentTurn = generateTurnOptions(activity, run);
                        return { continue: true, outcome: null };
                }
                // Training ended with skip
                return { continue: false, outcome: 'subpar' };
        }

        // Apply hype (with stack bonus and multiplier)
        const finalHype = Math.round((option.hype + activity.stackBonus) * activity.stackMultiplier);
        activity.currentHype += finalHype;
        run.hype += finalHype;

        // Reset stack after applying
        activity.stackBonus = 0;
        activity.stackMultiplier = 1;

        activity.turnsRemaining--;

        // Check if hype goal is reached
        if (activity.currentHype >= activity.hypeGoal) {
                if (!activity.isExtraRound) {
                        // Trigger extra round
                        activity.isExtraRound = true;
                        activity.extraHypeGoal = activity.currentHype + randInt(10, 20);
                        activity.turnsRemaining += 2; // bonus turns for extra round
                        activity.currentTurn = generateExtraRoundOptions(activity);
                        return { continue: true, outcome: null };
                }
                // Extra round complete — training done
                return { continue: false, outcome: 'perfect' };
        }

        // Out of turns?
        if (activity.turnsRemaining <= 0) {
                const ratio = activity.currentHype / activity.hypeGoal;
                if (ratio >= 0.7) {
                        return { continue: false, outcome: 'great' };
                }
                return { continue: false, outcome: 'subpar' };
        }

        // Generate next turn (with possible stack options)
        if (Math.random() < 0.25 && activity.turnsRemaining > 1) {
                activity.currentTurn = generateStackOptions(activity, run);
        } else {
                activity.currentTurn = generateTurnOptions(activity, run);
        }

        return { continue: true, outcome: null };
}

/** Generate options for the extra round */
function generateExtraRoundOptions(activity: TrainingActivity): TurnState {
        const options: TurnOption[] = [
                {
                        kind: 'high',
                        hype: randInt(10, 15),
                        psCost: randInt(3, 5),
                        label: 'Final Push',
                        description: 'Go beyond the limit!'
                },
                {
                        kind: 'medium',
                        hype: randInt(6, 9),
                        psCost: randInt(2, 3),
                        label: 'Keep Going',
                        description: 'Maintain the momentum.'
                },
                {
                        kind: 'skip',
                        hype: 0,
                        psCost: -3,
                        label: 'Wrap Up',
                        description: 'End on a high note. Recover 3 PS.'
                }
        ];
        return { options, rainbowIndex: -1 };
}

/** Generate turn options with stack choices */
function generateStackOptions(activity: TrainingActivity, run: LiveonRun): TurnState {
        const options: TurnOption[] = [
                {
                        kind: 'stack-add',
                        hype: randInt(2, 4),
                        psCost: randInt(1, 2),
                        label: 'Build Up',
                        description: 'Add +5 bonus hype to next turn.'
                },
                {
                        kind: 'stack-mul',
                        hype: 0,
                        psCost: 3,
                        label: 'Charge Up',
                        description: 'Double hype on the next turn.'
                },
                {
                        kind: 'shield-high',
                        hype: randInt(1, 3),
                        psCost: 2,
                        label: 'Shield (Strong)',
                        description: 'Gain 4 Shield to absorb PS costs.'
                }
        ];

        return { options, rainbowIndex: -1 };
}

/** Handle stack option selection */
export function selectStackOption(
        run: LiveonRun,
        activity: TrainingActivity,
        option: TurnOption
): void {
        const spent = spendPS(run, option.psCost);

        switch (option.kind) {
                case 'stack-add':
                        activity.stackBonus += 5;
                        break;
                case 'stack-mul':
                        activity.stackMultiplier *= 2;
                        break;
                case 'shield-high':
                        run.shield += 4;
                        break;
                case 'shield-low':
                        run.shield += 2;
                        break;
        }

        // Apply the hype from the stack option itself
        const finalHype = Math.round(option.hype * activity.stackMultiplier);
        activity.currentHype += finalHype;
        run.hype += finalHype;

        activity.turnsRemaining--;

        if (activity.turnsRemaining > 0) {
                activity.currentTurn = generateTurnOptions(activity, run);
        } else {
                // Out of turns during stack round
                const ratio = activity.currentHype / activity.hypeGoal;
                if (ratio >= 1) {
                        activity.currentTurn = null;
                } else if (ratio >= 0.7) {
                        activity.currentTurn = null;
                } else {
                        activity.currentTurn = null;
                }
        }
}

// ─── Checkpoint Turn Logic ───

/** Calculate opponent hype target based on their raw stats */
function calculateOpponentHype(stats: CharacterStats, cycle: number): number {
        const trainableTotal = stats.tc + stats.ch + stats.vc + stats.mg;
        // Scale by cycle: cycle 1 opponent is weakest, cycle 4 is UR
        const cycleMultiplier = 0.6 + (cycle * 0.15);
        return Math.round(trainableTotal * cycleMultiplier);
}

/** Generate a checkpoint turn */
function generateCheckpointTurn(activity: CheckpointActivity, run: LiveonRun): CheckpointTurnState {
        // Pick a random focus stat for this turn
        const focusStat = pickRandom<TrainableStat>(TRAINABLE_STATS);
        const statValue = run.currentStats[focusStat];

        // Stat value affects quality of options
        const options: TurnOption[] = [
                {
                        kind: 'high',
                        hype: Math.round(randInt(5, 10) + statValue * 0.2),
                        psCost: randInt(3, 5),
                        label: `Full ${STAT_LABELS[focusStat]} Push`,
                        description: `Leverage ${STAT_LABELS[focusStat]} for maximum hype!`
                },
                {
                        kind: 'medium',
                        hype: Math.round(randInt(3, 6) + statValue * 0.1),
                        psCost: randInt(1, 3),
                        label: 'Balanced Play',
                        description: 'Steady hype generation.'
                },
                {
                        kind: 'low',
                        hype: Math.round(randInt(1, 4) + statValue * 0.05),
                        psCost: randInt(1, 2),
                        label: 'Conservative',
                        description: 'Safe bet, preserves PS.'
                }
        ];

        return { focusStat, options };
}

/** Select a checkpoint turn option */
export function selectCheckpointOption(
        run: LiveonRun,
        activity: CheckpointActivity,
        option: TurnOption
): { continue: boolean; result: CheckpointResult | null } {
        if (option.kind === 'skip') {
                run.ps = Math.min(MAX_PS, run.ps + 2);
        } else {
                spendPS(run, Math.max(0, option.psCost));
        }

        activity.playerHype += option.hype;
        activity.turnsRemaining--;

        // Check if out of turns
        if (activity.turnsRemaining <= 0) {
                const won = activity.playerHype >= activity.opponentHype;
                const result: CheckpointResult = {
                        opponent: activity.opponent,
                        playerHype: activity.playerHype,
                        opponentHype: activity.opponentHype,
                        won,
                        outcome: won ? 'great' : 'decent'
                };
                return { continue: false, result };
        }

        // Generate next turn
        activity.currentTurn = generateCheckpointTurn(activity, run);
        return { continue: true, result: null };
}

// ─── Free Choice ───

/** Handle rest action in free choice */
export function doRest(run: LiveonRun): number {
        const recovered = recoverPS(run);
        return recovered;
}

/** Purchase a shop item */
export function purchaseShopItem(run: LiveonRun, item: ShopItem): boolean {
        if (item.purchased) return false;
        if (run.ps < item.cost) return false;

        spendPS(run, item.cost);
        item.purchased = true;

        // Apply effect
        const effect = item.effect as ShopEffect;
        switch (effect.type) {
                case 'stat-boost':
                        run.currentStats[effect.stat] += effect.value;
                        break;
                case 'ps-boost':
                        run.ps = Math.min(MAX_PS, run.ps + effect.value);
                        break;
                case 'shield':
                        run.shield += effect.value;
                        break;
                case 'hype-bonus':
                        run.hype += effect.value;
                        break;
        }

        return true;
}

// ─── Run Completion ───

/** Calculate training stat gains based on outcome */
function calculateStatGains(
        run: LiveonRun,
        trainingOutcome: StreamOutcome,
        checkpointWon: boolean
): TrainedStats {
        const gains: TrainedStats = { tc: 0, ch: 0, vc: 0, mg: 0 };

        // Base gains from training outcome
        const baseMultiplier = trainingOutcome === 'perfect' ? 3 :
                trainingOutcome === 'great' ? 2 : 1;

        // Gain based on the trained stat
        const activity = run.activity as TrainingActivity | null;
        if (activity && activity.type === 'training') {
                gains[activity.stat] += randInt(2, 5) * baseMultiplier;
        }

        // Cycle bonus — higher cycles give more
        const cycleBonus = run.cycle;

        // Checkpoint bonus
        if (checkpointWon) {
                // Boost the weakest stat
                const stats: TrainableStat[] = [...TRAINABLE_STATS];
                stats.sort((a, b) => run.currentStats[a] - run.currentStats[b]);
                gains[stats[0]] += randInt(2, 4);
                gains[stats[1]] += randInt(1, 3);
        }

        // Apply gains
        TRAINABLE_STATS.forEach(s => {
                gains[s] += Math.floor(cycleBonus * 0.5);
        });

        return gains;
}

/** Finish the run and generate results */
function finishRun(run: LiveonRun): void {
        run.phase = 'summary';

        // Determine grade based on total hype
        const totalHype = run.hype;
        let grade: RunGrade;
        let ending: 'perfect' | 'good' | 'decent';

        if (totalHype >= 500) {
                grade = 'S';
                ending = 'perfect';
        } else if (totalHype >= 350) {
                grade = 'A';
                ending = 'perfect';
        } else if (totalHype >= 200) {
                grade = 'A';
                ending = 'good';
        } else if (totalHype >= 120) {
                grade = 'B';
                ending = 'good';
        } else if (totalHype >= 60) {
                grade = 'B';
                ending = 'decent';
        } else {
                grade = 'C';
                ending = 'decent';
        }

        // Calculate rewards
        const rewards = calculateRewards(grade);

        // Generate sparks
        const quality = calculateSparkQuality(grade);
        const sparksOut = generateSparks(run.currentStats, quality);

        // Determine final outcome for the last training
        const lastTrainingResult = run.cycles[run.cycles.length - 1]?.training;
        const trainingOutcome: StreamOutcome = lastTrainingResult?.outcome || 'great';
        const lastCheckpoint = run.cycles[run.cycles.length - 1]?.checkpoint;
        const checkpointWon = lastCheckpoint?.won || false;

        // Apply final stat gains
        const gains = calculateStatGains(run, trainingOutcome, checkpointWon);
        TRAINABLE_STATS.forEach(s => {
                run.currentStats[s] += gains[s];
        });

        run.result = {
                grade,
                ending,
                totalHype,
                rewards,
                sparksOut,
                quality
        };
}

/** Calculate rewards based on grade */
function calculateRewards(grade: RunGrade): { vgems: number; vringgit: number; livecache: number } {
        switch (grade) {
                case 'S': return { vgems: 500, vringgit: 3000, livecache: 200 };
                case 'A': return { vgems: 300, vringgit: 2000, livecache: 120 };
                case 'B': return { vgems: 150, vringgit: 1000, livecache: 60 };
                case 'C': return { vgems: 50, vringgit: 500, livecache: 20 };
        }
}

/** Calculate spark quality from grade */
function calculateSparkQuality(grade: RunGrade): SparkQuality {
        switch (grade) {
                case 'S': return 3;
                case 'A': return 3;
                case 'B': return 2;
                case 'C': return 1;
        }
}

/** Generate output sparks from final stats */
function generateSparks(stats: TrainedStats, quality: SparkQuality): Sparks {
        // Pick the two highest stats
        const sorted: TrainableStat[] = [...TRAINABLE_STATS].sort((a, b) => stats[b] - stats[a]);
        const stat1 = sorted[0];
        const stat2 = sorted[1];

        const valueMultipliers: Record<SparkQuality, [number, number]> = {
                1: [3, 2],
                2: [5, 4],
                3: [8, 6]
        };
        const [val1, val2] = valueMultipliers[quality];

        return {
                stat1,
                stat2,
                value1: val1,
                value2: val2,
                quality
        };
}

// ─── Public Utilities ───

/** Get available scenarios */
export function getAvailableScenarios() {
        return SCENARIOS;
}

/** Check if a character can be used as lead (must be in collection) */
export function canUseAsLead(collection: Record<string, unknown>, slug: string): boolean {
        return slug in collection;
}

/** Get the current cycle's completed stages count */
export function getCompletedStages(run: LiveonRun): LiveonStage[] {
        const stages: LiveonStage[] = [];
        const cycleResult = run.cycles[run.cycles.length - 1];
        if (!cycleResult) return stages;
        if (cycleResult.training) stages.push('training');
        if (cycleResult.excursion) stages.push('excursion');
        if (cycleResult.freeChoice) stages.push('free-choice');
        if (cycleResult.checkpoint) stages.push('checkpoint');
        return stages;
}
