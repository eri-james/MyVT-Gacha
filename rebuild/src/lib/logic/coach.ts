// ─── Coach Logic ───────────────────────────────────────
// Pure functions for coach inspiration & passive computation.
// Used at run start to calculate the lead VTuber's starting stats.

import type { TrainedCopy, CycleFocus, CoachPassiveTag } from '$lib/types';
import {
        COACH_INSPIRATION_DIVISOR,
        COACH_GRADE_MULTIPLIER
} from '$lib/data/constants';

/** The 4 cycle focus stats */
const ALL_FOCUS_STATS: CycleFocus[] = ['mg', 'vc', 'tc', 'ch'];

/**
 * Calculate how much inspiration a single trained copy provides
 * for a specific stat.
 *
 * Formula: floor((Coach Final Stat / 10) × Grade Multiplier)
 *   B-Rank: 0.5× | A-Rank: 1.0× | S-Rank: 1.5×
 */
export function calculateCoachInspiration(
        coach: TrainedCopy,
        stat: CycleFocus,
): number {
        const statValue = coach.finalStats[stat] ?? 0;
        const gradeMult = COACH_GRADE_MULTIPLIER[coach.grade];
        return Math.floor((statValue / COACH_INSPIRATION_DIVISOR) * gradeMult);
}

/**
 * Aggregate inspiration from all coaches for each of the 4 focus stats.
 * Returns a Record<CycleFocus, number> suitable for LiveONRunState.coachInspirations.
 *
 * If a coach slot is null (empty), it contributes 0.
 */
export function aggregateInspirations(
        coaches: (TrainedCopy | null)[],
): Record<CycleFocus, number> {
        const result: Record<CycleFocus, number> = { mg: 0, vc: 0, tc: 0, ch: 0 };
        for (const coach of coaches) {
                if (!coach) continue;
                for (const stat of ALL_FOCUS_STATS) {
                        result[stat] += calculateCoachInspiration(coach, stat);
                }
        }
        return result;
}

/**
 * Collect all passive tags from all assigned coaches.
 * De-duplicates by tag ID (last occurrence wins).
 */
export function getActivePassives(
        coaches: (TrainedCopy | null)[],
): CoachPassiveTag[] {
        const map = new Map<string, CoachPassiveTag>();
        for (const coach of coaches) {
                if (!coach) continue;
                for (const tag of coach.coachPassives) {
                        map.set(tag.id, tag);
                }
        }
        return Array.from(map.values());
}

/**
 * Get a flat inspiration summary for display.
 * Returns per-coach breakdown and totals.
 */
export function getInspirationBreakdown(
        coaches: (TrainedCopy | null)[],
): {
        perCoach: Array<{
                slug: string | null;
                grade: string | null;
                inspirations: Record<CycleFocus, number>;
        }>;
        totals: Record<CycleFocus, number>;
} {
        const perCoach = coaches.map(coach => {
                if (!coach) {
                        return {
                                slug: null,
                                grade: null,
                                inspirations: { mg: 0, vc: 0, tc: 0, ch: 0 }
                        };
                }
                const inspirations: Record<CycleFocus, number> = { mg: 0, vc: 0, tc: 0, ch: 0 };
                for (const stat of ALL_FOCUS_STATS) {
                        inspirations[stat] = calculateCoachInspiration(coach, stat);
                }
                return { slug: coach.slug, grade: coach.grade, inspirations };
        });

        const totals = aggregateInspirations(coaches);
        return { perCoach, totals };
}
