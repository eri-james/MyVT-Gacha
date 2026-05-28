<script lang="ts">
	import type { LiveonRun, CheckpointActivity, TurnOption, CheckpointResult } from '$lib/types';
	import { STAT_LABELS } from '$lib/types';

	interface Props {
		run: LiveonRun;
		activity: CheckpointActivity;
		onselectoption: (option: TurnOption) => { continue: boolean; result: CheckpointResult | null };
		oncomplete: (result: CheckpointResult) => void;
	}

	let { run, activity, onselectoption, oncomplete }: Props = $props();

	let isComplete = $state(false);
	let finalResult = $state<CheckpointResult | null>(null);

	let progressPercent = $derived(
		activity.turnsTotal > 0
			? ((activity.turnsTotal - activity.turnsRemaining) / activity.turnsTotal) * 100
			: 0
	);

	let playerPercent = $derived(
		Math.min(100, (activity.playerHype / Math.max(1, activity.opponentHype)) * 100)
	);

	let turnsLeft = $derived(activity.turnsRemaining);
	let turnsUsed = $derived(activity.turnsTotal - turnsLeft);

	function handleOption(option: TurnOption) {
		if (isComplete || !activity.currentTurn) return;

		const { continue: cont, result } = onselectoption(option);

		if (!cont && result) {
			isComplete = true;
			finalResult = result;
			// Auto-complete after a delay
			setTimeout(() => {
				oncomplete(result);
			}, 2000);
		}
	}
</script>

<div class="checkpoint-screen anim-fade-in">
	<!-- Header -->
	<div class="checkpoint-header">
		<span class="badge badge-{activity.opponent.rarity}">CHECKPOINT</span>
		<span class="text-xs text-muted">Cycle {run.cycle}</span>
	</div>

	<!-- Opponent display -->
	<div class="versus-section">
		<div class="fighter player-side">
			<div class="fighter-label text-xs text-muted">YOU</div>
			<div class="fighter-portrait art-portrait"
				style="background-image: url('/portraits/{run.leadSlug}.jpg')">
			</div>
			<div class="fighter-hype text-gold font-bold">{activity.playerHype}</div>
		</div>

		<div class="vs-badge">
			<span class="text-lg font-bold text-muted">VS</span>
			<span class="text-xs text-muted">{turnsUsed}/{activity.turnsTotal}</span>
		</div>

		<div class="fighter opponent-side">
			<div class="fighter-label text-xs text-muted">{activity.opponent.name}</div>
			<div class="fighter-portrait art-portrait card card-rarity-{activity.opponent.rarity}"
				style="background-image: url('/portraits/{activity.opponent.slug}.jpg')">
			</div>
			<div class="fighter-hype text-red font-bold">{activity.opponentHype}</div>
		</div>
	</div>

	<!-- Hype bars -->
	<div class="hype-bars">
		<div class="hype-bar-row">
			<span class="text-xs text-muted">You</span>
			<div class="hype-bar">
				<div class="hype-bar-fill player" style="width: {Math.min(100, playerPercent)}%"></div>
			</div>
		</div>
		<div class="hype-bar-row">
			<span class="text-xs text-muted">Opponent</span>
			<div class="hype-bar">
				<div class="hype-bar-fill opponent" style="width: 100%"></div>
			</div>
		</div>
	</div>

	<!-- Turn info -->
	{#if activity.currentTurn && !isComplete}
		<div class="turn-info">
			<span class="focus-stat text-xs">Focus: {STAT_LABELS[activity.currentTurn.focusStat]}</span>
			<span class="text-xs text-muted">{turnsLeft} turns remaining</span>
		</div>

		<!-- Options -->
		<div class="turn-options">
			{#each activity.currentTurn.options as option}
				<button class="turn-option card" onclick={() => handleOption(option)}>
					<div class="option-main">
						<span class="text-sm font-semibold">{option.label}</span>
						<span class="text-sm font-bold text-gold">+{option.hype}</span>
					</div>
					<span class="text-xs text-red">-{option.psCost} PS</span>
				</button>
			{/each}
		</div>
	{:else if isComplete && finalResult}
		<div class="result-box anim-scale-in">
			{#if finalResult.won}
				<span class="text-xl font-bold text-gold">VICTORY!</span>
				<p class="text-sm text-secondary mt-md">You surpassed {finalResult.opponent.name}!</p>
			{:else}
				<span class="text-xl font-bold text-red">DEFEAT</span>
				<p class="text-sm text-secondary mt-md">Fell short against {finalResult.opponent.name}.</p>
			{/if}
			<div class="result-scores mt-md">
				<span class="text-sm">You: {finalResult.playerHype} vs {finalResult.opponentHype}</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.checkpoint-screen {
		display: flex;
		flex-direction: column;
		padding: var(--sp-xl);
	}

	.checkpoint-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--sp-lg);
	}

	/* Versus */
	.versus-section {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--sp-lg);
		margin-bottom: var(--sp-xl);
	}

	.fighter {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--sp-sm);
	}

	.fighter-portrait {
		width: 80px;
		height: 100px;
	}

	.fighter-hype {
		font-size: 18px;
	}

	.vs-badge {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--sp-xs);
	}

	.text-gold { color: var(--c-accent-gold); }
	.text-red { color: var(--c-accent-red); }

	/* Hype bars */
	.hype-bars {
		display: flex;
		flex-direction: column;
		gap: var(--sp-sm);
		margin-bottom: var(--sp-xl);
	}

	.hype-bar-row {
		display: flex;
		align-items: center;
		gap: var(--sp-sm);
	}

	.hype-bar {
		flex: 1;
		height: 8px;
		background: var(--c-bg-tertiary);
		border-radius: var(--r-full);
		overflow: hidden;
	}

	.hype-bar-fill {
		height: 100%;
		border-radius: var(--r-full);
		transition: width 0.5s ease;
	}

	.hype-bar-fill.player {
		background: linear-gradient(90deg, var(--c-accent-blue), var(--c-accent-gold));
	}

	.hype-bar-fill.opponent {
		background: var(--c-accent-red);
	}

	/* Turn info */
	.turn-info {
		display: flex;
		justify-content: space-between;
		margin-bottom: var(--sp-md);
	}

	.focus-stat {
		padding: var(--sp-xs) var(--sp-sm);
		background: rgba(66, 165, 245, 0.1);
		border-radius: var(--r-sm);
		color: var(--c-accent-blue);
	}

	/* Turn options */
	.turn-options {
		display: flex;
		flex-direction: column;
		gap: var(--sp-sm);
		flex: 1;
	}

	.turn-option {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--sp-md) var(--sp-lg);
		text-align: left;
		transition: all var(--t-fast);
	}

	.turn-option:active {
		transform: scale(0.98);
		background: var(--c-surface-hover);
	}

	.option-main {
		display: flex;
		gap: var(--sp-sm);
		align-items: center;
	}

	/* Result */
	.result-box {
		text-align: center;
		padding: var(--sp-2xl);
	}

	.result-scores {
		display: flex;
		justify-content: center;
		gap: var(--sp-lg);
	}

	.mt-md { margin-top: var(--sp-md); }
	.mt-xl { margin-top: var(--sp-xl); }
</style>
