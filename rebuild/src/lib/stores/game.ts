import type { GameState, Currencies, StudioState, CharacterData } from '$lib/types';
import { SAVE_VERSION } from '$lib/data/constants';
import { loadSave, writeSave, migrateFromLocalStorage } from '$lib/utils/save';

function generatePlayerId(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let id = 'MYVT';
	for (let g = 0; g < 3; g++) {
		id += '-';
		for (let i = 0; i < 4; i++) {
			id += chars[Math.floor(Math.random() * chars.length)];
		}
	}
	return id;
}

function createInitialState(): GameState {
	return {
		version: SAVE_VERSION,
		playerId: generatePlayerId(),
		username: 'Producer',
		producerLevel: { level: 1, exp: 0 },
		currencies: {
			vgems: 1500,
			vringgit: 0,
			myTicket: { blue: 10, red: 0 },
			liveCache: 0,
			stars: 1000,
			starDust: 0,
			starFragments: 0,
			bondPoints: 0,
			gems: 0
		},
		characters: {},
		oshiList: [],
		featuredVtuber: null,
		studio: {
			level: 1,
			exp: 0,
			stations: {
				streamRoom: { level: 1, assigned: null },
				creativeCorner: { level: 1, assigned: null },
				practiceHall: { level: 1, assigned: null },
				lounge: { level: 1, assigned: null }
			},
			contentLog: [],
			lastContentTick: Date.now(),
			trendingStat: null,
			trendingExpires: 0
		},
		pity: { count: 0 },
		stats: { totalPulls: 0, ssrStreak: 0, bestSsrStreak: 0 },
		pullHistory: {},
		milestones: [],
		dailyLogin: { streak: 0, lastClaim: null },
		quests: {
			daily: { date: '', progress: {}, claimed: {} },
			weekly: { weekId: '', progress: {}, claimed: {} }
		},
		stamina: { current: 180, lastRecovery: Date.now() },
		minigame: { dailyPlays: 0, lastPlayDate: null, highScore: 0 },
		lastOnline: Date.now()
	};
}

/** State migration (v1 → v8) — simplified for rebuild */
function migrateState(saved: GameState): GameState {
	const merged = { ...createInitialState(), ...saved, version: SAVE_VERSION };
	// Ensure all fields exist
	if (!merged.milestones) merged.milestones = [];
	if (!merged.pullHistory) merged.pullHistory = {};
	if (!merged.minigame) merged.minigame = { dailyPlays: 0, lastPlayDate: null, highScore: 0 };
	if (!merged.stamina) merged.stamina = { current: 180, lastRecovery: Date.now() };
	if (merged.stamina.current > 180) merged.stamina.current = 180;
	if (!merged.quests) merged.quests = { daily: { date: '', progress: {}, claimed: {} }, weekly: { weekId: '', progress: {}, claimed: {} } };
	if (!merged.producerLevel) merged.producerLevel = { level: 1, exp: 0 };
	if (!merged.oshiList) merged.oshiList = [];
	return merged;
}

export class GameStore {
	state: GameState = $state(createInitialState());
	ready: boolean = $state(false);
	private _saveTimer: ReturnType<typeof setInterval> | null = null;

	async init(): Promise<void> {
		let saved = await loadSave();

		// Try localStorage migration for existing players
		if (!saved) {
			saved = await migrateFromLocalStorage();
		}

		if (saved) {
			if (saved.version < SAVE_VERSION) {
				saved = migrateState(saved);
			}
			this.state = saved;
		}

		this.ready = true;

		// Auto-save every 30 seconds
		this._saveTimer = setInterval(() => this.save(), 30_000);

		// Save on page unload
		if (typeof window !== 'undefined') {
			window.addEventListener('beforeunload', () => this.save());
		}
	}

	async save(): Promise<void> {
		if (!this.ready) return;
		await writeSave(this.state);
	}

	async reset(): Promise<void> {
		this.state = createInitialState();
		await this.save();
	}

	// ── Currency shortcuts ──
	get currencies(): Currencies { return this.state.currencies; }
	get characters(): Record<string, CharacterData> { return this.state.characters; }
	get studio(): StudioState { return this.state.studio; }

	/** Count of owned characters */
	get ownedCount(): number {
		return Object.values(this.state.characters).filter((c) => c.owned).length;
	}

	/** Total power of all owned characters */
	get totalPower(): number {
		return Object.values(this.state.characters)
			.filter((c) => c.owned)
			.reduce((sum, c) => sum + Object.values(c.stats).reduce((a, b) => a + b, 0), 0);
	}

	destroy(): void {
		if (this._saveTimer) clearInterval(this._saveTimer);
		if (typeof window !== 'undefined') {
			window.removeEventListener('beforeunload', () => this.save());
		}
	}
}

// Singleton
export const gameStore = new GameStore();
