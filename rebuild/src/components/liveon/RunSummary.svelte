<script lang="ts">
        import { liveonStore, gameStore } from '$lib/stores';
        import { getImageUrl } from '$lib/data/characters';
        import { getBySlug } from '$lib/data/characters';
        import { loadCharacters } from '$lib/data/characters';
        import { incrementQuestProgress } from '$lib/logic/quests';
        import { checkBondLevelUp, applyBondLevelUp } from '$lib/logic/economy';
        import type { TrainedCopy, RunGrade } from '$lib/types';
        import { onMount } from 'svelte';

        interface Props {
                onback?: () => void;
        }

        let { onback }: Props = $props();

        const run = $derived(liveonStore.run);
        const rewards = $derived(run.rewards);
        const grade = $derived(run.ending);
        const leadSlug = $derived(run.lead);

        let charName = $state('');
        let charImage = $state('');
        let saved = $state(false);
        let loaded = $state(false);

        onMount(async () => {
                await loadCharacters();
                if (leadSlug) {
                        const char = getBySlug(leadSlug);
                        if (char) {
                                charName = char.name;
                                charImage = getImageUrl(char.slug);
                        }
                }
                loaded = true;
        });

        function getGradeLabel(g: RunGrade | null): string {
                if (g === 'S') return 'S — Legendary';
                if (g === 'A') return 'A — Great';
                return 'B — Normal';
        }

        function getGradeColor(g: RunGrade | null): string {
                if (g === 'S') return 'text-yellow-400';
                if (g === 'A') return 'text-green-400';
                return 'text-gray-400';
        }

        function getGradeGlow(g: RunGrade | null): string {
                if (g === 'S') return 'shadow-[0_0_30px_rgba(251,191,36,0.3)]';
                if (g === 'A') return 'shadow-[0_0_20px_rgba(102,187,106,0.2)]';
                return '';
        }

        function getGradeBorder(g: RunGrade | null): string {
                if (g === 'S') return 'border-yellow-400/50';
                if (g === 'A') return 'border-green-400/50';
                return 'border-white/10';
        }

        function saveTrainedCopy() {
                if (!leadSlug || !grade || !rewards) return;

                const trained: TrainedCopy = {
                        slug: leadSlug,
                        rarity: run.leadRarity!,
                        grade,
                        finalStats: { ...run.effectiveStats },
                        coachPassives: run.coachPassives,
                        totalSubscribers: rewards.totalSubscribers,
                        scenarioId: 'default',
                        timestamp: Date.now(),
                        runSummary: `Cycle ${run.cycle}/4 | ${rewards.totalSubscribers.toLocaleString()} subs | ${grade} rank`,
                };

                // Save trained copy to archive
                gameStore.addTrainedCopy(leadSlug, trained);

                // Apply currency rewards
                gameStore.addCurrency('vgems', rewards.vgems);
                gameStore.addCurrency('vringgit', rewards.vringgit);
                gameStore.addCurrency('liveCache', rewards.liveCache);

                // Apply bond EXP to lead character
                if (rewards.bondExp > 0) {
                        const charData = gameStore.getCharacter(leadSlug);
                        if (charData) {
                                const updated = { ...charData, bondPoints: charData.bondPoints + rewards.bondExp };
                                const { leveledUp, newLevel } = checkBondLevelUp(updated);
                                gameStore.setCharacter(leadSlug, leveledUp ? applyBondLevelUp(updated, newLevel) : updated);
                        }
                }

                // Quest progress
                gameStore.setQuests(incrementQuestProgress(gameStore.state.quests, 'daily', 'daily_liveon', 1));
                gameStore.setQuests(incrementQuestProgress(gameStore.state.quests, 'weekly', 'weekly_liveon25', 1));

                gameStore.save();
                saved = true;
        }

        function returnToSetup() {
                liveonStore.reset();
                if (onback) onback();
        }
</script>

<div class="flex flex-col gap-4 animate-fade-in">
        {#if loaded && rewards}
                <!-- Grade Display -->
                <div class="glass p-6 rounded-xl text-center border-2 {getGradeBorder(grade)} {getGradeGlow(grade)}">
                        <div class="text-xs text-white/30 mb-2">Campaign Complete</div>
                        <div class="text-5xl font-black {getGradeColor(grade)} mb-2">{grade}</div>
                        <div class="text-sm text-white/50">{getGradeLabel(grade)}</div>
                </div>

                <!-- Lead VTuber -->
                <div class="glass p-4 rounded-xl">
                        <div class="flex items-center gap-3 mb-3">
                                {#if charImage}
                                        <img
                                                src={charImage}
                                                alt={charName}
                                                class="w-14 h-14 rounded-full object-cover ring-2 {getGradeBorder(grade)}"
                                                onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                {/if}
                                <div>
                                        <div class="text-lg font-bold text-white">{charName}</div>
                                        <div class="text-xs text-white/40">{rewards.totalSubscribers.toLocaleString()} subscribers</div>
                                </div>
                        </div>

                        <!-- Final Stats -->
                        <div class="text-xs text-white/30 mb-2">Final Stats</div>
                        <div class="grid grid-cols-4 gap-2 text-center">
                                {#each ['mg', 'vc', 'tc', 'ch'] as stat}
                                        {@const val = run.effectiveStats[stat as keyof typeof run.effectiveStats]}
                                        {@const colors: Record<string, string> = { mg: 'text-yellow-400', vc: 'text-cyan-400', tc: 'text-blue-400', ch: 'text-red-400' }}
                                        <div class="p-2 rounded-lg bg-white/5">
                                                <span class="text-[10px] {colors[stat]}">{stat.toUpperCase()}</span>
                                                <div class="text-sm font-bold text-white">{val}</div>
                                        </div>
                                {/each}
                        </div>
                </div>

                <!-- Rewards -->
                <div class="glass p-4 rounded-xl">
                        <div class="text-xs text-white/30 mb-3">Rewards</div>
                        <div class="grid grid-cols-2 gap-2">
                                <div class="p-3 rounded-lg bg-white/5 text-center">
                                        <div class="text-lg font-bold text-purple-400">{rewards.vgems.toLocaleString()}</div>
                                        <div class="text-[10px] text-white/40">VGems</div>
                                </div>
                                <div class="p-3 rounded-lg bg-white/5 text-center">
                                        <div class="text-lg font-bold text-green-400">{rewards.vringgit.toLocaleString()}</div>
                                        <div class="text-[10px] text-white/40">VRinggit</div>
                                </div>
                                <div class="p-3 rounded-lg bg-white/5 text-center">
                                        <div class="text-lg font-bold text-cyan-400">{rewards.liveCache.toLocaleString()}</div>
                                        <div class="text-[10px] text-white/40">LiveCache</div>
                                </div>
                                <div class="p-3 rounded-lg bg-white/5 text-center">
                                        <div class="text-lg font-bold text-pink-400">{rewards.bondExp}</div>
                                        <div class="text-[10px] text-white/40">Bond EXP</div>
                                </div>
                        </div>
                </div>

                <!-- Run Log Summary -->
                {#if run.subLog.length > 0}
                        <details class="glass rounded-xl">
                                <summary class="p-3 text-xs text-white/50 cursor-pointer hover:text-white/70">
                                        Full Run Log ({run.subLog.length} turns)
                                </summary>
                                <div class="px-3 pb-3 max-h-60 overflow-y-auto">
                                        {#each run.subLog as entry}
                                                <div class="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
                                                        <span class="text-[10px] text-white/20 w-12 flex-shrink-0">T{entry.turn} C{entry.cycle}</span>
                                                        <div class="flex-1">
                                                                <div class="text-[10px] text-white/50">{entry.description}</div>
                                                        </div>
                                                </div>
                                        {/each}
                                </div>
                        </details>
                {/if}

                <!-- Save & Continue -->
                <div class="flex flex-col gap-2">
                        {#if !saved}
                                <button
                                        onclick={saveTrainedCopy}
                                        class="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-400 hover:to-blue-400 active:scale-[0.98] transition-all"
                                >
                                        Save to Trained Archive
                                </button>
                        {:else}
                                <div class="w-full py-3 rounded-xl font-semibold text-sm bg-green-500/20 text-green-400 text-center">
                                        Saved to Archive!
                                </div>
                        {/if}

                        <button
                                onclick={returnToSetup}
                                class="w-full py-2 rounded-xl text-sm text-white/50 hover:text-white/70 hover:bg-white/5 transition-all"
                        >
                                Return to Live!ON
                        </button>
                </div>
        {/if}
</div>
