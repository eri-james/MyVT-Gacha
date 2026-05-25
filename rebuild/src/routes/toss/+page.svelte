<script lang="ts">
        import { gameStore } from '$lib/stores';
        import { formatNumber, formatDuration } from '$lib/utils/format';
        import {
                TOSS_BASE_ROUND_DURATION,
                TOSS_SUPER_MODE_DURATION,
                TOSS_BOOST_DECAY_RATE,
                TOSS_BUBBLE_BASE_SPEED,
                TOSS_GEM_REWARD_THRESHOLDS,
                TOSS_LIVECACHE_RATIO,
                TOSS_VRINGGIT_RATIO,
                TOSS_CHALLENGE_SCORE_THRESHOLD,
                MINIGAME_STAMINA_COST
        } from '$lib/data/constants';
        import { incrementQuestProgress } from '$lib/logic/quests';

        // ── Game States ──
        type Phase = 'idle' | 'playing' | 'super' | 'ended';

        let phase = $state<Phase>('idle');
        let score = $state(0);
        let timeLeft = $state(TOSS_BASE_ROUND_DURATION);
        let combo = $state(0);
        let maxCombo = $state(0);
        let totalTaps = $state(0);
        let boostMultiplier = $state(1);

        // ── Bubbles ──
        interface Bubble {
                id: number;
                x: number;        // % 0-100
                y: number;        // % 0-100 (starts near bottom, moves up)
                value: number;    // superchat value
                speed: number;    // px per tick
                size: number;     // diameter in px
                color: string;
                alive: boolean;
        }

        let bubbles = $state<Bubble[]>([]);
        let nextBubbleId = 0;
        let gameTimer: ReturnType<typeof setInterval> | null = null;
        let animFrame: number | null = null;
        let lastTime = 0;

        // ── Superchat value tiers ──
        const SC_TIERS = [
                { value: 1, color: '#5c6bc0', weight: 40, size: 36 },
                { value: 5, color: '#42a5f5', weight: 25, size: 40 },
                { value: 10, color: '#26c6da', weight: 15, size: 44 },
                { value: 50, color: '#66bb6a', weight: 10, size: 48 },
                { value: 100, color: '#ffca28', weight: 6, size: 52 },
                { value: 500, color: '#ffa726', weight: 3, size: 56 },
                { value: 1000, color: '#ef5350', weight: 1, size: 60 }
        ];

        // ── Derived ──
        const minigameData = $derived(gameStore.state.minigame);
        const stamina = $derived(gameStore.state.stamina.current);

        const canPlay = $derived(
                phase === 'idle' &&
                stamina >= MINIGAME_STAMINA_COST
        );

        // ── Rewards ──
        function calcRewards(finalScore: number) {
                const liveCache = Math.floor(finalScore * TOSS_LIVECACHE_RATIO);
                const vringgit = Math.floor(finalScore * TOSS_VRINGGIT_RATIO);
                let vgems = 0;
                for (const threshold of TOSS_GEM_REWARD_THRESHOLDS) {
                        if (finalScore >= threshold) vgems += 10;
                }
                return { liveCache, vringgit, vgems };
        }

        // ── Game Logic ──

        function pickTier(): typeof SC_TIERS[0] {
                const totalWeight = SC_TIERS.reduce((s, t) => s + t.weight, 0);
                let r = Math.random() * totalWeight;
                for (const tier of SC_TIERS) {
                        r -= tier.weight;
                        if (r <= 0) return tier;
                }
                return SC_TIERS[0];
        }

        function spawnBubble() {
                const tier = pickTier();
                const bubble: Bubble = {
                        id: nextBubbleId++,
                        x: 5 + Math.random() * 80,
                        y: 105,
                        value: tier.value,
                        speed: TOSS_BUBBLE_BASE_SPEED * (0.6 + Math.random() * 0.8) / 100,
                        size: tier.size,
                        color: tier.color,
                        alive: true
                };
                bubbles = [...bubbles, bubble];
        }

        function tapBubble(bubble: Bubble) {
                if (!bubble.alive || phase === 'ended') return;
                bubble.alive = false;
                bubbles = bubbles.filter(b => b.id !== bubble.id);

                const points = Math.round(bubble.value * boostMultiplier);
                score += points;
                totalTaps++;
                combo++;
                if (combo > maxCombo) maxCombo = combo;

                // Combo boost
                if (combo >= 10) {
                        boostMultiplier = Math.min(3, 1 + (combo - 9) * TOSS_BOOST_DECAY_RATE * 0.1);
                }
        }

        function missBubble(bubble: Bubble) {
                bubble.alive = false;
                bubbles = bubbles.filter(b => b.id !== bubble.id);
                combo = 0;
                boostMultiplier = Math.max(1, boostMultiplier - 0.5);
        }

        function startGame() {
                if (!canPlay) return;

                // Deduct stamina
                gameStore.deductStamina(MINIGAME_STAMINA_COST);

                // Reset state
                phase = 'playing';
                score = 0;
                timeLeft = TOSS_BASE_ROUND_DURATION;
                combo = 0;
                maxCombo = 0;
                totalTaps = 0;
                boostMultiplier = 1;
                bubbles = [];
                nextBubbleId = 0;
                lastTime = performance.now();

                // Spawn interval — start with one bubble every 800ms, accelerate
                let spawnInterval = 800;
                function scheduleNextSpawn() {
                        gameTimer = setTimeout(() => {
                                if (phase === 'ended') return;
                                timeLeft--;
                                spawnBubble();

                                // Accelerate spawns over time
                                if (timeLeft % 5 === 0 && spawnInterval > 300) {
                                        spawnInterval -= 50;
                                }

                                // Enter super mode in last N seconds
                                if (timeLeft === TOSS_SUPER_MODE_DURATION) {
                                        phase = 'super';
                                }

                                if (timeLeft <= 0) {
                                        endGame();
                                } else {
                                        scheduleNextSpawn();
                                }
                        }, spawnInterval);
                }
                scheduleNextSpawn();

                // Animation loop
                function animate(now: number) {
                        const dt = (now - lastTime) / 1000;
                        lastTime = now;

                        // Move bubbles up
                        const toRemove: Bubble[] = [];
                        for (const b of bubbles) {
                                if (!b.alive) continue;
                                b.y -= b.speed * dt * 60;
                                if (b.y < -10) {
                                        toRemove.push(b);
                                }
                        }
                        for (const b of toRemove) {
                                missBubble(b);
                        }

                        if (phase !== 'ended') {
                                animFrame = requestAnimationFrame(animate);
                        }
                }
                animFrame = requestAnimationFrame(animate);

                // Track daily plays
                gameStore.updateMinigame({
                        dailyPlays: gameStore.state.minigame.dailyPlays + 1,
                        lastPlayDate: new Date().toISOString().split('T')[0]
                });
        }

        function endGame() {
                phase = 'ended';
                if (gameTimer) { clearTimeout(gameTimer); gameTimer = null; }
                if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
                bubbles = [];

                // Update high score
                if (score > gameStore.state.minigame.highScore) {
                        gameStore.updateMinigame({ highScore: score });
                }

                        // Grant rewards
                const rewards = calcRewards(score);
                if (rewards.liveCache > 0) gameStore.addCurrency('liveCache', rewards.liveCache);
                if (rewards.vringgit > 0) gameStore.addCurrency('vringgit', rewards.vringgit);
                if (rewards.vgems > 0) gameStore.addCurrency('vgems', rewards.vgems);

                // Quest progress
                gameStore.setQuests(incrementQuestProgress(gameStore.state.quests, 'daily', 'daily_toss', 1));
                gameStore.setQuests(incrementQuestProgress(gameStore.state.quests, 'weekly', 'weekly_toss25', 1));

                gameStore.save();
        }

        function resetGame() {
                phase = 'idle';
                score = 0;
        }

        // Cleanup on destroy
        $effect(() => {
                return () => {
                        if (gameTimer) clearTimeout(gameTimer);
                        if (animFrame) cancelAnimationFrame(animFrame);
                };
        });
</script>

<div class="animate-fade-in">
        <!-- Header -->
        <div class="flex items-center justify-between mb-3">
                <h2 class="text-lg font-bold text-white">Superchat Toss</h2>
                {#if phase === 'idle'}
                        <span class="text-xs text-white/30">Cost: {MINIGAME_STAMINA_COST} stamina</span>
                {/if}
        </div>

        <!-- Stats Bar -->
        <div class="glass p-3 rounded-xl mb-3">
                <div class="grid grid-cols-3 gap-2 text-center">
                        <div>
                                <div class="text-lg font-bold text-cyan-400">{gameStore.state.minigame.highScore}</div>
                                <div class="text-[10px] text-white/40">High Score</div>
                        </div>
                        <div>
                                <div class="text-lg font-bold text-green-400">{gameStore.state.minigame.dailyPlays}</div>
                                <div class="text-[10px] text-white/40">Plays Today</div>
                        </div>
                        <div>
                                <div class="text-lg font-bold text-yellow-400">{TOSS_CHALLENGE_SCORE_THRESHOLD}</div>
                                <div class="text-[10px] text-white/40">Challenge Target</div>
                        </div>
                </div>
        </div>

        <!-- Game Area -->
        {#if phase === 'idle'}
                <!-- Idle State -->
                <div class="glass p-6 rounded-xl text-center">
                        <div class="text-4xl mb-4 opacity-40">$</div>
                        <p class="text-sm text-white/60 mb-1">Tap rising superchats to score!</p>
                        <p class="text-xs text-white/30 mb-4">
                                Build combos for multipliers. Last {TOSS_SUPER_MODE_DURATION}s = Super Mode!
                        </p>

                        {#if stamina < MINIGAME_STAMINA_COST}
                                <div class="glass p-3 rounded-lg mb-3">
                                        <div class="text-xs text-red-400">Not enough stamina</div>
                                        <div class="text-[10px] text-white/30">{stamina}/{MINIGAME_STAMINA_COST} required</div>
                                </div>
                        {:else}
                                <button
                                        onclick={startGame}
                                        class="w-full py-3 rounded-xl bg-green-500/20 text-green-400 font-semibold text-sm hover:bg-green-500/30 transition-colors active:scale-[0.97]"
                                >
                                        Start Toss
                                </button>
                        {/if}
                </div>

        {:else if phase === 'playing' || phase === 'super'}
                <!-- Active Game -->
                <div class="relative glass rounded-xl overflow-hidden" style="height: 400px;"
                        role="application"
                        aria-label="Superchat Toss game area"
                >
                        <!-- Background pulse for super mode -->
                        {#if phase === 'super'}
                                <div class="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none z-0"></div>
                        {/if}

                        <!-- HUD -->
                        <div class="absolute top-2 left-2 right-2 z-10 flex justify-between items-start pointer-events-none">
                                <div>
                                        <div class="text-2xl font-bold text-white">{formatNumber(score)}</div>
                                        {#if combo >= 5}
                                                <div class="text-xs text-yellow-400 font-semibold">x{combo} combo</div>
                                        {/if}
                                </div>
                                <div class="text-right">
                                        <div class="text-lg font-mono {timeLeft <= 5 ? 'text-red-400' : phase === 'super' ? 'text-red-400 font-bold' : 'text-white/80'}">
                                                {timeLeft}s
                                        </div>
                                        {#if boostMultiplier > 1}
                                                <div class="text-xs text-yellow-300 font-bold">x{boostMultiplier.toFixed(1)} boost</div>
                                        {/if}
                                </div>
                        </div>

                        <!-- Super mode banner -->
                        {#if phase === 'super'}
                                <div class="absolute top-12 left-0 right-0 text-center z-10 pointer-events-none">
                                        <span class="text-xs font-bold text-red-400 animate-pulse tracking-wider">SUPER MODE</span>
                                </div>
                        {/if}

                        <!-- Bubbles -->
                        {#each bubbles as bubble (bubble.id)}
                                {#if bubble.alive}
                                        <button
                                                class="absolute rounded-full flex items-center justify-center font-bold text-white shadow-lg transition-transform active:scale-90 select-none"
                                                style="
                                                        left: {bubble.x}%;
                                                        top: {bubble.y}%;
                                                        width: {bubble.size}px;
                                                        height: {bubble.size}px;
                                                        background: {bubble.color};
                                                        transform: translate(-50%, -50%);
                                                "
                                                onclick={() => tapBubble(bubble)}
                                        >
                                                <span class="text-[10px] leading-none">${bubble.value >= 100 ? formatNumber(bubble.value) : '$' + bubble.value}</span>
                                        </button>
                                {/if}
                        {/each}
                </div>

        {:else if phase === 'ended'}
                <!-- Results -->
                {@const rewards = calcRewards(score)}
                <div class="glass p-5 rounded-xl text-center animate-slide-up">
                        <div class="text-2xl font-bold text-white mb-1">Score: {formatNumber(score)}</div>
                        <div class="text-xs text-white/40 mb-4">
                                {score >= TOSS_CHALLENGE_SCORE_THRESHOLD ? 'Challenge Cleared!' : `Target: ${TOSS_CHALLENGE_SCORE_THRESHOLD}`}
                        </div>

                        <div class="grid grid-cols-2 gap-2 mb-4">
                                <div class="glass p-2.5 rounded-lg text-center">
                                        <div class="text-sm font-bold text-white">{totalTaps}</div>
                                        <div class="text-[10px] text-white/40">Taps</div>
                                </div>
                                <div class="glass p-2.5 rounded-lg text-center">
                                        <div class="text-sm font-bold text-yellow-400">x{maxCombo}</div>
                                        <div class="text-[10px] text-white/40">Best Combo</div>
                                </div>
                        </div>

                        <!-- Rewards -->
                        <div class="glass p-3 rounded-lg mb-4">
                                <div class="text-xs text-white/40 mb-2">Rewards</div>
                                <div class="flex justify-around">
                                        {#if rewards.vgems > 0}
                                                <div class="text-center">
                                                        <div class="text-sm font-bold text-cyan-400">+{rewards.vgems}</div>
                                                        <div class="text-[10px] text-white/30">VGems</div>
                                                </div>
                                        {/if}
                                        {#if rewards.liveCache > 0}
                                                <div class="text-center">
                                                        <div class="text-sm font-bold text-green-400">+{rewards.liveCache}</div>
                                                        <div class="text-[10px] text-white/30">LiveCache</div>
                                                </div>
                                        {/if}
                                        {#if rewards.vringgit > 0}
                                                <div class="text-center">
                                                        <div class="text-sm font-bold text-purple-400">+{rewards.vringgit}</div>
                                                        <div class="text-[10px] text-white/30">VRinggit</div>
                                                </div>
                                        {/if}
                                        {#if rewards.vgems === 0 && rewards.liveCache === 0 && rewards.vringgit === 0}
                                                <div class="text-xs text-white/25">No rewards</div>
                                        {/if}
                                </div>
                        </div>

                        <!-- Gem thresholds info -->
                        <div class="text-[10px] text-white/20 mb-4">
                                VGem thresholds: {TOSS_GEM_REWARD_THRESHOLDS.map(t => `${formatNumber(t)}=+10`).join(' | ')}
                        </div>

                        <button
                                onclick={resetGame}
                                class="w-full py-2.5 rounded-xl bg-white/5 text-white/70 font-semibold text-sm hover:bg-white/10 transition-colors"
                        >
                                Back
                        </button>
                </div>
        {/if}
</div>
