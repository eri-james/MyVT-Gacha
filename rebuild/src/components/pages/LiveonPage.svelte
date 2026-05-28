<script lang="ts">
        import { useGame } from '$lib/stores/context';
        import { loadCharacters } from '$lib/data/characters';
        import type { CharacterData, RosterEntry, Sparks, TrainableStat } from '$lib/types';
        import { STAT_LABELS, TRAINABLE_STATS, MAX_ROSTER_SIZE } from '$lib/types';
        import { pickRandom } from '$lib/utils/format';
        import {
                createRun,
                spendPS,
                advanceStage,
                advanceCycle,
                startTraining,
                startExcursion,
                startShop,
                startCheckpoint,
                selectTurnOption,
                selectStackOption,
                selectCheckpointOption,
                doRest,
                purchaseShopItem,
                getAvailableScenarios
        } from '$lib/logic/liveon';
        import type { TrainingActivity, ExcursionActivity, ShopActivity, CheckpointActivity, TrainingResult, ExcursionResult, CheckpointResult, CycleResult } from '$lib/types';

        import CharacterSelect from '$components/liveon/CharacterSelect.svelte';
        import CycleFlow from '$components/liveon/CycleFlow.svelte';
        import TrainingScreen from '$components/liveon/TrainingScreen.svelte';
        import ExcursionScreen from '$components/liveon/ExcursionScreen.svelte';
        import FreeChoiceScreen from '$components/liveon/FreeChoiceScreen.svelte';
        import CheckpointScreen from '$components/liveon/CheckpointScreen.svelte';
        import RunSummary from '$components/liveon/RunSummary.svelte';

        // ─── State ───
        const game = useGame();
        let gameState = $derived(game.gameState);
        let navigateTo = game.navigateTo;

        let phase = $state<'setup' | 'charSelect' | 'running' | 'summary'>('setup');
        let characters = $state<CharacterData[]>([]);
        let selectedScenarioId = $state('debut');
        let selectedLeadSlug = $state<string | null>(null);
        let selectedInspirations = $state<RosterEntry[]>([]);
        let inheritedSparks = $state<Sparks | null>(null);
        let inheritedFromRosterId = $state<string | undefined>(undefined);
        let lastExcursionIds = $state<string[]>([]);

        // Sub-screen within running phase
        let subScreen = $state<'cycleFlow' | 'activity'>('cycleFlow');

        // Current cycle result being built
        let currentCycleResult = $state<CycleResult | null>(null);

        // Derived
        let run = $derived(gameState.liveon);
        let hasActiveRun = $derived(run !== null && run.phase === 'running');
        let ownedSlugs = $derived(new Set(Object.keys(gameState.collection)));
        let ownedCount = $derived(Object.keys(gameState.collection).length);
        let rosterCount = $derived(gameState.roster.length);
        let rosterFull = $derived(rosterCount >= MAX_ROSTER_SIZE);

        // ─── Lifecycle ───
        $effect(() => {
                if (run && run.phase === 'running' && phase === 'setup') {
                        phase = 'running';
                        subScreen = 'cycleFlow';
                }
                if (run && run.phase === 'summary' && phase !== 'summary') {
                        phase = 'summary';
                }
        });

        // Load character data
        async function loadCharData() {
                try {
                        characters = await loadCharacters();
                } catch (e) {
                        console.error('Failed to load characters:', e);
                }
        }
        loadCharData();

        // ─── Setup Phase ───

        function handleStartNew() {
                if (ownedCount === 0) return;
                phase = 'charSelect';
        }

        function handleResume() {
                if (run) {
                        phase = 'running';
                        subScreen = 'cycleFlow';
                }
        }

        function handleSelectCharacter(slug: string) {
                selectedLeadSlug = slug;

                // Check if this character has a previous roster entry with sparks
                const prevRun = gameState.roster.find(r => r.slug === slug && r.sparks);
                inheritedSparks = prevRun?.sparks || null;
                inheritedFromRosterId = prevRun?.id || undefined;
        }

        function handleConfirmCharacter() {
                if (!selectedLeadSlug) return;
                phase = 'charSelect'; // Will be set to running by the effect
                startNewRun(selectedLeadSlug);
        }

        async function startNewRun(leadSlug: string) {
                const lead = characters.find(c => c.slug === leadSlug);
                if (!lead) return;

                // Calculate generation: parent's gen + 1, or 1 if no parent
                const parentGen = inheritedFromRosterId
                        ? (gameState.roster.find(r => r.id === inheritedFromRosterId)?.generation ?? 0)
                        : 0;

                // Create run with selected inspirations
                const newRun = createRun(
                        lead,
                        selectedInspirations.map(r => ({
                                rosterId: r.id,
                                slug: r.slug,
                                stats: r.stats,
                                grade: r.grade,
                                sparks: r.sparks
                        })),
                        selectedScenarioId,
                        inheritedSparks,
                        inheritedFromRosterId,
                        parentGen + 1
                );

                gameState.liveon = newRun;
                phase = 'running';
                subScreen = 'cycleFlow';
                currentCycleResult = { cycle: 1, training: null, excursion: null, freeChoice: null, checkpoint: null };

                // Generation is stored directly on the run object
        }

        // ─── Cycle Flow ───

        function handleSelectStage(stage: import('$lib/types').LiveonStage) {
                if (!run) return;
                subScreen = 'activity';

                switch (stage) {
                        case 'training':
                                // Show stat selection first — default to a random stat
                                startTrainingForStat(pickRandom<TrainableStat>(TRAINABLE_STATS));
                                break;
                        case 'excursion':
                                startExcursionEvent();
                                break;
                        case 'free-choice':
                                startFreeChoice();
                                break;
                        case 'checkpoint':
                                startCheckpointBattle();
                                break;
                }
        }

        async function startTrainingForStat(stat: TrainableStat) {
                if (!run) return;
                startTraining(run, stat);
        }

        async function startExcursionEvent() {
                if (!run) return;
                await startExcursion(run);
        }

        function startFreeChoice() {
                if (!run) return;
                startShop(run);
        }

        async function startCheckpointBattle() {
                if (!run) return;
                await startCheckpoint(run);
        }

        // ─── Training Handlers ───

        function handleTrainingOption(option: import('$lib/types').TurnOption) {
                if (!run || !run.activity || run.activity.type !== 'training') return;
                const activity = run.activity as TrainingActivity;

                if (option.kind === 'stack-add' || option.kind === 'stack-mul' || option.kind === 'shield-high' || option.kind === 'shield-low') {
                        selectStackOption(run, activity, option);

                        // Check if stack option used the last turn
                        if (activity.turnsRemaining <= 0 && !activity.currentTurn) {
                                // Training ended after stack — record and advance
                                completeTraining(activity, 'subpar');
                        }
                        return;
                }

                const { continue: cont, outcome } = selectTurnOption(run, activity, option);

                if (!cont && outcome) {
                        completeTraining(activity, outcome);
                }
        }

        function completeTraining(activity: TrainingActivity, outcome: import('$lib/types').StreamOutcome) {
                if (!run) return;

                // Training complete — record result and return to cycle flow
                const ratio = activity.currentHype / activity.hypeGoal;
                let statGain: number;
                if (outcome === 'perfect') statGain = Math.floor(3 + ratio * 2);
                else if (outcome === 'great') statGain = Math.floor(2 + ratio * 1.5);
                else statGain = Math.floor(1 + ratio);

                // Apply stat gain
                run.currentStats[activity.stat] += statGain;
                run.trainingCount++;

                const trainingResult: TrainingResult = {
                        stat: activity.stat,
                        statGain,
                        hypeGenerated: activity.currentHype,
                        psSpent: 0,
                        outcome,
                        turnsUsed: activity.turnsTotal - activity.turnsRemaining
                };

                if (currentCycleResult) {
                        currentCycleResult.training = trainingResult;
                }

                // Advance stage
                advanceStage(run);
                subScreen = 'cycleFlow';
        }

        // ─── Excursion Handlers ───

        function handleExcursionChoice(choice: import('$lib/types').ExcursionChoice) {
                if (!run || !run.activity || run.activity.type !== 'excursion') return;

                // Check stat requirement
                if (choice.statRequirement) {
                        const statVal = run.currentStats[choice.statRequirement.stat as TrainableStat];
                        if (statVal < choice.statRequirement.threshold) {
                                // Requirement not met — still advance
                                advanceStage(run);
                                subScreen = 'cycleFlow';
                                return;
                        }
                }

                // Spend PS (via spendPS to respect shield)
                spendPS(run, choice.psCost);

                // Apply stat gain
                run.currentStats[choice.stat as TrainableStat] += choice.statGain;

                const excursionResult: ExcursionResult = {
                        choice,
                        bondGain: choice.bondGain
                };

                if (currentCycleResult) {
                        currentCycleResult.excursion = excursionResult;
                }

                lastExcursionIds.push(run.activity.eventId);

                // Advance stage
                advanceStage(run);
                subScreen = 'cycleFlow';
        }

        // ─── Free Choice Handlers ───

        function handleRest(): number {
                if (!run) return 0;
                return doRest(run);
        }

        function handleExtraTraining() {
                if (!run) return;
                startTrainingForStat(pickRandom<TrainableStat>(TRAINABLE_STATS));
        }

        async function handleExtraExcursion() {
                if (!run) return;
                await startExcursion(run);
        }

        function handlePurchaseShopItem(item: import('$lib/types').ShopItem): boolean {
                if (!run || !run.activity || run.activity.type !== 'shop') return false;
                return purchaseShopItem(run, item);
        }

        function handleFreeChoiceDone() {
                if (!run) return;
                if (currentCycleResult) {
                        currentCycleResult.freeChoice = { action: 'shop' };
                }
                advanceStage(run);
                subScreen = 'cycleFlow';

                // If stage advanced to checkpoint (next stage after free-choice), no push yet
                // If stage wrapped (null from advanceStage -> advanceCycle), push now
                // advanceStage handles the cycle push via advanceCycle only at checkpoint
        }

        // ─── Checkpoint Handlers ───

        function handleCheckpointOption(option: import('$lib/types').TurnOption): { continue: boolean; result: import('$lib/types').CheckpointResult | null } {
                if (!run || !run.activity || run.activity.type !== 'checkpoint') return { continue: true, result: null };
                const activity = run.activity as CheckpointActivity;

                const { continue: cont, result } = selectCheckpointOption(run, activity, option);

                if (!cont && result) {
                        if (currentCycleResult) {
                                currentCycleResult.checkpoint = result;
                        }
                        // Push cycle result before advancing
                        if (currentCycleResult) {
                                run.cycles.push({ ...currentCycleResult });
                                currentCycleResult = { cycle: (run.cycle ?? 0) + 1, training: null, excursion: null, freeChoice: null, checkpoint: null };
                        }
                        // Advance cycle
                        advanceCycle(run);
                        subScreen = 'cycleFlow';
                }
                return { continue: cont, result };
        }

        // ─── Summary ───

        function handleCollect() {
                if (!run || !run.result) return;

                // Add rewards
                gameState.currencies.vgems += run.result.rewards.vgems;
                gameState.currencies.vringgit += run.result.rewards.vringgit;
                gameState.currencies.livecache += run.result.rewards.livecache;

                // Create roster entry
                const entry: RosterEntry = {
                        id: run.id,
                        slug: run.leadSlug,
                        sourceRunId: run.id,
                        parentRunId: run.inheritedFromRosterId,
                        generation: run.generation ?? 1,
                        createdAt: Date.now(),
                        stats: { ...run.currentStats },
                        grade: run.result.grade,
                        totalHype: run.result.totalHype,
                        sparks: run.result.sparksOut,
                        quality: run.result.quality
                };

                gameState.roster.push(entry);
                gameState.liveon = null;
                phase = 'setup';
                navigateTo('home');
        }

        function handleGoHome() {
                gameState.liveon = null;
                phase = 'setup';
                navigateTo('home');
        }

        // ─── Back / Cancel ───

        function handleBackFromCharSelect() {
                phase = 'setup';
        }
</script>

<div class="liveon-page">
        {#if phase === 'setup'}
                <!-- Setup screen -->
                <div class="setup-screen anim-fade-in">
                        <div class="setup-content">
                                <div class="setup-header">
                                        <h2 class="page-title">Live!ON</h2>
                                        <p class="text-secondary text-sm">Training Simulator</p>
                                </div>

                                {#if hasActiveRun}
                                        <button class="btn btn-primary btn-block resume-btn" onclick={handleResume}>
                                                Resume Run
                                        </button>
                                        <div class="divider">
                                                <span class="text-xs text-muted">or start new</span>
                                        </div>
                                {/if}

                                {#if ownedCount === 0}
                                        <div class="warning-box">
                                                <p class="text-sm text-secondary">You need at least one VTuber in your collection to start a run.</p>
                                                <p class="text-xs text-muted mt-sm">Pull from the Gacha tab first!</p>
                                        </div>
                                {/if}

                                <!-- Scenarios -->
                                <div class="scenario-list">
                                        <h3 class="section-label text-xs text-muted">SELECT SCENARIO</h3>
                                        {#each getAvailableScenarios() as scenario}
                                                <button
                                                        class="scenario-card card"
                                                        class:selected={selectedScenarioId === scenario.id}
                                                        onclick={() => { selectedScenarioId = scenario.id; }}
                                                        disabled={ownedCount === 0}
                                                >
                                                        <div class="scenario-info">
                                                                <span class="font-semibold text-sm">{scenario.icon} {scenario.name}</span>
                                                                <span class="text-xs text-secondary">{scenario.description}</span>
                                                                <div class="difficulty">
                                                                        {#each Array(scenario.difficulty) as _}
                                                                                <span class="text-gold">&#9733;</span>
                                                                        {/each}
                                                                        {#each Array(3 - scenario.difficulty) as _}
                                                                                <span class="text-muted">&#9733;</span>
                                                                        {/each}
                                                                </div>
                                                        </div>
                                                </button>
                                        {/each}
                                </div>

                                <button
                                        class="btn btn-gold btn-block start-btn"
                                        onclick={handleStartNew}
                                        disabled={ownedCount === 0}
                                >
                                        Begin Training
                                </button>
                        </div>
                </div>

        {:else if phase === 'charSelect'}
                <CharacterSelect
                        characters={characters}
                        ownedSlugs={ownedSlugs}
                        selectedSlug={selectedLeadSlug}
                        {inheritedSparks}
                        onselect={handleSelectCharacter}
                        onconfirm={handleConfirmCharacter}
                        onback={handleBackFromCharSelect}
                />

        {:else if phase === 'running' && run}
                {#if subScreen === 'cycleFlow'}
                        <div class="running-screen anim-fade-in">
                                {#if run.activity === null}
                                        <CycleFlow {run} onselectstage={handleSelectStage} />
                                {:else if run.activity.type === 'training'}
                                        <TrainingScreen
                                                {run}
                                                activity={run.activity as TrainingActivity}
                                                onselectoption={handleTrainingOption}
                                                oncomplete={() => { subScreen = 'cycleFlow'; }}
                                        />
                                {:else if run.activity.type === 'excursion'}
                                        <ExcursionScreen
                                                {run}
                                                activity={run.activity as ExcursionActivity}
                                                onchoice={handleExcursionChoice}
                                        />
                                {:else if run.activity.type === 'shop'}
                                        <FreeChoiceScreen
                                                {run}
                                                activity={run.activity as ShopActivity}
                                                onpurchase={handlePurchaseShopItem}
                                                onrest={handleRest}
                                                onextratraining={handleExtraTraining}
                                                onextraexcursion={handleExtraExcursion}
                                                ondone={handleFreeChoiceDone}
                                        />
                                {:else if run.activity.type === 'checkpoint'}
                                        <CheckpointScreen
                                                {run}
                                                activity={run.activity as CheckpointActivity}
                                                onselectoption={handleCheckpointOption}
                                                oncomplete={() => { subScreen = 'cycleFlow'; }}
                                        />
                                {/if}
                        </div>
                {/if}

        {:else if phase === 'summary' && run && run.result}
                <RunSummary
                        {run}
                        rosterEntry={null}
                        oncollect={handleCollect}
                        onhome={handleGoHome}
                />
        {/if}
</div>

<style>
        .liveon-page {
                height: 100%;
                overflow-y: auto;
        }

        /* Setup */
        .setup-screen {
                padding: var(--sp-xl);
        }

        .setup-content {
                display: flex;
                flex-direction: column;
        }

        .setup-header {
                margin-bottom: var(--sp-2xl);
        }

        .resume-btn {
                margin-bottom: var(--sp-lg);
        }

        .divider {
                display: flex;
                align-items: center;
                gap: var(--sp-md);
                margin-bottom: var(--sp-xl);
        }

        .divider::before,
        .divider::after {
                content: '';
                flex: 1;
                height: 1px;
                background: var(--c-border);
        }

        .warning-box {
                padding: var(--sp-lg);
                background: rgba(239, 83, 80, 0.1);
                border: 1px solid rgba(239, 83, 80, 0.3);
                border-radius: var(--r-md);
                margin-bottom: var(--sp-xl);
                text-align: center;
        }

        .mt-sm { margin-top: var(--sp-sm); }

        .text-gold { color: var(--c-accent-gold); }
        .text-muted { color: var(--c-text-muted); }

        /* Scenarios */
        .scenario-list {
                display: flex;
                flex-direction: column;
                gap: var(--sp-sm);
                margin-bottom: var(--sp-xl);
        }

        .section-label {
                text-transform: uppercase;
                letter-spacing: 0.1em;
                margin-bottom: var(--sp-md);
        }

        .scenario-card {
                padding: var(--sp-lg);
                text-align: left;
                transition: all var(--t-fast);
        }

        .scenario-card.selected {
                border-color: var(--c-accent-blue);
                background: rgba(66, 165, 245, 0.05);
        }

        .scenario-card:active:not(:disabled) {
                transform: scale(0.98);
        }

        .scenario-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
        }

        .difficulty {
                letter-spacing: 2px;
                margin-top: var(--sp-xs);
        }

        .start-btn {
                margin-top: auto;
        }

        /* Running */
        .running-screen {
                height: 100%;
        }
</style>
