<script lang="ts">
	import type { PageId } from '$lib/types';
	import BottomNav from '$components/layout/BottomNav.svelte';

	interface Props {
		currentPage?: PageId;
		children: import('svelte').Snippet;
	}

	let { currentPage = $bindable('home'), children }: Props = $props();
</script>

<div class="app-root">
	<!-- Background layer — replace with artwork -->
	<div class="layer layer-bg">
		<div class="art-bg"></div>
	</div>

	<!-- Content layer -->
	<div class="layer layer-content">
		{@render children()}
	</div>

	<!-- Navigation layer -->
	<BottomNav bind:currentPage={currentPage} />

	<!-- Overlay layer — modals, toasts, canvas effects -->
	<div class="layer layer-overlay"></div>
</div>
