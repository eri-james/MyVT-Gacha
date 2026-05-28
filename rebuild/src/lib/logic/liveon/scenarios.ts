// ─── Live!ON Scenarios ───
// A scenario defines the theme for a Live!ON run.
// Each scenario affects which excursion events appear and the flavor of the run.

export interface Scenario {
	id: string;
	name: string;
	description: string;
	icon: string; // emoji placeholder — replaced with art later
	difficulty: 1 | 2 | 3; // affects opponent stat scaling
}

/** All available scenarios */
export const SCENARIOS: Scenario[] = [
	{
		id: 'debut',
		name: 'Debut Stream',
		description: 'A fresh start. Train a VTuber for their very first stream.',
		icon: '🎯',
		difficulty: 1
	},
	{
		id: 'collab',
		name: 'Collaboration Special',
		description: 'Two VTubers team up for a memorable collab stream.',
		icon: '🤝',
		difficulty: 2
	},
	{
		id: 'marathon',
		name: 'Endurance Marathon',
		description: 'A grueling long-stream challenge. Only the strongest survive.',
		icon: '🔥',
		difficulty: 3
	}
];

/** Get a scenario by ID */
export function getScenario(id: string): Scenario | undefined {
	return SCENARIOS.find(s => s.id === id);
}

/** Get default scenario */
export function getDefaultScenario(): Scenario {
	return SCENARIOS[0];
}
