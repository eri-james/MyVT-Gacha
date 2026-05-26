<script lang="ts">
	import type { LiveonRun, ExcursionActivity, ExcursionChoice } from '$lib/types';
	import { STAT_LABELS } from '$lib/types';
	import type { TrainableStat } from '$lib/types';

	interface Props {
		run: LiveonRun;
		activity: ExcursionActivity;
		onchoice: (choice: ExcursionChoice) => void;
	}

	let { run, activity, onchoice }: Props = $props();

	let selectedChoice = $state<ExcursionChoice | null>(null);
	let showResult = $state(false);

	function handleChoice(choice: ExcursionChoice) {
		// Check stat requirement
		if (choice.statRequirement) {
			const statVal = run.currentStats[choice.statRequirement.stat];
			if (statVal < choice.statRequirement.threshold) {
				// Requirement not met — show lockout
				selectedChoice = choice;
				showResult = true;
				return;
			}
		}

		selectedChoice = choice;
		showResult = true;
		onchoice(choice);
	}

	let lockedChoices = $derived(
		activity.choices.filter(c => {
			if (!c.statRequirement) return false;
			return run.currentStats[c.statRequirement.stat] < c.statRequirement.threshold;
		})
	);

	function isLocked(choice: ExcursionChoice): boolean {
		if (!choice.statRequirement) return false;
		return run.currentStats[choice.statRequirement.stat] < choice.statRequirement.threshold;
	}

	function getLockReason(choice: ExcursionChoice): string {
		if (!choice.statRequirement) return '';
		return `${STAT_LABELS[choice.statRequirement.stat]} ${choice.statRequirement.threshold}+ needed (have ${run.currentStats[choice.statRequirement.stat]})`;
	}
</script>

<div class="excursion-screen anim-fade-in">
	<!-- Narrative -->
	<div class="narrative-box">
		<p class="narrative-text text-sm">{activity.narrative}</p>
	</div>

	{#if !showResult}
		<!-- Choices -->
		<div class="choices">
			<h3 class="section-label text-xs text-muted">What will you do?</h3>
			{#each activity.choices as choice}
				<button
					class="choice-btn card"
					class:locked={isLocked(choice)}
					onclick={() => handleChoice(choice)}
				>
					<span class="choice-label font-semibold text-sm">{choice.label}</span>
					{#if isLocked(choice)}
						<span class="choice-lock text-xs text-red">{getLockReason(choice)}</span>
					{:else}
						<div class="choice-rewards">
							<span class="text-xs text-gold">+{choice.statGain} {STAT_LABELS[choice.stat]}</span>
							<span class="text-xs text-green">+{choice.bondGain} bond</span>
							<span class="text-xs text-red">-{choice.psCost} PS</span>
						</div>
					{/if}
				</button>
			{/each}
		</div>
	{:else if selectedChoice}
		<!-- Result -->
		<div class="result-box anim-slide-up">
			<p class="result-narrative text-sm">{selectedChoice.narrative}</p>
			{#if isLocked(selectedChoice)}
				<p class="text-xs text-red mt-md">{getLockReason(selectedChoice)}</p>
			{/if}
			{#if !isLocked(selectedChoice)}
				<div class="result-rewards mt-md">
					<span class="text-sm text-gold">+{selectedChoice.statGain} {STAT_LABELS[selectedChoice.stat]}</span>
					<span class="text-sm text-green">+{selectedChoice.bondGain} bond</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.excursion-screen {
		display: flex;
		flex-direction: column;
		padding: var(--sp-xl);
		gap: var(--sp-xl);
	}

	.narrative-box {
		padding: var(--sp-lg);
		background: var(--c-surface);
		border: 1px solid var(--c-border);
		border-radius: var(--r-lg);
		border-left: 3px solid var(--c-accent-purple);
	}

	.narrative-text {
		line-height: 1.6;
	}

	.section-label {
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--sp-md);
	}

	/* Choices */
	.choices {
		display: flex;
		flex-direction: column;
		gap: var(--sp-md);
	}

	.choice-btn {
		padding: var(--sp-lg);
		text-align: left;
		transition: all var(--t-fast);
	}

	.choice-btn.locked {
		opacity: 0.5;
	}

	.choice-btn:active:not(.locked) {
		transform: scale(0.98);
	}

	.choice-label {
		display: block;
		margin-bottom: var(--sp-sm);
	}

	.choice-lock {
		display: block;
	}

	.choice-rewards {
		display: flex;
		gap: var(--sp-md);
		margin-top: var(--sp-sm);
	}

	.text-red { color: var(--c-accent-red); }
	.text-green { color: var(--c-accent-green); }

	/* Result */
	.result-box {
		padding: var(--sp-lg);
		background: var(--c-surface);
		border: 1px solid var(--c-border);
		border-radius: var(--r-lg);
	}

	.result-narrative {
		line-height: 1.6;
	}

	.result-rewards {
		display: flex;
		gap: var(--sp-lg);
	}
</style>
