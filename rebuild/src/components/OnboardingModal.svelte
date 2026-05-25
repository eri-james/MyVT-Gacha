<script lang="ts">
        import { gameStore } from '$lib/stores';
        import { ONBOARDING_SCREENS, STARTER_COACHES } from '$lib/data/constants';

        const screens = ONBOARDING_SCREENS;
        const totalScreens = screens.length;

        let currentScreen = $state(0);
        let sliding = $state(false);
        let slideDir = $state<'next' | 'prev'>('next');

        function goNext() {
                if (currentScreen >= totalScreens - 1) return;
                slideDir = 'next';
                sliding = true;
                setTimeout(() => {
                        currentScreen++;
                        sliding = false;
                }, 200);
        }

        function goPrev() {
                if (currentScreen <= 0) return;
                slideDir = 'prev';
                sliding = true;
                setTimeout(() => {
                        currentScreen--;
                        sliding = false;
                }, 200);
        }

        function goTo(target: number) {
                if (target === currentScreen) return;
                slideDir = target > currentScreen ? 'next' : 'prev';
                sliding = true;
                setTimeout(() => {
                        currentScreen = target;
                        sliding = false;
                }, 200);
        }

        function finishOnboarding() {
                gameStore.grantStarterCoaches();
                gameStore.completeOnboardingStep('welcome');
        }

        const isLastScreen = $derived(currentScreen === totalScreens - 1);
        const isFirstScreen = $derived(currentScreen === 0);
        const screen = $derived(screens[currentScreen]);
        const isMentorScreen = $derived(currentScreen === 2);

        const iconColors: Record<string, string> = {
                star: 'text-yellow-400',
                campaign: 'text-purple-400',
                team: 'text-cyan-400',
                resources: 'text-green-400',
                rocket: 'text-pink-400'
        };
</script>

<div class="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4">
        <div
                class="max-w-sm w-full transition-all duration-200 {sliding
                        ? slideDir === 'next'
                                ? 'opacity-0 translate-x-8'
                                : 'opacity-0 -translate-x-8'
                        : 'opacity-100 translate-x-0'}"
        >
                <!-- Screen Content -->
                <div class="glass-strong p-6 rounded-2xl text-center">
                        <!-- Icon -->
                        {#if !isMentorScreen}
                                <div class="flex justify-center mb-5 {iconColors[screen.icon] || 'text-white/60'}">
                                        {#if screen.icon === 'star'}
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                        {:else if screen.icon === 'campaign'}
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                                        {:else if screen.icon === 'team'}
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                        {:else if screen.icon === 'resources'}
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                                        {:else if screen.icon === 'rocket'}
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
                                        {/if}
                                </div>
                        {:else}
                                <!-- Mentor avatar row -->
                                <div class="flex justify-center gap-3 mb-4">
                                        {#each STARTER_COACHES as coach}
                                                <div class="flex flex-col items-center gap-1">
                                                        <div
                                                                class="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 border-2 border-white/10 flex items-center justify-center text-lg font-bold text-white/80"
                                                        >
                                                                {coach.name.charAt(0)}
                                                        </div>
                                                        <span class="text-[10px] text-white/50 font-medium">{coach.name}</span>
                                                        <span class="text-[9px] rarity-text-sr">{coach.title}</span>
                                                </div>
                                        {/each}
                                </div>
                        {/if}

                        <!-- Title -->
                        <h2 class="text-xl font-bold text-white mb-3">{screen.title}</h2>

                        <!-- Body -->
                        <p class="text-sm text-white/60 leading-relaxed mb-5">{screen.body}</p>

                        {#if isMentorScreen}
                                <!-- Mentor detail cards -->
                                <div class="space-y-2 mb-5 text-left">
                                        {#each STARTER_COACHES as coach}
                                                <div class="glass p-3 rounded-lg flex items-start gap-3">
                                                        <div
                                                                class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white/80 shrink-0 mt-0.5"
                                                        >
                                                                {coach.name.charAt(0)}
                                                        </div>
                                                        <div class="min-w-0">
                                                                <div class="flex items-center gap-1.5">
                                                                        <span class="text-sm font-medium text-white">{coach.name}</span>
                                                                        <span class="text-[10px] rarity-text-sr">SR</span>
                                                                </div>
                                                                <div class="text-[11px] text-white/40 italic">{coach.tagline}</div>
                                                                <div class="text-[10px] text-cyan-400/80 mt-0.5">
                                                                        {coach.passive.label}: {coach.passive.desc}
                                                                </div>
                                                        </div>
                                                </div>
                                        {/each}
                                </div>
                        {/if}

                        <!-- Navigation Dots -->
                        <div class="flex items-center justify-center gap-2 mb-5" role="tablist" aria-label="Onboarding steps">
                                {#each screens as _, i}
                                        <button
                                                class="h-2 rounded-full transition-all duration-300 {i === currentScreen
                                                        ? 'bg-white w-6'
                                                        : 'bg-white/20 w-2'}"
                                                onclick={() => goTo(i)}
                                                role="tab"
                                                aria-selected={i === currentScreen}
                                                aria-label="Step {i + 1} of {totalScreens}"
                                                aria-current={i === currentScreen ? 'step' : undefined}
                                        ></button>
                                {/each}
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex gap-3">
                                {#if !isFirstScreen}
                                        <button
                                                onclick={goPrev}
                                                class="flex-1 py-3 rounded-xl bg-white/5 text-white/50 text-sm font-medium hover:bg-white/10 transition-colors"
                                        >
                                                Back
                                        </button>
                                {/if}

                                {#if isLastScreen}
                                        <button
                                                onclick={finishOnboarding}
                                                class="flex-[2] py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-bold hover:from-blue-400 hover:to-purple-400 active:scale-95 transition-all"
                                        >
                                                Start!
                                        </button>
                                {:else}
                                        <button
                                                onclick={goNext}
                                                class="flex-[2] py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors"
                                        >
                                                Next
                                        </button>
                                {/if}
                        </div>
                </div>

                <!-- Step counter -->
                <div class="text-center mt-3 text-[10px] text-white/20">
                        {currentScreen + 1} / {totalScreens}
                </div>
        </div>
</div>
