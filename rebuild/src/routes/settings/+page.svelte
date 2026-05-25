<script lang="ts">
	import { goto } from '$app/navigation';
	import { gameStore } from '$lib/stores';
	import { deleteSave } from '$lib/utils/save';

	let confirmReset = $state(false);
	let confirmOnboarding = $state(false);
	let resetting = $state(false);

	const playerId = $derived(gameStore.state.playerId);
	const saveVersion = $derived(gameStore.state.version);
	const trainedCount = $derived(Object.keys(gameStore.state.trainedArchive.trained).length);
	const ownedCount = $derived(gameStore.ownedCount);
	const totalPulls = $derived(gameStore.state.stats.totalPulls);

	async function handleFullReset() {
		if (!confirmReset) {
			confirmReset = true;
			return;
		}
		resetting = true;
		await deleteSave();
		gameStore.reset();
		confirmReset = false;
		resetting = false;
		goto('/');
	}

	function handleReplayOnboarding() {
		if (!confirmOnboarding) {
			confirmOnboarding = true;
			return;
		}
		gameStore.resetOnboarding();
		confirmOnboarding = false;
		goto('/');
	}
</script>

<div class="animate-fade-in pt-4">
	<h1 class="text-xl font-bold text-white mb-5">Settings</h1>

	<!-- Save Info -->
	<div class="glass p-4 rounded-xl mb-4">
		<h2 class="text-sm font-semibold text-white/70 mb-3">Save Data</h2>
		<div class="space-y-2 text-sm">
			<div class="flex items-center justify-between">
				<span class="text-white/50">Player ID</span>
				<span class="text-white/80 font-mono text-xs">{playerId}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-white/50">Save Version</span>
				<span class="text-white/80">v{saveVersion}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-white/50">VTubers Owned</span>
				<span class="text-white/80">{ownedCount}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-white/50">Trained Coaches</span>
				<span class="text-white/80">{trainedCount}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-white/50">Total Pulls</span>
				<span class="text-white/80">{totalPulls}</span>
			</div>
		</div>
	</div>

	<!-- Testing Tools -->
	<div class="glass p-4 rounded-xl mb-4">
		<h2 class="text-sm font-semibold text-white/70 mb-3">Testing</h2>
		<div class="space-y-3">
			<!-- Replay Onboarding -->
			<button
				onclick={handleReplayOnboarding}
				disabled={gameStore.needsOnboarding}
				class="w-full py-3 px-4 rounded-xl text-sm font-medium text-left transition-all
				{gameStore.needsOnboarding
					? 'bg-white/3 text-white/20 cursor-not-allowed'
					: confirmOnboarding
						? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'
						: 'bg-white/5 text-white/70 hover:bg-white/10'}"
			>
				{#if gameStore.needsOnboarding}
					Already pending
				{:else if confirmOnboarding}
					Confirm: Replay onboarding? (home refreshes)
				{:else}
					Replay Onboarding
				{/if}
			</button>

			<!-- Full Reset -->
			<button
				onclick={handleFullReset}
				disabled={resetting}
				class="w-full py-3 px-4 rounded-xl text-sm font-medium text-left transition-all
				{resetting
					? 'bg-white/3 text-white/20 cursor-not-allowed'
					: confirmReset
						? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
						: 'bg-white/5 text-white/70 hover:bg-white/10'}"
			>
				{#if resetting}
					Resetting...
				{:else if confirmReset}
					Confirm: Delete ALL data? This is irreversible.
				{:else}
					Reset All Data
				{/if}
			</button>
		</div>
	</div>

	<!-- About -->
	<div class="glass p-4 rounded-xl">
		<h2 class="text-sm font-semibold text-white/70 mb-3">About</h2>
		<div class="space-y-1.5 text-sm text-white/40">
			<div>MyVT Gacha — Training Simulator Rebuild</div>
			<div>Save Format: v{saveVersion} (IndexedDB)</div>
		</div>
	</div>
</div>
