<script lang="ts">
        import { liveonStore } from '$lib/stores';
        import { generateNextRoundButtons, playMinigameRound, createDeadAirButton } from '$lib/logic/minigame';
        import type { StreamMinigameState, MinigameButton, MinigameButtonType, CycleFocus } from '$lib/types';

        interface Props {
                minigameState: StreamMinigameState;
                focusStat: CycleFocus;
                focusValue: number;
                cycle: number;
                currentPS: number;
                oncomplete: (state: StreamMinigameState) => void;
        }

        let { minigameState, focusStat, focusValue, cycle, currentPS, oncomplete }: Props = $props();

        // Local round state
        let roundButtons = $state<MinigameButton[]>([]);
        let chatTrend = $state<CycleFocus | null>(null);
        let coachAssist = $state(false);
        let isClimax = $state(false);
        let deadAir = $state(false);
        let selectedButton = $state<MinigameButtonType | null>(null);
        let isAnimating = $state(false);
        let roundHype = $state(0);

        const isAlgorithmWar = $derived(minigameState.kind === 'algorithm_war');
        const roundNumber = $derived(minigameState.currentRound + 1);
        const totalRounds = $derived(minigameState.totalRounds);
        const isLastRound = $derived(roundNumber >= totalRounds);

        // Progress bar for rounds
        const roundProgress = $derived(Math.round((minigameState.currentRound / totalRounds) * 100));

        // Generate buttons for current round
        $effect(() => {
                if (minigameState.isComplete) return;
                generateRoundButtons();
        });

        function generateRoundButtons() {
                const result = generateNextRoundButtons(minigameState, {
                        focusStat,
                        focusValue,
                        cycle,
                        currentPS,
                });
                roundButtons = result.buttons;
                chatTrend = result.chatTrend;
                coachAssist = result.coachAssist;
                isClimax = result.isClimax;
                deadAir = result.deadAir;
                selectedButton = null;
        }

        function handleButtonSelect(buttonType: MinigameButtonType) {
                if (isAnimating || minigameState.isComplete) return;
                selectedButton = buttonType;
                isAnimating = true;

                // Play the round
                const { updatedState, psChange, hypeGained } = playMinigameRound(minigameState, {
                        focusStat,
                        focusValue,
                        cycle,
                        selectedButtonType: buttonType,
                        currentPS,
                });

                // Apply PS change
                liveonStore.modifyPS(psChange);

                // Update state for UI feedback
                roundHype = hypeGained;
                minigameState = updatedState;

                // Update buttons for next round or show results
                setTimeout(() => {
                        if (updatedState.isComplete) {
                                // Dispatch completion
                                oncomplete(updatedState);
                        } else {
                                // Generate next round buttons
                                roundButtons = [];
                                chatTrend = null;
                                coachAssist = false;
                                isClimax = false;

                                setTimeout(() => {
                                        generateRoundButtons();
                                        isAnimating = false;
                                }, 200);
                        }
                }, 400);
        }

        function getButtonStyle(btn: MinigameButton): string {
                if (btn.isCoachBoosted) return 'bg-yellow-500/20 border-yellow-400/50 text-yellow-300 hover:bg-yellow-500/30';
                if (btn.type === 'hydration') return 'bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20';
                if (btn.type === 'clip_it') return 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20';
                if (btn.type === 'standard') return 'bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20';
                return 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10';
        }

        function getButtonLabel(btn: MinigameButton): string {
                let label = btn.label;
                if (btn.isCoachBoosted) label = `COACH RAID: ${label}`;
                if (btn.isTrending) label += ' (TRENDING)';
                if (isClimax && btn.type !== 'hydration') label += ' (CLIMAX 2x)';
                return label;
        }
</script>

<div class="glass p-4 rounded-xl animate-slide-up">
        <!-- Header -->
        <div class="flex items-center justify-between mb-3">
                <div>
                        <div class="text-sm font-semibold {isAlgorithmWar ? 'text-red-400' : 'text-blue-400'}">
                                {isAlgorithmWar ? 'Algorithm War' : 'Practice Stream'}
                        </div>
                        <div class="text-[10px] text-white/40">
                                Round {roundNumber}/{totalRounds}
                                {#if isClimax} — <span class="text-yellow-400 font-bold">CLIMAX</span>{/if}
                        </div>
                </div>
                <div class="text-right">
                        <div class="text-lg font-bold text-white">{minigameState.totalHype.toLocaleString()}</div>
                        <div class="text-[10px] text-white/40">hype (target: {minigameState.hypeTarget.toLocaleString()})</div>
                </div>
        </div>

        <!-- Round Progress -->
        <div class="h-1 rounded-full bg-white/10 mb-4 overflow-hidden">
                <div
                        class="h-full rounded-full transition-all duration-300 {isAlgorithmWar ? 'bg-red-400' : 'bg-blue-400'}"
                        style="width: {roundProgress}%"
                ></div>
        </div>

        <!-- Status Banners -->
        {#if chatTrend}
                <div class="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-3 text-center animate-pulse">
                        <span class="text-xs text-yellow-400">Chat Trend: {chatTrend.toUpperCase()} actions get +50% hype!</span>
                </div>
        {/if}

        {#if coachAssist}
                <div class="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-3 text-center">
                        <span class="text-xs text-yellow-300">A Coach is Raiding! One button is boosted!</span>
                </div>
        {/if}

        {#if deadAir}
                <div class="p-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-3 text-center animate-pulse">
                        <span class="text-xs text-red-400">DEAD AIR — No PS! Only recovery actions available.</span>
                </div>
        {/if}

        <!-- Hype flash feedback -->
        {#if isAnimating && roundHype > 0}
                <div class="p-2 rounded-lg bg-white/5 text-center mb-3 animate-pulse">
                        <span class="text-lg font-bold text-white">+{roundHype} hype!</span>
                </div>
        {/if}

        <!-- Buttons -->
        {#if !minigameState.isComplete}
                <div class="grid grid-cols-2 gap-2">
                        {#each roundButtons as btn (btn.type)}
                                <button
                                        onclick={() => handleButtonSelect(btn.type)}
                                        disabled={btn.disabled || isAnimating || deadAir && btn.type !== 'hydration'}
                                        class="p-3 rounded-xl border text-left transition-all duration-200
                                        {btn.disabled || (deadAir && btn.type !== 'hydration')
                                                ? 'opacity-30 cursor-not-allowed'
                                                : getButtonStyle(btn) + ' active:scale-[0.97]'}
                                        {isAnimating && selectedButton === btn.type ? 'ring-2 ring-white/50 scale-95' : ''}"
                                >
                                        <div class="text-sm font-bold">{getButtonLabel(btn)}</div>
                                        <div class="flex items-center gap-3 mt-1">
                                                {#if btn.baseHype > 0}
                                                        <span class="text-xs text-white/60">+{btn.baseHype} hype</span>
                                                {/if}
                                                <span class="text-xs {btn.psCost > 0 ? 'text-green-400' : btn.psCost < 0 ? 'text-red-400' : 'text-white/30'}">
                                                        {btn.psCost > 0 ? `+${btn.psCost}` : btn.psCost < 0 ? `${btn.psCost}` : 'Free'} PS
                                                </span>
                                        </div>
                                        {#if btn.requirement > 0}
                                                <div class="text-[10px] text-white/30 mt-0.5">
                                                        Requires {btn.requirement} {focusStat.toUpperCase()}
                                                </div>
                                        {/if}
                                </button>
                        {/each}
                </div>
        {/if}

        <!-- Minigame Complete -->
        {#if minigameState.isComplete}
                <div class="text-center p-4 animate-fade-in">
                        {#if minigameState.isVictory}
                                <div class="text-2xl mb-2">VICTORY!</div>
                                <div class="text-sm text-green-400 mb-1">
                                        Target beaten by {minigameState.totalHype - minigameState.hypeTarget} hype!
                                </div>
                        {:else}
                                <div class="text-2xl mb-2">FAILED</div>
                                <div class="text-sm text-red-400 mb-1">
                                        Short by {minigameState.hypeTarget - minigameState.totalHype} hype
                                </div>
                        {/if}
                        <div class="text-xs text-white/50">
                                Final: {minigameState.totalHype.toLocaleString()} / {minigameState.hypeTarget.toLocaleString()} hype
                        </div>
                </div>
        {/if}
</div>
