import { get, set, del } from 'idb-keyval';
import { deepClone } from './format';

// ─── Save / Load ───

const SAVE_KEY = 'myvt-save';
const SAVE_VERSION = 1;

/** The serializable shape of the game state */
export interface SaveData {
	version: number;
	savedAt: number;
	data: unknown;
}

/** Write game state to IndexedDB */
export async function writeSave(state: unknown): Promise<void> {
	// Strip Svelte 5 proxies via JSON round-trip
	const clean = deepClone(state);
	const save: SaveData = {
		version: SAVE_VERSION,
		savedAt: Date.now(),
		data: clean
	};
	await set(SAVE_KEY, save);
}

/** Read game state from IndexedDB. Returns null if no save exists. */
export async function readSave(): Promise<unknown | null> {
	const save: SaveData | undefined = await get(SAVE_KEY);
	if (!save) return null;
	if (!save.data) return null;
	return save.data;
}

/** Get save metadata without loading full data */
export async function getSaveInfo(): Promise<{ version: number; savedAt: number } | null> {
	const save: SaveData | undefined = await get(SAVE_KEY);
	if (!save) return null;
	return { version: save.version, savedAt: save.savedAt };
}

/** Delete save data */
export async function deleteSave(): Promise<void> {
	await del(SAVE_KEY);
}

/** Current save version for migration checks */
export function currentSaveVersion(): number {
	return SAVE_VERSION;
}
