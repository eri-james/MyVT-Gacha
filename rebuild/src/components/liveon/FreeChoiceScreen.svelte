<script lang="ts">
	import type { LiveonRun, ShopActivity, ShopItem } from '$lib/types';
	import { STAT_LABELS } from '$lib/types';

	interface Props {
		run: LiveonRun;
		activity: ShopActivity;
		onpurchase: (item: ShopItem) => boolean;
		onrest: () => number;
		onextratraining: () => void;
		onextraexcursion: () => void;
		ondone: () => void;
	}

	let {
		run, activity, onpurchase, onrest,
		onextratraining, onextraexcursion, ondone
	}: Props = $props();

	let restMessage = $state<string | null>(null);
	let purchaseMessage = $state<string | null>(null);

	function handleRest() {
		const recovered = onrest();
		restMessage = `Recovered ${recovered} PS!`;
		setTimeout(() => { restMessage = null; }, 2000);
	}

	function handlePurchase(item: ShopItem) {
		const success = onpurchase(item);
		if (success) {
			purchaseMessage = `Purchased ${item.name}!`;
			setTimeout(() => { purchaseMessage = null; }, 2000);
		} else {
			purchaseMessage = `Not enough PS!`;
			setTimeout(() => { purchaseMessage = null; }, 2000);
		}
	}

	function getEffectDescription(item: ShopItem): string {
		switch (item.effect.type) {
			case 'stat-boost': return `+${item.effect.value} ${STAT_LABELS[item.effect.stat]}`;
			case 'ps-boost': return `+${item.effect.value} PS`;
			case 'shield': return `+${item.effect.value} Shield`;
			case 'hype-bonus': return `+${item.effect.value} Hype`;
		}
	}
</script>

<div class="freechoice-screen anim-fade-in">
	<h3 class="section-title text-sm font-bold">Free Choice</h3>
	<p class="text-xs text-secondary mb-lg">Do something extra before the checkpoint, or proceed.</p>

	<!-- Quick actions -->
	<div class="quick-actions">
		<button class="action-btn card" onclick={handleRest}>
			<span class="action-icon text-lg">&#x1F634;</span>
			<span class="action-label font-semibold text-sm">Rest</span>
			<span class="text-xs text-secondary">Recover 80% of missing PS</span>
		</button>

		<button class="action-btn card" onclick={onextratraining}>
			<span class="action-icon text-lg">&#x1F3AF;</span>
			<span class="action-label font-semibold text-sm">Extra Training</span>
			<span class="text-xs text-secondary">Train another stat</span>
		</button>

		<button class="action-btn card" onclick={onextraexcursion}>
			<span class="action-icon text-lg">&#x1F333;</span>
			<span class="action-label font-semibold text-sm">Extra Excursion</span>
			<span class="text-xs text-secondary">Go on another event</span>
		</button>
	</div>

	{#if restMessage}
		<div class="feedback-msg text-sm text-green">{restMessage}</div>
	{/if}
	{#if purchaseMessage}
		<div class="feedback-msg text-sm" class:text-gold={purchaseMessage.includes('Purchased')} class:text-red={purchaseMessage.includes('Not enough')}>{purchaseMessage}</div>
	{/if}

	<!-- Shop -->
	<div class="shop-section">
		<h4 class="shop-title text-xs text-muted">SHOP</h4>
		{#each activity.items as item}
			<button
				class="shop-item card"
				class:purchased={item.purchased}
				onclick={() => handlePurchase(item)}
				disabled={item.purchased || run.ps < item.cost}
			>
				<div class="shop-item-info">
					<span class="text-sm font-semibold">{item.name}</span>
					<span class="text-xs text-secondary">{item.description}</span>
					<span class="text-xs text-gold">{getEffectDescription(item)}</span>
				</div>
				<div class="shop-item-cost">
					{#if item.purchased}
						<span class="text-xs text-green">SOLD</span>
					{:else if item.cost === 0}
						<span class="text-xs text-green">FREE</span>
					{:else}
						<span class="text-xs font-bold" class:text-red={run.ps < item.cost}>{item.cost} PS</span>
					{/if}
				</div>
			</button>
		{/each}
	</div>

	<!-- Proceed button -->
	<button class="btn btn-primary btn-block proceed-btn" onclick={ondone}>
		Proceed to Checkpoint
	</button>
</div>

<style>
	.freechoice-screen {
		display: flex;
		flex-direction: column;
		padding: var(--sp-xl);
	}

	.section-title {
		margin-bottom: var(--sp-xs);
	}

	.mb-lg { margin-bottom: var(--sp-lg); }

	/* Quick actions */
	.quick-actions {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--sp-sm);
		margin-bottom: var(--sp-xl);
	}

	.action-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--sp-xs);
		padding: var(--sp-md) var(--sp-sm);
		text-align: center;
		transition: all var(--t-fast);
	}

	.action-btn:active {
		transform: scale(0.96);
		background: var(--c-surface-hover);
	}

	.action-icon {
		font-size: 24px;
	}

	.text-red { color: var(--c-accent-red); }
	.text-green { color: var(--c-accent-green); }
	.text-gold { color: var(--c-accent-gold); }

	/* Feedback */
	.feedback-msg {
		text-align: center;
		padding: var(--sp-sm);
		margin-bottom: var(--sp-md);
		background: var(--c-surface);
		border-radius: var(--r-md);
		animation: fadeIn 0.3s ease;
	}

	/* Shop */
	.shop-section {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--sp-sm);
		margin-bottom: var(--sp-xl);
	}

	.shop-title {
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--sp-sm);
	}

	.shop-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--sp-md) var(--sp-lg);
		text-align: left;
		transition: all var(--t-fast);
	}

	.shop-item.purchased {
		opacity: 0.5;
	}

	.shop-item:disabled {
		opacity: 0.35;
	}

	.shop-item:active:not(:disabled):not(.purchased) {
		transform: scale(0.98);
	}

	.shop-item-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}

	.shop-item-cost {
		flex-shrink: 0;
	}

	.proceed-btn {
		margin-top: auto;
	}
</style>
