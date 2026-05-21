/** Format large numbers with K/M suffixes */
export function formatNumber(n: number): string {
	if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
	if (n >= 10_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
	if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
	return n.toString();
}

/** Format duration in seconds to MM:SS */
export function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Format time ago from timestamp to human-readable string */
export function formatTimeAgo(timestamp: number): string {
	const diff = Date.now() - timestamp;
	const minutes = Math.floor(diff / 60_000);
	const hours = Math.floor(diff / 3_600_000);
	const days = Math.floor(diff / 86_400_000);

	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	return `${days}d ago`;
}

/** Format time remaining in ms to MM:SS or HH:MM:SS */
export function formatTimeRemaining(ms: number): string {
	if (ms <= 0) return '00:00';
	const totalSec = Math.floor(ms / 1000);
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
	return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}
