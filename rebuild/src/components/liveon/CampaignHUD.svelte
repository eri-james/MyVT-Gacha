<script lang="ts">
        import { liveonStore } from '$lib/stores';
        import { getImageUrl } from '$lib/data/characters';
        import { getBySlug } from '$lib/data/characters';
        import { loadCharacters } from '$lib/data/characters';
        import { onMount } from 'svelte';

        const run = $derived(liveonStore.run);
        const ps = $derived(run.ps);
        const maxPS = $derived(run.maxPS);
        const psPct = $derived(Math.round((ps / maxPS) * 100));

        const cycle = $derived(run.cycle);
        const turn = $derived(run.turn);
        const currentFocus = $derived(liveonStore.currentFocus);
        const totalSubs = $derived(run.totalSubscribers);
        const totalHype = $derived(run.totalHype);

        const focusLabels: Record<string, { label: string; color: string }> = {
                mg: { label: 'MG', color: 'text-yellow-400 bg-yellow-400/10' },
                vc: { label: 'VC', color: 'text-cyan-400 bg-cyan-400/10' },
                tc: { label: 'TC', color: 'text-blue-400 bg-blue-400/10' },
                ch: { label: 'CH', color: 'text-red-400 bg-red-400/10' },
        };

        let loaded = $state(false);

        onMount(async () => {
                await loadCharacters();
                loaded = true;
        });

        function getFocusLabel(focus: string | null) {
                if (!focus) return { label: '-', color: '' };
                return focusLabels[focus] ?? { label: focus.toUpperCase(), color: 'text-white/50' };
        }
</script>

<div class="flex flex-col gap-2">
        <!-- Cycle Progress -->
        <div class="flex items-center justify-between text-xs">
                <span class="text-white/50">
                        Cycle <span class="text-white font-bold">{cycle}</span>/4
                </span>
                <span class="text-white/50">
                        Turn <span class="text-white font-bold">{turn}</span>/16
                </span>
                <span class="text-purple-400 font-medium">
                        {totalSubs.toLocaleString()} subs
                </span>
        </div>

        <!-- Cycle Focus Badges -->
        <div class="flex gap-1">
                {#each ['mg', 'vc', 'tc', 'ch'] as f, i}
                        {@const info = focusLabels[f]}
                        {@const isActive = i + 1 === cycle}
                        {@const isPast = i + 1 < cycle}
                        <div
                                class="flex-1 text-center py-1 rounded text-[10px] font-medium transition-all
                                {isActive ? info.color + ' font-bold ring-1 ring-current/30' : isPast ? 'text-white/30 bg-white/5' : 'text-white/15 bg-white/3'}"
                        >
                                C{i + 1}: {info.label}
                        </div>
                {/each}
        </div>

        <!-- PS Bar -->
        <div>
                <div class="flex justify-between text-[10px] mb-1">
                        <span class="text-orange-400">PS (Passion)</span>
                        <span class="text-white/60">{ps}/{maxPS}</span>
                </div>
                <div class="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                                class="h-full rounded-full transition-all duration-300 {psPct > 50 ? 'bg-gradient-to-r from-green-500 to-green-400' : psPct > 20 ? 'bg-gradient-to-r from-yellow-500 to-orange-400' : 'bg-gradient-to-r from-red-500 to-red-400'}"
                                style="width: {psPct}%"
                        ></div>
                </div>
                {#if liveonStore.isDeadAir}
                        <p class="text-[10px] text-red-400 mt-0.5 animate-pulse">DEAD AIR — PS depleted!</p>
                {/if}
        </div>

        <!-- Effective Stats -->
        <div class="grid grid-cols-4 gap-1 text-center">
                {#each ['mg', 'vc', 'tc', 'ch'] as stat}
                        {@const info = focusLabels[stat]}
                        {@const val = run.effectiveStats[stat as keyof typeof run.effectiveStats]}
                        {@const isActive = currentFocus === stat}
                        <div class="p-1.5 rounded {isActive ? 'ring-1 ring-white/20 bg-white/8' : 'bg-white/3'}">
                                <span class="text-[9px] {info.color.split(' ')[0]}">{info.label}</span>
                                <div class="text-xs font-bold text-white">{val}</div>
                        </div>
                {/each}
        </div>

        <!-- Lead Info -->
        {#if loaded && run.lead}
                {@const char = getBySlug(run.lead)}
                {#if char}
                        <div class="flex items-center gap-2 px-1">
                                <img
                                        src={getImageUrl(char.slug)}
                                        alt={char.name}
                                        class="w-6 h-6 rounded-full object-cover"
                                        onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <span class="text-xs text-white/60">{char.name}</span>
                                <span class="text-[10px] text-white/30">|</span>
                                <span class="text-xs text-white/40">{totalHype.toLocaleString()} total hype</span>
                        </div>
                {/if}
        {/if}
</div>
