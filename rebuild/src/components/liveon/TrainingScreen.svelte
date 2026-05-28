<script lang="ts">
	import type { LiveonRun, TrainingActivity, TurnOption } from '$lib/types';
	import { STAT_LABELS } from '$lib/types';

	interface Props {
		run: LiveonRun;
		activity: TrainingActivity;
		onselectoption: (option: TurnOption) => void;
		oncomplete: (result: { statGain: number; outcome: string }) => void;
	}

	let { run, activity, onselectoption, oncomplete }: Props = $props();

	let isComplete = $state(false);
	let finalOutcome = $state<string | null>(null);
	let finalStatGain = $state(0);

	let progressPercent = $derived(
		Math.min(100, (activity.currentHype / activity.hypeGoal) * 100)
	);

	let turnsLeft = $derived(activity.turnsRemaining);
	let totalTurns = $derived(activity.turnsTotal + (activity.isExtraRound ? 2 : 0));

	function handleOption(option: TurnOption) {
		if (isComplete) return;

		if (option.kind === 'stack-add' || option.kind === 'stack-mul' || option.kind === 'shield-high' || option.kind === 'shield-low') {
			// Stack/shield option — just process, don't end training
			onselectoption(option);
			return;
		}

		if (option.kind === 'skip') {
			onselectoption(option);
			return;
		}

		const result = onselectoption(option);

		// Note: the return value from parent will tell us if training ended
		// For now we'll just process via the engine
	}

	function handleFinish() {
		if (!isComplete) return;

		// Calculate stat gain based on outcome
		const ratio = activity.currentHype / activity.hypeGoal;
		let gain: number;
		if (finalOutcome === 'perfect') gain = Math.floor(3 + ratio * 2);
		else if (finalOutcome === 'great') gain = Math.floor(2 + ratio * 1.5);
		else gain = Math.floor(1 + ratio);

		oncomplete({ statGain: gain, outcome: finalOutcome || 'subpar' });
	}
</script>

<div class="training-screen anim-fade-in">
	<!-- Training header -->
	<div class="training-header">
		<div class="training-title-row">
			<span class="badge badge-UR">{STAT_LABELS[activity.stat]}</span>
			<span class="text-sm font-semibold">Training</span>
			{#if activity.isExtraRound}
				<span class="badge" style="background: rgba(251, 191, 36, 0.2); color: var(--c-accent-gold);">EXTRA</span>
			{/if}
		</div>
		<span class="text-xs text-muted">Turn {totalTurns - turnsLeft + 1} / {totalTurns}</span>
	</div>

	<!-- Hype progress bar -->
	<div class="hype-progress">
		<div class="progress-bar">
			<div class="progress-fill" style="width: {progressPercent}%"></div>
		</div>
		<div class="progress-labels">
			<span class="text-xs text-muted">{activity.currentHype} / {activity.hypeGoal} Hype</span>
			{#if activity.isExtraRound && activity.extraHypeGoal}
				<span class="text-xs text-gold">Goal: {activity.extraHypeGoal}</span>
			{/if}
		</div>
	</div>

	<!-- Active bonuses -->
	{#if activity.stackBonus > 0 || activity.stackMultiplier > 1}
		<div class="active-bonuses">
			{#if activity.stackBonus > 0}
				<span class="bonus-tag text-xs">+{activity.stackBonus} next</span>
			{/if}
			{#if activity.stackMultiplier > 1}
				<span class="bonus-tag text-xs">x{activity.stackMultiplier} next</span>
			{/if}
		</div>
	{/if}

	<!-- Turn options -->
	{#if activity.currentTurn && !isComplete}
		<div class="turn-options">
			{#each activity.currentTurn.options as option, i}
				<button
					class="turn-option card"
					class:option-high={option.kind === 'high'}
					class:option-medium={option.kind === 'medium'}
					class:option-low={option.kind === 'low'}
					class:option-skip={option.kind === 'skip'}
					class:option-stack={option.kind === 'stack-add' || option.kind === 'stack-mul'}
					class:option-shield={option.kind === 'shield-high' || option.kind === 'shield-low'}
					onclick={() => handleOption(option)}
				>
					<div class="option-header">
						<span class="text-sm font-semibold">{option.label}</span>
						<span class="option-hype text-sm font-bold text-gold">+{option.hype} hype</span>
					</div>
					<p class="option-desc text-xs text-secondary">{option.description}</p>
					{#if option.psCost > 0}
						<span class="option-cost text-xs text-red">-{option.psCost} PS</span>
					{:else if option.psCost < 0}
						<span class="option-cost text-xs text-green">+{-option.psCost} PS</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.training-screen {
		display: flex;
		flex-direction: column;
		padding: var(--sp-xl);
	}

	.training-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--sp-lg);
	}

	.training-title-row {
		display: flex;
		align-items: center;
		gap: var(--sp-sm);
	}

	/* Progress */
	.hype-progress {
		margin-bottom: var(--sp-lg);
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: var(--c-bg-tertiary);
		border-radius: var(--r-full);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--c-accent-blue), var(--c-accent-purple));
		border-radius: var(--r-full);
		transition: width 0.3s ease;
	}

	.progress-labels {
		display: flex;
		justify-content: space-between;
		margin-top: var(--sp-xs);
	}

	.text-red { color: var(--c-accent-red); }
	.text-green { color: var(--c-accent-green); }

	/* Bonuses */
	.active-bonuses {
		display: flex;
		gap: var(--sp-sm);
		margin-bottom: var(--sp-md);
	}

	.bonus-tag {
		padding: 2px 8px;
		background: rgba(199, 125, 255, 0.15);
		color: var(--c-accent-purple);
		border-radius: var(--r-full);
	}

	/* Turn options */
	.turn-options {
		display: flex;
		flex-direction: column;
		gap: var(--sp-md);
		flex: 1;
	}

	.turn-option {
		padding: var(--sp-lg);
		text-align: left;
		transition: all var(--t-fast);
	}

	.turn-option:active {
		transform: scale(0.98);
	}

	.option-high {
		border-color: var(--c-accent-gold);
		background: rgba(251, 191, 36, 0.05);
	}

	.option-medium {
		border-color: var(--c-accent-blue);
	}

	.option-low {
		border-color: var(--c-border);
	}

	.option-skip {
		border-color: var(--c-accent-green);
		background: rgba(102, 187, 106, 0.05);
	}

	.option-stack {
		border-color: var(--c-accent-purple);
		background: rgba(199, 125, 255, 0.05);
	}

	.option-shield {
		border-color: var(--c-accent-blue);
		background: rgba(66, 165, 245, 0.05);
	}

	.option-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--sp-xs);
	}

	.option-desc {
		margin-bottom: var(--sp-sm);
	}

	.option-cost {
		display: block;
	}
</style>
