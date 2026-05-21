// ─── Economy Logic ─────────────────────────────────────
// Pure functions for currency conversions, producer level, and bond system.

import type { CharacterData, Rarity } from '$lib/types';
import {
	PRODUCER_MAX_LEVEL, PRODUCER_INITIAL_EXP_CAP, PRODUCER_EXP_CAP_GROWTH,
	PRODUCER_REWARD_LEVELS, PRODUCER_REWARD_TICKETS,
	BOND_LEVELS, BOND_MAX_LEVEL, BOND_DATE_COOLDOWN_MS, BOND_DATE_BOND_REQ
} from '$lib/data/constants';

// ── Producer Level ──

export function getProducerExpCap(level: number): number {
	return Math.floor(PRODUCER_INITIAL_EXP_CAP * Math.pow(PRODUCER_EXP_CAP_GROWTH, level - 1));
}

export function addProducerExp(
	currentLevel: number,
	currentExp: number,
	expGained: number
): { level: number; exp: number; leveledUp: boolean } {
	let level = currentLevel;
	let exp = currentExp + expGained;
	let leveledUp = false;

	while (level < PRODUCER_MAX_LEVEL) {
		const cap = getProducerExpCap(level + 1);
		if (exp >= cap) {
			exp -= cap;
			level++;
			leveledUp = true;
		} else {
			break;
		}
	}

	return { level, exp, leveledUp };
}

export function getProducerTicketRewards(level: number): number {
	return PRODUCER_REWARD_LEVELS.filter((lvl) => level >= lvl).length * PRODUCER_REWARD_TICKETS;
}

// ── Bond System ──

export function checkBondLevelUp(charData: CharacterData): { leveledUp: boolean; newLevel: number } {
	if (charData.bondLevel >= BOND_MAX_LEVEL) return { leveledUp: false, newLevel: charData.bondLevel };

	const nextLevelDef = BOND_LEVELS[charData.bondLevel]; // Index 0 = level 1 threshold
	if (!nextLevelDef) return { leveledUp: false, newLevel: charData.bondLevel };

	if (charData.bondPoints >= nextLevelDef.bpRequired) {
		return { leveledUp: true, newLevel: nextLevelDef.level };
	}
	return { leveledUp: false, newLevel: charData.bondLevel };
}

export function applyBondLevelUp(charData: CharacterData, newLevel: number): CharacterData {
	const levelDef = BOND_LEVELS.find((l) => l.level === newLevel);
	if (!levelDef) return charData;

	const bonus = levelDef.statBonus;
	return {
		...charData,
		bondLevel: newLevel,
		stats: {
			st: charData.stats.st + bonus,
			ps: charData.stats.ps + bonus,
			tc: charData.stats.tc + bonus,
			ch: charData.stats.ch + bonus,
			vc: charData.stats.vc + bonus,
			mg: charData.stats.mg + bonus
		}
	};
}

export function getBondStatBonus(bondLevel: number): Record<string, number> {
	let total = 0;
	for (const def of BOND_LEVELS) {
		if (def.level > bondLevel) break;
		total += def.statBonus;
	}
	return {
		st: total,
		ps: total,
		tc: total,
		ch: total,
		vc: total,
		mg: total
	};
}

export function canOdekake(charData: CharacterData): boolean {
	if (charData.bondLevel < BOND_DATE_BOND_REQ) return false;
	const now = Date.now();
	if (now - charData.lastDateCooldown < BOND_DATE_COOLDOWN_MS) return false;
	return true;
}

// ── Daily Login Rewards ──

export function getLoginRewards(streak: number): { vgems: number; tickets: number } {
	const vgems = Math.min(500, 100 + (streak - 1) * 50);
	const tickets = Math.min(3, 1 + Math.floor((streak - 1) / 7));
	return { vgems, tickets };
}

// ── Stamina Recovery ──

export function calculateStaminaRecovery(
	currentStamina: number,
	maxStamina: number,
	lastRecovery: number,
	now: number
): { stamina: number; lastRecovery: number } {
	if (currentStamina >= maxStamina) return { stamina: maxStamina, lastRecovery: now };

	const elapsed = now - lastRecovery;
	const pointsToRecover = Math.floor(elapsed / (4 * 60 * 1000)); // 1 per 4 min
	if (pointsToRecover <= 0) return { stamina: currentStamina, lastRecovery };

	const recovered = Math.min(pointsToRecover, maxStamina - currentStamina);
	return { stamina: currentStamina + recovered, lastRecovery: now };
}
