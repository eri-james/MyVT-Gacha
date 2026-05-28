<script lang="ts">
        import { useGame } from '$lib/stores/context';

        const game = useGame();
        let gameState = $derived(game.gameState);

        interface Props {
                onclose: () => void;
        }

        let { onclose }: Props = $props();
</script>

<div class="page anim-fade-in">
        <div class="page-content">
                <div class="page-header">
                        <button class="back-btn" onclick={onclose}>
                                <span class="back-arrow text-muted">&#x2039;</span>
                        </button>
                        <h2 class="page-title">Settings</h2>
                </div>

                <div class="settings-list">
                        <div class="settings-section">
                                <span class="text-xs text-muted settings-label">ACCOUNT</span>
                                <div class="settings-item">
                                        <span class="text-sm">Player ID</span>
                                        <span class="text-xs text-secondary selectable">{gameState.playerId.slice(0, 8)}</span>
                                </div>
                        </div>

                        <div class="settings-section">
                                <span class="text-xs text-muted settings-label">DATA</span>
                                <div class="settings-item">
                                        <span class="text-sm">Account created</span>
                                        <span class="text-xs text-secondary">{new Date(gameState.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div class="settings-item">
                                        <span class="text-sm">Last saved</span>
                                        <span class="text-xs text-secondary">
                                                {gameState.lastSaveAt ? new Date(gameState.lastSaveAt).toLocaleString() : 'Never'}
                                        </span>
                                </div>
                                <div class="settings-item">
                                        <span class="text-sm">Collection size</span>
                                        <span class="text-xs text-secondary">{Object.keys(gameState.collection).length} characters</span>
                                </div>
                                <div class="settings-item">
                                        <span class="text-sm">Roster size</span>
                                        <span class="text-xs text-secondary">{gameState.roster.length} / 70</span>
                                </div>
                        </div>

                        <div class="settings-section">
                                <span class="text-xs text-muted settings-label">VERSION</span>
                                <div class="settings-item">
                                        <span class="text-sm">Save version</span>
                                        <span class="text-xs text-secondary">v1</span>
                                </div>
                        </div>
                </div>
        </div>
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
                margin-bottom: var(--sp-xl);
        }

        .back-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                border-radius: var(--r-md);
                transition: background var(--t-fast);
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

        .settings-list {
                display: flex;
                flex-direction: column;
                gap: var(--sp-xl);
        }

        .settings-section {
                display: flex;
                flex-direction: column;
                gap: var(--sp-sm);
        }

        .settings-label {
                letter-spacing: 0.08em;
                font-weight: 600;
                margin-bottom: var(--sp-xs);
        }

        .settings-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--sp-md) var(--sp-lg);
                background: var(--c-surface);
                border: 1px solid var(--c-border-light);
                border-radius: var(--r-md);
        }
</style>
