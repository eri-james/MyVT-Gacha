import type { GameState, Currencies, CharacterData, QuestState, TrainedCopy, TrainedArchive, OnboardingState } from '$lib/types';
import { SAVE_VERSION, TRAINED_ARCHIVE_CAP, STARTER_COACHES, AUTO_SAVE_INTERVAL } from '$lib/data/constants';
import { loadSave, writeSave, migrateFromLocalStorage } from '$lib/utils/save';
import { getLoginRewards } from '$lib/logic/economy';

function generatePlayerId(): string {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
        }
        // Fallback for environments without crypto.randomUUID
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let id = 'MYVT';
        for (let g = 0; g < 3; g++) {
                id += '-';
                for (let i = 0; i < 4; i++) {
                        id += chars[Math.floor(Math.random() * chars.length)];
                }
        }
        return id;
}

function createInitialState(): GameState {
        return {
                version: SAVE_VERSION,
                playerId: generatePlayerId(),
                username: 'Producer',
                producerLevel: { level: 1, exp: 0 },
                currencies: {
                        vgems: 1500,
                        vringgit: 0,
                        myTicket: { blue: 10, red: 0 },
                        liveCache: 0,
                        stars: 1000,
                        starDust: 0,
                        starFragments: 0,
                        bondPoints: 0,
                        gems: 0
                },
                characters: {},
                oshiList: [],
                featuredVtuber: null,
                trainedArchive: {
                        trained: {},
                        starterCoaches: []
                },
                pity: { count: 0 },
                stats: { totalPulls: 0, ssrStreak: 0, bestSsrStreak: 0 },
                pullHistory: {},
                milestones: [],
                dailyLogin: { streak: 0, lastClaim: null },
                quests: {
                        daily: { date: '', progress: {}, claimed: {} },
                        weekly: { date: '', progress: {}, claimed: {} }
                },
                stamina: { current: 180, lastRecovery: Date.now() },
                minigame: { dailyPlays: 0, lastPlayDate: '', highScore: 0 },
                onboarding: {
                        welcome: false,
                        homeHint: false,
                        gachaHint: false,
                        liveonHint: false
                },
                lastOnline: Date.now()
        };
}

/** State migration (v1 → v9) */
function migrateState(saved: GameState): GameState {
        const merged = { ...createInitialState(), ...saved, version: SAVE_VERSION };
        // Ensure all fields exist
        if (!merged.milestones) merged.milestones = [];
        if (!merged.pullHistory) merged.pullHistory = {};
        if (!merged.minigame) merged.minigame = { dailyPlays: 0, lastPlayDate: '', highScore: 0 };
        if (!merged.stamina) merged.stamina = { current: 180, lastRecovery: Date.now() };
        if (merged.stamina.current > 180) merged.stamina.current = 180;
        if (!merged.quests) merged.quests = { daily: { date: '', progress: {}, claimed: {} }, weekly: { date: '', progress: {}, claimed: {} } };
        if (!merged.producerLevel) merged.producerLevel = { level: 1, exp: 0 };
        if (!merged.oshiList) merged.oshiList = [];
        // v9: Remove studio field, ensure trainedArchive exists
        delete (merged as any).studio;
        if (!merged.trainedArchive) merged.trainedArchive = { trained: {}, starterCoaches: [] };
        // Existing players skip onboarding
        if (!merged.onboarding) {
                merged.onboarding = { welcome: true, homeHint: true, gachaHint: true, liveonHint: true };
        }
        return merged;
}

export class GameStore {
        state: GameState = $state(createInitialState());
        ready: boolean = $state(false);
        private _saveTimer: ReturnType<typeof setInterval> | null = null;
        private _beforeUnloadHandler = () => { this.save(); };

        async init(): Promise<void> {
                let saved = await loadSave();

                // Try localStorage migration for existing players
                if (!saved) {
                        saved = await migrateFromLocalStorage();
                }

                if (saved) {
                        if (saved.version < SAVE_VERSION) {
                                saved = migrateState(saved);
                        }
                        this.state = saved;
                }

                this.ready = true;

                // Auto-save every 30 seconds
                this._saveTimer = setInterval(() => this.save(), AUTO_SAVE_INTERVAL);

                // Save on page unload
                if (typeof window !== 'undefined') {
                        window.addEventListener('beforeunload', this._beforeUnloadHandler);
                }
        }

        async save(): Promise<void> {
                if (!this.ready) return;
                await writeSave(this.state);
        }

        async reset(): Promise<void> {
                this.state = createInitialState();
                await this.save();
        }

        // ── Currency shortcuts ──
        get currencies(): Currencies { return this.state.currencies; }
        get characters(): Record<string, CharacterData> { return this.state.characters; }

        /** Count of owned characters */
        get ownedCount(): number {
                return Object.values(this.state.characters).filter((c) => c.owned).length;
        }

        /** Total power of all owned characters */
        get totalPower(): number {
                return Object.values(this.state.characters)
                        .filter((c) => c.owned)
                        .reduce((sum, c) => sum + Object.values(c.stats).reduce((a, b) => a + b, 0), 0);
        }

        // ── Safe Mutation Methods ──
        // All reactive state changes MUST go through these methods
        // to avoid Svelte 5 state_unsafe_mutation errors.

        /** Add/subtract currency (e.g. addCurrency('vgems', 100)) */
        addCurrency(key: keyof Currencies, amount: number): void {
                if (typeof this.state.currencies[key] === 'number') {
                        (this.state.currencies[key] as number) += amount;
                } else if (key === 'myTicket') {
                        // myTicket is an object — handle separately
                }
        }

        /** Add/subtract ticket counts */
        addTickets(type: 'blue' | 'red', amount: number): void {
                this.state.currencies.myTicket[type] += amount;
        }

        /** Set a character's data (full replace) */
        setCharacter(slug: string, data: CharacterData): void {
                this.state.characters[slug] = data;
        }

        /** Get a mutable character data reference (safe to mutate within the same tick) */
        getCharacter(slug: string): CharacterData | undefined {
                return this.state.characters[slug];
        }

        /** Update a character's stats by merging a partial stats object */
        updateCharacterStats(slug: string, stats: Partial<CharacterData['stats']>): void {
                const char = this.state.characters[slug];
                if (!char) return;
                this.state.characters[slug] = {
                        ...char,
                        stats: { ...char.stats, ...stats }
                };
        }

        /** Update a character's lastStaminaRecovery timestamp */
        updateCharacterStamina(slug: string, stamina: number, recoveryTime: number): void {
                const char = this.state.characters[slug];
                if (!char) return;
                this.state.characters[slug] = {
                        ...char,
                        stats: { ...char.stats, st: stamina },
                        lastStaminaRecovery: recoveryTime
                };
        }

        // ── Trained Archive ──

        /** Get the trained archive */
        get trainedArchive(): TrainedArchive { return this.state.trainedArchive; }

        /** Save a trained copy to the archive (cap at TRAINED_ARCHIVE_CAP) */
        addTrainedCopy(slug: string, trained: TrainedCopy): void {
                const archive = this.state.trainedArchive;
                // If at cap, remove oldest non-starter entry
                const keys = Object.keys(archive.trained);
                if (keys.length >= TRAINED_ARCHIVE_CAP) {
                        const nonStarter = keys.filter(k => !archive.starterCoaches.includes(k));
                        if (nonStarter.length > 0) {
                                const oldest = nonStarter.sort((a, b) => archive.trained[a].timestamp - archive.trained[b].timestamp)[0];
                                delete archive.trained[oldest];
                        } else {
                                // All entries are starters — evict oldest overall to preserve cap
                                const oldest = keys.sort((a, b) => archive.trained[a].timestamp - archive.trained[b].timestamp)[0];
                                delete archive.trained[oldest];
                        }
                }
                this.state.trainedArchive.trained[slug] = trained;
        }

        /** Get all available coaches (trained copies eligible as coaches) */
        getAvailableCoaches(): TrainedCopy[] {
                return Object.values(this.state.trainedArchive.trained);
        }

        // ── Pity ──

        /** Update pity counter */
        setPityCount(count: number): void {
                this.state.pity.count = count;
        }

        /** Increment pity */
        incrementPity(): number {
                this.state.pity.count++;
                return this.state.pity.count;
        }

        /** Update pull stats */
        updatePullStats(ssrStreak: number): void {
                this.state.stats.totalPulls++;
                this.state.stats.ssrStreak = ssrStreak;
                if (ssrStreak > this.state.stats.bestSsrStreak) {
                        this.state.stats.bestSsrStreak = ssrStreak;
                }
        }

        /** Track pull history */
        trackPullHistory(slug: string): void {
                if (!this.state.pullHistory[slug]) {
                        this.state.pullHistory[slug] = { firstPullDate: new Date().toISOString(), totalPulls: 0 };
                }
                this.state.pullHistory[slug].totalPulls++;
        }

        // ── Quests ──

        /** Update quests state */
        setQuests(quests: QuestState): void {
                this.state.quests = quests;
        }

        // ── Onboarding ──

        get onboarding(): OnboardingState { return this.state.onboarding; }

        /** Mark an onboarding step as completed */
        completeOnboardingStep(step: keyof OnboardingState): void {
                this.state.onboarding[step] = true;
                this.save();
        }

        /** Check if the welcome sequence needs to be shown */
        get needsOnboarding(): boolean {
                return !this.state.onboarding.welcome;
        }

        /** Claim daily login rewards based on current streak */
        claimDailyLogin(): { vgems: number; tickets: number } | null {
                const today = new Date().toISOString().split('T')[0];
                // Already claimed today
                if (this.state.quests.daily.claimed['daily_login_reward']) return null;
                // Must have logged in today (daily_login progress set by quest reset)
                if (!this.state.quests.daily.progress.daily_login) return null;

                const rewards = getLoginRewards(this.state.dailyLogin.streak);
                this.addCurrency('vgems', rewards.vgems);
                this.addTickets('blue', rewards.tickets);
                this.state.quests.daily.claimed['daily_login_reward'] = true;
                this.save();
                return rewards;
        }

        /** Reset all onboarding flags (replay welcome sequence) */
        resetOnboarding(): void {
                this.state.onboarding = { welcome: false, homeHint: false, gachaHint: false, liveonHint: false };
                this.save();
        }

        /** Grant starter coaches to a new player. Called once after welcome completes. */
        grantStarterCoaches(): void {
                const archive = this.state.trainedArchive;
                for (const coach of STARTER_COACHES) {
                        // Don't re-grant if already present
                        if (archive.trained[coach.slug]) continue;
                        archive.trained[coach.slug] = {
                                slug: coach.slug,
                                rarity: coach.rarity,
                                grade: coach.grade,
                                finalStats: coach.stats,
                                coachPassives: [{
                                        id: `starter-${coach.slug}`,
                                        name: coach.passive.label,
                                        description: coach.passive.desc,
                                        effect: { type: 'stat_boost', target: coach.passive.stat, value: coach.passive.stat === 'mg' ? 5 : 3 },
                                        sourceCoach: coach.slug,
                                        sourceBondLevel: 1
                                }],
                                totalSubscribers: 1200,
                                scenarioId: 'starter',
                                timestamp: Date.now(),
                                runSummary: `Trainee ${coach.name} — ${coach.title}. ${coach.tagline}`
                        };
                        if (!archive.starterCoaches.includes(coach.slug)) {
                                archive.starterCoaches.push(coach.slug);
                        }
                }
                this.save();
        }

        // ── Misc ──

        /** Deduct stamina (safe mutation) */
        deductStamina(amount: number): void {
                this.state.stamina = { ...this.state.stamina, current: Math.max(0, this.state.stamina.current - amount) };
        }

        /** Update minigame state (safe mutation) */
        updateMinigame(partial: Partial<typeof this.state.minigame>): void {
                this.state.minigame = { ...this.state.minigame, ...partial };
        }

        /** Set lastOnline timestamp */
        setLastOnline(ts: number): void {
                this.state.lastOnline = ts;
        }

        /** Set featured VTuber */
        setFeaturedVtuber(slug: string | null): void {
                this.state.featuredVtuber = slug;
        }

        destroy(): void {
                if (this._saveTimer) clearInterval(this._saveTimer);
                if (typeof window !== 'undefined') {
                        window.removeEventListener('beforeunload', this._beforeUnloadHandler);
                }
        }
}

// Singleton
export const gameStore = new GameStore();
