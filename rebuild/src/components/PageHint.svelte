<script lang="ts">
	import { gameStore } from '$lib/stores';
	import type { OnboardingState } from '$lib/types';

	interface Props {
		step: keyof OnboardingState;
		title: string;
		body: string;
		icon?: string;
	}

	let { step, title, body, icon = 'info' }: Props = $props();

	let dismissed = $derived(gameStore.onboarding[step]);
	let visible = $state(false);

	// Brief delay before showing so page transition feels natural
	$effect(() => {
		if (!dismissed) {
			const timer = setTimeout(() => { visible = true; }, 400);
			return () => clearTimeout(timer);
		} else {
			visible = false;
		}
	});

	function dismiss() {
		visible = false;
		setTimeout(() => {
			gameStore.completeOnboardingStep(step);
		}, 200);
	}
</script>

{#if !dismissed}
	<div
		class="glass-strong p-4 rounded-xl mb-4 border border-blue-500/20 transition-all duration-300 {visible
			? 'opacity-100 translate-y-0'
			: 'opacity-0 -translate-y-2 pointer-events-none'}"
	>
		<div class="flex items-start gap-3">
			<!-- Icon -->
			<div class="shrink-0 mt-0.5 text-blue-400">
				{#if icon === 'home'}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
				{:else if icon === 'gacha'}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
				{:else if icon === 'liveon'}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
				{/if}
			</div>

			<!-- Content -->
			<div class="flex-1 min-w-0">
				<h3 class="text-sm font-semibold text-blue-400 mb-1">{title}</h3>
				<p class="text-xs text-white/50 leading-relaxed">{body}</p>
			</div>

			<!-- Dismiss -->
			<button
				onclick={dismiss}
				class="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors"
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>
	</div>
{/if}
