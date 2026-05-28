<script lang="ts">
        import { useGame } from '$lib/stores/context';
        import {
                BANNERS, getBanner,
                calculatePullCost, deductPullCost,
                executeSinglePull, executeTenPull,
                getPityDisplay, getPityProgress,
                UR_PITY_THRESHOLD
        } from '$lib/logic/gacha';
        import type { GachaBanner, GachaResult, PullMode } from '$lib/types';

        const game = useGame();
        let gameState = $derived(game.gameState);
        let navigateTo = game.navigateTo;
        let showToast = game.showToast;

        let selectedBannerId = $state('standard');
        let isPulling = $state(false);
        let pullResults = $state<GachaResult[] | null>(null);
        let showResults = $state(false);
        let resultIndex = $state(0);

        let selectedBanner = $derived(getBanner(selectedBannerId) ?? BANNERS[0]);
        let ownedSlugs = $derived(new Set(Object.keys(gameState.collection)));
        let gachaState = $derived(gameState.gacha);

        let pityDisplay = $derived(getPityDisplay(gachaState.urPity));
        let pityProgress = $derived(getPityProgress(gachaState.urPity));
        let isSoftPity = $derived(gachaState.urPity >= 75);

        let singleCost = $derived(calculatePullCost(selectedBanner, 'single', gameState.currencies));
        let tenCost = $derived(calculatePullCost(selectedBanner, 'ten', gameState.currencies));

        function selectBanner(id: string) {
                selectedBannerId = id;
        }

        function switchToTickets() {
                // Switch to featured banner which uses tickets
                selectedBannerId = 'featured';
        }

        async function doPull(mode: PullMode) {
                if (isPulling) return;

                const cost = calculatePullCost(selectedBanner, mode, gameState.currencies);
                if (!cost.affordable) {
                        showToast('Not enough resources!');
                        return;
                }

                isPulling = true;

                // Deduct cost
                deductPullCost(selectedBanner, mode, gameState.currencies);

                // Execute pull
                let results: GachaResult[];
                let newPity: number;

                if (mode === 'single') {
                        const pull = await executeSinglePull(selectedBanner, gachaState.urPity, ownedSlugs);
                        results = [pull.result];
                        newPity = pull.newPity;
                } else {
                        const pull = await executeTenPull(selectedBanner, gachaState.urPity, ownedSlugs);
                        results = pull.results;
                        newPity = pull.newPity;
                }

                // Update pity
                gameState.gacha.urPity = newPity;
                gameState.gacha.lastPullAt = Date.now();
                if (selectedBanner.type === 'standard') {
                        gameState.gacha.totalStandardPulls += mode === 'single' ? 1 : 10;
                } else {
                        gameState.gacha.totalFeaturedPulls += mode === 'single' ? 1 : 10;
                }

                // Add to collection
                for (const result of results) {
                        if (!ownedSlugs.has(result.slug)) {
                                gameState.collection[result.slug] = {
                                        slug: result.slug,
                                        obtainedAt: Date.now()
                                };
                                ownedSlugs.add(result.slug);
                        }
                }

                // Show results
                pullResults = results;
                resultIndex = 0;
                showResults = true;
                isPulling = false;
        }

        function closeResults() {
                showResults = false;
                pullResults = null;
        }

        function nextResult() {
                if (pullResults && resultIndex < pullResults.length - 1) {
                        resultIndex++;
                }
        }

        let currentResult = $derived(pullResults ? pullResults[resultIndex] : null);
        let hasMoreResults = $derived(pullResults ? resultIndex < pullResults.length - 1 : false);

        function getCostLabel(): string {
                if (selectedBanner.costType === 'vgems') return 'VGems';
                if (selectedBanner.costType === 'blueTicket') return 'Blue MyTicket';
                return 'Red MyTicket';
        }

        function getBalance(): number {
                return gameState.currencies[selectedBanner.costType as keyof typeof gameState.currencies] ?? 0;
        }
</script>

<div class="page anim-fade-in">
        {#if !showResults}
                <!-- Gacha main screen -->
                <div class="gacha-content">
                        <h2 class="page-title">Gacha</h2>

                        <!-- Banner selection -->
                        <div class="banner-tabs">
                                {#each BANNERS as banner}
                                        <button
                                                class="banner-tab card"
                                                class:selected={selectedBannerId === banner.id}
                                                onclick={() => selectBanner(banner.id)}
                                        >
                                                <span class="text-sm font-semibold">{banner.name}</span>
                                                <span class="text-xs text-secondary">{banner.description}</span>
                                        </button>
                                {/each}
                        </div>

                        <!-- Pity meter -->
                        <div class="pity-section">
                                <div class="pity-header">
                                        <span class="text-xs text-secondary">UR Pity</span>
                                        <span class="text-xs" class:text-gold={isSoftPity}>{pityDisplay}</span>
                                </div>
                                <div class="pity-bar">
                                        <div class="pity-fill" class:soft-pity={isSoftPity} style="width: {pityProgress}%"></div>
                                </div>
                                {#if isSoftPity}
                                        <span class="text-xs text-gold">Soft pity active — increased UR rates!</span>
                                {/if}
                        </div>

                        <!-- Rates display -->
                        <div class="rates-section card">
                                <h4 class="text-xs font-bold">Rates</h4>
                                <div class="rates-grid mt-sm">
                                        <div class="rate-item">
                                                <span class="badge badge-UR">UR</span>
                                                <span class="text-xs">{selectedBanner.rates.UR}%</span>
                                        </div>
                                        <div class="rate-item">
                                                <span class="badge badge-SSR">SSR</span>
                                                <span class="text-xs">{selectedBanner.rates.SSR}%</span>
                                        </div>
                                        <div class="rate-item">
                                                <span class="badge badge-SR">SR</span>
                                                <span class="text-xs">{selectedBanner.rates.SR}%</span>
                                        </div>
                                        <div class="rate-item">
                                                <span class="badge badge-R">R</span>
                                                <span class="text-xs">{selectedBanner.rates.R}%</span>
                                        </div>
                                </div>
                        </div>

                        <!-- Balance -->
                        <div class="balance-section">
                                <span class="text-xs text-muted">{getCostLabel()}: {getBalance().toLocaleString()}</span>
                        </div>

                        <!-- Pull buttons -->
                        <div class="pull-buttons">
                                <button
                                        class="btn btn-primary pull-btn"
                                        onclick={() => doPull('single')}
                                        disabled={isPulling || !singleCost.affordable}
                                >
                                        <span class="pull-label">Pull x1</span>
                                        <span class="pull-cost">{selectedBanner.singleCost} {getCostLabel()}</span>
                                </button>

                                <button
                                        class="btn btn-gold pull-btn"
                                        onclick={() => doPull('ten')}
                                        disabled={isPulling || !tenCost.affordable}
                                >
                                        <span class="pull-label">Pull x10</span>
                                        <span class="pull-cost">{selectedBanner.tenCost} {getCostLabel()}</span>
                                </button>
                        </div>

                        {#if isPulling}
                                <div class="pulling-overlay">
                                        <p class="text-sm text-secondary">Pulling...</p>
                                </div>
                        {/if}
                </div>
        {:else if currentResult}
                <!-- Result reveal -->
                <div class="result-screen anim-fade-in">
                        <div class="result-counter text-xs text-muted">
                                {resultIndex + 1}{#if pullResults} / {pullResults.length}{/if}
                        </div>

                        <div class="result-portrait art-portrait card card-rarity-{currentResult.rarity}"
                                style="background-image: url('{currentResult.portraitUrl}')">
                        </div>

                        {#if currentResult.isNew}
                                <span class="new-badge badge badge-UR">NEW!</span>
                        {/if}
                        {#if currentResult.isFeatured}
                                <span class="featured-badge badge" style="background: rgba(251, 191, 36, 0.2); color: var(--c-accent-gold);">PICKUP</span>
                        {/if}

                        <h3 class="result-name text-lg font-bold">{currentResult.name}</h3>
                        <span class="badge badge-{currentResult.rarity}">{currentResult.rarity}</span>

                        <div class="result-actions">
                                {#if hasMoreResults}
                                        <button class="btn btn-primary btn-block" onclick={nextResult}>
                                                Next
                                        </button>
                                {:else}
                                        <button class="btn btn-primary btn-block" onclick={closeResults}>
                                                Done
                                        </button>
                                {/if}
                        </div>
                </div>
        {/if}
</div>

<style>
        .gacha-content {
                display: flex;
                flex-direction: column;
                padding: var(--sp-xl);
                gap: var(--sp-xl);
        }

        .page-title {
                font-size: 18px;
                font-weight: 700;
        }

        /* Banner tabs */
        .banner-tabs {
                display: flex;
                gap: var(--sp-sm);
        }

        .banner-tab {
                flex: 1;
                padding: var(--sp-md);
                text-align: left;
                display: flex;
                flex-direction: column;
                gap: 2px;
                transition: all var(--t-fast);
        }

        .banner-tab.selected {
                border-color: var(--c-accent-blue);
                background: rgba(66, 165, 245, 0.05);
        }

        .banner-tab:active {
                transform: scale(0.98);
        }

        /* Pity */
        .pity-section {
                display: flex;
                flex-direction: column;
                gap: var(--sp-xs);
        }

        .pity-header {
                display: flex;
                justify-content: space-between;
        }

        .pity-bar {
                width: 100%;
                height: 6px;
                background: var(--c-bg-tertiary);
                border-radius: var(--r-full);
                overflow: hidden;
        }

        .pity-fill {
                height: 100%;
                background: var(--c-accent-blue);
                border-radius: var(--r-full);
                transition: width 0.3s ease;
        }

        .pity-fill.soft-pity {
                background: linear-gradient(90deg, var(--c-accent-gold), var(--c-accent-red));
        }

        .text-gold { color: var(--c-accent-gold); }

        /* Rates */
        .rates-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: var(--sp-sm);
        }

        .rate-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--sp-xs);
        }

        .mt-sm { margin-top: var(--sp-sm); }

        /* Balance */
        .balance-section {
                text-align: center;
        }

        /* Pull buttons */
        .pull-buttons {
                display: flex;
                flex-direction: column;
                gap: var(--sp-sm);
        }

        .pull-btn {
                display: flex;
                justify-content: space-between;
                padding: var(--sp-lg) var(--sp-xl);
        }

        .pull-label {
                font-weight: 700;
        }

        .pull-cost {
                font-size: 12px;
                opacity: 0.8;
        }

        .pulling-overlay {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(10, 14, 26, 0.7);
                z-index: 50;
        }

        /* Result screen */
        .result-screen {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: var(--sp-2xl);
                gap: var(--sp-lg);
                position: relative;
                z-index: 1;
        }

        .result-counter {
                margin-bottom: var(--sp-md);
        }

        .result-portrait {
                width: 200px;
                height: 250px;
        }

        .new-badge, .featured-badge {
                font-size: 13px;
        }

        .result-name {
                text-align: center;
        }

        .result-actions {
                width: 100%;
                margin-top: var(--sp-xl);
        }
</style>
