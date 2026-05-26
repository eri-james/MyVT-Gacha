<script lang="ts">
        import '$lib/../app.css';
        import type { PageId } from '$lib/types';
        import type { GameState } from '$lib/stores/game.svelte';
        import { createInitialState, migrateState } from '$lib/stores/game.svelte';
        import { readSave, writeSave } from '$lib/utils/save';
        import AppShell from '$components/layout/AppShell.svelte';
        import { setContext, onMount } from 'svelte';
        import type { Snippet } from 'svelte';
        let { children }: { children: Snippet } = $props();

        // ─── Central reactive state ───
        let currentPage = $state<PageId>('home');
        let gameState = $state<GameState>(createInitialState());
        let isLoading = $state(true);
        let toastMessage = $state<string | null>(null);

        // Navigation function — children call this instead of direct assignment
        function navigateTo(page: PageId) {
                currentPage = page;
        }

        function showToast(msg: string) {
                toastMessage = msg;
                setTimeout(() => { toastMessage = null; }, 3000);
        }

        // Provide state + mutators to all child components via context
        setContext('myvt-game', {
                get currentPage() { return currentPage; },
                get gameState() { return gameState; },
                get isLoading() { return isLoading; },
                get toastMessage() { return toastMessage; },
                navigateTo,
                showToast
        });

        // ─── Save / Load ───
        onMount(async () => {
                try {
                        const saved = await readSave();
                        if (saved) {
                                gameState = migrateState(saved);
                        }
                } catch (e) {
                        console.error('Failed to load save:', e);
                }
                isLoading = false;
        });

        // Auto-save every 30 seconds
        onMount(() => {
                const interval = setInterval(async () => {
                        if (!isLoading && gameState) {
                                try {
                                        gameState.lastSaveAt = Date.now();
                                        await writeSave(gameState);
                                } catch {
                                        showToast('Save failed');
                                }
                        }
                }, 30_000);
                return () => clearInterval(interval);
        });
</script>

<AppShell bind:currentPage={currentPage}>
        {#if isLoading}
                <div class="loading-screen">
                        <div class="loading-spinner"></div>
                        <p class="text-secondary text-sm mt-md">Loading...</p>
                </div>
        {:else}
                {#if toastMessage}
                        <div class="toast-bar anim-slide-down">
                                <span class="text-sm">{toastMessage}</span>
                        </div>
                {/if}

                {@render children()}
        {/if}
</AppShell>

<style>
        .loading-screen {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
        }

        .loading-spinner {
                width: 32px;
                height: 32px;
                border: 3px solid var(--c-border);
                border-top-color: var(--c-accent-blue);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
                to { transform: rotate(360deg); }
        }

        .toast-bar {
                position: absolute;
                top: calc(var(--safe-top) + var(--sp-md));
                left: var(--sp-xl);
                right: var(--sp-xl);
                z-index: var(--z-toast);
                padding: var(--sp-md) var(--sp-lg);
                background: var(--c-accent-red);
                border-radius: var(--r-md);
                text-align: center;
        }
</style>
