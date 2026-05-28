<script lang="ts">
        import type { PageId } from '$lib/types';
        import { useGame } from '$lib/stores/context';
        import ResourceBar from '$components/layout/ResourceBar.svelte';
        import HomePage from '$components/pages/HomePage.svelte';
        import LiveonPage from '$components/pages/LiveonPage.svelte';
        import GachaPage from '$components/pages/GachaPage.svelte';
        import CollectionPage from '$components/pages/CollectionPage.svelte';
        import RosterPage from '$components/pages/RosterPage.svelte';
        import SettingsPage from '$components/pages/SettingsPage.svelte';

        const game = useGame();
        let currentPage = $derived(game.currentPage);
        let gameState = $derived(game.gameState);
        let navigateTo = game.navigateTo;

        // Show nav bar on main pages, hide on sub-pages
        const showNav = $derived(
                ['home', 'liveon', 'gacha', 'collection'].includes(currentPage)
        );
</script>

<div class="page-wrapper">
        <!-- Resource bar on all pages -->
        <ResourceBar currencies={gameState.currencies} />

        {#if currentPage === 'home'}
                <HomePage />
        {:else if currentPage === 'liveon'}
                <LiveonPage />
        {:else if currentPage === 'gacha'}
                <GachaPage />
        {:else if currentPage === 'collection'}
                <CollectionPage />
        {:else if currentPage === 'roster'}
                <RosterPage />
        {:else if currentPage === 'settings'}
                <SettingsPage onclose={() => navigateTo('home')} />
        {/if}
</div>

<style>
        .page-wrapper {
                position: relative;
                width: 100%;
                height: 100%;
        }
</style>
