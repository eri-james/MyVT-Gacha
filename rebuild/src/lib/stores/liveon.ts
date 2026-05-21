import type { LiveONRunState, CoachSlot, LiveONScenario, LiveONEvent } from '$lib/types';
import {
	LIVEON_MAX_TURNS, LIVEON_COACH_SLOTS, LIVEON_COACH_BASE_BONUS,
	LIVEON_RUN_PS_CAP, LIVEON_FINALE_BASE_TARGET, LIVEON_FINALE_DIFFICULTY_MULT
} from '$lib/data/constants';

export function createRunState(): LiveONRunState {
	return {
		active: false,
		scenario: null,
		lead: null,
		coaches: { streamer: null, performance: null, stage: null },
		coachBonuses: { streamer: LIVEON_COACH_BASE_BONUS, performance: LIVEON_COACH_BASE_BONUS, stage: LIVEON_COACH_BASE_BONUS },
		turn: 0,
		maxTurns: LIVEON_MAX_TURNS,
		ps: 0,
		maxPS: 0,
		subscribers: 0,
		subscriberLog: [],
		upgrades: [],
		consumedUpgrades: [],
		chaosUpgrades: [],
		targetSubs: 0,
		currentEvent: null,
		ending: null,
		rewards: null
	};
}

export class LiveONStore {
	run: LiveONRunState = $state(createRunState());

	get isActive(): boolean {
		return this.run.active;
	}

	get currentTurn(): number {
		return this.run.turn;
	}

	get subscribers(): number {
		return this.run.subscribers;
	}

	get ps(): number {
		return this.run.ps;
	}

	get isFinaleTurn(): boolean {
		return this.run.turn === LIVEON_MAX_TURNS;
	}

	get isAgencyVisitTurn(): boolean {
		return [5, 10, 15].includes(this.run.turn);
	}

	startRun(scenario: LiveONScenario, leadSlug: string, coaches: Record<CoachSlot, string | null>, leadPS: number, maxPS: number): void {
		const run = createRunState();
		run.active = true;
		run.scenario = scenario;
		run.lead = leadSlug;
		run.coaches = coaches;
		run.turn = 1;
		run.ps = Math.min(leadPS, LIVEON_RUN_PS_CAP);
		run.maxPS = Math.min(maxPS, LIVEON_RUN_PS_CAP);
		run.targetSubs = LIVEON_FINALE_BASE_TARGET + scenario.difficulty * LIVEON_FINALE_DIFFICULTY_MULT;
		this.run = run;
	}

	endRun(ending: 'good' | 'neutral' | 'bad', rewards: { vgems: number; vringgit: number; liveCache: number; bondExp: number }): void {
		this.run = {
			...this.run,
			ending,
			rewards,
			active: false
		};
	}

	reset(): void {
		this.run = createRunState();
	}
}

export const liveonStore = new LiveONStore();
