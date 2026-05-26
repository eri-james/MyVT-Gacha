<script lang="ts">
        import { useGame } from '$lib/stores/context';
        import { loadCharacters } from '$lib/data/characters';
        import type { CharacterData } from '$lib/types';

        const { navigateTo } = useGame();

        let characters = $state<CharacterData[]>([]);
        let isLoading = $state(true);

        $effect(() => {
                loadCharacters().then(data => {
                        characters = data;
                        isLoading = false;
                });
        });

        function goBack() {
                navigateTo('collection');
        }
</script>

<div class="page anim-fade-in">
        <div class="page-content">
                <div class="page-header">
                        <button class="back-btn" onclick={goBack}>
                                <span class="back-arrow text-muted">&#x2039;</span>
                        </button>
                        <h2 class="page-title">Roster</h2>
                        <span class="text-xs text-secondary">{0} / 70</span>
                </div>

                {#if isLoading}
                        <div class="empty-state">
                                <p class="text-secondary">Loading...</p>
                        </div>
                {:else}
                        <div class="empty-state">
                                <div class="empty-icon art-icon"></div>
                                <p class="text-secondary text-sm mt-md">No trained VTubers yet</p>
                                <p class="text-muted text-xs mt-sm">Complete Live!ON runs to train VTubers for your roster</p>
                        </div>
                {/if}
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
</style>
