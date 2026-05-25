<script lang="ts">
	import '../app.css';
	import ResourceBar from '$components/layout/ResourceBar.svelte';
	import BottomNav from '$components/layout/BottomNav.svelte';
	import Toast from '$components/layout/Toast.svelte';
	import OnboardingModal from '$components/OnboardingModal.svelte';
	import { gameStore } from '$lib/stores';
	import { onMount } from 'svelte';

	let { children } = $props();

	let loaded = $state(false);
	const needsOnboarding = $derived(gameStore.needsOnboarding);

	onMount(async () => {
		await gameStore.init();
		loaded = true;
		return () => gameStore.destroy();
	});
</script>

{#if loaded}
	{#if needsOnboarding}
		<OnboardingModal />
	{:else}
		<ResourceBar />
		<main class="pt-16 pb-20 px-3 max-w-lg mx-auto min-h-screen">
			{@render children()}
		</main>
		<BottomNav />
		<Toast />
	{/if}
{:else}
	<div class="flex items-center justify-center min-h-screen">
		<div class="text-white/60 animate-pulse">Loading...</div>
	</div>
{/if}
