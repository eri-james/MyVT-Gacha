import { get, set } from 'idb-keyval';
import type { GameState } from '$lib/types';
import { SAVE_KEY } from '$lib/data/constants';

/** Load game state from IndexedDB */
export async function loadSave(): Promise<GameState | null> {
	try {
		const saved = await get<GameState>(SAVE_KEY);
		return saved ?? null;
	} catch (err) {
		console.error('Failed to load save:', err);
		return null;
	}
}

/** Save game state to IndexedDB */
export async function writeSave(state: GameState): Promise<void> {
	try {
		state.lastOnline = Date.now();
		await set(SAVE_KEY, state);
	} catch (err) {
		console.error('Failed to save:', err);
	}
}

/** Delete save data (for reset) */
export async function deleteSave(): Promise<void> {
	try {
		await set(SAVE_KEY, null);
	} catch (err) {
		console.error('Failed to delete save:', err);
	}
}

/** Migrate localStorage save to IndexedDB (one-time tool) */
export async function migrateFromLocalStorage(): Promise<GameState | null> {
	try {
		const raw = localStorage.getItem(SAVE_KEY);
		if (!raw) return null;
		const state = JSON.parse(raw) as GameState;
		await set(SAVE_KEY, state);
		localStorage.removeItem(SAVE_KEY);
		return state;
	} catch (err) {
		console.error('Migration failed:', err);
		return null;
	}
}
