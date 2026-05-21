// ─── Studio Logic ──────────────────────────────────────
// Pure functions for studio content creation, quality calculation,
// and offline earnings. No DOM, no store dependencies.

import type {
	CharacterData, Station, StationId, StudioState,
	ContentEntry, QualityTier, Currencies, GameState
} from '$lib/types';
import {
	STATION_DEFS, STATION_MULTIPLIERS, STATION_UPGRADE_COSTS,
	CONTENT_TYPES, QUALITY_TIERS, STAMINA_COSTS,
	STUDIO_EXP_RATES, STUDIO_EXP_RARITY_MULT,
	STUDIO_FLAT_BONUS_PER_LEVEL, STUDIO_FLAT_BONUS_PRACTICE_HALL,
	CONTENT_LOG_MAX, OFFLINE_EARNINGS_CAP_HOURS,
	RARITY_MULTIPLIERS, STAMINA_RECOVERY_INTERVAL_MS
} from '$lib/data/constants';

// ── Level Costs ──

export function getLevelCost(variant: string, level: number): [number, number] {
	const v = variant.toLowerCase();
	const base = v === 'ur' ? 50 : v === 'ssr' ? 30 : v === 'sr' ? 15 : 5;
	const mult = v === 'ur' ? 12 : v === 'ssr' ? 8 : v === 'sr' ? 5 : 3;
	const ringgitCost = base + level * mult;
	const liveCacheCost = Math.ceil(ringgitCost * 0.2);
	return [ringgitCost, liveCacheCost];
}

export function getLevelCap(variant: string): number {
	const v = variant.toLowerCase();
	switch (v) {
		case 'ur': return 70;
		case 'ssr': return 50;
		case 'sr': return 35;
		default: return 20;
	}
}

// ── Station Slots ──

export function getMaxSlots(studioLevel: number): number {
	if (studioLevel >= 1) return 2;
	return 2; // Always 2 slots minimum
}

export function getStationUpgradeCost(currentLevel: number): number {
	const idx = currentLevel - 1;
	if (idx < 0 || idx >= STATION_UPGRADE_COSTS.length) return 0;
	return STATION_UPGRADE_COSTS[idx];
}

// ── Trending Stat ──

export function getTrendingStat(studio: StudioState): string {
	const now = Date.now();
	if (!studio.trendingStat || !studio.trendingExpires || now >= studio.trendingExpires) {
		const trendableStats = ['tc', 'ch', 'vc', 'mg'];
		return trendableStats[Math.floor(Math.random() * trendableStats.length)];
	}
	return studio.trendingStat;
}

export function getTrendingTimeRemaining(studio: StudioState): number {
	const now = Date.now();
	if (!studio.trendingExpires) return 0;
	return Math.max(0, studio.trendingExpires - now);
}

// ── Content Quality ──

export function getContentQuality(
	stationId: StationId,
	station: Station,
	charData: CharacterData,
	studio: StudioState
): QualityTier | null {
	const def = (CONTENT_TYPES as Record<string, typeof CONTENT_TYPES.streamRoom>)[stationId];
	if (!def || !station.assigned) return null;

	const stats = charData.stats;
	const primaryStat = stats[def.primary] || 0;
	const secondaryStat = stats[def.secondary] || 0;

	const otherStatKeys = Object.keys(stats).filter((k) => k !== def.primary && k !== def.secondary);
	const avgOtherStats =
		otherStatKeys.length > 0
			? otherStatKeys.reduce((sum, k) => sum + (stats[k as keyof typeof stats] || 0), 0) / otherStatKeys.length
			: 0;

	const levelBonus = 1 + (charData.level || 0) * 0.02;
	const stationMult = STATION_MULTIPLIERS[(station.level || 1) - 1] || 1;

	const trending = getTrendingStat(studio);
	let trendingBonus = 1;
	if (trending === def.primary || trending === def.secondary) {
		trendingBonus = 1.5;
	}

	const statScore =
		(primaryStat * 0.6 + secondaryStat * 0.3 + avgOtherStats * 0.1) * levelBonus * stationMult * trendingBonus;

	// Find quality tier
	let quality = QUALITY_TIERS[QUALITY_TIERS.length - 1]; // default D
	for (const qt of QUALITY_TIERS) {
		if (statScore >= qt.minScore) {
			quality = qt;
			break;
		}
	}

	return quality;
}

// ── Offline Earnings (pure — does NOT mutate state) ──

export function calculateOfflineEarnings(
	studio: StudioState,
	characters: Record<string, CharacterData>,
	minutes: number
): {
		vgems: number;
		vringgit: number;
		liveCache: number;
		studioExp: number;
		contentPieces: number;
		stationPieces: Record<string, number>;
	} {
	const earnings = { vgems: 0, vringgit: 0, liveCache: 0, studioExp: 0, contentPieces: 0, stationPieces: {} as Record<string, number> };
	const contentCycles = Math.floor(minutes);
	if (contentCycles <= 0) return earnings;

	const recoveryPerMin = STAMINA_RECOVERY_INTERVAL_MS > 0 ? 60000 / STAMINA_RECOVERY_INTERVAL_MS : 0;
	const maxSlots = getMaxSlots(studio.level);
	let slotCount = 0;

	for (const [stationId, stationDef] of Object.entries(STATION_DEFS)) {
		if (slotCount >= maxSlots) break;
		const station = studio.stations[stationId as StationId];
		if (!station || !station.assigned) continue;
		if (studio.level < stationDef.unlockLv) continue;

		const charData = characters[station.assigned];
		if (!charData) { slotCount++; continue; }

		const def = (CONTENT_TYPES as Record<string, typeof CONTENT_TYPES.streamRoom>)[stationId];
		if (!def) { slotCount++; continue; }

		const staminaCost = STAMINA_COSTS[(station.level || 1) - 1] || 8;

		// Per-VTuber stamina calculation
		const maxST = charData.baseStats?.st || 0;
		const currentST = charData.stats?.st || 0;
		const stAfterRecovery = Math.min(maxST, currentST + Math.floor(recoveryPerMin * minutes));
		const maxPieces = Math.floor(stAfterRecovery / staminaCost);
		const actualPieces = Math.min(contentCycles, maxPieces);

		if (actualPieces <= 0) { slotCount++; continue; }

		earnings.stationPieces[stationId] = actualPieces;

		const levelBonus = 1 + (charData.level || 0) * 0.02;
		const stationMult = STATION_MULTIPLIERS[(station.level || 1) - 1] || 1;
		const rarityMult = RARITY_MULTIPLIERS[charData.rarity] || 1;
		const qualityMult = 1.0; // B tier for offline

		const flatBonus =
			stationId === 'streamRoom'
				? 0
				: stationId === 'practiceHall'
					? (studio.level - 1) * STUDIO_FLAT_BONUS_PRACTICE_HALL
					: (studio.level - 1) * STUDIO_FLAT_BONUS_PER_LEVEL;

		const perPieceReward = def.baseReward * qualityMult * rarityMult * stationMult * levelBonus + flatBonus;
		const totalReward = perPieceReward * actualPieces;

		if (def.resource === 'vgems') earnings.vgems += Math.floor(totalReward);
		else if (def.resource === 'vringgit') earnings.vringgit += Math.floor(totalReward);
		else if (def.resource === 'liveCache') earnings.liveCache += totalReward;

		// Lounge bonus LiveCache
		if ('bonusResource' in def && def.bonusResource === 'liveCache' && 'bonusAmount' in def) {
			earnings.liveCache += Math.floor((def.bonusAmount as number) * qualityMult * rarityMult * stationMult * levelBonus * actualPieces);
		}

		// Passive studio EXP
		const expRate = (STUDIO_EXP_RATES[stationId as keyof typeof STUDIO_EXP_RATES] || 0) * (STUDIO_EXP_RARITY_MULT[charData.rarity] || 1.0);
		earnings.studioExp += Math.floor(expRate * minutes);
		earnings.contentPieces += actualPieces;
		slotCount++;
	}

	return earnings;
}

// ── Studio EXP ──

export function addStudioExp(studio: StudioState, amount: number): StudioState {
	const updated = { ...studio, exp: studio.exp + amount };
	return updated;
}

export function checkStudioLevelUp(studio: StudioState): StudioState {
	const levels = [
		{ level: 2, exp: 200 },
		{ level: 3, exp: 600 },
		{ level: 4, exp: 1500 },
		{ level: 5, exp: 3500 },
		{ level: 6, exp: 7000 },
		{ level: 7, exp: 12000 },
		{ level: 8, exp: 20000 },
		{ level: 9, exp: 35000 },
		{ level: 10, exp: 60000 }
	];

	const updated = { ...studio };
	for (const lvl of levels) {
		if (updated.level < lvl.level && updated.exp >= lvl.exp) {
			updated.level = lvl.level;
		}
	}
	return updated;
}

// ── VTuber Stamina Recovery ──

export function recoverVTuberStamina(charData: CharacterData): CharacterData {
	const maxST = charData.baseStats?.st || 0;
	if (charData.stats.st >= maxST) return charData;

	const now = Date.now();
	const elapsed = now - (charData.lastStaminaRecovery || now);
	const pointsToRecover = Math.floor(elapsed / STAMINA_RECOVERY_INTERVAL_MS);
	if (pointsToRecover <= 0) return charData;

	const recovered = Math.min(pointsToRecover, maxST - charData.stats.st);
	return {
		...charData,
		stats: { ...charData.stats, st: charData.stats.st + recovered },
		lastStaminaRecovery: now
	};
}
