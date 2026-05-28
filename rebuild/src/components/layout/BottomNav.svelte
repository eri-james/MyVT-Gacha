<script lang="ts">
	import type { PageId } from '$lib/types';

	interface Props {
		currentPage?: PageId;
	}

	let { currentPage = $bindable('home') }: Props = $props();

	const tabs: { id: PageId; label: string }[] = [
		{ id: 'home', label: 'Home' },
		{ id: 'liveon', label: 'Live!ON' },
		{ id: 'gacha', label: 'Gacha' },
		{ id: 'collection', label: 'Collection' }
	];

	function selectPage(id: PageId) {
		currentPage = id;
	}
</script>

<nav class="bottom-nav">
	{#each tabs as tab}
		<button
			class="nav-tab"
			class:active={currentPage === tab.id}
			onclick={() => selectPage(tab.id)}
		>
			<!-- Placeholder icon slot — replace with SVG/image -->
			<span class="nav-icon art-icon"></span>
			<span class="nav-label">{tab.label}</span>
		</button>
	{/each}
</nav>

<style>
	.bottom-nav {
		position: absolute;
		inset: 0;
		top: auto;
		height: var(--nav-height);
		z-index: var(--z-nav);
		display: flex;
		align-items: center;
		justify-content: space-around;
		background: linear-gradient(to top, var(--c-bg-primary) 70%, transparent);
		padding-bottom: var(--safe-bottom);
	}

	.nav-tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: var(--sp-sm) var(--sp-md);
		opacity: 0.45;
		transition: opacity var(--t-fast);
	}

	.nav-tab.active {
		opacity: 1;
	}

	.nav-icon {
		width: 24px;
		height: 24px;
	}

	.nav-label {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.03em;
	}
</style>
