import type {
        LiveONRunState, CycleFocus, TurnPhase, RunGrade, Rarity,
        CharacterStats, CoachPassiveTag, LiveONRewards, StreamMinigameState,
        ExcursionEvent, CheckpointState, CycleState,
        FreeScheduleAction, ShopItem
} from '$lib/types';
import {
        LIVEON_MAX_TURNS, LIVEON_CYCLES, LIVEON_TURNS_PER_CYCLE, LIVEON_BASE_PS,
        CYCLE_FOCUS_ORDER
} from '$lib/data/constants';

const EMPTY_STATS: CharacterStats = { st: 0, ps: 0, tc: 0, ch: 0, vc: 0, mg: 0 };

/** Create a blank run state (not started) */
export function createRunState(): LiveONRunState {
        return {
                active: false,
                lead: null,
                leadRarity: null,
                coaches: [null, null, null],
                coachInspirations: { mg: 0, vc: 0, tc: 0, ch: 0 },
                coachPassives: [],
                baseStats: { ...EMPTY_STATS },
                effectiveStats: { ...EMPTY_STATS },
                turn: 0,
                cycle: 0,
                cycles: [],
                currentPhase: 'practice_stream',
                ps: 0,
                maxPS: LIVEON_BASE_PS,
                totalHype: 0,
                totalSubscribers: 0,
                subLog: [],
                inRunCurrency: 0,
                currentMinigame: null,
                currentExcursion: null,
                currentCheckpoint: null,
                freeScheduleAction: null,
                shopItems: [],
                ending: null,
                rewards: null
        };
}

/** Build the 4 cycle shells for a fresh run */
function createCycles(): CycleState[] {
        const cycles: CycleState[] = [];
        for (let i = 0; i < LIVEON_CYCLES; i++) {
                cycles.push({
                        cycle: i + 1,
                        focus: CYCLE_FOCUS_ORDER[i],
                        turnsCompleted: 0,
                        practiceState: null,
                        excursionEvent: null,
                        freeScheduleAction: null,
                        checkpointState: null,
                        totalHype: 0,
                        totalSubs: 0,
                        isComplete: false
                });
        }
        return cycles;
}

export class LiveONStore {
        run: LiveONRunState = $state(createRunState());

        // ── Derived Getters ──

        get isActive(): boolean { return this.run.active; }
        get currentTurn(): number { return this.run.turn; }
        get currentCycle(): number { return this.run.cycle; }
        get currentPhase(): TurnPhase { return this.run.currentPhase; }
        get ps(): number { return this.run.ps; }
        get maxPS(): number { return this.run.maxPS; }
        get totalSubscribers(): number { return this.run.totalSubscribers; }
        get totalHype(): number { return this.run.totalHype; }

        get isFinaleTurn(): boolean {
                return this.run.turn === LIVEON_MAX_TURNS;
        }

        /** Get the focus stat for the current cycle */
        get currentFocus(): CycleFocus | null {
                if (this.run.cycle < 1 || this.run.cycle > LIVEON_CYCLES) return null;
                return CYCLE_FOCUS_ORDER[this.run.cycle - 1];
        }

        /** Get the effective stat value for the current cycle's focus */
        get currentFocusValue(): number {
                const focus = this.currentFocus;
                if (!focus) return 0;
                return this.run.effectiveStats[focus];
        }

        /** Which turn phase is expected for the current turn (1-indexed) */
        get expectedPhase(): TurnPhase {
                const t = ((this.run.turn - 1) % LIVEON_TURNS_PER_CYCLE) + 1;
                return (['practice_stream', 'excursion', 'free_schedule', 'algorithm_war'] as const)[t - 1];
        }

        // ── Run Lifecycle ──

        startRun(
                leadSlug: string,
                leadRarity: Rarity,
                leadBaseStats: CharacterStats,
                coaches: [string | null, string | null, string | null],
                coachInspirations: Record<CycleFocus, number>,
                coachPassives: CoachPassiveTag[],
                leadPS: number,
        ): void {
                const run = createRunState();
                run.active = true;
                run.lead = leadSlug;
                run.leadRarity = leadRarity;
                run.baseStats = { ...leadBaseStats };
                run.coaches = coaches;
                run.coachInspirations = coachInspirations;
                run.coachPassives = coachPassives;
                run.turn = 1;
                run.cycle = 1;
                run.cycles = createCycles();
                run.ps = Math.min(leadPS, LIVEON_BASE_PS);
                run.maxPS = LIVEON_BASE_PS;
                run.currentPhase = 'practice_stream';

                // Compute effective stats = base + coach inspirations
                run.effectiveStats = {
                        st: leadBaseStats.st,
                        ps: leadBaseStats.ps,
                        mg: leadBaseStats.mg + coachInspirations.mg,
                        vc: leadBaseStats.vc + coachInspirations.vc,
                        tc: leadBaseStats.tc + coachInspirations.tc,
                        ch: leadBaseStats.ch + coachInspirations.ch,
                };

                this.run = run;
        }

        endRun(grade: RunGrade, rewards: Omit<LiveONRewards, 'grade'>): void {
                this.run = {
                        ...this.run,
                        ending: grade,
                        rewards: { ...rewards, grade },
                        active: false
                };
        }

        reset(): void {
                this.run = createRunState();
        }

        // ── Effective Stat Mutations ──

        /** Add to an effective stat (clamped >= 0) */
        addEffectiveStat(stat: CycleFocus, amount: number): void {
                this.run.effectiveStats[stat] = Math.max(0, this.run.effectiveStats[stat] + amount);
        }

        // ── Phase State Setters ──
        // Called by the logic layer to push transient state.

        setMinigame(state: StreamMinigameState): void {
                this.run.currentMinigame = state;
        }

        setExcursion(event: ExcursionEvent): void {
                this.run.currentExcursion = event;
        }

        setCheckpoint(state: CheckpointState): void {
                this.run.currentCheckpoint = state;
        }

        setFreeScheduleAction(action: FreeScheduleAction): void {
                this.run.freeScheduleAction = action;
        }

        setShopItems(items: ShopItem[]): void {
                this.run.shopItems = items;
        }

        // ── PS & Currency Helpers ──

        /** Modify PS (positive = recover, negative = spend). Clamped to [0, maxPS]. */
        modifyPS(delta: number): void {
                this.run.ps = Math.max(0, Math.min(this.run.maxPS, this.run.ps + delta));
        }

        /** Add/subtract in-run currency */
        modifyCurrency(amount: number): void {
                this.run.inRunCurrency = Math.max(0, this.run.inRunCurrency + amount);
        }

        /** Add subscribers */
        addSubscribers(amount: number): void {
                this.run.totalSubscribers += amount;
        }

        /** Add hype to running total */
        addHype(amount: number): void {
                this.run.totalHype += amount;
        }

        /** Add an entry to the turn sub log */
        addSubLog(entry: { turn: number; cycle: number; phase: TurnPhase; subsGained: number; hypeGenerated: number; description: string }): void {
                this.run.subLog.push(entry);
        }

        get isDeadAir(): boolean {
                return this.run.ps <= 0;
        }

        // ── Cycle Helpers ──

        /** Get the CycleState for the given cycle (1-indexed) */
        getCycleState(cycle: number): CycleState | undefined {
                return this.run.cycles[cycle - 1];
        }

        /** Get the current CycleState */
        get currentCycleState(): CycleState | undefined {
                return this.run.cycles[this.run.cycle - 1];
        }
}

export const liveonStore = new LiveONStore();
