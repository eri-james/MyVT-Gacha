// ─── Minigame Logic ─────────────────────────────────────
// Pure functions for the stream minigame system.
// Used during Practice Streams (Turn 1) and Algorithm Wars (Turn 4).
//
// Each round offers 4 buttons: Clip It, Standard, Scuffed, Hydration Break.
// Algorithm War adds: Chat Trends (50% chance, +50% hype if matching),
//   Coach Assists (15% chance, gold button with 2.0× hype, 0 PS cost),
//   and Climax Round (Round 5: all hype & PS costs × 2.0).

import type {
        MinigameButton, MinigameButtonType, CycleFocus,
        MinigameRoundResult, StreamMinigameState
} from '$lib/types';
import {
        // Button formulas
        BTN_CLIP_IT_REQUIREMENT, BTN_CLIP_IT_HYPE, BTN_CLIP_IT_COST,
        BTN_STANDARD_REQUIREMENT, BTN_STANDARD_HYPE, BTN_STANDARD_COST,
        BTN_SCUFFED_REQUIREMENT, BTN_SCUFFED_HYPE, BTN_SCUFFED_COST,
        BTN_HYDRATION_REQUIREMENT, BTN_HYDRATION_HYPE, BTN_HYDRATION_COST,
        // Multipliers & modifiers
        COACH_ASSIST_CHANCE, COACH_ASSIST_HYPE_MULT, COACH_ASSIST_PS_COST,
        ALGORITHM_WAR_CHAT_TREND_CHANCE, ALGORITHM_WAR_CHAT_TREND_HYPE_MULT,
        CLIMAX_ROUND_HYPE_MULT, CLIMAX_ROUND_PS_COST_MULT,
        // Round counts
        PRACTICE_STREAM_ROUNDS, ALGORITHM_WAR_ROUNDS,
        // Hype targets
        PRACTICE_HYPE_TARGETS, ALGORITHM_WAR_HYPE_TARGETS,
} from '$lib/data/constants';

/** All 4 primary stats — used for random chat trend selection */
const ALL_FOCUS: CycleFocus[] = ['mg', 'vc', 'tc', 'ch'];

// ── Button Generation ──────────────────────────────────

/**
 * Generate the 4 action buttons for a minigame round.
 *
 * @param focusStat   Current cycle's focus stat key
 * @param focusValue  Lead's effective stat value for the focus stat
 * @param cycle       Current cycle number (1-4)
 * @param roundNumber Current round (1-indexed)
 * @param totalRounds Total rounds (3 for practice, 5 for algorithm war)
 * @param isAlgorithmWar Whether this is an Algorithm War (enables trends, coach assists, climax)
 */
export function generateButtons(params: {
        focusStat: CycleFocus;
        focusValue: number;
        cycle: number;
        roundNumber: number;
        totalRounds: number;
        isAlgorithmWar: boolean;
}): {
        buttons: MinigameButton[];
        chatTrend: CycleFocus | null;
        coachAssist: boolean;
        isClimax: boolean;
} {
        const { focusStat, focusValue, cycle, roundNumber, totalRounds, isAlgorithmWar } = params;
        const isClimax = isAlgorithmWar && roundNumber === totalRounds; // Round 5

        // ── Roll RNG features (algorithm war only) ──
        let chatTrend: CycleFocus | null = null;
        let coachAssist = false;

        if (isAlgorithmWar) {
                // Chat trend: 50% chance, randomly picks a focus stat
                if (Math.random() < ALGORITHM_WAR_CHAT_TREND_CHANCE) {
                        chatTrend = ALL_FOCUS[Math.floor(Math.random() * ALL_FOCUS.length)];
                }
                // Coach assist: 15% chance
                if (Math.random() < COACH_ASSIST_CHANCE) {
                        coachAssist = true;
                }
        }

        const psCostMult = isClimax ? CLIMAX_ROUND_PS_COST_MULT : 1.0;

        // ── Build the 4 buttons ──
        const clipItRequirement = BTN_CLIP_IT_REQUIREMENT(cycle);
        const clipItHype = BTN_CLIP_IT_HYPE(focusValue, cycle);
        const clipItPsCost = Math.round(BTN_CLIP_IT_COST * psCostMult);

        const standardRequirement = BTN_STANDARD_REQUIREMENT(cycle);
        const standardHype = BTN_STANDARD_HYPE(focusValue, cycle);
        const standardPsCost = Math.round(BTN_STANDARD_COST * psCostMult);

        const scuffedRequirement = BTN_SCUFFED_REQUIREMENT;
        const scuffedHype = BTN_SCUFFED_HYPE(focusValue);
        const scuffedPsCost = Math.round(BTN_SCUFFED_COST * psCostMult);

        const hydrationRequirement = BTN_HYDRATION_REQUIREMENT;
        const hydrationHype = BTN_HYDRATION_HYPE;
        const hydrationPsCost = Math.round(BTN_HYDRATION_COST * psCostMult);

        // Determine which RNG button (index 0-2) gets the coach assist
        const coachBoostedIndex = coachAssist
                ? Math.floor(Math.random() * 3)
                : -1;

        const rngButtons: MinigameButton[] = [
                {
                        type: 'clip_it',
                        label: 'Clip It!',
                        focus: focusStat,
                        requirement: clipItRequirement,
                        baseHype: clipItHype,
                        psCost: clipItPsCost,
                        isCoachBoosted: coachBoostedIndex === 0,
                        isTrending: isAlgorithmWar && chatTrend === focusStat,
                        disabled: focusValue < clipItRequirement,
                },
                {
                        type: 'standard',
                        label: 'Standard',
                        focus: focusStat,
                        requirement: standardRequirement,
                        baseHype: standardHype,
                        psCost: standardPsCost,
                        isCoachBoosted: coachBoostedIndex === 1,
                        isTrending: isAlgorithmWar && chatTrend === focusStat,
                        disabled: focusValue < standardRequirement,
                },
                {
                        type: 'scuffed',
                        label: 'Scuffed',
                        focus: focusStat,
                        requirement: scuffedRequirement,
                        baseHype: scuffedHype,
                        psCost: scuffedPsCost,
                        isCoachBoosted: coachBoostedIndex === 2,
                        isTrending: isAlgorithmWar && chatTrend === focusStat,
                        disabled: false, // always unlocked
                },
        ];

        // Hydration Break — always available, never boosted by coach/trend
        const hydration: MinigameButton = {
                type: 'hydration',
                label: 'Hydration Break',
                focus: focusStat,
                requirement: hydrationRequirement,
                baseHype: hydrationHype,
                psCost: hydrationPsCost,
                isCoachBoosted: false,
                isTrending: false,
                disabled: false,
        };

        const buttons = [...rngButtons, hydration];

        return { buttons, chatTrend, coachAssist, isClimax };
}

// ── Round Resolution ──────────────────────────────────

/**
 * Calculate the final hype generated by selecting a button in a round.
 *
 * Applies multipliers in order:
 *   1. Coach boost → 2.0× hype, 0 PS cost
 *   2. Chat trend match → 1.5× hype (algorithm war only)
 *   3. Climax round → 2.0× hype, 2.0× PS cost (algorithm war round 5)
 *   4. Dead Air (PS = 0) → forced 0 hype
 *
 * Returns { hypeGenerated, psChange } — psChange is negative (spending)
 * or positive (recovery).
 */
export function resolveButton(
        button: MinigameButton,
        params: {
                isClimax: boolean;
                currentPS: number;
        },
): { hypeGenerated: number; psChange: number } {
        const { isClimax, currentPS } = params;

        // Dead Air: if PS is 0, the player can only pick "Dead Air" (0 hype)
        if (currentPS <= 0 && button.type !== 'hydration') {
                return { hypeGenerated: 0, psChange: 0 };
        }

        let hype = button.baseHype;
        let psCost = button.psCost;

        // 1. Coach boost override
        if (button.isCoachBoosted) {
                hype = Math.floor(hype * COACH_ASSIST_HYPE_MULT);
                psCost = COACH_ASSIST_PS_COST;
        }

        // 2. Chat trend match
        if (button.isTrending) {
                hype = Math.floor(hype * ALGORITHM_WAR_CHAT_TREND_HYPE_MULT);
        }

        // 3. Climax round multiplier
        if (isClimax) {
                hype = Math.floor(hype * CLIMAX_ROUND_HYPE_MULT);
                psCost = Math.floor(psCost * CLIMAX_ROUND_PS_COST_MULT);
        }

        // Ensure PS can't go below 0 — if the player can't afford it, they get dead air
        if (currentPS + psCost < 0) {
                // Button not affordable: treat as dead air
                return { hypeGenerated: 0, psChange: 0 };
        }

        return { hypeGenerated: hype, psChange: psCost };
}

/**
 * Create a "Dead Air" button for when PS is 0.
 * This is the only option when the player has no passion left.
 */
export function createDeadAirButton(): MinigameButton {
        return {
                type: 'dead_air',
                label: 'Dead Air...',
                focus: 'mg', // doesn't matter
                requirement: 0,
                baseHype: 0,
                psCost: 0,
                isCoachBoosted: false,
                isTrending: false,
                disabled: false,
        };
}

// ── Minigame Orchestrators ────────────────────────────

/**
 * Create the initial state for a Practice Stream (Turn 1).
 * Call `playMinigameRound()` to advance round by round.
 */
export function createPracticeStream(cycle: number): StreamMinigameState {
        return {
                kind: 'practice',
                rounds: [],
                currentRound: 0,
                totalRounds: PRACTICE_STREAM_ROUNDS,
                totalHype: 0,
                hypeTarget: PRACTICE_HYPE_TARGETS[cycle],
                isComplete: false,
                isVictory: null,
        };
}

/**
 * Create the initial state for an Algorithm War (Turn 4).
 * Call `playMinigameRound()` to advance round by round.
 */
export function createAlgorithmWar(cycle: number): StreamMinigameState {
        return {
                kind: 'algorithm_war',
                rounds: [],
                currentRound: 0,
                totalRounds: ALGORITHM_WAR_ROUNDS,
                totalHype: 0,
                hypeTarget: ALGORITHM_WAR_HYPE_TARGETS[cycle],
                isComplete: false,
                isVictory: null,
        };
}

/**
 * Play one round of a minigame. Returns the updated StreamMinigameState.
 *
 * This function:
 *   1. Generates 4 buttons for the round
 *   2. Resolves the selected button's hype & PS impact
 *   3. Records the round result
 *   4. If all rounds played, determines victory/failure
 */
export function playMinigameRound(
        state: StreamMinigameState,
        params: {
                focusStat: CycleFocus;
                focusValue: number;
                cycle: number;
                selectedButtonType: MinigameButtonType;
                currentPS: number;
        },
): {
        updatedState: StreamMinigameState;
        roundResult: MinigameRoundResult;
        psChange: number;
        hypeGained: number;
} {
        const { focusStat, focusValue, cycle, selectedButtonType, currentPS } = params;
        const roundNumber = state.currentRound + 1; // 1-indexed
        const isAlgorithmWar = state.kind === 'algorithm_war';

        // Generate buttons for this round
        const { buttons, chatTrend, coachAssist, isClimax } = generateButtons({
                focusStat,
                focusValue,
                cycle,
                roundNumber,
                totalRounds: state.totalRounds,
                isAlgorithmWar,
        });

        // If PS is 0 and not hydration, force dead air
        const actualSelection = (currentPS <= 0 && selectedButtonType !== 'hydration')
                ? 'dead_air' as MinigameButtonType
                : selectedButtonType;

        // Find the selected button
        let selectedButton = buttons.find(b => b.type === actualSelection);
        if (!selectedButton) {
                // Fallback: hydration if not found
                selectedButton = buttons.find(b => b.type === 'hydration') ?? buttons[3];
        }

        // Resolve the button
        const { hypeGenerated, psChange } = resolveButton(selectedButton, {
                isClimax,
                currentPS,
        });

        // Build round result
        const roundResult: MinigameRoundResult = {
                roundNumber,
                buttons,
                chatTrend,
                coachAssist,
                isClimax,
                selectedButton: actualSelection,
                hypeGenerated,
                psSpent: psChange, // negative for spending, positive for recovery
        };

        // Update minigame state
        const newRounds = [...state.rounds, roundResult];
        const newTotalHype = state.totalHype + hypeGenerated;
        const allRoundsPlayed = newRounds.length >= state.totalRounds;

        const updatedState: StreamMinigameState = {
                ...state,
                rounds: newRounds,
                currentRound: newRounds.length,
                totalHype: newTotalHype,
                isComplete: allRoundsPlayed,
                isVictory: allRoundsPlayed ? (newTotalHype >= state.hypeTarget) : null,
        };

        return {
                updatedState,
                roundResult,
                psChange,
                hypeGained: hypeGenerated,
        };
}

/**
 * Generate buttons for the next round without playing it.
 * Useful for the UI to render the button selection screen.
 */
export function generateNextRoundButtons(
        state: StreamMinigameState,
        params: {
                focusStat: CycleFocus;
                focusValue: number;
                cycle: number;
                currentPS: number;
        },
): {
        buttons: MinigameButton[];
        chatTrend: CycleFocus | null;
        coachAssist: boolean;
        isClimax: boolean;
        deadAir: boolean;
} {
        if (state.isComplete) {
                return {
                        buttons: [],
                        chatTrend: null,
                        coachAssist: false,
                        isClimax: false,
                        deadAir: false,
                };
        }

        const roundNumber = state.currentRound + 1;
        const isAlgorithmWar = state.kind === 'algorithm_war';
        const { buttons, chatTrend, coachAssist, isClimax } = generateButtons({
                focusStat: params.focusStat,
                focusValue: params.focusValue,
                cycle: params.cycle,
                roundNumber,
                totalRounds: state.totalRounds,
                isAlgorithmWar,
        });

        const deadAir = params.currentPS <= 0;

        return { buttons, chatTrend, coachAssist, isClimax, deadAir };
}
