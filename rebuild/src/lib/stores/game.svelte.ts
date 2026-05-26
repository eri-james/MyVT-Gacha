import type {
	Currencies,
	CollectionEntry,
	RosterEntry,
	LiveonRun,
	BrawlAP,
	PageId
} from '$lib/types';
import { DEFAULT_CURRENCIES } from '$lib/types/currencies';
import { DEFAULT_BRAWL_AP } from '$lib/types/brawl';
import { uniqueId } from '$lib/utils/format';

// ─── Game State Store ───
// Single centralized store. Each game mode reads/writes only its own slice.
// Dependency flow: Types → Logic → Store → Components → Routes

export interface GameState {
	// Core
	playerId: string;
	currencies: Currencies;
	collection: Record<string, CollectionEntry>; // keyed by slug
	roster: RosterEntry[];

	// Live!ON
	liveon: LiveonRun | null;

	// AlgoBrawl
	brawlAP: BrawlAP;

	// Navigation
	currentPage: PageId;

	// Meta
	createdAt: number;
	lastSaveAt: number;
}

/** Create a fresh initial game state for new accounts */
export function createInitialState(): GameState {
	return {
		playerId: uniqueId(),
		currencies: { ...DEFAULT_CURRENCIES },
		collection: {},
		roster: [],
		liveon: null,
		brawlAP: { ...DEFAULT_BRAWL_AP, lastRecovery: Date.now() },
		currentPage: 'home',
		createdAt: Date.now(),
		lastSaveAt: 0
	};
}

/** Migrate save data from older versions to current schema */
export function migrateState(data: unknown): GameState {
	// Phase 1: No migrations needed yet — first version
	// Future: check data.version and apply transformations
	if (!data || typeof data !== 'object') {
		return createInitialState();
	}

	const state = data as Record<string, unknown>;

	// Ensure all required fields exist (defensive)
	const initial = createInitialState();
	return {
		playerId: (state.playerId as string) || initial.playerId,
		currencies: (state.currencies as Currencies) || initial.currencies,
		collection: (state.collection as Record<string, CollectionEntry>) || initial.collection,
		roster: (state.roster as RosterEntry[]) || initial.roster,
		liveon: (state.liveon as LiveonRun) || null,
		brawlAP: (state.brawlAP as BrawlAP) || initial.brawlAP,
		currentPage: (state.currentPage as PageId) || 'home',
		createdAt: (state.createdAt as number) || initial.createdAt,
		lastSaveAt: (state.lastSaveAt as number) || 0
	};
}
