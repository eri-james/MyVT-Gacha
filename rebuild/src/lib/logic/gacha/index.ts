// ─── Gacha Engine ───
// Pull logic: rates, pity, cost calculation, banner management

import type { Rarity, CharacterData } from '$lib/types';
import type { GachaBanner, GachaResult, GachaRates, PullMode, PullCost } from '$lib/types';
import { randInt, pickRandom } from '$lib/utils/format';
import { loadCharacters, getCharactersByRarity } from '$lib/data/characters';
import type { Currencies } from '$lib/types';

// ─── Constants ───

/** Pity threshold — guaranteed UR at this many pulls without one */
export const UR_PITY_THRESHOLD = 100;

/** Soft pity starts at this count — UR rate begins increasing */
export const UR_SOFT_PITY_START = 75;

/** Default banner rates */
export const DEFAULT_RATES: GachaRates = {
	R: 50,
	SR: 35,
	SSR: 12,
	UR: 3,
	featuredBoost: 1.5
};

// ─── Banners ───

export const BANNERS: GachaBanner[] = [
	{
		id: 'standard',
		type: 'standard',
		name: 'Standard Spotlight',
		description: 'All VTubers available. Higher rates for SR and above.',
		costType: 'vgems',
		singleCost: 160,
		tenCost: 1600,
		rates: { ...DEFAULT_RATES }
	},
	{
		id: 'featured',
		type: 'featured',
		name: 'Featured Pickup',
		description: 'Rate-up for featured UR character! Uses Red MyTickets first.',
		costType: 'redTicket',
		singleCost: 1,
		tenCost: 10,
		rates: {
			...DEFAULT_RATES,
			featuredBoost: 3.0 // higher boost for featured
		}
	}
];

/** Get a banner by ID */
export function getBanner(id: string): GachaBanner | undefined {
	return BANNERS.find(b => b.id === id);
}

/** Get default banner */
export function getDefaultBanner(): GachaBanner {
	return BANNERS[0];
}

// ─── Pull Cost ───

/** Calculate pull cost and check affordability */
export function calculatePullCost(
	banner: GachaBanner,
	mode: PullMode,
	currencies: Currencies
): PullCost {
	const costType = banner.costType as keyof Currencies;
	const amount = mode === 'single' ? banner.singleCost : banner.tenCost;
	const balance = currencies[costType] ?? 0;

	return {
		costType: banner.costType,
		amount,
		affordable: balance >= amount
	};
}

/** Deduct pull cost from currencies */
export function deductPullCost(
	banner: GachaBanner,
	mode: PullMode,
	currencies: Currencies
): boolean {
	const cost = calculatePullCost(banner, mode, currencies);
	if (!cost.affordable) return false;

	const key = banner.costType as keyof Currencies;
	currencies[key] -= cost.amount;
	return true;
}

// ─── Pull Logic ───

/** Determine rarity for a single pull, accounting for pity */
export function rollRarity(
	banner: GachaBanner,
	urPityCount: number
): Rarity {
	const rates = { ...banner.rates };

	// Soft pity: increase UR rate starting at 75 pulls
	if (urPityCount >= UR_SOFT_PITY_START) {
		const pityBonus = ((urPityCount - UR_SOFT_PITY_START + 1) / (UR_PITY_THRESHOLD - UR_SOFT_PITY_START)) * 50;
		rates.UR = Math.min(100, rates.UR + pityBonus);
		// Reduce R rate to compensate
		rates.R = Math.max(0, rates.R - pityBonus);
	}

	// Hard pity: guaranteed UR
	if (urPityCount >= UR_PITY_THRESHOLD) {
		return 'UR';
	}

	// Roll
	const roll = Math.random() * 100;
	let cumulative = 0;

	// Check from highest rarity down
	cumulative += rates.UR;
	if (roll < cumulative) return 'UR';

	cumulative += rates.SSR;
	if (roll < cumulative) return 'SSR';

	cumulative += rates.SR;
	if (roll < cumulative) return 'SR';

	return 'R';
}

/** Check if this pull hits the featured character (for featured banners) */
export function rollFeatured(banner: GachaBanner, rolledRarity: Rarity): boolean {
	if (banner.type !== 'featured' || !banner.featuredRarity) return false;
	if (rolledRarity !== banner.featuredRarity) return false;

	// Featured boost chance
	return Math.random() * 100 < banner.rates.featuredBoost;
}

/** Execute a single pull */
export async function executeSinglePull(
	banner: GachaBanner,
	urPityCount: number,
	ownedSlugs: Set<string>
): Promise<{ result: GachaResult; newPity: number }> {
	const characters = await loadCharacters();
	const rarity = rollRarity(banner, urPityCount);

	// Select a random character of that rarity
	const pool = characters.filter(c => c.rarity === rarity);
	if (pool.length === 0) {
		// Fallback — shouldn't happen
		const fallback = characters[0];
		return {
			result: {
				slug: fallback.slug,
				name: fallback.name,
				rarity: fallback.rarity,
				isNew: !ownedSlugs.has(fallback.slug),
				isFeatured: false,
				portraitUrl: `/portraits/${fallback.slug}.jpg`
			},
			newPity: rarity === 'UR' ? 0 : urPityCount + 1
		};
	}

	// Check for featured
	let character: CharacterData;
	const isFeatured = rollFeatured(banner, rarity);

	if (isFeatured && banner.featuredSlug) {
		const featured = characters.find(c => c.slug === banner.featuredSlug);
		if (featured) {
			character = featured;
		} else {
			character = pickRandom(pool);
		}
	} else {
		character = pickRandom(pool);
	}

	return {
		result: {
			slug: character.slug,
			name: character.name,
			rarity: character.rarity,
			isNew: !ownedSlugs.has(character.slug),
			isFeatured: isFeatured && character.slug === banner.featuredSlug,
			portraitUrl: `/portraits/${character.slug}.jpg`
		},
		newPity: rarity === 'UR' ? 0 : urPityCount + 1
	};
}

/** Execute an x10 pull */
export async function executeTenPull(
	banner: GachaBanner,
	urPityCount: number,
	ownedSlugs: Set<string>
): Promise<{ results: GachaResult[]; newPity: number }> {
	const results: GachaResult[] = [];
	let currentPity = urPityCount;

	for (let i = 0; i < 10; i++) {
		const { result, newPity } = await executeSinglePull(banner, currentPity, ownedSlugs);
		results.push(result);
		currentPity = newPity;
		ownedSlugs.add(result.slug); // avoid duplicate "new" within same batch
	}

	return { results, newPity: currentPity };
}

// ─── Statistics ───

/** Get pull count display for pity */
export function getPityDisplay(pityCount: number): string {
	if (pityCount >= UR_PITY_THRESHOLD) return 'MAX';
	return `${pityCount}/${UR_PITY_THRESHOLD}`;
}

/** Get pity progress percentage */
export function getPityProgress(pityCount: number): number {
	return Math.min(100, (pityCount / UR_PITY_THRESHOLD) * 100);
}
