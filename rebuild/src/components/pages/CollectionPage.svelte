<script lang="ts">
        import { useGame } from '$lib/stores/context';
        import { loadCharacters } from '$lib/data/characters';
        import type { CharacterData, Rarity } from '$lib/types';

        const { gameState, navigateTo } = useGame();

        let characters = $state<CharacterData[]>([]);
        let isLoading = $state(true);
        let filterRarity = $state<Rarity | 'all'>('all');

        $effect(() => {
                loadCharacters().then(data => {
                        characters = data;
                        isLoading = false;
                });
        });

        const ownedSlugs = $derived(Object.keys(gameState.collection));

        const filtered = $derived(
                characters.filter(c =>
                        (filterRarity === 'all' || c.rarity === filterRarity)
                ).sort((a, b) => {
                        const aOwned = ownedSlugs.includes(a.slug) ? 0 : 1;
                        const bOwned = ownedSlugs.includes(b.slug) ? 0 : 1;
                        if (aOwned !== bOwned) return aOwned - bOwned;
                        const ro: Record<string, number> = { R: 0, SR: 1, SSR: 2, UR: 3 };
                        if (ro[b.rarity] !== ro[a.rarity]) return ro[b.rarity] - ro[a.rarity];
                        return a.name.localeCompare(b.name);
                })
        );

        const ownedCount = $derived(ownedSlugs.length);
        const totalCount = $derived(characters.length);
</script>

<div class="page anim-fade-in">
        <div class="page-content">
                <div class="page-header">
                        <h2 class="page-title">Collection</h2>
                        <span class="text-xs text-secondary">{ownedCount} / {totalCount}</span>
                </div>

                <!-- Rarity filter tabs -->
                <div class="filter-tabs">
                        <button class="filter-tab" class:active={filterRarity === 'all'} onclick={() => filterRarity = 'all'}>All</button>
                        <button class="filter-tab" class:active={filterRarity === 'UR'} onclick={() => filterRarity = 'UR'}>UR</button>
                        <button class="filter-tab" class:active={filterRarity === 'SSR'} onclick={() => filterRarity = 'SSR'}>SSR</button>
                        <button class="filter-tab" class:active={filterRarity === 'SR'} onclick={() => filterRarity = 'SR'}>SR</button>
                        <button class="filter-tab" class:active={filterRarity === 'R'} onclick={() => filterRarity = 'R'}>R</button>
                </div>

                {#if isLoading}
                        <div class="empty-state">
                                <p class="text-secondary">Loading characters...</p>
                        </div>
                {:else}
                        <div class="char-grid">
                                {#each filtered as char (char.slug)}
                                        <div class="char-card card card-rarity-{char.rarity}">
                                                <div class="char-portrait art-portrait"
                                                        style="background-image: url('/portraits/{char.slug}.jpg')">
                                                </div>
                                                <div class="char-info">
                                                        <span class="char-name text-sm font-semibold">{char.name}</span>
                                                        <span class="char-power text-xs text-secondary">PWR {char.power}</span>
                                                </div>
                                                {#if ownedSlugs.includes(char.slug)}
                                                        <span class="badge badge-{char.rarity}">OWNED</span>
                                                {/if}
                                        </div>
                                {/each}
                        </div>
                {/if}

                <!-- Roster shortcut -->
                <button class="roster-link mt-xl" onclick={() => navigateTo('roster')}>
                        <span class="text-sm text-secondary">View Roster &#x203A;</span>
                </button>
        </div>
</div>

<style>
        .page-content {
                position: relative;
                z-index: 1;
        }

        .page-header {
                display: flex;
                align-items: baseline;
                gap: var(--sp-md);
                margin-bottom: var(--sp-lg);
        }

        .page-title {
                font-size: 18px;
                font-weight: 700;
        }

        .filter-tabs {
                display: flex;
                gap: var(--sp-sm);
                margin-bottom: var(--sp-lg);
        }

        .filter-tab {
                padding: var(--sp-xs) var(--sp-md);
                border-radius: var(--r-full);
                font-size: 12px;
                font-weight: 600;
                background: var(--c-surface);
                border: 1px solid var(--c-border-light);
                opacity: 0.5;
                transition: opacity var(--t-fast);
        }

        .filter-tab.active {
                opacity: 1;
                border-color: var(--c-accent-blue);
        }

        .char-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: var(--sp-md);
        }

        .char-card {
                display: flex;
                flex-direction: column;
                gap: var(--sp-sm);
                padding: var(--sp-sm);
                position: relative;
        }

        .char-portrait {
                width: 100%;
                aspect-ratio: 1;
        }

        .char-info {
                display: flex;
                flex-direction: column;
                gap: 1px;
                padding: 0 var(--sp-xs);
        }

        .char-name {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
        }

        .char-card .badge {
                position: absolute;
                top: var(--sp-sm);
                right: var(--sp-sm);
        }

        .empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: var(--sp-3xl) 0;
                text-align: center;
        }

        .roster-link {
                display: block;
                text-align: center;
                padding: var(--sp-md);
                border-radius: var(--r-md);
                transition: background var(--t-fast);
        }

        .roster-link:active {
                background: var(--c-surface);
        }
</style>
