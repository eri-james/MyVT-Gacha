<script lang="ts">
        import { useGame } from '$lib/stores/context';

        const game = useGame();
        let gameState = $derived(game.gameState);
        let navigateTo = game.navigateTo;

        let hasActiveRun = $derived(gameState.liveon !== null && gameState.liveon.phase === 'running');
</script>

<div class="page anim-fade-in">
        <!-- Background -->
        <div class="home-hero art-bg"></div>

        <div class="home-content">
                <!-- Title -->
                <div class="home-header">
                        <div>
                                <h1 class="home-title">MyVT Gacha</h1>
                                <p class="home-subtitle text-secondary">Collection & Training</p>
                        </div>
                </div>

                <!-- Quick stats -->
                <div class="home-stats">
                        <div class="stat-card">
                                <span class="text-muted text-xs">Collection</span>
                                <span class="text-lg font-bold">{Object.keys(gameState.collection).length}</span>
                        </div>
                        <div class="stat-card">
                                <span class="text-muted text-xs">Roster</span>
                                <span class="text-lg font-bold">{gameState.roster.length}<span class="text-muted text-xs"> / 70</span></span>
                        </div>
                        <div class="stat-card">
                                <span class="text-muted text-xs">VGems</span>
                                <span class="text-lg font-bold text-gold">{gameState.currencies.vgems.toLocaleString()}</span>
                        </div>
                </div>

                <!-- Game mode entry points -->
                <div class="home-modes">
                        <button class="mode-card" onclick={() => navigateTo('liveon')}>
                                <div class="mode-art art-icon"></div>
                                <div class="mode-info">
                                        <span class="text-md font-semibold">Live!ON</span>
                                        {#if hasActiveRun}
                                                <span class="text-xs text-gold">Run in Progress — Cycle {gameState.liveon?.cycle}/4</span>
                                        {:else}
                                                <span class="text-xs text-secondary">Training Simulator</span>
                                        {/if}
                                </div>
                                {#if hasActiveRun}
                                        <span class="badge badge-UR" style="align-self: center;">RESUME</span>
                                {:else}
                                        <span class="mode-arrow text-muted">&#x203A;</span>
                                {/if}
                        </button>

                        <button class="mode-card" disabled>
                                <div class="mode-art art-icon"></div>
                                <div class="mode-info">
                                        <span class="text-md font-semibold">AlgoBrawl</span>
                                        <span class="text-xs text-muted">Coming Soon</span>
                                </div>
                                <span class="badge badge-SR" style="align-self: center;">SOON</span>
                        </button>
                </div>

                <!-- Settings -->
                <div class="home-footer">
                        <button class="settings-link" onclick={() => navigateTo('settings')}>
                                <span class="art-icon settings-icon"></span>
                                <span class="text-sm text-secondary">Settings</span>
                        </button>
                </div>
        </div>
</div>

<style>
        .page { position: relative; }

        .home-hero {
                position: absolute;
                inset: 0;
                background: linear-gradient(180deg, var(--c-bg-secondary) 0%, var(--c-bg-primary) 50%);
        }

        .home-content {
                position: relative;
                z-index: 1;
        }

        .home-header {
                padding-top: var(--sp-3xl);
        }

        .home-title {
                font-size: 28px;
                font-weight: 800;
                letter-spacing: 0.02em;
                text-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
        }

        .home-subtitle {
                font-size: 13px;
                margin-top: var(--sp-xs);
        }

        .home-stats {
                display: flex;
                gap: var(--sp-md);
                margin-top: var(--sp-2xl);
        }

        .stat-card {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--sp-xs);
                padding: var(--sp-md);
                background: var(--c-surface);
                border: 1px solid var(--c-border-light);
                border-radius: var(--r-md);
        }

        .home-modes {
                display: flex;
                flex-direction: column;
                gap: var(--sp-md);
                margin-top: var(--sp-2xl);
        }

        .mode-card {
                display: flex;
                align-items: center;
                gap: var(--sp-lg);
                padding: var(--sp-lg);
                background: var(--c-surface);
                border: 1px solid var(--c-border);
                border-radius: var(--r-lg);
                transition: background var(--t-fast);
                width: 100%;
                text-align: left;
        }

        .mode-card:not(:disabled):active {
                background: var(--c-surface-hover);
        }

        .mode-card:disabled {
                opacity: 0.5;
        }

        .mode-art {
                width: 48px;
                height: 48px;
                flex-shrink: 0;
        }

        .mode-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 2px;
        }

        .mode-arrow {
                font-size: 20px;
                font-weight: 300;
        }

        .home-footer {
                margin-top: var(--sp-3xl);
        }

        .settings-link {
                display: flex;
                align-items: center;
                gap: var(--sp-sm);
                margin-left: auto;
                padding: var(--sp-sm) var(--sp-md);
                border-radius: var(--r-md);
                transition: background var(--t-fast);
        }

        .settings-link:active {
                background: var(--c-surface);
        }

        .settings-icon {
                width: 18px;
                height: 18px;
        }
</style>
