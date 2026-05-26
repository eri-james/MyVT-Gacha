<script lang="ts">
	import { onMount } from 'svelte';
	import { createInitialState, migrateState } from '$lib/stores/game.svelte.ts';
	import { readSave, writeSave } from '$lib/utils/save';

	let gameState = $state(createInitialState());
	let isLoaded = $state(false);

	onMount(async () => {
		const saved = await readSave();
		if (saved) {
			gameState = migrateState(saved);
		}
		isLoaded = true;
	});

	// Auto-save every 30 seconds
	onMount(() => {
		const interval = setInterval(async () => {
			if (isLoaded && gameState) {
				gameState.lastSaveAt = Date.now();
				await writeSave(gameState);
			}
		}, 30_000);
		return () => clearInterval(interval);
	});
</script>

<div class="page anim-fade-in">
	<!-- Placeholder: Background art -->
	<div class="home-hero art-bg"></div>

	<div class="home-content">
		<!-- Title -->
		<h1 class="home-title">MyVT Gacha</h1>
		<p class="home-subtitle text-secondary">Collection & Training</p>

		<!-- Quick stats -->
		<div class="home-stats mt-xl">
			<div class="stat-card">
				<span class="text-muted text-xs">Collection</span>
				<span class="text-lg font-bold">{Object.keys(gameState.collection).length}</span>
			</div>
			<div class="stat-card">
				<span class="text-muted text-xs">Roster</span>
				<span class="text-lg font-bold">{gameState.roster.length}</span>
			</div>
			<div class="stat-card">
				<span class="text-muted text-xs">VGems</span>
				<span class="text-lg font-bold text-gold">{gameState.currencies.vgems}</span>
			</div>
		</div>

		<!-- Game mode entry points -->
		<div class="home-modes mt-2xl">
			<button class="mode-card">
				<div class="mode-art art-icon"></div>
				<div class="mode-info">
					<span class="text-md font-semibold">Live!ON</span>
					<span class="text-xs text-secondary">Training Simulator</span>
				</div>
			</button>
			<button class="mode-card">
				<div class="mode-art art-icon"></div>
				<div class="mode-info">
					<span class="text-md font-semibold">AlgoBrawl</span>
					<span class="text-xs text-secondary">Coming Soon</span>
				</div>
			</button>
		</div>

		<!-- Settings -->
		<button class="settings-btn mt-xl">
			<span class="text-sm text-muted">Settings</span>
		</button>
	</div>
</div>

<style>
	.page {
		position: relative;
	}

	.home-hero {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, var(--c-bg-secondary) 0%, var(--c-bg-primary) 60%);
	}

	.home-content {
		position: relative;
		z-index: 1;
	}

	.home-title {
		font-size: 28px;
		font-weight: 800;
		letter-spacing: 0.02em;
	}

	.home-subtitle {
		font-size: 13px;
		margin-top: var(--sp-xs);
	}

	.home-stats {
		display: flex;
		gap: var(--sp-md);
	}

	.stat-card {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--sp-xs);
		padding: var(--sp-md);
		background: var(--c-surface);
		border: 1px solid var(--c-border-light);
		border-radius: var(--r-md);
	}

	.home-modes {
		display: flex;
		flex-direction: column;
		gap: var(--sp-md);
	}

	.mode-card {
		display: flex;
		align-items: center;
		gap: var(--sp-lg);
		padding: var(--sp-lg);
		background: var(--c-surface);
		border: 1px solid var(--c-border);
		border-radius: var(--r-lg);
		transition: background var(--t-fast);
		width: 100%;
	}

	.mode-card:active {
		background: var(--c-surface-hover);
	}

	.mode-art {
		width: 48px;
		height: 48px;
		flex-shrink: 0;
	}

	.mode-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.settings-btn {
		display: block;
		margin-left: auto;
		padding: var(--sp-sm) var(--sp-md);
	}
</style>
