<script lang="ts">
	import type { LiveonRun, LiveonStage } from '$lib/types';
	import { CYCLE_STAGES, STAT_LABELS, TRAINABLE_STATS } from '$lib/types';

	interface Props {
		run: LiveonRun;
		onselectstage: (stage: LiveonStage) => void;
	}

	let { run, onselectstage }: Props = $props();

	let currentStageIndex = $derived(CYCLE_STAGES.indexOf(run.stage));
	let completedStages = $derived(
		run.cycles.length > 0 ? (run.cycles[run.cycles.length - 1] ? getCompletedStageNames() : []) : []
	);

	function getCompletedStageNames(): LiveonStage[] {
		const cycle = run.cycles[run.cycles.length - 1];
		if (!cycle) return [];
		const stages: LiveonStage[] = [];
		if (cycle.training) stages.push('training');
		if (cycle.excursion) stages.push('excursion');
		if (cycle.freeChoice) stages.push('free-choice');
		if (cycle.checkpoint) stages.push('checkpoint');
		return stages;
	}

	let currentStageIdx = $derived(CYCLE_STAGES.indexOf(run.stage));

	let stageLabels: Record<LiveonStage, string> = {
		'training': 'Training',
		'excursion': 'Excursion',
		'free-choice': 'Free Choice',
		'checkpoint': 'Checkpoint'
	};

	let stageDescriptions: Record<LiveonStage, string> = {
		'training': 'Choose a stat to train via streaming practice',
		'excursion': 'Go on an excursion event with your VTuber',
		'free-choice': 'Rest, visit the shop, or do extra activities',
		'checkpoint': 'Face off against an opponent in a hype race'
	};
</script>

<div class="cycle-flow anim-fade-in">
	<!-- Cycle header -->
	<div class="cycle-header">
		<div class="cycle-info">
			<span class="cycle-badge">Cycle {run.cycle}/4</span>
			<span class="text-xs text-secondary">{stageLabels[run.stage]}</span>
		</div>
		<div class="run-stats">
			<div class="stat-pill">
				<span class="text-xs text-muted">Hype</span>
				<span class="text-sm font-bold text-gold">{run.hype}</span>
			</div>
			<div class="stat-pill">
				<span class="text-xs text-muted">PS</span>
				<span class="text-sm font-bold" class:text-red={run.ps <= 5}>{run.ps}/30</span>
			</div>
			{#if run.shield > 0}
				<div class="stat-pill shield">
					<span class="text-xs text-muted">Shield</span>
					<span class="text-sm font-bold text-accent">{run.shield}</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Stage progress bar -->
	<div class="stage-progress">
		{#each CYCLE_STAGES as stage, i}
			<button
				class="stage-node"
				class:completed={completedStages.includes(stage)}
				class:current={i === currentStageIdx}
				class:locked={i > currentStageIdx}
				onclick={() => {
					if (i === currentStageIdx) onselectstage(stage);
				}}
				disabled={i !== currentStageIdx}
			>
				<div class="stage-dot">
					{#if completedStages.includes(stage)}
						<span class="text-xs">&#10003;</span>
					{:else if i === currentStageIdx}
						<span class="text-xs font-bold">{i + 1}</span>
					{:else}
						<span class="text-xs text-muted">{i + 1}</span>
					{/if}
				</div>
				<span class="stage-label text-xs">{stageLabels[stage]}</span>
			</button>
			{#if i < CYCLE_STAGES.length - 1}
				<div class="stage-connector" class:done={completedStages.includes(stage)}></div>
			{/if}
		{/each}
	</div>

	<!-- Current stage description -->
	<div class="stage-description">
		<p class="text-sm text-secondary">{stageDescriptions[run.stage]}</p>
	</div>

	<!-- Current stats -->
	<div class="stats-bar">
		{#each TRAINABLE_STATS as stat}
			<div class="stat-item">
				<span class="text-xs text-secondary">{STAT_LABELS[stat]}</span>
				<span class="text-sm font-bold">{run.currentStats[stat]}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.cycle-flow {
		display: flex;
		flex-direction: column;
		padding: var(--sp-xl);
	}

	.cycle-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--sp-xl);
	}

	.cycle-info {
		display: flex;
		align-items: center;
		gap: var(--sp-sm);
	}

	.cycle-badge {
		background: var(--c-accent-blue);
		color: #fff;
		padding: var(--sp-xs) var(--sp-md);
		border-radius: var(--r-full);
		font-size: 12px;
		font-weight: 700;
	}

	.run-stats {
		display: flex;
		gap: var(--sp-md);
	}

	.stat-pill {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
	}

	.text-red {
		color: var(--c-accent-red);
	}

	/* Stage progress */
	.stage-progress {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		margin-bottom: var(--sp-lg);
	}

	.stage-node {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--sp-xs);
	}

	.stage-dot {
		width: 32px;
		height: 32px;
		border-radius: var(--r-full);
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--c-bg-tertiary);
		border: 2px solid var(--c-border);
		transition: all var(--t-fast);
	}

	.stage-node.completed .stage-dot {
		background: var(--c-accent-green);
		border-color: var(--c-accent-green);
		color: #fff;
	}

	.stage-node.current .stage-dot {
		background: var(--c-accent-blue);
		border-color: var(--c-accent-blue);
		color: #fff;
		box-shadow: 0 0 12px rgba(66, 165, 245, 0.5);
	}

	.stage-node.locked .stage-dot {
		opacity: 0.4;
	}

	.stage-label {
		white-space: nowrap;
	}

	.stage-connector {
		width: 24px;
		height: 2px;
		background: var(--c-border);
		margin-bottom: 18px;
	}

	.stage-connector.done {
		background: var(--c-accent-green);
	}

	.stage-description {
		text-align: center;
		margin-bottom: var(--sp-lg);
	}

	/* Stats bar */
	.stats-bar {
		display: flex;
		gap: var(--sp-md);
		padding: var(--sp-md);
		background: var(--c-surface);
		border-radius: var(--r-md);
		border: 1px solid var(--c-border-light);
	}

	.stat-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}
</style>
