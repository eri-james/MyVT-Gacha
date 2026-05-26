<script lang="ts">
        import { useGame } from '$lib/stores/context';
        import { loadCharacters, getCharacter } from '$lib/data/characters';
        import type { CharacterData, RosterEntry, Rarity } from '$lib/types';
        import { STAT_LABELS, TRAINABLE_STATS, RARITY_ORDER, MAX_ROSTER_SIZE } from '$lib/types';

        const { gameState, navigateTo } = useGame();

        let characters = $state<Map<string, CharacterData>>(new Map());
        let isLoading = $state(true);
        let sortMode = $state<'grade' | 'date' | 'hype'>('grade');
        let selectedEntry = $state<RosterEntry | null>(null);
        let showDetail = $state(false);

        $effect(() => {
                loadCharacters().then(data => {
                        characters = new Map(data.map(c => [c.slug, c]));
                        isLoading = false;
                });
        });

        let roster = $derived(gameState.roster);
        let rosterCount = $derived(roster.length);

        let sorted = $derived(
                [...roster].sort((a, b) => {
                        if (sortMode === 'grade') {
                                const gradeOrder: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
                                return (gradeOrder[a.grade] ?? 4) - (gradeOrder[b.grade] ?? 4);
                        }
                        if (sortMode === 'date') return b.createdAt - a.createdAt;
                        if (sortMode === 'hype') return b.totalHype - a.totalHype;
                        return 0;
                })
        );

        function getChar(slug: string): CharacterData | undefined {
                return characters.get(slug);
        }

        function selectEntry(entry: RosterEntry) {
                selectedEntry = entry;
                showDetail = true;
        }

        function closeDetail() {
                showDetail = false;
                selectedEntry = null;
        }

        function goBack() {
                navigateTo('collection');
        }

        // ─── Lineage helpers ───

        /** Walk the parentRunId chain to build a lineage of ancestor entries */
        function getLineage(entry: RosterEntry): RosterEntry[] {
                const chain: RosterEntry[] = [];
                let current: RosterEntry | undefined = entry;

                // Walk backward through parents
                while (current) {
                        chain.unshift(current);
                        current = current.parentRunId
                                ? roster.find(r => r.id === current!.parentRunId)
                                : undefined;
                }

                return chain;
        }

        /** Get all descendants (entries that list this entry as ancestor) */
        function getDescendants(entry: RosterEntry): RosterEntry[] {
                return roster.filter(r => {
                        let current: RosterEntry | undefined = r;
                        while (current) {
                                if (current.parentRunId === entry.id) return true;
                                current = current.parentRunId
                                        ? roster.find(p => p.id === current!.parentRunId)
                                        : undefined;
                        }
                        return false;
                });
        }

        /** Full lineage chain: ancestors + self + descendants */
        let fullLineage = $derived(
                selectedEntry ? getLineage(selectedEntry) : []
        );

        let descendants = $derived(
                selectedEntry ? getDescendants(selectedEntry) : []
        );
</script>

<div class="page anim-fade-in">
        {#if !showDetail}
                <div class="page-content">
                        <div class="page-header">
                                <button class="back-btn" onclick={goBack}>
                                        <span class="back-arrow text-muted">&#x2039;</span>
                                </button>
                                <h2 class="page-title">Roster</h2>
                                <span class="text-xs text-secondary">{rosterCount} / {MAX_ROSTER_SIZE}</span>
                        </div>

                        <!-- Sort tabs -->
                        <div class="sort-tabs">
                                <button class="sort-tab" class:active={sortMode === 'grade'} onclick={() => sortMode = 'grade'}>Grade</button>
                                <button class="sort-tab" class:active={sortMode === 'date'} onclick={() => sortMode = 'date'}>Newest</button>
                                <button class="sort-tab" class:active={sortMode === 'hype'} onclick={() => sortMode = 'hype'}>Hype</button>
                        </div>

                        {#if isLoading}
                                <div class="empty-state">
                                        <p class="text-secondary">Loading...</p>
                                </div>
                        {:else if rosterCount === 0}
                                <div class="empty-state">
                                        <div class="empty-icon art-icon"></div>
                                        <p class="text-secondary text-sm mt-md">No trained VTubers yet</p>
                                        <p class="text-muted text-xs mt-sm">Complete Live!ON runs to train VTubers for your roster</p>
                                </div>
                        {:else}
                                <div class="roster-grid">
                                        {#each sorted as entry (entry.id)}
                                                {@const char = getChar(entry.slug)}
                                                {#if char}
                                                        <button class="roster-card card card-rarity-{char.rarity}" onclick={() => selectEntry(entry)}>
                                                                <div class="roster-portrait art-portrait"
                                                                        style="background-image: url('/portraits/{char.slug}.jpg')">
                                                                </div>
                                                                <span class="badge badge-{char.rarity}" style="position:absolute;top:var(--sp-xs);left:var(--sp-xs);">{entry.grade}</span>
                                                                {#if entry.sparks}
                                                                        <span class="spark-indicator">&#10038;</span>
                                                                {/if}
                                                                {#if entry.generation > 1}
                                                                        <span class="gen-badge">G{entry.generation}</span>
                                                                {/if}
                                                                <span class="roster-name text-xs">{char.name}</span>
                                                                <span class="text-xs text-muted">PWR {entry.totalHype}</span>
                                                        </button>
                                                {/if}
                                        {/each}
                                </div>
                        {/if}
                </div>
        {:else if selectedEntry}
                <!-- Character detail view -->
                {@const char = getChar(selectedEntry.slug)}
                {#if char}
                        <div class="detail-view anim-fade-in">
                                <div class="detail-header">
                                        <button class="back-btn" onclick={closeDetail}>
                                                <span class="back-arrow text-muted">&#x2039;</span>
                                        </button>
                                        <span class="text-sm font-semibold">{char.name}</span>
                                        <span class="badge badge-{char.rarity}">{char.rarity}</span>
                                </div>

                                <div class="detail-portrait art-portrait"
                                        style="background-image: url('/portraits/{char.slug}.jpg')">
                                </div>

                                <!-- Grade and hype -->
                                <div class="detail-summary">
                                        <div class="grade-display" style="color: {selectedEntry.grade === 'S' ? 'var(--c-accent-gold)' : selectedEntry.grade === 'A' ? 'var(--c-accent-green)' : 'var(--c-accent-blue)'}">
                                                <span class="grade-letter text-3xl font-bold">{selectedEntry.grade}</span>
                                                <span class="text-xs text-secondary">Grade</span>
                                        </div>
                                        <div class="hype-display">
                                                <span class="text-lg font-bold text-gold">{selectedEntry.totalHype}</span>
                                                <span class="text-xs text-secondary">Total Hype</span>
                                        </div>
                                </div>

                                <!-- Trained stats -->
                                <div class="stats-grid">
                                        {#each TRAINABLE_STATS as stat}
                                                {@const base = char.stats[stat]}
                                                {@const trained = selectedEntry.stats[stat]}
                                                {@const gain = trained - base}
                                                <div class="stat-item stat-bar-{stat}">
                                                        <span class="text-xs text-secondary">{STAT_LABELS[stat]}</span>
                                                        <span class="text-sm font-bold">{trained}</span>
                                                        {#if gain > 0}
                                                                <span class="text-xs text-green">+{gain}</span>
                                                        {/if}
                                                </div>
                                        {/each}
                                </div>

                                <!-- Sparks -->
                                {#if selectedEntry.sparks}
                                        <div class="sparks-box card">
                                                <h4 class="text-sm font-bold">Sparks Available</h4>
                                                <p class="text-xs text-secondary mt-sm">These sparks boost the next Live!ON run with this VTuber.</p>
                                                <div class="sparks-detail mt-md">
                                                        <span class="text-sm text-gold">+{selectedEntry.sparks.value1} {STAT_LABELS[selectedEntry.sparks.stat1]}</span>
                                                        <span class="text-sm text-gold">+{selectedEntry.sparks.value2} {STAT_LABELS[selectedEntry.sparks.stat2]}</span>
                                                        <span class="spark-stars text-gold">
                                                                {#each Array(selectedEntry.quality) as _}&#9733;{/each}
                                                        </span>
                                                </div>
                                        </div>
                                {/if}

                                <!-- Spark Lineage -->
                                {#if fullLineage.length > 1}
                                        <div class="lineage-box card">
                                                <h4 class="text-sm font-bold">
                                                        Spark Lineage
                                                        <span class="lineage-gen text-xs text-secondary">Gen {selectedEntry.generation}</span>
                                                </h4>
                                                <div class="lineage-chain mt-md">
                                                        {#each fullLineage as ancestor, i}
                                                                <div class="lineage-node" class:lineage-current={ancestor.id === selectedEntry.id}>
                                                                        <div class="lineage-portrait art-portrait"
                                                                                style="background-image: url('/portraits/{ancestor.slug}.jpg')"
                                                                        ></div>
                                                                        <span class="lineage-grade" style="color: {ancestor.grade === 'S' ? 'var(--c-accent-gold)' : ancestor.grade === 'A' ? 'var(--c-accent-green)' : 'var(--c-accent-blue)'}">{ancestor.grade}</span>
                                                                        <span class="lineage-gen-label text-xs text-muted">G{ancestor.generation}</span>
                                                                        <span class="lineage-sparks text-xs text-gold">
                                                                                {#if ancestor.sparks}
                                                                                        {#each Array(ancestor.quality) as _}&#9733;{/each}
                                                                                {:else}
                                                                                        &mdash;
                                                                                {/if}
                                                                        </span>
                                                                </div>
                                                                {#if i < fullLineage.length - 1}
                                                                        <div class="lineage-arrow text-muted">&#10230;</div>
                                                                {/if}
                                                        {/each}
                                                </div>
                                                <p class="text-xs text-muted mt-sm lineage-hint">
                                                        Sparks were inherited and evolved across {fullLineage.length} generation{fullLineage.length > 1 ? 's' : ''}
                                                </p>
                                        </div>
                                {:else if selectedEntry.generation > 1}
                                        <!-- Generation badge even without full chain visible (parent was released) -->
                                        <div class="lineage-box card">
                                                <div class="lineage-orphan">
                                                        <span class="text-sm font-bold">Generation {selectedEntry.generation}</span>
                                                        <span class="text-xs text-secondary">Inherited sparks from a previous run</span>
                                                </div>
                                        </div>
                                {/if}

                                <div class="detail-meta">
                                        <span class="text-xs text-muted">Trained: {new Date(selectedEntry.createdAt).toLocaleDateString()}</span>
                                </div>
                        </div>
                {/if}
        {/if}
</div>

<style>
        .page-content {
                position: relative;
                z-index: 1;
        }

        .page-header {
                display: flex;
                align-items: center;
                gap: var(--sp-md);
                margin-bottom: var(--sp-lg);
        }

        .back-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                border-radius: var(--r-md);
        }

        .back-btn:active {
                background: var(--c-surface);
        }

        .back-arrow {
                font-size: 28px;
                line-height: 1;
                font-weight: 300;
        }

        .page-title {
                font-size: 18px;
                font-weight: 700;
        }

        /* Sort */
        .sort-tabs {
                display: flex;
                gap: var(--sp-sm);
                margin-bottom: var(--sp-lg);
        }

        .sort-tab {
                padding: var(--sp-xs) var(--sp-md);
                border-radius: var(--r-full);
                font-size: 12px;
                font-weight: 600;
                background: var(--c-surface);
                border: 1px solid var(--c-border-light);
                opacity: 0.5;
                transition: opacity var(--t-fast);
        }

        .sort-tab.active {
                opacity: 1;
                border-color: var(--c-accent-blue);
        }

        /* Grid */
        .roster-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: var(--sp-md);
        }

        .roster-card {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
                padding: var(--sp-xs);
                position: relative;
                text-align: center;
                transition: all var(--t-fast);
        }

        .roster-card:active {
                transform: scale(0.97);
        }

        .roster-portrait {
                width: 100%;
                aspect-ratio: 1;
        }

        .roster-name {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 100%;
        }

        .spark-indicator {
                position: absolute;
                top: var(--sp-xs);
                right: var(--sp-xs);
                color: var(--c-accent-gold);
                font-size: 14px;
        }

        .text-green { color: var(--c-accent-green); }
        .text-gold { color: var(--c-accent-gold); }

        /* Empty */
        .empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: var(--sp-3xl) 0;
                text-align: center;
        }

        .empty-icon {
                width: 64px;
                height: 64px;
        }

        .mt-sm { margin-top: var(--sp-sm); }
        .mt-md { margin-top: var(--sp-md); }

        /* Detail view */
        .detail-view {
                position: relative;
                z-index: 1;
        }

        .detail-header {
                display: flex;
                align-items: center;
                gap: var(--sp-md);
                margin-bottom: var(--sp-lg);
        }

        .detail-portrait {
                width: 100%;
                height: 200px;
                margin-bottom: var(--sp-lg);
                border-radius: var(--r-lg);
        }

        .detail-summary {
                display: flex;
                justify-content: space-around;
                padding: var(--sp-lg);
                background: var(--c-surface);
                border: 1px solid var(--c-border);
                border-radius: var(--r-lg);
                margin-bottom: var(--sp-lg);
        }

        .grade-display,
        .hype-display {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--sp-xs);
        }

        /* Stats */
        .stats-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: var(--sp-sm);
                margin-bottom: var(--sp-lg);
        }

        .stat-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
                padding: var(--sp-sm);
                background: var(--c-surface);
                border-radius: var(--r-md);
                border: 1px solid var(--c-border-light);
        }

        /* Sparks */
        .sparks-box {
                padding: var(--sp-lg);
                margin-bottom: var(--sp-lg);
        }

        .sparks-detail {
                display: flex;
                align-items: center;
                gap: var(--sp-lg);
        }

        .spark-stars {
                letter-spacing: 2px;
                font-size: 14px;
        }

        .detail-meta {
                text-align: center;
                padding: var(--sp-lg) 0;
        }

        /* Lineage chain */
        .lineage-box {
                padding: var(--sp-lg);
                margin-bottom: var(--sp-lg);
        }

        .lineage-gen {
                margin-left: var(--sp-sm);
                font-weight: 400;
        }

        .lineage-chain {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: var(--sp-xs);
                overflow-x: auto;
                padding: var(--sp-sm) 0;
        }

        .lineage-node {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
                min-width: 56px;
                opacity: 0.5;
                transition: opacity var(--t-fast);
        }

        .lineage-node.lineage-current {
                opacity: 1;
        }

        .lineage-portrait {
                width: 44px;
                height: 44px;
                border-radius: var(--r-full);
                border: 2px solid var(--c-border);
                background-size: cover;
                background-position: center;
        }

        .lineage-node.lineage-current .lineage-portrait {
                border-color: var(--c-accent-gold);
                box-shadow: 0 0 8px rgba(251, 191, 36, 0.3);
        }

        .lineage-grade {
                font-size: 14px;
                font-weight: 800;
        }

        .lineage-gen-label {
                font-size: 10px;
        }

        .lineage-sparks {
                font-size: 10px;
                letter-spacing: 1px;
        }

        .lineage-arrow {
                font-size: 16px;
                margin: 0 var(--sp-xs);
                flex-shrink: 0;
                padding-bottom: 16px;
        }

        .lineage-hint {
                text-align: center;
        }

        .lineage-orphan {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--sp-xs);
                text-align: center;
        }

        /* Generation badge on grid card */
        .gen-badge {
                position: absolute;
                bottom: var(--sp-xs);
                right: var(--sp-xs);
                background: rgba(251, 191, 36, 0.15);
                color: var(--c-accent-gold);
                font-size: 9px;
                font-weight: 700;
                padding: 1px 4px;
                border-radius: var(--r-full);
                line-height: 1.4;
        }
</style>
