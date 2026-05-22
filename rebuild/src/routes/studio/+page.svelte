<script lang="ts">
        import { gameStore } from '$lib/stores';
        import { studioStore } from '$lib/stores';
        import { loadCharacters, getBySlug, getImageUrl } from '$lib/data/characters';
        import {
                getContentQuality,
                getTrendingTimeRemaining,
                calculateOfflineEarnings,
                addStudioExp,
                checkStudioLevelUp,
                recoverVTuberStamina
        } from '$lib/logic/studio';
        import { formatNumber, formatTimeAgo } from '$lib/utils/format';
        import {
                STATION_DEFS,
                STATION_UPGRADE_COSTS,
                STATION_MULTIPLIERS,
                STATION_LEVELS,
                CONTENT_TYPES,
                QUALITY_TIERS,
                CONTENT_LOG_MAX,
                CONTENT_INTERVAL,
                STAMINA_COSTS,
                RARITY_MULTIPLIERS,
                STUDIO_EXP_RATES,
                STUDIO_EXP_RARITY_MULT,
                STUDIO_FLAT_BONUS_PER_LEVEL,
                STUDIO_FLAT_BONUS_PRACTICE_HALL,
                OFFLINE_EARNINGS_CAP_HOURS
        } from '$lib/data/constants';
        import type {
                CharacterRecord,
                CharacterData,
                StationId,
                ContentEntry
        } from '$lib/types';

        let allChars = $state<CharacterRecord[]>([]);
        let charsLoaded = $state(false);

        // ── Derived State ──
        const studio = $derived(gameStore.studio);
        const studioLevel = $derived(studio.level);
        const studioExp = $derived(studio.exp);

        // EXP progress
        let expProgress = $derived.by(() => {
                const current = STATION_LEVELS.find((l) => l.level === studioLevel);
                const next = STATION_LEVELS.find((l) => l.level === studioLevel + 1);
                if (!next) return { pct: 100, current: studioExp, required: studioExp, isMax: true };
                return {
                        pct: Math.min(((studioExp - (current?.exp ?? 0)) / (next.exp - (current?.exp ?? 0))) * 100, 100),
                        current: studioExp,
                        required: next.exp,
                        prevRequired: current?.exp ?? 0,
                        isMax: false
                };
        });

        // Trending — read persisted value directly (no Math.random in derived)
        let trendingStat = $derived(studio.trendingStat ?? 'tc');
        let trendingTimeRemaining = $derived(getTrendingTimeRemaining(studio));

        // Station icon map
        const STATION_ICONS: Record<StationId, string> = {
                streamRoom: '🎬',
                creativeCorner: '🎨',
                practiceHall: '🎵',
                lounge: '☕'
        };

        // Station stat colors
        const STAT_COLORS: Record<string, string> = {
                st: '#66bb6a',
                ps: '#ff9800',
                tc: '#42a5f5',
                ch: '#ef5350',
                vc: '#00bcd4',
                mg: '#fbbf24'
        };

        const STATION_ORDER: StationId[] = ['streamRoom', 'creativeCorner', 'practiceHall', 'lounge'];

        // ── Content Timer ──
        let contentCountdown = $state(CONTENT_INTERVAL);
        let contentTimerInterval: ReturnType<typeof setInterval> | null = null;

        // ── Offline Earnings ──
        let hasOffline = $state(false);
        let offlineData = $state<{
                minutes: number;
                vgems: number;
                vringgit: number;
                liveCache: number;
                studioExp: number;
                contentPieces: number;
        } | null>(null);

        // ── Assign Modal State ──
        let showAssignModal = $state(false);
        let assignStationId: StationId | null = $state(null);
        let assignFilter = $state<'all' | 'unassigned'>('all');
        let assignSearch = $state('');

        // ── Content tick ──
        function contentTick() {
                if (!charsLoaded) return;
                const now = Date.now();

                // Persist trending assignment if expired
                if (!gameStore.state.studio.trendingStat || !gameStore.state.studio.trendingExpires || now >= gameStore.state.studio.trendingExpires) {
                        const trendableStats = ['tc', 'ch', 'vc', 'mg'];
                        const newTrending = trendableStats[Math.floor(Math.random() * trendableStats.length)];
                        gameStore.setStudio({
                                ...gameStore.state.studio,
                                trendingStat: newTrending,
                                trendingExpires: now + 2 * 60 * 60 * 1000
                        });
                }

                // Recover stamina for all assigned characters first
                for (const [sid, st] of Object.entries(gameStore.state.studio.stations)) {
                        if (st.assigned && gameStore.state.characters[st.assigned]) {
                                gameStore.setCharacter(st.assigned, recoverVTuberStamina(gameStore.state.characters[st.assigned]));
                        }
                }

                // Check each active station
                for (const stationId of STATION_ORDER) {
                        const station = gameStore.state.studio.stations[stationId];
                        if (!station || !station.assigned) continue;
                        const def = STATION_DEFS[stationId];
                        if (gameStore.state.studio.level < def.unlockLv) continue;

                        const charData = gameStore.state.characters[station.assigned];
                        if (!charData) continue;
                        const charInfo = getBySlug(station.assigned);
                        if (!charInfo) continue;

                        const contentType = CONTENT_TYPES[stationId];
                        if (!contentType) continue;

                        const staminaCost = STAMINA_COSTS[(station.level || 1) - 1] || 2;
                        if (charData.stats.st < staminaCost) continue;

                        // Get quality
                        const quality = getContentQuality(stationId, station, { ...charInfo, stats: charData.stats, level: charData.level, rarity: charData.rarity, baseStats: charData.baseStats } as any, gameStore.state.studio);
                        if (!quality) continue;

                        // Calculate rewards
                        const stationMult = STATION_MULTIPLIERS[(station.level || 1) - 1] || 1;
                        const rarityMult = RARITY_MULTIPLIERS[charData.rarity] || 1;
                        const levelBonus = 1 + (charData.level || 0) * 0.02;

                        const flatBonus =
                                stationId === 'streamRoom'
                                        ? 0
                                        : stationId === 'practiceHall'
                                                ? (gameStore.state.studio.level - 1) * STUDIO_FLAT_BONUS_PRACTICE_HALL
                                                : (gameStore.state.studio.level - 1) * STUDIO_FLAT_BONUS_PER_LEVEL;

                        const reward = contentType.baseReward * quality.multiplier * rarityMult * stationMult * levelBonus + flatBonus;

                        // Apply trending bonus to quality label
                        const trending = gameStore.state.studio.trendingStat;
                        const isTrending = trending === contentType.primary || trending === contentType.secondary;

                        // Deduct stamina
                        gameStore.updateCharacterStamina(station.assigned!, Math.max(0, charData.stats.st - staminaCost), now);

                        // Apply currency reward
                        if (contentType.resource === 'vgems') gameStore.addCurrency('vgems', Math.floor(reward));
                        else if (contentType.resource === 'vringgit') gameStore.addCurrency('vringgit', Math.floor(reward));
                        else if (contentType.resource === 'liveCache') gameStore.addCurrency('liveCache', reward);

                        // Lounge bonus LiveCache
                        if ('bonusResource' in contentType && contentType.bonusResource === 'liveCache') {
                                const bonusReward = contentType.bonusAmount * quality.multiplier * rarityMult * stationMult * levelBonus;
                                gameStore.addCurrency('liveCache', Math.floor(bonusReward));
                        }

                        // Studio EXP
                        const expRate = (STUDIO_EXP_RATES[stationId] || 0) * (STUDIO_EXP_RARITY_MULT[charData.rarity] || 1.0);
                        const prevLevel = gameStore.state.studio.level;
                        gameStore.setStudio(addStudioExp(gameStore.state.studio, expRate));
                        gameStore.setStudio(checkStudioLevelUp(gameStore.state.studio));

                        // Notify level up
                        if (gameStore.state.studio.level > prevLevel) {
                                const lvlDef = STATION_LEVELS.find((l) => l.level === gameStore.state.studio.level);
                                studioStore.showLevelUpNotice(prevLevel, gameStore.state.studio.level, lvlDef?.unlocks || '');
                        }

                        // Add to content log
                        const rewards: Record<string, number> = {};
                        if (contentType.resource === 'vgems') rewards.vgems = Math.floor(reward);
                        else if (contentType.resource === 'vringgit') rewards.vringgit = Math.floor(reward);
                        else if (contentType.resource === 'liveCache') rewards.liveCache = Math.round(reward * 10) / 10;
                        if ('bonusResource' in contentType) {
                                const lcKey = contentType.bonusResource as string;
                                rewards[lcKey] = (rewards[lcKey] || 0) + Math.floor(contentType.bonusAmount * quality.multiplier * rarityMult * stationMult * levelBonus);
                        }

                        const entry: ContentEntry = {
                                timestamp: now,
                                stationId,
                                stationName: def.name,
                                charSlug: station.assigned,
                                charName: charInfo.name,
                                charImage: getImageUrl(charInfo.slug),
                                quality: quality.tier,
                                qualityColor: quality.color,
                                qualityLabel: quality.label,
                                qualityMultiplier: quality.multiplier,
                                rewards,
                                trendingMatch: isTrending,
                                staminaCost
                        };

                        gameStore.addContentLogEntry(entry);
                }

                // Trim content log
                gameStore.trimContentLog(CONTENT_LOG_MAX);

                gameStore.setStudioLastContentTick(now);
                gameStore.save();
        }

        // ── Station Operations (delegated to gameStore safe methods) ──
        function handleUpgradeStation(stationId: StationId): void {
                const station = gameStore.state.studio.stations[stationId];
                if (!station || station.level >= 5) return;
                const cost = STATION_UPGRADE_COSTS[station.level] || 0;
                if (gameStore.state.currencies.vringgit < cost) return;
                gameStore.addCurrency('vringgit', -cost);
                gameStore.upgradeStation(stationId);
                gameStore.save();
        }

        // ── Offline Earnings ──
        function checkOffline(): void {
                const state = gameStore.state;
                const now = Date.now();
                const elapsed = now - state.lastOnline;
                const capMs = OFFLINE_EARNINGS_CAP_HOURS * 60 * 60 * 1000;

                if (elapsed < 60_000) return; // Less than 1 min

                const minutes = Math.min(Math.floor(elapsed / 60_000), OFFLINE_EARNINGS_CAP_HOURS * 60);

                // Build characters map with recovered stamina for offline calc
                const charsForCalc: Record<string, CharacterData> = {};
                for (const [sid, st] of Object.entries(state.studio.stations)) {
                        if (!st.assigned) continue;
                        const char = state.characters[st.assigned];
                        if (!char) continue;
                        charsForCalc[st.assigned] = recoverVTuberStamina(char);
                }

                const earnings = calculateOfflineEarnings(state.studio, charsForCalc, minutes);

                if (earnings.contentPieces > 0 || earnings.vgems > 0 || earnings.vringgit > 0 || earnings.liveCache > 0) {
                        offlineData = {
                                minutes,
                                vgems: earnings.vgems,
                                vringgit: earnings.vringgit,
                                liveCache: Math.floor(earnings.liveCache),
                                studioExp: earnings.studioExp,
                                contentPieces: earnings.contentPieces
                        };
                        hasOffline = true;
                }

                gameStore.setLastOnline(now);
                gameStore.save();
        }

        function claimOffline(): void {
                if (!offlineData) return;

                // Add currencies
                gameStore.addCurrency('vgems', offlineData.vgems);
                gameStore.addCurrency('vringgit', offlineData.vringgit);
                gameStore.addCurrency('liveCache', offlineData.liveCache);

                // Studio EXP from offline
                const prevLevel = gameStore.state.studio.level;
                gameStore.setStudio(addStudioExp(gameStore.state.studio, offlineData.studioExp));
                gameStore.setStudio(checkStudioLevelUp(gameStore.state.studio));

                if (gameStore.state.studio.level > prevLevel) {
                        const lvlDef = STATION_LEVELS.find((l) => l.level === gameStore.state.studio.level);
                        studioStore.showLevelUpNotice(prevLevel, gameStore.state.studio.level, lvlDef?.unlocks || '');
                }

                // Recover stamina for assigned VTubers
                for (const [sid, st] of Object.entries(gameStore.state.studio.stations)) {
                        if (!st.assigned) continue;
                        const char = gameStore.state.characters[st.assigned];
                        if (!char) continue;
                        gameStore.setCharacter(st.assigned, recoverVTuberStamina(char));
                }

                // Add offline entry to content log
                const offlineEntry: ContentEntry = {
                        timestamp: Date.now(),
                        stationId: 'offline',
                        stationName: 'Offline',
                        charSlug: null,
                        charName: 'Offline Earnings',
                        charImage: '',
                        quality: 'B',
                        qualityColor: '#66bb6a',
                        qualityLabel: 'Offline',
                        qualityMultiplier: 1.0,
                        rewards: {
                                ...(offlineData.vgems > 0 ? { vgems: offlineData.vgems } : {}),
                                ...(offlineData.vringgit > 0 ? { vringgit: offlineData.vringgit } : {}),
                                ...(offlineData.liveCache > 0 ? { liveCache: offlineData.liveCache } : {})
                        },
                        trendingMatch: false,
                        staminaCost: 0,
                        isOffline: true,
                        contentPieces: offlineData.contentPieces
                };

                gameStore.addContentLogEntry(offlineEntry);
                gameStore.trimContentLog(CONTENT_LOG_MAX);

                gameStore.save();
                hasOffline = false;
                offlineData = null;
        }

        // ── Stamina helpers ──
        function getStaminaInfo(slug: string): { current: number; max: number; pct: number } {
                const charData = gameStore.state.characters[slug];
                if (!charData) return { current: 0, max: 0, pct: 0 };
                const maxST = charData.baseStats?.st || charData.stats.st;
                const current = charData.stats.st;
                return { current, max: maxST, pct: maxST > 0 ? (current / maxST) * 100 : 0 };
        }

        function getStaminaColor(pct: number): string {
                if (pct > 50) return '#66bb6a';
                if (pct > 25) return '#ff9800';
                return '#ef5350';
        }

        // ── Station income estimate ──
        function getStationIncome(stationId: StationId): { resource: string; amount: number; bonus?: { resource: string; amount: number } } | null {
                const state = gameStore.state;
                const station = state.studio.stations[stationId];
                if (!station || !station.assigned) return null;

                const def = STATION_DEFS[stationId];
                if (state.studio.level < def.unlockLv) return null;

                const charData = state.characters[station.assigned];
                if (!charData) return null;
                const charInfo = getBySlug(station.assigned);
                if (!charInfo) return null;

                const contentType = CONTENT_TYPES[stationId];
                if (!contentType) return null;

                const quality = getContentQuality(stationId, station, { ...charInfo, stats: charData.stats, level: charData.level, rarity: charData.rarity, baseStats: charData.baseStats } as any, state.studio);
                if (!quality) return null;

                const stationMult = STATION_MULTIPLIERS[(station.level || 1) - 1] || 1;
                const rarityMult = RARITY_MULTIPLIERS[charData.rarity] || 1;
                const levelBonus = 1 + (charData.level || 0) * 0.02;

                const flatBonus =
                        stationId === 'streamRoom'
                                ? 0
                                : stationId === 'practiceHall'
                                        ? (state.studio.level - 1) * STUDIO_FLAT_BONUS_PRACTICE_HALL
                                        : (state.studio.level - 1) * STUDIO_FLAT_BONUS_PER_LEVEL;

                const amount = contentType.baseReward * quality.multiplier * rarityMult * stationMult * levelBonus + flatBonus;

                const result: { resource: string; amount: number; bonus?: { resource: string; amount: number } } = {
                        resource: contentType.resource,
                        amount: Math.floor(amount)
                };

                if ('bonusResource' in contentType) {
                        result.bonus = {
                                resource: contentType.bonusResource as string,
                                amount: Math.floor(contentType.bonusAmount * quality.multiplier * rarityMult * stationMult * levelBonus)
                        };
                }

                return result;
        }

        function getResourceIcon(resource: string): string {
                switch (resource) {
                        case 'vgems': return '💎';
                        case 'vringgit': return '🪙';
                        case 'liveCache': return '💾';
                        default: return '•';
                }
        }

        function getResourceName(resource: string): string {
                switch (resource) {
                        case 'vgems': return 'VGems';
                        case 'vringgit': return 'VRinggit';
                        case 'liveCache': return 'LiveCache';
                        default: return resource;
                }
        }

        // ── Assign Modal ──
        function openAssignModal(stationId: StationId): void {
                assignStationId = stationId;
                assignFilter = 'all';
                assignSearch = '';
                showAssignModal = true;
        }

        function closeAssignModal(): void {
                showAssignModal = false;
                assignStationId = null;
        }

        function getFilteredCharacters(): CharacterRecord[] {
                let chars = allChars.filter((c) => {
                        const charData = gameStore.state.characters[c.slug];
                        return charData && charData.owned;
                });

                if (assignFilter === 'unassigned') {
                        chars = chars.filter((c) => {
                                for (const st of Object.values(gameStore.state.studio.stations)) {
                                        if (st.assigned === c.slug) return false;
                                }
                                return true;
                        });
                }

                if (assignSearch.trim()) {
                        const q = assignSearch.toLowerCase();
                        chars = chars.filter((c) => c.name.toLowerCase().includes(q) || c.agency.toLowerCase().includes(q));
                }

                return chars;
        }

        function handleAssign(slug: string): void {
                if (!assignStationId) return;
                gameStore.assignStation(assignStationId, slug);
                gameStore.save();
                closeAssignModal();
        }

        function getCharacterStation(slug: string): StationId | null {
                for (const [sid, st] of Object.entries(gameStore.state.studio.stations)) {
                        if (st.assigned === slug) return sid as StationId;
                }
                return null;
        }

        // ── Lifecycle ──
        import { onMount, onDestroy } from 'svelte';

        onMount(async () => {
                allChars = await loadCharacters();
                charsLoaded = true;

                // Check offline earnings
                checkOffline();

                // Start content timer
                contentCountdown = CONTENT_INTERVAL - Math.floor((Date.now() - gameStore.state.studio.lastContentTick) / 1000) % CONTENT_INTERVAL;
                if (contentCountdown <= 0) contentCountdown = CONTENT_INTERVAL;

                contentTimerInterval = setInterval(() => {
                        contentCountdown--;
                        if (contentCountdown <= 0) {
                                contentTick();
                                contentCountdown = CONTENT_INTERVAL;
                        }
                }, 1000);
        });

        onDestroy(() => {
                if (contentTimerInterval) clearInterval(contentTimerInterval);
        });
</script>

<div class="animate-fade-in">
        <!-- Offline Earnings Banner -->
        {#if hasOffline && offlineData}
                <div class="glass p-4 rounded-xl mb-4 border border-yellow-500/30 bg-yellow-500/5 animate-slide-up">
                        <div class="flex items-center gap-2 mb-2">
                                <span class="text-lg">🔄</span>
                                <span class="text-sm font-bold text-yellow-300">Offline Earnings</span>
                                <span class="text-xs text-white/40 ml-auto">{offlineData.minutes}m away</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mb-3">
                                {#if offlineData.vgems > 0}
                                        <div class="flex items-center gap-1.5 text-sm">
                                                <span>💎</span>
                                                <span class="text-purple-300">+{offlineData.vgems}</span>
                                        </div>
                                {/if}
                                {#if offlineData.vringgit > 0}
                                        <div class="flex items-center gap-1.5 text-sm">
                                                <span>🪙</span>
                                                <span class="text-green-300">+{offlineData.vringgit}</span>
                                        </div>
                                {/if}
                                {#if offlineData.liveCache > 0}
                                        <div class="flex items-center gap-1.5 text-sm">
                                                <span>💾</span>
                                                <span class="text-cyan-300">+{offlineData.liveCache}</span>
                                        </div>
                                {/if}
                                <div class="flex items-center gap-1.5 text-sm">
                                        <span>📝</span>
                                        <span class="text-white/60">{offlineData.contentPieces} pieces</span>
                                </div>
                        </div>
                        <div class="flex gap-2">
                                <button
                                        onclick={() => { claimOffline(); }}
                                        class="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold text-sm hover:from-yellow-400 hover:to-amber-400 transition-all active:scale-95"
                                >
                                        Claim All
                                </button>
                                <button
                                        onclick={() => { hasOffline = false; }}
                                        class="px-4 py-2.5 rounded-lg bg-white/5 text-white/50 text-sm hover:bg-white/10 transition-colors"
                                >
                                        Dismiss
                                </button>
                        </div>
                </div>
        {/if}

        <!-- Studio Header -->
        <div class="glass p-4 rounded-xl mb-4">
                <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                                <span class="text-lg">🎬</span>
                                <span class="text-base font-bold text-white">Studio</span>
                                <span class="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">
                                        Lv {studioLevel}
                                </span>
                        </div>
                        <div class="text-xs text-white/40">
                                {#if expProgress.isMax}
                                        <span class="text-yellow-400">MAX</span>
                                {:else}
                                        <span>{formatNumber(Math.floor(expProgress.current))} / {formatNumber(expProgress.required)} EXP</span>
                                {/if}
                        </div>
                </div>
                <!-- EXP bar -->
                <div class="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-3">
                        <div
                                class="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                                style="width: {expProgress.pct}%"
                        ></div>
                </div>

                <!-- Trending + Timer -->
                <div class="flex items-center justify-between">
                        <div class="flex items-center gap-1.5">
                                <span class="text-xs text-white/40">Trending:</span>
                                <span class="text-xs font-bold" style="color: {STAT_COLORS[trendingStat] || '#fff'}">
                                        {trendingStat.toUpperCase()}
                                </span>
                                <span class="text-[10px] text-yellow-400/60">×1.5</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                                <span class="text-xs text-white/40">Next content:</span>
                                <span class="text-xs font-mono text-cyan-400">{contentCountdown}s</span>
                        </div>
                </div>
        </div>

        <!-- Stations Grid -->
        <div class="space-y-3 mb-4">
                {#each STATION_ORDER as stationId}
                        {@const def = STATION_DEFS[stationId]}
                        {@const station = studio.stations[stationId]}
                        {@const isLocked = studioLevel < def.unlockLv}
                        {@const isAssigned = station && station.assigned !== null}
                        {@const assignedCharData = isAssigned ? gameStore.state.characters[station.assigned!] : null}
                        {@const assignedCharInfo = isAssigned ? getBySlug(station.assigned!) : null}
                        {@const contentType = CONTENT_TYPES[stationId]}
                        {@const stationIcon = STATION_ICONS[stationId]}
                        {@const stationLevel = station?.level || 1}
                        {@const staminaCost = STAMINA_COSTS[stationLevel - 1] || 2}
                        {@const upgradeCost = station && station.level < 5 ? STATION_UPGRADE_COSTS[station.level] : 0}
                        {@const canUpgrade = upgradeCost > 0 && gameStore.currencies.vringgit >= upgradeCost}
                        {@const income = isAssigned ? getStationIncome(stationId) : null}
                        {@const stInfo = isAssigned ? getStaminaInfo(station.assigned!) : null}

                        <div class="glass rounded-xl overflow-hidden transition-all duration-200
                                {isLocked ? 'opacity-50' : ''}
                                {isAssigned && !isLocked ? 'border border-white/10' : ''}">
                                <!-- Station Header -->
                                <div class="flex items-center justify-between p-3 pb-2">
                                        <div class="flex items-center gap-2">
                                                <span class="text-base">{stationIcon}</span>
                                                <span class="text-sm font-bold text-white">{def.name}</span>
                                                <span class="text-xs text-white/40">Lv {stationLevel}</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                                <span class="text-xs" style="color: {STAT_COLORS[contentType.primary] || '#fff'}">
                                                        {contentType.primary.toUpperCase()}
                                                </span>
                                                <span class="text-[10px] text-white/20">←</span>
                                                <span class="text-xs text-white/40">Main</span>
                                                <span class="text-[10px] text-white/20 mx-1">|</span>
                                                <span class="text-xs" style="color: {STAT_COLORS[contentType.secondary] || '#fff'}">
                                                        {contentType.secondary.toUpperCase()}
                                                </span>
                                                <span class="text-[10px] text-white/20">←</span>
                                                <span class="text-xs text-white/40">Sub</span>
                                        </div>
                                </div>

                                <!-- Station Slot -->
                                <button
                                        onclick={() => { if (!isLocked && station) { if (isAssigned) { gameStore.assignStation(stationId, null); gameStore.save(); } else { openAssignModal(stationId); } } }}
                                        class="w-full p-3 transition-colors
                                        {isLocked ? 'cursor-not-allowed' : isAssigned ? 'hover:bg-white/3' : 'hover:bg-white/5'}"
                                        disabled={isLocked}
                                >
                                        {#if isAssigned && assignedCharInfo && assignedCharData}
                                                <!-- Assigned character -->
                                                <div class="flex items-center gap-3">
                                                        <div class="relative">
                                                                <img
                                                                        src={getImageUrl(assignedCharInfo.slug)}
                                                                        alt={assignedCharInfo.name}
                                                                        class="w-12 h-12 rounded-full object-cover ring-2 rarity-border-{assignedCharData.rarity}"
                                                                        onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                />
                                                                <!-- Rarity badge -->
                                                                <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-black rarity-bg-{assignedCharData.rarity}" style="background: {assignedCharData.rarity === 'R' ? '#9ca3af' : assignedCharData.rarity === 'SR' ? '#60a5fa' : assignedCharData.rarity === 'SSR' ? '#c77dff' : '#fbbf24'}">
                                                                        {assignedCharData.rarity}
                                                                </div>
                                                        </div>
                                                        <div class="flex-1 min-w-0 text-left">
                                                                <div class="text-sm font-medium text-white truncate">{assignedCharInfo.name}</div>
                                                                <div class="text-xs text-white/40">Lv {assignedCharData.level}{assignedCharData.echo > 0 ? ` E${assignedCharData.echo}` : ''}</div>
                                                                <!-- Stamina bar -->
                                                                {#if stInfo}
                                                                        <div class="mt-1.5 flex items-center gap-2">
                                                                                <div class="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                                                        <div
                                                                                                class="h-full rounded-full transition-all duration-300"
                                                                                                style="width: {stInfo.pct}%; background: {getStaminaColor(stInfo.pct)}"
                                                                                        ></div>
                                                                                </div>
                                                                                <span class="text-[10px] font-mono" style="color: {getStaminaColor(stInfo.pct)}">
                                                                                        {stInfo.current}/{stInfo.max}
                                                                                </span>
                                                                        </div>
                                                                {/if}
                                                        </div>
                                                        <div class="text-xs text-white/30">tap to remove</div>
                                                </div>
                                        {:else if isLocked}
                                                <!-- Locked -->
                                                <div class="text-center py-2">
                                                        <span class="text-xs text-white/30">🔒 Requires Studio Lv {def.unlockLv}</span>
                                                </div>
                                        {:else}
                                                <!-- Empty slot -->
                                                <div class="text-center py-2">
                                                        <div class="text-xs text-white/40">Tap to assign a VTuber</div>
                                                </div>
                                        {/if}
                                </button>

                                <!-- Station Footer: cost + income + upgrade -->
                                {#if !isLocked}
                                        <div class="px-3 pb-3">
                                                <!-- Stamina cost + cycle time -->
                                                <div class="flex items-center justify-between text-[10px] text-white/30 mb-2">
                                                        <span>⚡ {staminaCost} stamina / {CONTENT_INTERVAL}s cycle</span>
                                                        {#if income}
                                                                <div class="flex items-center gap-1">
                                                                        <span>{getResourceIcon(income.resource)}</span>
                                                                        <span style="color: {income.resource === 'vgems' ? '#c77dff' : income.resource === 'vringgit' ? '#66bb6a' : '#00bcd4'}">+{income.amount}</span>
                                                                        {#if income.bonus}
                                                                                <span class="text-white/20">+</span>
                                                                                <span>{getResourceIcon(income.bonus.resource)}</span>
                                                                                <span style="color: #00bcd4">+{income.bonus.amount}</span>
                                                                        {/if}
                                                                        <span class="text-white/20">/cycle</span>
                                                                </div>
                                                        {/if}
                                                </div>

                                                <!-- Upgrade -->
                                                {#if station && stationLevel < 5}
                                                        <button
                                                                onclick={() => handleUpgradeStation(stationId)}
                                                                disabled={!canUpgrade}
                                                                class="w-full py-2 rounded-lg text-xs font-medium transition-all
                                                                {canUpgrade
                                                                        ? 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                                                                        : 'bg-white/3 text-white/20 cursor-not-allowed'}"
                                                        >
                                                                Upgrade (🪙 {formatNumber(upgradeCost)})
                                                        </button>
                                                {:else if station && stationLevel >= 5}
                                                        <div class="text-center text-[10px] text-yellow-400/40 py-1">★ Max Level</div>
                                                {/if}
                                        </div>
                                {/if}
                        </div>
                {/each}
        </div>

        <!-- Estimated Income Summary -->
        <div class="glass p-4 rounded-xl mb-4">
                <div class="text-sm font-bold text-white/80 mb-3">Estimated Income (per cycle)</div>
                {#each STATION_ORDER as stationId}
                        {@const income = getStationIncome(stationId)}
                        {@const def = STATION_DEFS[stationId]}
                        {@const station = studio.stations[stationId]}
                        {#if income && station && station.assigned}
                                <div class="flex items-center justify-between py-1.5 text-sm">
                                        <span class="text-white/50">{def.name}</span>
                                        <div class="flex items-center gap-2">
                                                <span class="flex items-center gap-1">
                                                        {getResourceIcon(income.resource)}
                                                        <span style="color: {income.resource === 'vgems' ? '#c77dff' : income.resource === 'vringgit' ? '#66bb6a' : '#00bcd4'}">
                                                                +{formatNumber(income.amount)}
                                                        </span>
                                                </span>
                                                {#if income.bonus}
                                                        <span class="flex items-center gap-1">
                                                                {getResourceIcon(income.bonus.resource)}
                                                                <span style="color: #00bcd4">+{income.bonus.amount}</span>
                                                        </span>
                                                {/if}
                                        </div>
                                </div>
                        {/if}
                {/each}
                {#if STATION_ORDER.every((s) => !getStationIncome(s))}
                        <div class="text-center text-xs text-white/30 py-2">
                                Assign characters to start earning!
                        </div>
                {/if}
        </div>

        <!-- Content Log -->
        <div class="glass p-4 rounded-xl mb-4">
                <div class="flex items-center justify-between mb-3">
                        <span class="text-sm font-bold text-white/80">Content Log</span>
                        <span class="text-[10px] text-white/30">Last {CONTENT_LOG_MAX} entries</span>
                </div>

                {#if studio.contentLog.length === 0}
                        <div class="text-center py-6">
                                <div class="text-2xl mb-2">📝</div>
                                <div class="text-xs text-white/30">No content created yet.</div>
                                <div class="text-[10px] text-white/20 mt-1">Assign VTubers and wait {CONTENT_INTERVAL}s!</div>
                        </div>
                {:else}
                        <div class="space-y-2 max-h-80 overflow-y-auto">
                                {#each studio.contentLog as entry}
                                        <div class="flex items-start gap-2.5 p-2 rounded-lg {entry.isOffline ? 'bg-yellow-500/5 border border-yellow-500/10' : 'bg-white/3'} animate-fade-in">
                                                {#if entry.isOffline}
                                                        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-500/10 flex-shrink-0 mt-0.5">
                                                                <span class="text-sm">🔄</span>
                                                        </div>
                                                {:else if entry.charImage}
                                                        <img
                                                                src={entry.charImage}
                                                                alt={entry.charName}
                                                                class="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-white/10 mt-0.5"
                                                                onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                        />
                                                {:else}
                                                        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 flex-shrink-0 mt-0.5">
                                                                <span class="text-sm">👤</span>
                                                        </div>
                                                {/if}

                                                <div class="flex-1 min-w-0">
                                                        <div class="flex items-center gap-1.5 flex-wrap">
                                                                <span class="text-xs font-medium text-white/80 truncate">{entry.charName}</span>
                                                                {#if !entry.isOffline}
                                                                        <span class="text-[10px] text-white/30">{entry.stationName}</span>
                                                                {/if}
                                                                {#if entry.contentPieces}
                                                                        <span class="text-[10px] text-yellow-400/60">{entry.contentPieces} pcs</span>
                                                                {/if}
                                                        </div>
                                                        <div class="flex items-center gap-1.5 mt-0.5">
                                                                <span
                                                                        class="px-1.5 py-0.5 rounded text-[9px] font-bold"
                                                                        style="background: {entry.qualityColor}22; color: {entry.qualityColor}"
                                                                >
                                                                        {entry.quality} {entry.qualityLabel}
                                                                </span>
                                                                {#if entry.trendingMatch}
                                                                        <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/10 text-yellow-400">TRENDING</span>
                                                                {/if}
                                                        </div>
                                                        <div class="flex items-center gap-2 mt-1 flex-wrap">
                                                                {#each Object.entries(entry.rewards) as [resource, amount]}
                                                                        <span class="text-[10px]" style="color: {resource === 'vgems' ? '#c77dff' : resource === 'vringgit' ? '#66bb6a' : '#00bcd4'}">
                                                                                {getResourceIcon(resource)}{formatNumber(amount)}
                                                                        </span>
                                                                {/each}
                                                        </div>
                                                </div>

                                                <span class="text-[10px] text-white/20 flex-shrink-0">{formatTimeAgo(entry.timestamp)}</span>
                                        </div>
                                {/each}
                        </div>
                {/if}
        </div>
</div>

<!-- Assign Character Modal -->
{#if showAssignModal && assignStationId}
        {@const stationDef = STATION_DEFS[assignStationId]}
        {@const contentType = CONTENT_TYPES[assignStationId]}
        {@const filtered = getFilteredCharacters()}
        <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
        <div class="fixed inset-0 z-[200] bg-black/80 flex items-end sm:items-center justify-center" onclick={closeAssignModal}>
                <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
                <div class="glass-strong w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col animate-slide-up" onclick={(e) => e.stopPropagation()}>
                        <!-- Modal Header -->
                        <div class="flex items-center justify-between p-4 border-b border-white/10">
                                <div>
                                        <h3 class="text-base font-bold text-white">Assign to {stationDef.name}</h3>
                                        {#if contentType}
                                                <div class="text-xs text-white/40 mt-0.5">
                                                        Best: <span style="color: {STAT_COLORS[contentType.primary]}">{contentType.primary.toUpperCase()}</span>
                                                        + <span style="color: {STAT_COLORS[contentType.secondary]}">{contentType.secondary.toUpperCase()}</span>
                                                </div>
                                        {/if}
                                </div>
                        <!-- svelte-ignore a11y_consider_explicit_label -->
                                <button onclick={closeAssignModal} class="text-white/40 hover:text-white p-1 transition-colors" aria-label="Close">
                                        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M18 6L6 18M6 6l12 12" />
                                        </svg>
                                </button>
                        </div>

                        <!-- Filters -->
                        <div class="flex items-center gap-2 p-3 border-b border-white/5">
                                <div class="flex gap-1">
                                        <button
                                                onclick={() => { assignFilter = 'all'; }}
                                                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                                {assignFilter === 'all' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'}"
                                        >
                                                All
                                        </button>
                                        <button
                                                onclick={() => { assignFilter = 'unassigned'; }}
                                                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                                {assignFilter === 'unassigned' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'}"
                                        >
                                                Free
                                        </button>
                                </div>
                                <input
                                        type="text"
                                        placeholder="Search..."
                                        bind:value={assignSearch}
                                        class="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 outline-none focus:border-blue-500/30"
                                />
                        </div>

                        <!-- Character Grid -->
                        <div class="flex-1 overflow-y-auto p-3">
                                {#if filtered.length === 0}
                                        <div class="text-center py-8">
                                                <div class="text-sm text-white/30">No characters available</div>
                                                <div class="text-xs text-white/20 mt-1">Get VTubers from Gacha first!</div>
                                        </div>
                                {:else}
                                        <div class="grid grid-cols-2 gap-2">
                                                {#each filtered as char}
                                                        {@const charData = gameStore.state.characters[char.slug]}
                                                        {@const stInfo = charData ? getStaminaInfo(char.slug) : null}
                                                        {@const workingStation = getCharacterStation(char.slug)}
                                                        <button
                                                                onclick={() => handleAssign(char.slug)}
                                                                class="flex items-center gap-2.5 p-2.5 rounded-lg transition-all hover:bg-white/5 rarity-bg-{char.rarity} border border-white/5 text-left"
                                                        >
                                                                <div class="relative flex-shrink-0">
                                                                        <img
                                                                                src={getImageUrl(char.slug)}
                                                                                alt={char.name}
                                                                                class="w-10 h-10 rounded-full object-cover ring-1 rarity-border-{char.rarity}"
                                                                                onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                        />
                                                                </div>
                                                                <div class="flex-1 min-w-0">
                                                                        <div class="text-xs font-medium text-white truncate">{char.name}</div>
                                                                        <div class="flex items-center gap-1 mt-0.5">
                                                                                <span class="text-[10px] rarity-text-{char.rarity}">{char.rarity}</span>
                                                                                <span class="text-[10px] text-white/30">Lv{charData?.level || 1}</span>
                                                                        </div>
                                                                        {#if stInfo}
                                                                                <div class="flex items-center gap-1 mt-0.5">
                                                                                        <span class="text-[9px]" style="color: {getStaminaColor(stInfo.pct)}">⚡{stInfo.current}/{stInfo.max}</span>
                                                                                </div>
                                                                        {/if}
                                                                        {#if workingStation}
                                                                                <div class="text-[9px] text-yellow-400/60 mt-0.5 truncate">
                                                                                        Working: {STATION_DEFS[workingStation].name}
                                                                                </div>
                                                                        {/if}
                                                                </div>
                                                        </button>
                                                {/each}
                                        </div>
                                {/if}
                        </div>
                </div>
        </div>
{/if}

<!-- Level Up Notice -->
{#if studioStore.showLevelUp}
        <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
        <div class="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onclick={() => studioStore.closeLevelUp()}>
                <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
                <div class="glass-strong p-6 rounded-xl max-w-xs w-full text-center animate-slide-up" onclick={(e) => e.stopPropagation()}>
                        <div class="text-3xl mb-2">🎉</div>
                        <h3 class="text-lg font-bold text-yellow-400 mb-1">Studio Level Up!</h3>
                        <div class="text-base text-white/80 mb-2">
                                Lv {studioStore.levelUpFrom} → <span class="text-yellow-400 font-bold">Lv {studioStore.levelUpTo}</span>
                        </div>
                        <div class="text-sm text-white/50 mb-4">{studioStore.levelUpUnlock}</div>
                        <button
                                onclick={() => studioStore.closeLevelUp()}
                                class="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold hover:from-yellow-400 hover:to-amber-400 transition-all active:scale-95"
                        >
                                Awesome!
                        </button>
                </div>
        </div>
{/if}
