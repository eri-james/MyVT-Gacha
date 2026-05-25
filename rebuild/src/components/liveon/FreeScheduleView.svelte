<script lang="ts">
        import type { ShopItem, FreeScheduleAction } from '$lib/types';
        import { LIVEON_PS_RECOVERY_REST } from '$lib/data/constants';

        interface Props {
                shopItems: ShopItem[];
                inRunCurrency: number;
                purchasedIds: Set<string>;
                onaction: (action: FreeScheduleAction) => void;
                onpurchase: (index: number) => void;
        }

        let { shopItems, inRunCurrency, purchasedIds, onaction, onpurchase }: Props = $props();
</script>

<div class="glass p-4 rounded-xl animate-slide-up">
        <div class="text-center mb-4">
                <div class="text-sm font-semibold text-purple-400 mb-1">Free Schedule</div>
                <p class="text-xs text-white/40">Choose how to spend this turn</p>
        </div>

        <!-- Main Actions -->
        <div class="flex flex-col gap-2 mb-4">
                <!-- Rest -->
                <button
                        onclick={() => onaction('rest')}
                        class="p-3 rounded-xl border border-green-500/20 bg-green-500/5 hover:bg-green-500/15 text-left transition-all active:scale-[0.98]"
                >
                        <div class="flex items-center gap-2">
                                <span class="text-lg">😴</span>
                                <div>
                                        <div class="text-sm font-bold text-green-300">Rest</div>
                                        <div class="text-[10px] text-white/40">Recover +{LIVEON_PS_RECOVERY_REST} PS. Skip this turn.</div>
                                </div>
                        </div>
                </button>

                <!-- Train (bonus practice stream) -->
                <button
                        onclick={() => onaction('train')}
                        class="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/15 text-left transition-all active:scale-[0.98]"
                >
                        <div class="flex items-center gap-2">
                                <span class="text-lg">💪</span>
                                <div>
                                        <div class="text-sm font-bold text-blue-300">Train (Bonus Stream)</div>
                                        <div class="text-[10px] text-white/40">Do another Practice Stream. Costs PS, earns hype & stats.</div>
                                </div>
                        </div>
                </button>

                <!-- Shop -->
                <button
                        onclick={() => onaction('shop')}
                        class="p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/15 text-left transition-all active:scale-[0.98]"
                >
                        <div class="flex items-center gap-2">
                                <span class="text-lg">🛒</span>
                                <div>
                                        <div class="text-sm font-bold text-yellow-300">Shop</div>
                                        <div class="text-[10px] text-white/40">Buy temporary buff items. Currency: {inRunCurrency} coins</div>
                                </div>
                        </div>
                </button>
        </div>

        <!-- Shop Items (expandable) -->
        <div class="border-t border-white/5 pt-3">
                <div class="text-[10px] text-white/30 mb-2">Available Items</div>
                <div class="flex flex-col gap-1.5">
                        {#each shopItems as item, i (item.id)}
                                {@const isPurchased = purchasedIds.has(item.id)}
                                <div class="flex items-center gap-2 p-2 rounded-lg bg-white/3 border border-white/5 {isPurchased ? 'opacity-40' : ''}">
                                        <div class="flex-1 min-w-0">
                                                <div class="text-xs text-white/70 truncate">{item.label}</div>
                                                <div class="text-[10px] text-white/30 truncate">{item.description}</div>
                                        </div>
                                        <button
                                                onclick={() => onpurchase(i)}
                                                disabled={inRunCurrency < item.cost || isPurchased}
                                                class="text-xs px-2 py-1 rounded-lg transition-all whitespace-nowrap
                                                {isPurchased
                                                        ? 'bg-white/3 text-white/20 cursor-not-allowed'
                                                        : inRunCurrency >= item.cost
                                                                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                                                : 'bg-white/3 text-white/20 cursor-not-allowed'}"
                                        >
                                                {isPurchased ? 'Sold' : `${item.cost}c`}
                                        </button>
                                </div>
                        {/each}
                        {#if shopItems.length === 0}
                                <p class="text-[10px] text-white/20 text-center py-2">No items available</p>
                        {/if}
                </div>
        </div>
</div>
