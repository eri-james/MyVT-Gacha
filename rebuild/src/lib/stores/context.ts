import { getContext } from 'svelte';
import type { PageId } from '$lib/types';
import type { GameState } from '$lib/stores/game.svelte';

export interface GameContext {
        readonly currentPage: PageId;
        readonly gameState: GameState;
        readonly isLoading: boolean;
        readonly toastMessage: string | null;
        navigateTo(page: PageId): void;
        showToast(msg: string): void;
}

/** Access game state from any child component */
export function useGame(): GameContext {
        const ctx = getContext<GameContext>('myvt-game');
        if (!ctx) throw new Error('useGame must be used inside AppShell');
        return ctx;
}
