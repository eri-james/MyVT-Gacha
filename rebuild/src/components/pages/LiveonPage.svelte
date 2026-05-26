<script lang="ts">
        import { useGame } from '$lib/stores/context';

        const { navigateTo } = useGame();
</script>

<div class="page anim-fade-in">
        <div class="page-content">
                <h2 class="page-title">Live!ON</h2>
                <p class="text-secondary text-sm mt-md">Training Simulator</p>
                <div class="coming-soon">
                        <div class="coming-icon art-icon"></div>
                        <p class="text-secondary text-sm mt-lg">Live!ON setup coming in next update</p>
                        <p class="text-muted text-xs mt-sm">Train VTubers through cycles of Practice, Excursion, and more</p>
                </div>
        </div>
</div>

<style>
        .page-content {
                position: relative;
                z-index: 1;
        }

        .page-title {
                font-size: 18px;
                font-weight: 700;
        }

        .coming-soon {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: var(--sp-3xl) 0;
                text-align: center;
        }

        .coming-icon {
                width: 80px;
                height: 80px;
        }
</style>
