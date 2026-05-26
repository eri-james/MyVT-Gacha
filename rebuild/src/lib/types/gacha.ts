import type { Rarity } from './common';

// ─── Gacha Types (stub for Phase 2) ───

export type BannerType = 'standard' | 'featured';

export interface Banner {
	id: string;
	type: BannerType;
	name: string;
	description: string;
}

export interface GachaResult {
	slug: string;
	rarity: Rarity;
	isNew: boolean;
}
