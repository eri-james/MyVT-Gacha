// ─── Live!ON Core Logic ────────────────────────────────
// Orchestrator functions for the 16-turn Training Simulator campaign.
// Handles: excursion generation, shop items, checkpoint setup,
// turn advancement, grade calculation, and reward computation.
//
// Minigame logic is in ./minigame.ts
// Coach logic is in ./coach.ts

import type {
        LiveONRunState, CycleFocus, TurnPhase, RunGrade, Rarity,
        ExcursionEvent, ExcursionChoice, ExcursionChoiceType,
        CheckpointState, ShopItem,
        LiveONRewards, CharacterStats, TrainedCopy, CoachPassiveTag
} from '$lib/types';
import {
        // Structure
        LIVEON_CYCLES, LIVEON_TURNS_PER_CYCLE, LIVEON_MAX_TURNS,
        CYCLE_FOCUS_ORDER,
        // PS
        LIVEON_PS_COST_EXCURSION,
        // Excursion
        EXCURSION_STAT_GAIN, SUB_GAIN_EXCURSION,
        // Practice / Algorithm War
        PRACTICE_HYPE_TARGETS, PRACTICE_STAT_GAIN,
        ALGORITHM_WAR_HYPE_TARGETS,
        // Checkpoint
        CHECKPOINT_WIN_SUB_GAINS,
        // Grade
        RUN_GRADE_SUB_MULTIPLIER, RUN_GRADE_S_EXCEED_THRESHOLD,
        // Subscriber
        SUB_GAIN_MIDTURN_HYPE_MULT,
        // In-run currency
        INRUN_CURRENCY_BASE_EARN, INRUN_CURRENCY_PER_HYPE,
} from '$lib/data/constants';

import {
        createPracticeStream,
        createAlgorithmWar,
} from './minigame';

import {
        aggregateInspirations,
        getActivePassives,
} from './coach';

// ═══════════════════════════════════════════════════════
// Run Setup
// ═══════════════════════════════════════════════════════

export interface RunSetupConfig {
        leadSlug: string;
        leadRarity: Rarity;
        leadBaseStats: CharacterStats;
        coaches: (TrainedCopy | null)[];
}

/**
 * Pre-compute everything needed to start a run.
 * Returns values to pass into liveonStore.startRun().
 */
export function computeRunSetup(config: RunSetupConfig): {
        inspirations: Record<CycleFocus, number>;
        passives: CoachPassiveTag[];
} {
        const inspirations = aggregateInspirations(config.coaches);
        const passives = getActivePassives(config.coaches);
        return { inspirations, passives };
}

// ═══════════════════════════════════════════════════════
// Turn Phase: Practice Stream (Turn 1)
// ═══════════════════════════════════════════════════════

/**
 * Initialize a Practice Stream for the current cycle.
 * Returns the minigame state and the sub-log entry placeholder.
 */
export function beginPracticeStream(
        run: LiveONRunState,
): { minigameState: ReturnType<typeof createPracticeStream>; description: string } {
        const cycle = run.cycle;
        const focus = CYCLE_FOCUS_ORDER[cycle - 1];
        const target = PRACTICE_HYPE_TARGETS[cycle];
        const description = `Cycle ${cycle} Practice Stream — Focus: ${focus.toUpperCase()} (Target: ${target} hype)`;
        return {
                minigameState: createPracticeStream(cycle),
                description,
        };
}

/**
 * Resolve the completed Practice Stream.
 * Applies stat gain and subscriber payout based on victory/failure.
 */
export function resolvePracticeStream(
        run: LiveONRunState,
        minigameState: ReturnType<typeof createPracticeStream> & { isComplete: true; isVictory: boolean | null },
): {
        statGain: number;
        subGain: number;
        currencyGain: number;
        description: string;
} {
        const focus = CYCLE_FOCUS_ORDER[run.cycle - 1] as CycleFocus;
        const victory = minigameState.isVictory === true;
        const statGain = victory ? PRACTICE_STAT_GAIN.success : PRACTICE_STAT_GAIN.fail;
        const subGain = Math.floor(minigameState.totalHype * SUB_GAIN_MIDTURN_HYPE_MULT);
        const currencyGain = Math.floor(INRUN_CURRENCY_BASE_EARN + minigameState.totalHype * INRUN_CURRENCY_PER_HYPE);
        const description = victory
                ? `Practice Stream cleared! +${statGain} ${focus.toUpperCase()}, +${subGain.toLocaleString()} subs`
                : `Practice Stream failed. +${statGain} ${focus.toUpperCase()}, +${subGain.toLocaleString()} subs`;

        return { statGain, subGain, currencyGain, description };
}

// ═══════════════════════════════════════════════════════
// Turn Phase: Excursion (Turn 2)
// ═══════════════════════════════════════════════════════

/** Themed excursion events per focus stat */
const EXCURSION_TEMPLATES: Record<CycleFocus, Array<{
        title: string;
        description: string;
}>> = {
        mg: [
                { title: 'Agency Meeting', description: 'Your manager calls an urgent meeting about upcoming sponsorships.' },
                { title: 'Schedule Conflict', description: 'Two major collabs overlap — how do you handle it?' },
                { title: 'Sponsor Negotiation', description: 'A major brand wants to sponsor your stream.' },
                { title: 'Budget Review', description: 'Time to review the channel budget for next month.' },
                { title: 'Manager\'s Challenge', description: 'Your manager sets a growth target for the quarter.' },
        ],
        vc: [
                { title: 'Karaoke Night', description: 'An impromptu singing stream — the chat wants more!' },
                { title: 'Voice Acting Audition', description: 'A studio invites you to audition for an anime role.' },
                { title: 'Song Recording Session', description: 'Studio time booked! Your first original song awaits.' },
                { title: 'ASMR Challenge', description: 'Chat challenges you to a whispered ASMR stream.' },
                { title: 'Duet Collab', description: 'Another VTuber invites you for a duet performance.' },
        ],
        tc: [
                { title: 'Tech Setup Stream', description: 'Your OBS is acting up mid-stream. Time to troubleshoot live!' },
                { title: 'Gaming Tournament', description: 'You\'ve been invited to a community gaming tournament.' },
                { title: 'New Equipment Testing', description: 'New mic and camera arrived! Unboxing stream time.' },
                { title: 'Stream Overlay Design', description: 'A fan made custom overlays — test them on stream!' },
                { title: 'PC Upgrade Day', description: 'Your PC needs an upgrade. What do you prioritize?' },
        ],
        ch: [
                { title: 'Zatsudan Challenge', description: 'Chat dares you to talk about a random topic for 10 minutes.' },
                { title: 'Collab Stream', description: 'A well-known VTuber invites you for a zatsudan collab.' },
                { title: 'Fan Meet & Greet', description: 'An online fan event — hundreds are waiting to meet you!' },
                { title: 'Story Time', description: 'Chat wants to hear about your journey to becoming a VTuber.' },
                { title: 'Chat Games', description: 'Interactive chat games to boost engagement.' },
        ],
};

/**
 * Generate a random Excursion event for the current cycle's focus stat.
 */
export function generateExcursion(cycle: number): ExcursionEvent {
        const focus = CYCLE_FOCUS_ORDER[cycle - 1] as CycleFocus;
        const templates = EXCURSION_TEMPLATES[focus];
        const template = templates[Math.floor(Math.random() * templates.length)];

        const choices: ExcursionChoice[] = [
                {
                        type: 'tryhard',
                        label: 'Tryhard',
                        description: `Go all out — maximum ${focus.toUpperCase()} gains but drains your energy.`,
                        statGain: EXCURSION_STAT_GAIN.tryhard,
                        psCost: LIVEON_PS_COST_EXCURSION.tryhard,
                        subGain: SUB_GAIN_EXCURSION.tryhard,
                },
                {
                        type: 'normal',
                        label: 'Normal',
                        description: `A balanced approach — decent ${focus.toUpperCase()} gains with moderate energy cost.`,
                        statGain: EXCURSION_STAT_GAIN.normal,
                        psCost: LIVEON_PS_COST_EXCURSION.normal,
                        subGain: SUB_GAIN_EXCURSION.normal,
                },
                {
                        type: 'chill',
                        label: 'Chill',
                        description: `Take it easy — recover your energy with minimal ${focus.toUpperCase()} gains.`,
                        statGain: EXCURSION_STAT_GAIN.chill,
                        psCost: LIVEON_PS_COST_EXCURSION.chill,
                        subGain: SUB_GAIN_EXCURSION.chill,
                },
        ];

        return {
                id: `excursion-c${cycle}-${Date.now()}`,
                title: template.title,
                description: template.description,
                focusStat: focus,
                choices,
                selectedChoice: null,
        };
}

/**
 * Resolve the selected excursion choice.
 * Returns the effects to apply to the run state.
 */
export function resolveExcursion(
        event: ExcursionEvent,
        choiceType: ExcursionChoiceType,
): {
        statGain: number;
        psChange: number;
        subGain: number;
        description: string;
} {
        const choice = event.choices.find(c => c.type === choiceType);
        if (!choice) {
                // Fallback: treat as chill
                const chill = event.choices[2];
                return {
                        statGain: chill.statGain,
                        psChange: chill.psCost,
                        subGain: chill.subGain,
                        description: `Chill: +${chill.statGain} ${event.focusStat.toUpperCase()}, +${chill.psCost} PS`,
                };
        }

        const description = `${choice.label}: +${choice.statGain} ${event.focusStat.toUpperCase()}, ${choice.psCost} PS, +${choice.subGain} subs`;
        return {
                statGain: choice.statGain,
                psChange: choice.psCost,
                subGain: choice.subGain,
                description,
        };
}

// ═══════════════════════════════════════════════════════
// Turn Phase: Free Schedule (Turn 3)
// ═══════════════════════════════════════════════════════

/** Available shop item templates */
const SHOP_ITEM_TEMPLATES: Omit<ShopItem, 'id'>[] = [
        {
                label: 'Energy Drink',
                description: 'Restores 30 PS immediately.',
                cost: 50,
                effect: { type: 'ps_restore', target: 'self', value: 30, duration: 'permanent' },
        },
        {
                label: 'Stream Overlay',
                description: '+20% hype on the next minigame.',
                cost: 40,
                effect: { type: 'hype_boost', target: 'next_minigame', value: 0.20, duration: 'next_checkpoint' },
        },
        {
                label: 'Collab Invite',
                description: '+15 to next cycle focus stat.',
                cost: 60,
                effect: { type: 'stat_boost', target: 'next_focus', value: 15, duration: 'next_checkpoint' },
        },
        {
                label: 'Lucky Charm',
                description: '+10% coach assist chance next minigame.',
                cost: 45,
                effect: { type: 'coach_assist_boost', target: 'self', value: 0.10, duration: 'next_checkpoint' },
        },
        {
                label: 'Ad Read',
                description: 'Read a mid-roll ad for 100 coins.',
                cost: 30,
                effect: { type: 'currency', target: 'self', value: 100, duration: 'one_turn' },
        },
];

/**
 * Generate random shop items for the Free Schedule phase.
 * Produces 3 random items from the template pool.
 */
export function generateShopItems(): ShopItem[] {
        // Shuffle and pick 3
        const shuffled = [...SHOP_ITEM_TEMPLATES].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3).map((template, i) => ({
                ...template,
                id: `shop-${Date.now()}-${i}`,
        }));
}

/**
 * Apply the effects of a purchased shop item.
 * Returns the stat/PS/currency changes to apply to the run.
 */
export function applyShopItem(
        item: ShopItem,
        currentCycleFocus: CycleFocus,
): {
        psChange: number;
        statGain: number | null;
        statTarget: CycleFocus | null;
        currencyChange: number;
} {
        const result = {
                psChange: 0,
                statGain: null as number | null,
                statTarget: null as CycleFocus | null,
                currencyChange: 0,
        };

        switch (item.effect.type) {
                case 'ps_restore':
                        result.psChange = item.effect.value;
                        break;
                case 'stat_boost':
                        result.statGain = item.effect.value;
                        result.statTarget = item.effect.target === 'next_focus'
                                ? currentCycleFocus
                                : (item.effect.target as CycleFocus);
                        break;
                case 'currency':
                        result.currencyChange = item.effect.value;
                        break;
                // hype_boost and coach_assist_boost are handled by the minigame logic layer
                // They don't produce immediate stat/PS changes
        }

        return result;
}

// ═══════════════════════════════════════════════════════
// Turn Phase: Algorithm War (Turn 4)
// ═══════════════════════════════════════════════════════

/** Rival names for checkpoint bosses */
const RIVAL_NAMES = [
        'ShadowStream', 'NeonBlaze', 'CrystalVoice', 'PixelDrift',
        'ThunderChat', 'GlowFennec', 'AquaNova', 'VoidMelody',
        'StarForge', 'LunarWave', 'EmberFox', 'CloudNine',
];

/**
 * Initialize an Algorithm War checkpoint for the current cycle.
 */
export function beginAlgorithmWar(
        run: LiveONRunState,
): {
        checkpointState: CheckpointState;
        minigameState: ReturnType<typeof createAlgorithmWar>;
        description: string;
} {
        const cycle = run.cycle;
        const focus = CYCLE_FOCUS_ORDER[cycle - 1];
        const targetCCV = ALGORITHM_WAR_HYPE_TARGETS[cycle];
        const rivalName = RIVAL_NAMES[Math.floor(Math.random() * RIVAL_NAMES.length)];

        const checkpointState: CheckpointState = {
                cycle,
                rivalName,
                rivalTargetCCV: targetCCV,
                hypeAchieved: 0,
                isComplete: false,
                isVictory: null,
                subBonus: CHECKPOINT_WIN_SUB_GAINS[cycle],
                statPenalty: 10 * cycle,
                psDrain: 5 * cycle,
        };

        const description = `Algorithm War: ${rivalName} — ${targetCCV.toLocaleString()} CCV target`;

        return {
                checkpointState,
                minigameState: createAlgorithmWar(cycle),
                description,
        };
}

/**
 * Resolve the completed Algorithm War.
 * Applies victory bonuses or loss penalties.
 */
export function resolveAlgorithmWar(
        run: LiveONRunState,
        checkpoint: CheckpointState,
        minigameState: ReturnType<typeof createAlgorithmWar> & { isComplete: true; isVictory: boolean | null },
): {
        victory: boolean;
        subGain: number;
        currencyGain: number;
        statPenalty: number;
        psDrain: number;
        description: string;
} {
        const victory = minigameState.isVictory === true;
        const cycle = run.cycle;

        const subGain = victory ? checkpoint.subBonus : 0;
        const currencyGain = Math.floor(INRUN_CURRENCY_BASE_EARN * 2 + minigameState.totalHype * INRUN_CURRENCY_PER_HYPE);
        const statPenalty = victory ? 0 : checkpoint.statPenalty;
        const psDrain = victory ? 0 : checkpoint.psDrain;

        const description = victory
                ? `Algorithm War won vs ${checkpoint.rivalName}! +${subGain.toLocaleString()} subs`
                : `Algorithm War lost to ${checkpoint.rivalName}. -${statPenalty} stats, -${psDrain} PS`;

        return { victory, subGain, currencyGain, statPenalty, psDrain, description };
}

// ═══════════════════════════════════════════════════════
// Turn Advancement
// ═══════════════════════════════════════════════════════

/**
 * Advance the run to the next turn.
 * Updates turn/cycle counters and the current phase.
 * Returns the new turn number, cycle, and expected phase.
 */
export function advanceTurn(run: LiveONRunState): {
        newTurn: number;
        newCycle: number;
        newPhase: TurnPhase;
        isRunComplete: boolean;
} | null {
        if (run.turn > LIVEON_MAX_TURNS) {
                return null; // Run is already complete
        }

        const newTurn = run.turn + 1;
        const newCycle = Math.ceil(newTurn / LIVEON_TURNS_PER_CYCLE);
        const isRunComplete = newTurn > LIVEON_MAX_TURNS;

        if (isRunComplete) {
                return {
                        newTurn,
                        newCycle: LIVEON_CYCLES,
                        newPhase: 'run_complete',
                        isRunComplete: true,
                };
        }

        // Determine phase: (turn-1) % 4 → 0=practice, 1=excursion, 2=free_schedule, 3=algorithm_war
        const phaseIndex = (newTurn - 1) % LIVEON_TURNS_PER_CYCLE;
        const phases: TurnPhase[] = ['practice_stream', 'excursion', 'free_schedule', 'algorithm_war'];

        return {
                newTurn,
                newCycle,
                newPhase: phases[phaseIndex],
                isRunComplete: false,
        };
}

/**
 * Get the expected phase for a given turn number (1-indexed).
 */
export function getPhaseForTurn(turn: number): TurnPhase {
        const phaseIndex = (turn - 1) % LIVEON_TURNS_PER_CYCLE;
        const phases: TurnPhase[] = ['practice_stream', 'excursion', 'free_schedule', 'algorithm_war'];
        return phases[phaseIndex];
}

/**
 * Get the cycle number for a given turn number (1-indexed).
 */
export function getCycleForTurn(turn: number): number {
        return Math.ceil(turn / LIVEON_TURNS_PER_CYCLE);
}

// ═══════════════════════════════════════════════════════
// Grade & Rewards
// ═══════════════════════════════════════════════════════

/**
 * Calculate the final run grade based on the 4th checkpoint result.
 *
 * B: Failed checkpoint 4 (hype < target) → subs × 1.0
 * A: Passed checkpoint 4 (hype >= target) → subs × 1.2
 * S: Exceeded checkpoint 4 by ≥20% (hype >= target × 1.2) → subs × 1.5
 */
export function calculateGrade(
        totalHype: number,
        checkpoint4Hype: number,
        checkpoint4Target: number,
): RunGrade {
        if (checkpoint4Hype === 0) {
                // Checkpoint 4 was never attempted — auto B
                return 'B';
        }

        if (checkpoint4Hype >= checkpoint4Target * (1 + RUN_GRADE_S_EXCEED_THRESHOLD)) {
                return 'S';
        }
        if (checkpoint4Hype >= checkpoint4Target) {
                return 'A';
        }
        return 'B';
}

/**
 * Calculate currency rewards based on grade and total subscribers.
 *
 * Base rewards (will be tuned via playtesting):
 *   vGems: grade × 50 + floor(subs / 100)
 *   VRinggit: grade × 20 + floor(subs / 200)
 *   LiveCache: floor(subs × 0.1)
 *   Bond EXP: 50 (flat)
 */
export function calculateRewards(
        grade: RunGrade,
        totalSubscribers: number,
): Omit<LiveONRewards, 'grade'> {
        const gradeMultiplier = RUN_GRADE_SUB_MULTIPLIER[grade];
        const finalSubs = Math.floor(totalSubscribers * gradeMultiplier);

        const gradeBonus = grade === 'S' ? 300 : grade === 'A' ? 200 : 100;

        return {
                vgems: gradeBonus + Math.floor(finalSubs / 100),
                vringgit: Math.floor(gradeBonus * 0.4) + Math.floor(finalSubs / 200),
                liveCache: Math.floor(finalSubs * 0.1),
                bondExp: 50,
                totalSubscribers: finalSubs,
        };
}

/**
 * Full run end: compute grade + rewards.
 */
export function finalizeRun(
        run: LiveONRunState,
): {
        grade: RunGrade;
        rewards: LiveONRewards;
        trainedStats: CharacterStats;
} {
        // Get checkpoint 4 data
        const checkpoint4 = run.cycles[3]?.checkpointState;
        const c4Hype = checkpoint4?.hypeAchieved ?? 0;
        const c4Target = ALGORITHM_WAR_HYPE_TARGETS[4];

        const grade = calculateGrade(run.totalHype, c4Hype, c4Target);
        const rewardBase = calculateRewards(grade, run.totalSubscribers);
        const rewards: LiveONRewards = { ...rewardBase, grade };

        return {
                grade,
                rewards,
                trainedStats: { ...run.effectiveStats },
        };
}
