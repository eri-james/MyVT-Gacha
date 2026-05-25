<script lang="ts">
        import { goto } from '$app/navigation';
        import { gameStore } from '$lib/stores';
        import { formatNumber } from '$lib/utils/format';

        const currencies = $derived(gameStore.currencies);
</script>

<div class="fixed top-0 left-0 right-0 z-50 px-3 pt-2 safe-top">
        <div class="glass-strong flex items-center justify-between px-3 py-2 text-xs sm:text-sm">
                <!-- Logo / Title -->
                <div class="flex items-center gap-2">
                        <span
                                class="font-bold text-sm sm:text-base bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
                        >
                                MyVT
                        </span>
                </div>

                <!-- Currencies -->
                <div class="flex items-center gap-3">
                        <!-- VGems -->
                        <div class="flex items-center gap-1" title="VGems">
                                <span class="text-purple-400">&#9670;</span>
                                <span class="text-white font-medium">{formatNumber(currencies.vgems)}</span>
                        </div>

                        <!-- VRinggit -->
                        <div class="flex items-center gap-1" title="VRinggit">
                                <span class="text-green-400">&#9679;</span>
                                <span class="text-white font-medium">{formatNumber(currencies.vringgit)}</span>
                        </div>

                        <!-- Tickets -->
                        <div class="flex items-center gap-1" title="Tickets">
                                <span class="text-blue-400">&#9632;</span>
                                <span class="text-white font-medium">{currencies.myTicket.blue}</span>
                                {#if currencies.myTicket.red > 0}
                                        <span class="text-white/20 mx-px">|</span>
                                        <span class="text-red-400">&#9632;</span>
                                        <span class="text-white font-medium">{currencies.myTicket.red}</span>
                                {/if}
                        </div>

                        <!-- LiveCache -->
                        <div class="flex items-center gap-1" title="LiveCache">
                                <span class="text-cyan-400">&#9654;</span>
                                <span class="text-white font-medium">{formatNumber(Math.floor(currencies.liveCache))}</span>
                        </div>

                        <!-- Settings -->
                        <button
                                onclick={() => goto('/settings')}
                                class="text-white/40 hover:text-white/70 transition-colors p-1 -mr-1"
                                aria-label="Settings"
                        >
                                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>
                        </button>
                </div>
        </div>
</div>
