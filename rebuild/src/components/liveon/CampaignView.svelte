<script lang="ts">
        import { liveonStore } from '$lib/stores';
        import { loadCharacters } from '$lib/data/characters';
        import CampaignHUD from './CampaignHUD.svelte';
        import MinigameView from './MinigameView.svelte';
        import ExcursionView from './ExcursionView.svelte';
        import FreeScheduleView from './FreeScheduleView.svelte';
        import RunSummary from './RunSummary.svelte';
        import {
                beginPracticeStream, resolvePracticeStream,
                generateExcursion, resolveExcursion,
                generateShopItems, applyShopItem,
                beginAlgorithmWar, resolveAlgorithmWar,
                advanceTurn, finalizeRun,
                getPhaseForTurn,
        } from '$lib/logic/liveon';
        import type {
                StreamMinigameState, ExcursionEvent, CheckpointState,
                CycleFocus, ExcursionChoiceType, FreeScheduleAction,
                MinigameButtonType
        } from '$lib/types';
        import { onMount } from 'svelte';

        // ── Local state for phase transitions ──
        let phaseState = $state<'idle' | 'playing' | 'complete'>('idle');
        let showCheckpointIntro = $state(false);
        let checkpointData = $state<CheckpointState | null>(null);
        let purchasedItemIds = $state<Set<string>>(new Set());

        const run = $derived(liveonStore.run);
        const currentPhase = $derived(liveonStore.currentPhase);
        const cycleFocus = $derived(liveonStore.currentFocus);

        onMount(async () => {
                await loadCharacters();
                // Auto-start first phase
                if (run.active && currentPhase === 'practice_stream') {
                        initPracticeStream();
                }
        });

        // ═══════════════════════════════════════════════
        // Phase 1: Practice Stream
        // ═══════════════════════════════════════════════
        function initPracticeStream() {
                const { minigameState } = beginPracticeStream(run);
                liveonStore.setMinigame(minigameState);
                phaseState = 'playing';
        }

        function handleMinigameComplete(state: StreamMinigameState) {
                const isPractice = currentPhase === 'practice_stream';

                if (isPractice) {
                        // Resolve practice stream
                        const result = resolvePracticeStream(run, state as StreamMinigameState & { isComplete: true; isVictory: boolean | null });
                        liveonStore.addEffectiveStat(cycleFocus!, result.statGain);
                        liveonStore.modifyPS(0); // PS already deducted per-round
                        liveonStore.addSubscribers(result.subGain);
                        liveonStore.addHype(state.totalHype);
                        liveonStore.modifyCurrency(result.currencyGain);
                        liveonStore.addSubLog({
                                turn: run.turn,
                                cycle: run.cycle,
                                phase: 'practice_stream',
                                subsGained: result.subGain,
                                hypeGenerated: state.totalHype,
                                description: result.description,
                        });

                        // Advance to next turn (excursion)
                        finishTurn();
                } else {
                        // Resolve algorithm war
                        if (checkpointData) {
                                const result = resolveAlgorithmWar(run, checkpointData, state as StreamMinigameState & { isComplete: true; isVictory: boolean | null });

                                if (!result.victory) {
                                        liveonStore.modifyPS(-result.psDrain);
                                        // Stat penalty applied to focus stat
                                        if (cycleFocus) {
                                                liveonStore.addEffectiveStat(cycleFocus, -result.statPenalty);
                                        }
                                }

                                liveonStore.addSubscribers(result.subGain);
                                liveonStore.addHype(state.totalHype);
                                liveonStore.modifyCurrency(result.currencyGain);
                                liveonStore.addSubLog({
                                        turn: run.turn,
                                        cycle: run.cycle,
                                        phase: 'algorithm_war',
                                        subsGained: result.subGain,
                                        hypeGenerated: state.totalHype,
                                        description: result.description,
                                });

                                // Mark checkpoint complete with actual hype achieved
                                liveonStore.setCheckpoint({
                                        ...checkpointData,
                                        isComplete: true,
                                        isVictory: result.victory,
                                        hypeAchieved: state.totalHype,
                                });

                                checkpointData = null;
                                showCheckpointIntro = false;

                                // Advance turn
                                finishTurn();
                        }
                }
        }

        // ═══════════════════════════════════════════════
        // Phase 2: Excursion
        // ═══════════════════════════════════════════════
        function initExcursion() {
                const event = generateExcursion(run.cycle);
                liveonStore.setExcursion(event);
                phaseState = 'playing';
        }

        function handleExcursionChoice(choiceType: ExcursionChoiceType) {
                const event = run.currentExcursion;
                if (!event) return;

                const result = resolveExcursion(event, choiceType);

                // Apply effects
                if (cycleFocus) {
                        liveonStore.addEffectiveStat(cycleFocus, result.statGain);
                }
                liveonStore.modifyPS(result.psChange);
                liveonStore.addSubscribers(result.subGain);
                liveonStore.addSubLog({
                        turn: run.turn,
                        cycle: run.cycle,
                        phase: 'excursion',
                        subsGained: result.subGain,
                        hypeGenerated: 0,
                        description: result.description,
                });

                finishTurn();
        }

        // ═══════════════════════════════════════════════
        // Phase 3: Free Schedule
        // ═══════════════════════════════════════════════
        function initFreeSchedule() {
                const items = generateShopItems();
                liveonStore.setShopItems(items);
                phaseState = 'playing';
        }

        function handleFreeScheduleAction(action: FreeScheduleAction) {
                if (action === 'rest') {
                        liveonStore.modifyPS(50);
                        liveonStore.addSubLog({
                                turn: run.turn,
                                cycle: run.cycle,
                                phase: 'free_schedule',
                                subsGained: 0,
                                hypeGenerated: 0,
                                description: 'Rest: +50 PS recovered',
                        });
                } else if (action === 'train') {
                        // Re-do practice stream as bonus (costs PS, earns hype)
                        const { minigameState } = beginPracticeStream(run);
                        liveonStore.setMinigame(minigameState);
                        // Don't advance turn yet — return to minigame view
                        return;
                } else if (action === 'shop') {
                        // Shop is handled within FreeScheduleView
                        return;
                }
                finishTurn();
        }

        function handleShopPurchase(itemIndex: number) {
                const item = run.shopItems[itemIndex];
                if (!item || run.inRunCurrency < item.cost || purchasedItemIds.has(item.id)) return;

                liveonStore.modifyCurrency(-item.cost);
                const effects = applyShopItem(item, cycleFocus!);

                if (effects.psChange !== 0) liveonStore.modifyPS(effects.psChange);
                if (effects.statGain !== null && effects.statTarget !== null) {
                        liveonStore.addEffectiveStat(effects.statTarget, effects.statGain);
                }
                if (effects.currencyChange !== 0) liveonStore.modifyCurrency(effects.currencyChange);

                purchasedItemIds = new Set([...purchasedItemIds, item.id]);
        }

        // ═══════════════════════════════════════════════
        // Phase 4: Algorithm War
        // ═══════════════════════════════════════════════
        function initAlgorithmWar() {
                const { checkpointState } = beginAlgorithmWar(run);
                checkpointData = checkpointState;
                liveonStore.setCheckpoint(checkpointState);
                showCheckpointIntro = true;
                phaseState = 'idle';
        }

        function startAlgorithmWar() {
                showCheckpointIntro = false;
                const { minigameState } = beginAlgorithmWar(run);
                liveonStore.setMinigame(minigameState);
                phaseState = 'playing';
        }

        // ═══════════════════════════════════════════════
        // Turn Advancement
        // ═══════════════════════════════════════════════
        function finishTurn() {
                const result = advanceTurn(run);
                if (!result) return;

                if (result.isRunComplete) {
                        // Run is over — finalize
                        const { grade, rewards } = finalizeRun(run);
                        liveonStore.endRun(grade, rewards);
                        return;
                }

                // Update store state
                liveonStore.run.turn = result.newTurn;
                liveonStore.run.cycle = result.newCycle;
                liveonStore.run.currentPhase = result.newPhase;
                phaseState = 'idle';

                // Auto-initialize next phase
                initPhase(result.newPhase);
        }

        function initPhase(phase: string) {
                // Use tick to let reactive state update first
                setTimeout(() => {
                        if (phase === 'practice_stream') initPracticeStream();
                        else if (phase === 'excursion') initExcursion();
                        else if (phase === 'free_schedule') initFreeSchedule();
                        else if (phase === 'algorithm_war') initAlgorithmWar();
                }, 50);
        }

        // ═══════════════════════════════════════════════
        // Phase label helper
        // ═══════════════════════════════════════════════
        function getPhaseLabel(phase: string): string {
                const labels: Record<string, string> = {
                        practice_stream: 'Practice Stream',
                        excursion: 'Excursion',
                        free_schedule: 'Free Schedule',
                        algorithm_war: 'Algorithm War',
                        run_complete: 'Campaign Complete!',
                };
                return labels[phase] ?? phase;
        }

        function getPhaseColor(phase: string): string {
                const colors: Record<string, string> = {
                        practice_stream: 'text-blue-400',
                        excursion: 'text-green-400',
                        free_schedule: 'text-purple-400',
                        algorithm_war: 'text-red-400',
                        run_complete: 'text-yellow-400',
                };
                return colors[phase] ?? 'text-white/50';
        }
</script>

<div class="flex flex-col gap-4 animate-fade-in">
        <!-- Campaign Header -->
        <div class="text-center">
                <div class="text-xs text-white/30 mb-1">Cycle {run.cycle} — Turn {run.turn}/16</div>
                <div class="text-lg font-bold {getPhaseColor(currentPhase)}">{getPhaseLabel(currentPhase)}</div>
        </div>

        <!-- HUD -->
        <CampaignHUD />

        <!-- Divider -->
        <div class="border-t border-white/5"></div>

        <!-- Phase Content -->
        {#if showCheckpointIntro && checkpointData}
                <!-- Algorithm War Intro -->
                <div class="glass p-4 rounded-xl text-center animate-slide-up">
                        <div class="text-red-400 font-bold text-lg mb-2">Algorithm War</div>
                        <div class="text-2xl font-bold text-white mb-1">{checkpointData.rivalName}</div>
                        <div class="text-sm text-white/60 mb-4">
                                Target: <span class="text-red-300 font-bold">{checkpointData.rivalTargetCCV.toLocaleString()} CCV</span>
                        </div>
                        <div class="text-xs text-white/40 mb-4">
                                Win: +{checkpointData.subBonus.toLocaleString()} subs
                                <br />
                                Lose: -{checkpointData.statPenalty} {cycleFocus?.toUpperCase()} stats, -{checkpointData.psDrain} PS
                        </div>
                        <button
                                onclick={startAlgorithmWar}
                                class="w-full py-2 rounded-lg bg-red-500/20 text-red-400 font-semibold text-sm hover:bg-red-500/30 transition-colors"
                        >
                                Begin Stream Battle!
                        </button>
                </div>
        {:else if currentPhase === 'practice_stream' || currentPhase === 'algorithm_war'}
                {#if run.currentMinigame}
                        <MinigameView
                                minigameState={run.currentMinigame}
                                focusStat={cycleFocus!}
                                focusValue={liveonStore.currentFocusValue}
                                cycle={run.cycle}
                                currentPS={run.ps}
                                oncomplete={handleMinigameComplete}
                        />
                {/if}
        {:else if currentPhase === 'excursion'}
                {#if run.currentExcursion}
                        <ExcursionView
                                event={run.currentExcursion}
                                onchoose={handleExcursionChoice}
                        />
                {/if}
        {:else if currentPhase === 'free_schedule'}
                {#if phaseState === 'playing'}
                        {#if run.currentMinigame && run.currentMinigame.kind === 'practice'}
                                <!-- Training: bonus practice stream -->
                                <MinigameView
                                        minigameState={run.currentMinigame}
                                        focusStat={cycleFocus!}
                                        focusValue={liveonStore.currentFocusValue}
                                        cycle={run.cycle}
                                        currentPS={run.ps}
                                        oncomplete={(state) => {
                                                const result = resolvePracticeStream(run, state as StreamMinigameState & { isComplete: true; isVictory: boolean | null });
                                                liveonStore.addEffectiveStat(cycleFocus!, result.statGain);
                                                liveonStore.addSubscribers(result.subGain);
                                                liveonStore.modifyCurrency(result.currencyGain);
                                                liveonStore.addSubLog({
                                                        turn: run.turn, cycle: run.cycle, phase: 'free_schedule',
                                                        subsGained: result.subGain, hypeGenerated: state.totalHype,
                                                        description: `Training: ${result.description}`,
                                                });
                                                liveonStore.setMinigame(null);
                                                // Stay in free schedule
                                        }}
                                />
                        {:else}
                                <FreeScheduleView
                                        shopItems={run.shopItems}
                                        inRunCurrency={run.inRunCurrency}
                                        purchasedIds={purchasedItemIds}
                                        onaction={handleFreeScheduleAction}
                                        onpurchase={handleShopPurchase}
                                />
                        {/if}
                {/if}
        {/if}

        <!-- Run Log (collapsible) -->
        {#if run.subLog.length > 0}
                <details class="glass rounded-xl">
                        <summary class="p-3 text-xs text-white/50 cursor-pointer hover:text-white/70">
                                Run Log ({run.subLog.length} entries)
                        </summary>
                        <div class="px-3 pb-3 max-h-40 overflow-y-auto">
                                {#each run.subLog.slice().reverse() as entry}
                                        <div class="flex items-start gap-2 py-1 border-b border-white/5 last:border-0">
                                                <span class="text-[10px] text-white/20 w-8 flex-shrink-0">T{entry.turn}</span>
                                                <span class="text-[10px] text-white/50">{entry.description}</span>
                                        </div>
                                {/each}
                        </div>
                </details>
        {/if}
</div>
