import type { StationId } from '$lib/types';

export interface OfflineEarningsData {
	minutes: number;
	vgems: number;
	vringgit: number;
	liveCache: number;
	studioExp: number;
	contentPieces: number;
	stationPieces: Record<string, number>;
}

export class StudioStore {
	showAssignModal: boolean = $state(false);
	assignStationId: StationId | null = $state(null);
	showOfflineModal: boolean = $state(false);
	offlineResult: OfflineEarningsData | null = $state(null);
	showLevelUp: boolean = $state(false);
	levelUpFrom: number = $state(0);
	levelUpTo: number = $state(0);
	levelUpUnlock: string = $state('');

	openAssignModal(stationId: StationId): void {
		this.assignStationId = stationId;
		this.showAssignModal = true;
	}

	closeAssignModal(): void {
		this.showAssignModal = false;
		this.assignStationId = null;
	}

	showOfflineEarnings(result: OfflineEarningsData): void {
		this.offlineResult = result;
		this.showOfflineModal = true;
	}

	closeOfflineEarnings(): void {
		this.showOfflineModal = false;
		this.offlineResult = null;
	}

	showLevelUpNotice(from: number, to: number, unlock: string): void {
		this.levelUpFrom = from;
		this.levelUpTo = to;
		this.levelUpUnlock = unlock;
		this.showLevelUp = true;
	}

	closeLevelUp(): void {
		this.showLevelUp = false;
	}

	reset(): void {
		this.showAssignModal = false;
		this.assignStationId = null;
		this.showOfflineModal = false;
		this.offlineResult = null;
		this.showLevelUp = false;
	}
}

export const studioStore = new StudioStore();
