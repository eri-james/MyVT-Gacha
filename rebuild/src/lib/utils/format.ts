// ─── Formatting utilities ───

/** Format large numbers with K/M suffix */
export function formatNumber(n: number): string {
	if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
	if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
	return n.toString();
}

/** Format number with commas */
export function formatWithCommas(n: number): string {
	return n.toLocaleString();
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/** Random integer in [min, max] inclusive */
export function randInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick a random element from an array */
export function pickRandom<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

/** Shuffle an array (Fisher-Yates, returns new array) */
export function shuffle<T>(arr: T[]): T[] {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/** Deep-clone a value via JSON serialization (strips Svelte proxies) */
export function deepClone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}

/** Generate a unique ID */
export function uniqueId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Get ISO week number */
export function getISOWeekId(): string {
	const now = new Date();
	const start = new Date(now.getFullYear(), 0, 1);
	const diff = now.getTime() - start.getTime();
	const week = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
	return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Get ISO date string */
export function getISODateId(): string {
	return new Date().toISOString().split('T')[0];
}

/** Get ISO month string */
export function getISOMonthId(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
