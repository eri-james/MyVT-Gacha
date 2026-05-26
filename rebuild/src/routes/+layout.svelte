<script lang="ts">
	import '$lib/../app.css';
	import type { PageId } from '$lib/types';
	import type { GameState } from '$lib/stores/game.svelte.ts';
	import AppShell from '$components/layout/AppShell.svelte';

	// ─── Central reactive state ───
	// All components access state through these bindings.
	// Game logic files produce new state; components just display it.
	let currentPage = $state<PageId>('home');
	let gameState = $state<GameState | null>(null);
	let isLoading = $state(true);
</script>

<AppShell bind:currentPage={currentPage}>
	{#if isLoading}
		<div class="loading-screen">
			<div class="loading-spinner"></div>
			<p class="text-secondary text-sm mt-md">Loading...</p>
		</div>
	{:else if gameState}
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
</style>
