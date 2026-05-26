import type { Rarity } from './common';

// ─── Gacha Types ───

export type BannerType = 'standard' | 'featured';

export interface GachaBanner {
	id: string;
	type: BannerType;
	name: string;
	description: string;
	featuredSlug?: string; // only for featured banners
	featuredRarity?: Rarity; // rarity of featured character
	costType: 'vgems' | 'blueTicket' | 'redTicket';
	singleCost: number; // cost per single pull
	tenCost: number; // cost per x10 pull (usually discounted)
	rates: GachaRates;
}

export interface GachaRates {
	/** Base pull rates per 100 */
	R: number;    // e.g. 50
	SR: number;   // e.g. 35
	SSR: number;  // e.g. 12
	UR: number;   // e.g. 3
	/** Featured rate boost (added on top of base rate for featured character) */
	featuredBoost: number; // e.g. 1.5 (1.5% extra chance for featured UR)
}

export interface GachaResult {
	slug: string;
	name: string;
	rarity: Rarity;
	isNew: boolean;
	isFeatured: boolean;
	portraitUrl: string;
}

export interface GachaState {
	/** Pity counter for UR — resets on UR pull */
	urPity: number;
	/** Total pulls on standard banner */
	totalStandardPulls: number;
	/** Total pulls on featured banner */
	totalFeaturedPulls: number;
	/** Last pull timestamp */
	lastPullAt: number;
}

/** Pull modes */
export type PullMode = 'single' | 'ten';

/** Pull cost result */
export interface PullCost {
	costType: 'vgems' | 'blueTicket' | 'redTicket';
	amount: number;
	affordable: boolean;
}
