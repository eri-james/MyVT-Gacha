import type { CharacterData } from '$lib/types/character';

// ─── Character data loader ───

let cachedCharacters: CharacterData[] = [];

/** Fetch and cache all character data from static JSON */
export async function loadCharacters(): Promise<CharacterData[]> {
        if (cachedCharacters.length > 0) return cachedCharacters;

        const res = await fetch('/data/characters.json');
        if (!res.ok) throw new Error(`Failed to load characters: ${res.status}`);
        cachedCharacters = await res.json();
        return cachedCharacters;
}

/** Get a single character by slug */
export async function getCharacter(slug: string): Promise<CharacterData | undefined> {
        const chars = await loadCharacters();
        return chars.find(c => c.slug === slug);
}

/** Get characters filtered by rarity */
export async function getCharactersByRarity(rarity: string): Promise<CharacterData[]> {
        const chars = await loadCharacters();
        return chars.filter(c => c.rarity === rarity);
}

/** Get random characters of a given rarity */
export async function getRandomCharacters(rarity: string, count: number): Promise<CharacterData[]> {
        const pool = await getCharactersByRarity(rarity);
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
}

/** Get a random character of a specific rarity */
export async function getRandomCharacter(rarity: string): Promise<CharacterData> {
        const chars = await getCharactersByRarity(rarity);
        if (chars.length === 0) throw new Error(`No characters found with rarity ${rarity}`);
        return chars[Math.floor(Math.random() * chars.length)];
}
