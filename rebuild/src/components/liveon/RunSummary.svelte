<script lang="ts">
        import type { LiveonRun, RosterEntry } from '$lib/types';
        import { STAT_LABELS, TRAINABLE_STATS } from '$lib/types';

        interface Props {
                run: LiveonRun;
                rosterEntry: RosterEntry | null;
                oncollect: () => void;
                onhome: () => void;
        }

        let { run, rosterEntry, oncollect, onhome }: Props = $props();

        let result = $derived(run.result);

        let gradeColors: Record<string, string> = {
                'S': '#fbbf24',
                'A': '#66bb6a',
                'B': '#60a5fa',
                'C': '#9ca3af'
        };
</script>

<div class="summary-screen anim-fade-in">
        {#if result}
                <!-- Grade reveal -->
                <div class="grade-reveal">
                        <div class="grade-badge" style="color: {gradeColors[result.grade]}; border-color: {gradeColors[result.grade]};">
                                <span class="grade-letter">{result.grade}</span>
                        </div>
                        <h2 class="summary-title">Run Complete!</h2>
                        <span class="ending-label text-sm text-secondary">
                                {#if result.ending === 'perfect'}Perfect Ending
                                {:else if result.ending === 'good'}Good Ending
                                {:else}Decent Ending
                                {/if}
                        </span>
                </div>

                <!-- Stats summary -->
                <div class="stats-summary card">
                        <div class="summary-row">
                                <span class="text-xs text-muted">Total Hype</span>
                                <span class="text-lg font-bold text-gold">{result.totalHype}</span>
                        </div>
                        <div class="summary-divider"></div>
                        {#each TRAINABLE_STATS as stat}
                                <div class="summary-row">
                                        <span class="text-xs text-secondary">{STAT_LABELS[stat]}</span>
                                        <span class="text-sm font-semibold">{run.currentStats[stat]}</span>
                                </div>
                        {/each}
                </div>

                <!-- Rewards -->
                <div class="rewards-section">
                        <h3 class="section-title text-sm font-bold">Rewards</h3>
                        <div class="rewards-grid">
                                <div class="reward-item">
                                        <span class="text-xs text-muted">VGems</span>
                                        <span class="text-gold font-bold">+{result.rewards.vgems}</span>
                                </div>
                                <div class="reward-item">
                                        <span class="text-xs text-muted">VRinggit</span>
                                        <span class="text-accent font-bold">+{result.rewards.vringgit}</span>
                                </div>
                                <div class="reward-item">
                                        <span class="text-xs text-muted">LiveCache</span>
                                        <span class="text-secondary font-bold">+{result.rewards.livecache}</span>
                                </div>
                        </div>
                </div>

                <!-- Sparks output -->
                {#if result.sparksOut}
                        <div class="sparks-section card">
                                <h3 class="section-title text-sm font-bold">Sparks Inherited</h3>
                                <p class="text-xs text-secondary mt-sm">These sparks will boost your next run with this VTuber.</p>
                                <div class="sparks-display mt-md">
                                        <div class="spark-item">
                                                <span class="spark-quality">
                                                        {#each Array(result.quality) as _}
                                                                &#9733;
                                                        {/each}
                                                </span>
                                                <span class="text-sm">+{result.sparksOut.value1} {STAT_LABELS[result.sparksOut.stat1]}</span>
                                        </div>
                                        <div class="spark-item">
                                                <span class="spark-quality">
                                                        {#each Array(result.quality) as _}
                                                                &#9733;
                                                        {/each}
                                                </span>
                                                <span class="text-sm">+{result.sparksOut.value2} {STAT_LABELS[result.sparksOut.stat2]}</span>
                                        </div>
                                </div>
                        </div>
                {/if}

                <!-- Action buttons -->
                <div class="actions">
                        <button class="btn btn-gold btn-block" onclick={oncollect}>
                                Add to Roster
                        </button>
                        <button class="btn btn-secondary btn-block" onclick={onhome}>
                                Return Home
                        </button>
                </div>
        {/if}
</div>

<style>
        .summary-screen {
                display: flex;
                flex-direction: column;
                padding: var(--sp-xl);
                align-items: center;
        }

        /* Grade reveal */
        .grade-reveal {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--sp-sm);
                margin-bottom: var(--sp-2xl);
                padding-top: var(--sp-xl);
        }

        .grade-badge {
                width: 80px;
                height: 80px;
                border-radius: var(--r-full);
                border: 3px solid;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0, 0, 0, 0.3);
        }

        .grade-letter {
                font-size: 40px;
                font-weight: 800;
        }

        .summary-title {
                font-size: 22px;
                font-weight: 700;
        }

        .text-gold { color: var(--c-accent-gold); }
        .text-accent { color: var(--c-accent-blue); }

        /* Stats summary */
        .stats-summary {
                width: 100%;
                padding: var(--sp-lg);
                margin-bottom: var(--sp-xl);
        }

        .summary-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--sp-xs) 0;
        }

        .summary-divider {
                height: 1px;
                background: var(--c-border);
                margin: var(--sp-sm) 0;
        }

        /* Rewards */
        .rewards-section {
                width: 100%;
                margin-bottom: var(--sp-xl);
        }

        .section-title {
                margin-bottom: var(--sp-md);
        }

        .rewards-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: var(--sp-sm);
        }

        .reward-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--sp-xs);
                padding: var(--sp-md);
                background: var(--c-surface);
                border-radius: var(--r-md);
                border: 1px solid var(--c-border-light);
        }

        /* Sparks */
        .sparks-section {
                width: 100%;
                padding: var(--sp-lg);
                margin-bottom: var(--sp-xl);
        }

        .sparks-display {
                display: flex;
                flex-direction: column;
                gap: var(--sp-sm);
        }

        .spark-item {
                display: flex;
                align-items: center;
                gap: var(--sp-sm);
                padding: var(--sp-sm);
                background: rgba(251, 191, 36, 0.05);
                border-radius: var(--r-sm);
        }

        .spark-quality {
                color: var(--c-accent-gold);
                font-size: 12px;
                letter-spacing: 2px;
        }

        .mt-sm { margin-top: var(--sp-sm); }
        .mt-md { margin-top: var(--sp-md); }

        /* Actions */
        .actions {
                width: 100%;
                display: flex;
                flex-direction: column;
                gap: var(--sp-sm);
                margin-top: auto;
        }
</style>
