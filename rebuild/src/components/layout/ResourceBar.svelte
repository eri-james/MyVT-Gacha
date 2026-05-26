<script lang="ts">
	import type { Currencies } from '$lib/types';
	import { formatNumber } from '$lib/utils/format';

	interface Props {
		currencies: Currencies;
	}

	let { currencies }: Props = $props();
</script>

<div class="resource-bar">
	<div class="resource-item">
		<span class="resource-icon art-icon"></span>
		<span class="resource-value text-gold font-bold text-sm">{formatNumber(currencies.vgems)}</span>
	</div>
	<div class="resource-item">
		<span class="resource-icon art-icon"></span>
		<span class="resource-value text-accent font-bold text-sm">{formatNumber(currencies.vringgit)}</span>
	</div>
	<div class="resource-item">
		<span class="resource-icon art-icon"></span>
		<span class="resource-value text-secondary font-bold text-sm">{formatNumber(currencies.livecache)}</span>
	</div>
</div>

<style>
	.resource-bar {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		z-index: 50;
		display: flex;
		justify-content: flex-end;
		gap: var(--sp-sm);
		padding: calc(var(--safe-top) + var(--sp-sm)) var(--sp-lg) var(--sp-xs);
		background: linear-gradient(to bottom, var(--c-bg-primary) 40%, transparent);
	}

	.resource-item {
		display: flex;
		align-items: center;
		gap: var(--sp-xs);
		padding: 2px var(--sp-sm);
		background: rgba(0, 0, 0, 0.4);
		border-radius: var(--r-full);
		border: 1px solid var(--c-border-light);
	}

	.resource-icon {
		width: 16px;
		height: 16px;
	}

	.resource-value {
		min-width: 32px;
		text-align: right;
	}
</style>
