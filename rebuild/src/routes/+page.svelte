<script lang="ts">
        import { gameStore } from '$lib/stores';
        import { formatNumber } from '$lib/utils/format';
        import { loadCharacters, getBySlug, getImageUrl } from '$lib/data/characters';

        const username = $derived(gameStore.state.username);
        const ownedCount = $derived(gameStore.ownedCount);
        const totalPower = $derived(gameStore.totalPower);

        let featuredChar = $state<{ name: string; slug: string; image: string } | null>(null);
        let charactersLoaded = $state(false);

        async function loadFeatured() {
                await loadCharacters();
                charactersLoaded = true;
                const slug = gameStore.state.featuredVtuber;
                if (slug) {
                        const char = getBySlug(slug);
                        if (char) {
                                featuredChar = { name: char.name, slug: char.slug, image: getImageUrl(char.slug) };
                        }
                }
        }

        loadFeatured();
</script>

<div class="flex flex-col items-center gap-8 pt-8 animate-fade-in">
        <!-- Title -->
        <div class="text-center">
                <h1
                        class="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2"
                >
                        MyVT Gacha
                </h1>
                <p class="text-white/50 text-sm">
                        Welcome back, {username}
                </p>
        </div>

        <!-- Stats Summary -->
        <div class="w-full glass p-4 rounded-xl">
                <h2 class="text-sm font-semibold text-white/70 mb-3">Agency Overview</h2>
                <div class="grid grid-cols-2 gap-3">
                        <div class="glass p-3 rounded-lg text-center">
                                <div class="text-2xl font-bold text-blue-400">{ownedCount}</div>
                                <div class="text-xs text-white/50">VTubers</div>
                        </div>
                        <div class="glass p-3 rounded-lg text-center">
                                <div class="text-2xl font-bold text-purple-400">{formatNumber(totalPower)}</div>
                                <div class="text-xs text-white/50">Total Power</div>
                        </div>
                        <div class="glass p-3 rounded-lg text-center">
                                <div class="text-2xl font-bold text-green-400">Lv.{gameStore.state.studio.level}</div>
                                <div class="text-xs text-white/50">Studio</div>
                        </div>
                        <div class="glass p-3 rounded-lg text-center">
                                <div class="text-2xl font-bold text-cyan-400"
                                        >Lv.{gameStore.state.producerLevel.level}</div
                                >
                                <div class="text-xs text-white/50">Producer</div>
                        </div>
                </div>
        </div>

        <!-- Featured VTuber -->
        {#if featuredChar}
                <div class="w-full glass p-4 rounded-xl">
                        <h2 class="text-sm font-semibold text-white/70 mb-3">Featured VTuber</h2>
                        <div class="flex items-center gap-4">
                                <img
                                        src={featuredChar.image}
                                        alt={featuredChar.name}
                                        class="w-16 h-16 rounded-full object-cover ring-2 ring-purple-400/50"
                                        onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <div>
                                        <div class="font-semibold text-white">{featuredChar.name}</div>
                                        <div class="text-xs text-white/50">Featured on your homepage</div>
                                </div>
                        </div>
                </div>
        {/if}

        <!-- Quick Actions -->
        <div class="w-full grid grid-cols-2 gap-3">
                <button
                        onclick={() => (gameStore.state.featuredVtuber = null)}
                        class="glass p-3 rounded-xl text-center hover:bg-white/10 transition-colors"
                >
                        <div class="text-lg mb-1">&#9733;</div>
                        <div class="text-xs text-white/70">Pull Gacha</div>
                </button>
                <button class="glass p-3 rounded-xl text-center hover:bg-white/10 transition-colors">
                        <div class="text-lg mb-1">&#9654;</div>
                        <div class="text-xs text-white/70">Start Live!ON</div>
                </button>
        </div>
</div>
