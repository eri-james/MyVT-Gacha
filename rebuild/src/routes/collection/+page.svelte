<script lang="ts">
        import { gameStore } from '$lib/stores';
        import { loadCharacters, getCharacters, getImageUrl } from '$lib/data/characters';
        import { formatNumber } from '$lib/utils/format';
        import { onMount } from 'svelte';
        import type { CharacterRecord, CharacterData, Rarity } from '$lib/types';

        // ── State ──
        let searchQuery = $state('');
        let sortBy = $state<'name' | 'rarity' | 'power' | 'echo' | 'level'>('rarity');
        let filterRarity = $state<Rarity | 'all'>('all');
        let charsLoaded = $state(false);

        // ── Derived ──
        const ownedEntries = $derived.by(() => {
                const records = getCharacters();
                const owned: Array<{ record: CharacterRecord; data: CharacterData }> = [];

                for (const record of records) {
                        const data = gameStore.state.characters[record.slug];
                        if (data && data.owned) {
                                owned.push({ record, data });
                        }
                }

                // Filter by rarity
                let filtered = filterRarity === 'all'
                        ? owned
                        : owned.filter(e => e.record.rarity === filterRarity);

                // Filter by search
                if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase();
                        filtered = filtered.filter(e =>
                                e.record.name.toLowerCase().includes(q) ||
                                e.record.slug.toLowerCase().includes(q) ||
                                e.record.agency.toLowerCase().includes(q)
                        );
                }

                // Sort
                const rarityOrder: Record<Rarity, number> = { UR: 4, SSR: 3, SR: 2, R: 1 };
                filtered.sort((a, b) => {
                        switch (sortBy) {
                                case 'name': return a.record.name.localeCompare(b.record.name);
                                case 'rarity': return rarityOrder[b.record.rarity] - rarityOrder[a.record.rarity];
                                case 'power':
                                        return Object.values(b.data.stats).reduce((s, v) => s + v, 0)
                                                - Object.values(a.data.stats).reduce((s, v) => s + v, 0);
                                case 'echo': return b.data.echo - a.data.echo;
                                case 'level': return b.data.level - a.data.level;
                                default: return 0;
                        }
                });

                return filtered;
        });

        const totalCount = $derived(Object.values(gameStore.state.characters).filter(c => c.owned).length);

        function getRarityColor(rarity: Rarity): string {
                switch (rarity) {
                        case 'UR': return 'text-yellow-400';
                        case 'SSR': return 'text-purple-400';
                        case 'SR': return 'text-blue-400';
                        default: return 'text-white/50';
                }
        }

        function getRarityBg(rarity: Rarity): string {
                switch (rarity) {
                        case 'UR': return 'border-yellow-500/30 bg-yellow-500/5';
                        case 'SSR': return 'border-purple-500/30 bg-purple-500/5';
                        case 'SR': return 'border-blue-500/30 bg-blue-500/5';
                        default: return 'border-white/10 bg-white/3';
                }
        }

        function getEchoLabel(echo: number): string {
                if (echo === 0) return '';
                if (echo >= 6) return 'MAX';
                return `E${echo}`;
        }

        onMount(async () => {
                await loadCharacters();
                charsLoaded = true;
        });
</script>

<div class="animate-fade-in">
        <!-- Header -->
        <div class="flex items-center justify-between mb-3">
                <h2 class="text-lg font-bold text-white">Roster</h2>
                <span class="text-xs text-white/40">{totalCount} owned</span>
        </div>

        <!-- Search & Filters -->
        <div class="flex flex-col gap-2 mb-3">
                <!-- Search -->
                <div class="relative">
                        <input
                                type="text"
                                bind:value={searchQuery}
                                placeholder="Search name, slug, agency..."
                                class="w-full glass px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 bg-transparent outline-none focus:ring-1 focus:ring-white/20"
                        />
                        {#if searchQuery}
                                <button
                                        onclick={() => searchQuery = ''}
                                        class="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs"
                                >
                                        clear
                                </button>
                        {/if}
                </div>

                <!-- Filter row -->
                <div class="flex gap-1.5 overflow-x-auto no-scrollbar">
                        {#each ['all', 'UR', 'SSR', 'SR', 'R'] as rarity}
                                <button
                                        onclick={() => filterRarity = rarity as Rarity | 'all'}
                                        class="px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors
                                        {filterRarity === rarity
                                                ? 'bg-white/15 text-white'
                                                : 'bg-white/5 text-white/40 hover:text-white/60 hover:bg-white/8'}"
                                >
                                        {rarity === 'all' ? 'All' : rarity}
                                </button>
                        {/each}
                        <div class="flex-1"></div>
                        <select
                                bind:value={sortBy}
                                class="px-2 py-1 rounded-lg text-[10px] bg-white/5 text-white/60 border-0 outline-none cursor-pointer"
                        >
                                <option value="rarity">Rarity</option>
                                <option value="power">Power</option>
                                <option value="level">Level</option>
                                <option value="echo">Echo</option>
                                <option value="name">Name</option>
                        </select>
                </div>
        </div>

        <!-- Character Grid -->
        {#if !charsLoaded}
                <div class="text-center py-8 text-white/30 text-sm">Loading roster...</div>
        {:else if ownedEntries.length === 0}
                <div class="text-center py-12">
                        <div class="text-3xl mb-3 opacity-30">&#128100;</div>
                        <p class="text-sm text-white/40">No VTubers in your roster yet.</p>
                        <p class="text-xs text-white/25 mt-1">Pull from the Gacha to recruit!</p>
                </div>
        {:else}
                <div class="grid grid-cols-2 gap-2">
                        {#each ownedEntries as entry (entry.record.slug)}
                                {@const r = entry.record}
                                {@const d = entry.data}
                                {@const totalStats = Object.values(d.stats).reduce((s, v) => s + v, 0)}
                                <div class="glass p-3 rounded-xl border {getRarityBg(r.rarity)} transition-all active:scale-[0.97]">
                                        <!-- Portrait + Name -->
                                        <div class="flex items-start gap-2.5 mb-2">
                                                <div class="relative shrink-0">
                                                        <img
                                                                src={getImageUrl(r.slug)}
                                                                alt={r.name}
                                                                class="w-12 h-12 rounded-full object-cover ring-1 ring-white/10"
                                                                onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                        />
                                                        {#if d.echo > 0}
                                                                <span class="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold px-1 rounded bg-yellow-500/80 text-black leading-none">
                                                                        {getEchoLabel(d.echo)}
                                                                </span>
                                                        {/if}
                                                </div>
                                                <div class="min-w-0 flex-1">
                                                        <div class="text-sm font-semibold text-white truncate">{r.name}</div>
                                                        <div class="text-[10px] {getRarityColor(r.rarity)} font-semibold">{r.rarity}</div>
                                                        <div class="text-[10px] text-white/30 truncate">{r.agency}</div>
                                                </div>
                                        </div>

                                        <!-- Stats row -->
                                        <div class="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                                                <div class="flex justify-between">
                                                        <span class="text-white/30">Lv</span>
                                                        <span class="text-white/70">{d.level}</span>
                                                </div>
                                                <div class="flex justify-between">
                                                        <span class="text-white/30">PWR</span>
                                                        <span class="text-white/70">{formatNumber(totalStats)}</span>
                                                </div>
                                                <div class="flex justify-between">
                                                        <span class="text-white/30">Bond</span>
                                                        <span class="text-pink-400/70">{d.bondLevel}/8</span>
                                                </div>
                                                <div class="flex justify-between">
                                                        <span class="text-white/30">Shards</span>
                                                        <span class="text-cyan-400/70">{d.shards}</span>
                                                </div>
                                        </div>
                                </div>
                        {/each}
                </div>
        {/if}
</div>
