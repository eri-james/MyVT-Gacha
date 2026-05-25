<script lang="ts">
        import { liveonStore } from '$lib/stores';
        import LiveonSetup from '$components/liveon/LiveonSetup.svelte';
        import CampaignView from '$components/liveon/CampaignView.svelte';
        import RunSummary from '$components/liveon/RunSummary.svelte';
        import PageHint from '$components/PageHint.svelte';

        // Derived state for routing
        const run = $derived(liveonStore.run);
        const hasActiveRun = $derived(run.active);
        const hasResults = $derived(!run.active && run.ending !== null);
        const isNew = $derived(!run.active && run.ending === null && run.turn === 0);



        function handleReturnToSetup() {
                liveonStore.reset();
        }
</script>

<div class="animate-fade-in">
        {#if hasActiveRun}
                <CampaignView />
        {:else if hasResults}
                <RunSummary onback={handleReturnToSetup} />
        {:else}
                <!-- LiveON Page Hint -->
                <PageHint
                        step="liveonHint"
                        title="Live!ON Training"
                        body="Select a lead VTuber and up to 3 coaches, then start a 16-turn training campaign. Each cycle focuses on a different stat. Beat Algorithm War checkpoints to grade your run."
                        icon="liveon"
                />
                <LiveonSetup />
        {/if}
</div>
