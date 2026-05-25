<script lang="ts">
        import { goto } from '$app/navigation';
        import { page } from '$app/stores';
        import type { PageId } from '$lib/stores';

        type Tab = {
                id: PageId;
                label: string;
                icon: string;
                route: string;
        };

        const tabs: Tab[] = [
                { id: 'home', label: 'Home', icon: 'home', route: '/' },
                { id: 'collection', label: 'Roster', icon: 'collection', route: '/collection' },
                { id: 'gacha', label: 'Gacha', icon: 'gacha', route: '/gacha' },
                { id: 'liveon', label: 'Live!ON', icon: 'liveon', route: '/liveon' },
                { id: 'toss', label: 'Toss', icon: 'toss', route: '/toss' }
        ];

        function navigate(tab: Tab) {
                goto(tab.route);
        }

        function isActive(tab: Tab): boolean {
                if (tab.id === 'home') return $page.url.pathname === '/';
                return $page.url.pathname.startsWith(tab.route);
        }
</script>

<nav class="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
        <div class="glass-strong mx-2 mb-1 rounded-xl">
                <div class="flex items-center justify-around py-1 px-1">
                        {#each tabs as tab}
                                <button
                                        onclick={() => navigate(tab)}
                                        class="flex flex-col items-center justify-center flex-1 py-1.5 rounded-lg transition-all duration-200
                                        {isActive(tab)
                                                ? 'text-blue-400 bg-white/5'
                                                : 'text-white/40 hover:text-white/70 hover:bg-white/3'}"
                                        aria-label={tab.label}
                                >
                                        <!-- Inline SVG icons -->
                                        {#if tab.icon === 'home'}
                                                <svg
                                                        class="w-5 h-5"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        stroke-width="2"
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                >
                                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                        <polyline points="9 22 9 12 15 12 15 22" />
                                                </svg>

                                        {:else if tab.icon === 'collection'}
                                                <svg
                                                        class="w-5 h-5"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        stroke-width="2"
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                >
                                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                        <circle cx="9" cy="7" r="4" />
                                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                                </svg>

                                        {:else if tab.icon === 'gacha'}
                                                <svg
                                                        class="w-5 h-5"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        stroke-width="2"
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                >
                                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                </svg>

                                        {:else if tab.icon === 'liveon'}
                                                <svg
                                                        class="w-5 h-5"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        stroke-width="2"
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                >
                                                        <polygon points="23 7 16 12 23 17 23 7" />
                                                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                                </svg>

                                        {:else if tab.icon === 'toss'}
                                                <svg
                                                        class="w-5 h-5"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        stroke-width="2"
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                >
                                                        <line x1="12" y1="1" x2="12" y2="23" />
                                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                                </svg>
                                        {/if}
                                        <span class="text-[10px] mt-0.5">{tab.label}</span>
                                </button>
                        {/each}
                </div>
        </div>
</nav>
