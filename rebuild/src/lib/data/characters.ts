import type { CharacterRecord, Rarity } from '$lib/types';

let _characters: CharacterRecord[] = [];
let _loaded = false;
let _loadPromise: Promise<CharacterRecord[]> | null = null;

/** Load characters from static JSON (lazy, cached, singleton promise) */
export async function loadCharacters(): Promise<CharacterRecord[]> {
	if (_loaded) return _characters;
	if (_loadPromise) return _loadPromise;

	_loadPromise = _doLoad();
	try {
		return await _loadPromise;
	} finally {
		_loadPromise = null;
	}
}

async function _doLoad(): Promise<CharacterRecord[]> {
	try {
		const resp = await fetch('/data/characters.json');
		if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
		_characters = await resp.json();
		_loaded = true;
		console.log(`Loaded ${_characters.length} characters.`);
		return _characters;
	} catch (err) {
		console.error('Failed to load characters:', err);
		return [];
	}
}

/** Get all loaded characters */
export function getCharacters(): CharacterRecord[] {
	return _characters;
}

/** Find a character by slug */
export function getBySlug(slug: string): CharacterRecord | undefined {
	return _characters.find((c) => c.slug === slug);
}

/** Get all unique agencies */
export function getAgencies(): string[] {
	const agencies = new Set(_characters.map((c) => c.agency));
	return [...agencies].sort();
}

/** Get characters filtered by rarity */
export function getByRarity(rarity: Rarity): CharacterRecord[] {
	return _characters.filter((c) => c.rarity === rarity);
}

/** Get a random character */
export function getRandom(): CharacterRecord | undefined {
	return _characters[Math.floor(Math.random() * _characters.length)];
}

/** Get portrait image URL (self-hosted) */
export function getImageUrl(slug: string): string {
	return `/data/portraits/${slug}.jpg`;
}

/** Get the original (remote) image URL for a character */
export function getOriginalImageUrl(slug: string): string {
	const char = getBySlug(slug);
	return char?.image ?? '';
}

/** Check if characters are loaded */
export function isLoaded(): boolean {
	return _loaded;
}
