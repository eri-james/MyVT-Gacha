// ─── Shop Items ───
// Items available during the Free Choice → Shop stage of a Live!ON cycle.

import type { ShopItem, TrainableStat } from '$lib/types';

/** Generate shop items for a cycle */
export function generateShopItems(cycle: number): ShopItem[] {
	const items: ShopItem[] = [];

	// PS Recovery — always available
	items.push({
		id: `shop-ps-${cycle}`,
		name: 'Energy Drink',
		description: 'Recover 8 PS to keep going strong.',
		cost: 0,
		effect: { type: 'ps-boost', value: 8 },
		purchased: false
	});

	// Shield — available from cycle 2+
	if (cycle >= 2) {
		items.push({
			id: `shop-shield-${cycle}`,
			name: 'Stream Shield',
			description: 'Gain 5 Shield to absorb PS costs.',
			cost: 3,
			effect: { type: 'shield', value: 5 },
			purchased: false
		});
	}

	// Stat boosts — rotate based on cycle
	const statPool: TrainableStat[] = ['tc', 'ch', 'vc', 'mg'];
	const statLabels: Record<TrainableStat, string> = {
		tc: 'Tech',
		ch: 'Charisma',
		vc: 'Vocal',
		mg: 'Management'
	};
	const statIndex = (cycle - 1) % statPool.length;

	// Primary stat boost
	items.push({
		id: `shop-stat-primary-${cycle}`,
		name: `${statLabels[statPool[statIndex]]} Coaching`,
		description: `+${3 + Math.floor(cycle / 2)} ${statLabels[statPool[statIndex]]} permanently.`,
		cost: 4,
		effect: { type: 'stat-boost', stat: statPool[statIndex], value: 3 + Math.floor(cycle / 2) },
		purchased: false
	});

	// Secondary stat boost (different stat)
	const secondaryStat = statPool[(statIndex + 2) % statPool.length];
	items.push({
		id: `shop-stat-secondary-${cycle}`,
		name: `${statLabels[secondaryStat]} Workshop`,
		description: `+${2 + Math.floor(cycle / 3)} ${statLabels[secondaryStat]} permanently.`,
		cost: 3,
		effect: { type: 'stat-boost', stat: secondaryStat, value: 2 + Math.floor(cycle / 3) },
		purchased: false
	});

	// Hype bonus — expensive but powerful
	items.push({
		id: `shop-hype-${cycle}`,
		name: 'Hype Potion',
		description: `Instant +${5 + cycle * 2} Hype for the next Checkpoint.`,
		cost: 5,
		effect: { type: 'hype-bonus', value: 5 + cycle * 2 },
		purchased: false
	});

	return items;
}
