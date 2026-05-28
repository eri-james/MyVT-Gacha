// ─── AlgoBrawl Types (stub for future) ───

/** AP (Algo Points) system */
export interface BrawlAP {
	current: number;  // 0-5
	max: number;      // 5
	lastRecovery: number; // timestamp of last recovery tick
}

export const DEFAULT_BRAWL_AP: BrawlAP = {
	current: 5,
	max: 5,
	lastRecovery: 0
};

/** AP recovery: 1 point per 4 minutes (240000ms) */
export const AP_RECOVERY_MS = 240_000;
