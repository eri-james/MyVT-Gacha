// Simple seeded PRNG (mulberry32) for reproducible randomness
export class SeededRNG {
	private seed: number;

	constructor(seed: number) {
		this.seed = seed;
	}

	/** Returns a float in [0, 1) */
	next(): number {
		this.seed |= 0;
		this.seed = (this.seed + 0x6d2b79f5) | 0;
		let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	/** Returns int in [min, max] inclusive */
	nextInt(min: number, max: number): number {
		return Math.floor(this.next() * (max - min + 1)) + min;
	}

	/** Returns true with given probability */
	chance(probability: number): boolean {
		return this.next() < probability;
	}

	/** Pick random element from array */
	pick<T>(arr: T[]): T {
		return arr[Math.floor(this.next() * arr.length)];
	}

	/** Shuffle array (returns new array) */
	shuffle<T>(arr: T[]): T[] {
		const result = [...arr];
		for (let i = result.length - 1; i > 0; i--) {
			const j = Math.floor(this.next() * (i + 1));
			[result[i], result[j]] = [result[j], result[i]];
		}
		return result;
	}
}
