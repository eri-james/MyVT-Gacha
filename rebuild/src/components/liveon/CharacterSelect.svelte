<script lang="ts">
	import type { CharacterData } from '$lib/types';
	import { STAT_LABELS, TRAINABLE_STATS, RARITY_ORDER } from '$lib/types';
	import type { TrainableStat } from '$lib/types';

	interface Props {
		characters: CharacterData[];
		ownedSlugs: Set<string>;
		selectedSlug: string | null;
		inheritedSparks: { stat1: TrainableStat; stat2: TrainableStat; value1: number; value2: number; quality: number } | null;
		onselect: (slug: string) => void;
		onconfirm: () => void;
		onback: () => void;
	}

	let {
		characters,
		ownedSlugs,
		selectedSlug,
		inheritedSparks,
		onselect,
		onconfirm,
		onback
	}: Props = $props();

	// Sort by rarity (UR first) then name
	let sorted = $derived(
		[...characters]
			.filter(c => ownedSlugs.has(c.slug))
			.sort((a, b) => {
				const rd = RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
				if (rd !== 0) return rd;
				return a.name.localeCompare(b.name);
			})
	);

	let selected = $derived(sorted.find(c => c.slug === selectedSlug));
</script>

<div class="select-screen anim-fade-in">
	<!-- Header -->
	<div class="select-header">
		<button class="back-btn" onclick={onback}>
			<span class="text-lg">&#x2039;</span>
		</button>
		<h2 class="select-title">Choose Your Lead</h2>
		<span class="text-xs text-muted">{sorted.length} available</span>
	</div>

	<!-- Selected character preview -->
	{#if selected}
		<div class="selected-preview">
			<div class="preview-portrait art-portrait"
				style="background-image: url('/portraits/{selected.slug}.jpg')">
			</div>
			<div class="preview-info">
				<div class="preview-name">
					<span class="font-bold text-lg">{selected.name}</span>
					<span class="badge badge-{selected.rarity}">{selected.rarity}</span>
				</div>
				<div class="preview-stats">
					{#each TRAINABLE_STATS as stat}
						<div class="preview-stat">
							<span class="stat-label text-xs text-secondary">{STAT_LABELS[stat]}</span>
							<span class="stat-value text-sm font-bold">{selected.stats[stat]}</span>
						</div>
					{/each}
				</div>
				{#if inheritedSparks}
					<div class="sparks-info">
						<span class="text-xs text-gold">Sparks: +{inheritedSparks.value1} {STAT_LABELS[inheritedSparks.stat1]}, +{inheritedSparks.value2} {STAT_LABELS[inheritedSparks.stat2]}</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Character grid -->
	<div class="char-grid">
		{#each sorted as char (char.slug)}
			<button
				class="char-item card card-rarity-{char.rarity}"
				class:selected={selectedSlug === char.slug}
				onclick={() => onselect(char.slug)}
			>
				<div class="char-thumb art-portrait"
					style="background-image: url('/portraits/{char.slug}.jpg')">
				</div>
				<span class="char-name text-xs">{char.name}</span>
				<span class="char-rarity text-xs text-muted">{char.rarity}</span>
			</button>
		{/each}
	</div>

	<!-- Confirm button -->
	{#if selected}
		<button class="btn btn-primary btn-block confirm-btn" onclick={onconfirm}>
			Select {selected.name}
		</button>
	{/if}
</div>

<style>
	.select-screen {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: var(--sp-xl) 0;
	}

	.select-header {
		display: flex;
		align-items: center;
		gap: var(--sp-md);
		padding: 0 var(--sp-xl);
		margin-bottom: var(--sp-lg);
	}

	.back-btn {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--r-full);
		background: var(--c-surface);
		border: 1px solid var(--c-border);
	}

	.select-title {
		flex: 1;
		font-size: 18px;
		font-weight: 700;
	}

	/* Selected preview */
	.selected-preview {
		display: flex;
		gap: var(--sp-lg);
		padding: var(--sp-lg);
		margin: 0 var(--sp-xl) var(--sp-lg);
		background: var(--c-surface);
		border: 1px solid var(--c-border);
		border-radius: var(--r-lg);
	}

	.preview-portrait {
		width: 80px;
		height: 80px;
		flex-shrink: 0;
	}

	.preview-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--sp-sm);
	}

	.preview-name {
		display: flex;
		align-items: center;
		gap: var(--sp-sm);
	}

	.preview-stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--sp-sm);
	}

	.preview-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.sparks-info {
		padding: var(--sp-xs) var(--sp-sm);
		background: rgba(251, 191, 36, 0.1);
		border-radius: var(--r-sm);
		display: flex;
		align-items: center;
	}

	/* Character grid */
	.char-grid {
		flex: 1;
		overflow-y: auto;
		padding: 0 var(--sp-xl);
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--sp-sm);
		align-content: start;
	}

	.char-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: var(--sp-xs);
		transition: all var(--t-fast);
	}

	.char-item.selected {
		border-color: var(--c-accent-blue) !important;
		box-shadow: 0 0 12px rgba(66, 165, 245, 0.4);
	}

	.char-thumb {
		width: 100%;
		aspect-ratio: 1;
	}

	.char-name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
		text-align: center;
	}

	.confirm-btn {
		margin: var(--sp-md) var(--sp-xl) var(--sp-xl);
	}
</style>
