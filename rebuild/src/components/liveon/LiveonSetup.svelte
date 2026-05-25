<script lang="ts">
        import { gameStore, liveonStore } from '$lib/stores';
        import { loadCharacters, getCharacters, getBySlug, getImageUrl } from '$lib/data/characters';
        import { computeRunSetup } from '$lib/logic/liveon';
        import { getInspirationBreakdown } from '$lib/logic/coach';
        import { LIVEON_STAMINA_COST } from '$lib/data/constants';
        import type { CharacterRecord, TrainedCopy, Rarity } from '$lib/types';
        import { onMount } from 'svelte';

        // ── State ──
        let allChars: CharacterRecord[] = $state([]);
        let ownedChars: CharacterRecord[] = $state([]);
        let trainedCopies: TrainedCopy[] = $state([]);

        let selectedLead: CharacterRecord | null = $state(null);
        let selectedCoaches: (TrainedCopy | null)[] = $state([null, null, null]);
        let coachTab = $state(0);

        let showCoachPicker = $state(false);
        let coachSlotIndex = $state(0);

        let inspirationBreakdown = $derived.by(() => {
                if (selectedCoaches.every(c => c === null)) return null;
                return getInspirationBreakdown(selectedCoaches);
        });

        let canStart = $derived(selectedLead !== null && gameStore.state.stamina.current >= LIVEON_STAMINA_COST);

        const statLabels: Record<string, { label: string; color: string }> = {
                mg: { label: 'MG', color: 'text-yellow-400' },
                vc: { label: 'VC', color: 'text-cyan-400' },
                tc: { label: 'TC', color: 'text-blue-400' },
                ch: { label: 'CH', color: 'text-red-400' }
        };

        // ── Lifecycle ──
        onMount(async () => {
                await loadCharacters();
                allChars = getCharacters();
                updateOwned();
                updateTrained();
        });

        function updateOwned() {
                ownedChars = allChars.filter(c => gameStore.state.characters[c.slug]?.owned);
        }

        function updateTrained() {
                trainedCopies = Object.values(gameStore.state.trainedArchive.trained);
        }

        // ── Actions ──
        function selectLead(char: CharacterRecord) {
                selectedLead = char;
        }

        function openCoachPicker(slot: number) {
                coachSlotIndex = slot;
                showCoachPicker = true;
        }

        function selectCoach(copy: TrainedCopy) {
                selectedCoaches[coachSlotIndex] = copy;
                showCoachPicker = false;
                // Recalculate derived
                selectedCoaches = [...selectedCoaches];
        }

        function clearCoach(slot: number) {
                selectedCoaches[slot] = null;
                selectedCoaches = [...selectedCoaches];
        }

        function getCoachRarityClass(rarity: Rarity): string {
                return rarity === 'UR' ? 'text-yellow-400' : rarity === 'SSR' ? 'text-purple-400' : rarity === 'SR' ? 'text-blue-400' : 'text-gray-400';
        }

        function getCoachGradeClass(grade: string): string {
                return grade === 'S' ? 'text-yellow-400' : grade === 'A' ? 'text-green-400' : 'text-gray-400';
        }

        function startRun() {
                if (!selectedLead || !canStart) return;

                const charData = gameStore.state.characters[selectedLead.slug];
                const leadBaseStats = charData?.stats ?? selectedLead.stats;

                const { inspirations, passives } = computeRunSetup({
                        leadSlug: selectedLead.slug,
                        leadRarity: selectedLead.rarity,
                        leadBaseStats,
                        coaches: selectedCoaches,
                });

                // Deduct stamina
                gameStore.deductStamina(LIVEON_STAMINA_COST);

                liveonStore.startRun(
                        selectedLead.slug,
                        selectedLead.rarity,
                        leadBaseStats,
                        [selectedCoaches[0]?.slug ?? null, selectedCoaches[1]?.slug ?? null, selectedCoaches[2]?.slug ?? null],
                        inspirations,
                        passives,
                        leadBaseStats.ps,
                );
        }
</script>

<div class="flex flex-col gap-4">
        <!-- Header -->
        <div class="text-center">
                <h1 class="text-xl font-bold text-white mb-1">Live!ON</h1>
                <p class="text-xs text-white/50">Training Simulator — 16-Turn Campaign</p>
        </div>

        <!-- Stamina Warning -->
        {#if gameStore.state.stamina.current < LIVEON_STAMINA_COST}
                <div class="glass p-3 rounded-lg border-red-500/30 bg-red-500/10">
                        <p class="text-xs text-red-400 text-center">
                                Not enough Stamina (need {LIVEON_STAMINA_COST}, have {gameStore.state.stamina.current})
                        </p>
                </div>
        {/if}

        <!-- Step 1: Select Lead -->
        <div class="glass p-4 rounded-xl">
                <h2 class="text-sm font-semibold text-white/70 mb-3">
                        1. Select Lead VTuber
                        <span class="text-white/30 ml-1">(-{LIVEON_STAMINA_COST} ST)</span>
                </h2>

                {#if selectedLead}
                        <div class="flex items-center gap-3 p-3 rounded-lg rarity-bg-{selectedLead.rarity} border border-white/10 mb-3">
                                <img
                                        src={getImageUrl(selectedLead.slug)}
                                        alt={selectedLead.name}
                                        class="w-12 h-12 rounded-full object-cover ring-2 rarity-border-{selectedLead.rarity}"
                                        onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <div class="flex-1">
                                        <div class="text-sm font-semibold text-white">{selectedLead.name}</div>
                                        <div class="text-xs rarity-text-{selectedLead.rarity}">{selectedLead.rarity}</div>
                                </div>
                                <button
                                        onclick={() => { selectedLead = null; }}
                                        class="text-xs text-white/40 hover:text-white/70 px-2 py-1"
                                >
                                        Change
                                </button>
                        </div>
                {/if}

                {#if !selectedLead}
                        <div class="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                                {#each ownedChars as char (char.slug)}
                                        <button
                                                onclick={() => selectLead(char)}
                                                class="flex flex-col items-center p-2 rounded-lg transition-all hover:bg-white/10 rarity-bg-{char.rarity} border border-transparent hover:border-white/20"
                                        >
                                                <img
                                                        src={getImageUrl(char.slug)}
                                                        alt={char.name}
                                                        class="w-10 h-10 rounded-full object-cover mb-1"
                                                        onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                                <span class="text-[10px] text-white/70 truncate max-w-[60px]">{char.name}</span>
                                                <span class="text-[9px] rarity-text-{char.rarity}">{char.rarity}</span>
                                        </button>
                                {/each}
                                {#if ownedChars.length === 0}
                                        <p class="col-span-4 text-xs text-white/30 text-center py-4">No VTubers owned yet. Pull from Gacha first!</p>
                                {/if}
                        </div>
                {/if}

                <!-- Lead stats preview -->
                {#if selectedLead}
                        <div class="mt-3 grid grid-cols-4 gap-2 text-center">
                                {#each ['mg', 'vc', 'tc', 'ch'] as stat}
                                        {@const info = statLabels[stat]}
                                        {@const val = (gameStore.state.characters[selectedLead.slug]?.stats ?? selectedLead.stats)[stat as keyof typeof selectedLead.stats]}
                                        <div class="p-2 rounded-lg bg-white/5">
                                                <span class="text-[10px] {info.color}">{info.label}</span>
                                                <div class="text-sm font-bold text-white">{val}</div>
                                        </div>
                                {/each}
                        </div>
                {/if}
        </div>

        <!-- Step 2: Select Coaches -->
        <div class="glass p-4 rounded-xl">
                <h2 class="text-sm font-semibold text-white/70 mb-3">
                        2. Select Coaches
                        <span class="text-white/30 ml-1">(Trained Archive)</span>
                </h2>

                <!-- 3 Coach Slots -->
                <div class="grid grid-cols-3 gap-2 mb-3">
                        {#each selectedCoaches as coach, i}
                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                <div
                                        onclick={() => openCoachPicker(i)}
                                        onkeydown={(e) => { if (e.key === 'Enter') openCoachPicker(i); }}
                                        role="button"
                                        tabindex="0"
                                        class="p-2 rounded-lg border border-dashed cursor-pointer {coach ? 'border-white/20 bg-white/5' : 'border-white/10 hover:border-white/20 hover:bg-white/3'} transition-all min-h-[80px] flex flex-col items-center justify-center"
                                >
                                        {#if coach}
                                                <img
                                                        src={getImageUrl(coach.slug)}
                                                        alt={coach.slug}
                                                        class="w-8 h-8 rounded-full object-cover mb-1"
                                                        onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                                <span class="text-[10px] text-white/70 truncate max-w-[70px]">{coach.slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</span>
                                                <span class="text-[9px] {getCoachGradeClass(coach.grade)}">{coach.grade}-Rank</span>
                                                <button
                                                        onclick={(e) => { e.stopPropagation(); clearCoach(i); }}
                                                        class="text-[9px] text-red-400/60 hover:text-red-400 mt-0.5"
                                                >
                                                        Remove
                                                </button>
                                        {:else}
                                                <span class="text-lg text-white/20">+</span>
                                                <span class="text-[10px] text-white/30">Slot {i + 1}</span>
                                        {/if}
                                </div>
                        {/each}
                </div>

                <!-- Inspiration Preview -->
                {#if inspirationBreakdown}
                        <div class="p-3 rounded-lg bg-white/5">
                                <div class="text-xs text-white/50 mb-2">Inspiration Bonus</div>
                                <div class="grid grid-cols-4 gap-2 text-center">
                                        {#each ['mg', 'vc', 'tc', 'ch'] as stat}
                                                {@const info = statLabels[stat]}
                                                {@const val = inspirationBreakdown.totals[stat as keyof typeof inspirationBreakdown.totals]}
                                                <div>
                                                        <span class="text-[10px] {info.color}">{info.label}</span>
                                                        <div class="text-sm font-bold text-green-400">+{val}</div>
                                                </div>
                                        {/each}
                                </div>
                        </div>
                {:else}
                        <p class="text-xs text-white/30 text-center">Select coaches to see inspiration bonuses</p>
                        {#if trainedCopies.length === 0}
                                <p class="text-xs text-white/20 text-center mt-1">No trained VTubers in archive yet. Complete a run first!</p>
                                {/if}
                {/if}
        </div>

        <!-- Coach Picker Modal -->
        {#if showCoachPicker}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                        class="fixed inset-0 z-[200] bg-black/70 flex items-end justify-center p-4"
                        onclick={() => { showCoachPicker = false; }}
                        onkeydown={(e) => { if (e.key === 'Escape') showCoachPicker = false; }}
                        role="dialog"
                >
                        <div class="glass-strong w-full max-w-lg rounded-t-xl p-4 max-h-[60vh] overflow-y-auto animate-slide-up" onclick={(e) => e.stopPropagation()}>
                                <div class="flex items-center justify-between mb-3">
                                        <h3 class="text-sm font-semibold text-white">Select Coach (Slot {coachSlotIndex + 1})</h3>
                                        <button onclick={() => { showCoachPicker = false; }} class="text-white/40 hover:text-white text-xl">&times;</button>
                                </div>
                                <div class="grid grid-cols-3 gap-2">
                                        {#each trainedCopies as copy (copy.slug + copy.timestamp)}
                                                <button
                                                        onclick={() => selectCoach(copy)}
                                                        class="flex flex-col items-center p-2 rounded-lg transition-all hover:bg-white/10 border border-transparent hover:border-white/20"
                                                >
                                                        <img
                                                                src={getImageUrl(copy.slug)}
                                                                alt={copy.slug}
                                                                class="w-10 h-10 rounded-full object-cover mb-1"
                                                                onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                        />
                                                        <span class="text-[10px] text-white/70 truncate max-w-[70px]">{copy.slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</span>
                                                        <div class="flex gap-1">
                                                                <span class="text-[9px] {getCoachRarityClass(copy.rarity)}">{copy.rarity}</span>
                                                                <span class="text-[9px] {getCoachGradeClass(copy.grade)}">{copy.grade}</span>
                                                        </div>
                                                </button>
                                        {/each}
                                        {#if trainedCopies.length === 0}
                                                <p class="col-span-3 text-xs text-white/30 text-center py-4">No trained VTubers available</p>
                                        {/if}
                                </div>
                        </div>
                </div>
        {/if}

        <!-- Start Button -->
        <button
                onclick={startRun}
                disabled={!canStart}
                class="w-full py-3 rounded-xl font-semibold text-sm transition-all
                {canStart
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-400 hover:to-blue-400 active:scale-[0.98]'
                        : 'bg-white/5 text-white/20 cursor-not-allowed'}"
        >
                {selectedLead ? 'Start Campaign' : 'Select a Lead VTuber'}
        </button>
</div>
