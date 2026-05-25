// ─── Character Stats ───────────────────────────────────

export enum Stat {
        Stamina = 'st',
        Passion = 'ps',
        Tech = 'tc',
        Charisma = 'ch',
        Voice = 'vc',
        Mgmt = 'mg'
}

export type StatMap = Record<Stat, number>;

export type StatKey = keyof typeof Stat;

export enum Rarity {
        R = 'R',
        SR = 'SR',
        SSR = 'SSR',
        UR = 'UR'
}

export interface CharacterStats {
        st: number; // Stamina (account-wide, consumed to start game modes)
        ps: number; // Passion (in-run battery, used for stream actions)
        tc: number; // Technical — gaming, OBS, tech setups
        ch: number; // Charisma — storytelling, zatsudan, crowd control
        vc: number; // Vocal — singing, karaoke, voice acting
        mg: number; // Management — agency relations, schedules, superchats
}

// ─── Character Data (per-player, persisted) ───────────

export interface CharacterData {
        owned: boolean;
        rarity: Rarity;
        echo: number; // 0-6, dupe merge count
        level: number;
        variants: string[]; // ['r'] or ['r','sr'] etc.
        shards: number;
        stats: CharacterStats; // current stats (modified by echo/level/bond)
        baseStats: CharacterStats; // max stat caps (for stamina recovery ceiling)
        bondPoints: number;
        bondLevel: number; // 0-8
        lastDateCooldown: number; // timestamp ms
        lastStaminaRecovery: number; // timestamp ms
}

// ─── Character Roster Entry (from characters.json) ───

export interface CharacterRecord {
        name: string;
        slug: string;
        url: string;
        image: string;
        agency: string;
        rarity: Rarity;
        stats: CharacterStats;
        power: number;
        rarity_data?: {
                debut: string;
                status: string;
                subscribers: number;
                longevity_pts: number;
                follower_pts: number;
                status_pts: number;
                total_pts: number;
        };
}

// ─── Currency ─────────────────────────────────────────

export interface Currencies {
        vgems: number;
        vringgit: number;
        myTicket: { blue: number; red: number };
        liveCache: number;
        // Legacy (preserved for migration, no longer generated)
        stars: number;
        starDust: number;
        starFragments: number;
        bondPoints: number;
        gems: number;
}

// ─── Trained Archive (Inspiration System) ────────────

export type RunGrade = 'B' | 'A' | 'S';

export interface CoachPassiveTag {
        id: string;
        name: string;
        description: string;
        effect: { type: string; target: string; value: number };
        sourceCoach: string;
        sourceBondLevel: number;
}

export interface TrainedCopy {
        slug: string;
        rarity: Rarity;
        grade: RunGrade;
        finalStats: CharacterStats;
        coachPassives: CoachPassiveTag[];
        totalSubscribers: number;
        scenarioId: string;
        timestamp: number;
        runSummary: string;
}

export interface TrainedArchive {
        trained: Record<string, TrainedCopy>;
        starterCoaches: string[];
}

// ─── Gacha ────────────────────────────────────────────

export type BannerType = 'standard' | 'featured';

export interface PullResult {
        character: CharacterRecord;
        rarity: Rarity;
        isNew: boolean;
        echo: number;
        liveCacheGained: number;
        vgemsBought?: number;
}

export interface GachaRates {
        R: number;
        SR: number;
        SSR: number;
        UR: number;
}

// ─── Live!ON (Training Simulator) ─────────────────────
//
// A 16-turn roguelite campaign divided into 4 Cycles of 4 Turns.
// Each cycle focuses on one stat: C1=MG, C2=VC, C3=TC, C4=CH.
// Turn 1: Practice Stream (3-round minigame)
// Turn 2: Excursion / Off-Collab (VN event, 3 choices)
// Turn 3: Free Schedule (Rest / Train / Shop)
// Turn 4: Algorithm War (5-round checkpoint boss)

/** The 4 primary stats that serve as cycle focus areas */
export type CycleFocus = 'mg' | 'vc' | 'tc' | 'ch';

/** Which phase a turn represents within a cycle */
export type TurnPhase =
        | 'practice_stream'   // Turn 1: 3-round low-stakes minigame
        | 'excursion'         // Turn 2: VN event with 3 choices
        | 'free_schedule'     // Turn 3: Rest / Train / Shop
        | 'algorithm_war'     // Turn 4: 5-round checkpoint boss
        | 'run_complete';     // Post-turn-16 results

/** Action button types generated during minigame rounds */
export type MinigameButtonType = 'clip_it' | 'standard' | 'scuffed' | 'hydration' | 'dead_air';

/** A single action button shown to the player during a minigame round */
export interface MinigameButton {
        type: MinigameButtonType;
        label: string;
        focus: CycleFocus;           // which stat this button draws from
        requirement: number;         // minimum focus-stat value to unlock
        baseHype: number;            // raw hype (before multipliers)
        psCost: number;              // negative = spend PS, positive = recover PS
        isCoachBoosted: boolean;     // coach raid turned this gold
        isTrending: boolean;         // matches chat trend (algorithm war only)
        disabled: boolean;
}

/** Result of a single minigame round */
export interface MinigameRoundResult {
        roundNumber: number;         // 1-indexed
        buttons: MinigameButton[];   // all 4 buttons offered this round
        chatTrend: CycleFocus | null;    // null for practice streams
        coachAssist: boolean;        // a coach raided this round
        isClimax: boolean;           // round 5 of algorithm war (2.0x everything)
        selectedButton: MinigameButtonType | null;
        hypeGenerated: number;
        psSpent: number;             // always <= 0 (net PS change)
}

/** Transient state for an active stream minigame (practice or algorithm war) */
export interface StreamMinigameState {
        kind: 'practice' | 'algorithm_war';
        rounds: MinigameRoundResult[];
        currentRound: number;        // 0-indexed (next round to play)
        totalRounds: number;         // 3 for practice, 5 for algorithm war
        totalHype: number;           // accumulated hype across rounds
        hypeTarget: number;          // target to beat
        isComplete: boolean;
        isVictory: boolean | null;   // null = in progress, true = met/exceeded target
}

/** Excursion (off-collab VN event) choice types */
export type ExcursionChoiceType = 'tryhard' | 'normal' | 'chill';

/** A single choice within an excursion event */
export interface ExcursionChoice {
        type: ExcursionChoiceType;
        label: string;
        description: string;
        statGain: number;            // gain to cycle focus stat
        psCost: number;              // negative = spend, positive = recover
        subGain: number;
}

/** A full excursion / off-collab VN event (Turn 2) */
export interface ExcursionEvent {
        id: string;
        title: string;
        description: string;
        focusStat: CycleFocus;
        choices: ExcursionChoice[];
        selectedChoice: ExcursionChoiceType | null;
}

/** Free schedule options (Turn 3) */
export type FreeScheduleAction = 'rest' | 'train' | 'shop';

/** In-run temporary buff item purchasable at the shop (Turn 3) */
export interface ShopItem {
        id: string;
        label: string;
        description: string;
        cost: number;                // in-run currency
        effect: {
                type: string;
                target: string;
                value: number;
                duration: 'permanent' | 'next_checkpoint' | 'one_turn';
        };
}

/** Checkpoint (Algorithm War) result tracking (Turn 4) */
export interface CheckpointState {
        cycle: number;               // 1-4
        rivalName: string;
        rivalTargetCCV: number;      // hype needed to win
        hypeAchieved: number;        // hype actually generated during this checkpoint
        isComplete: boolean;
        isVictory: boolean | null;   // null = not yet resolved
        subBonus: number;            // awarded on victory
        statPenalty: number;         // applied on loss
        psDrain: number;             // applied on loss
}

/** Per-cycle state tracking */
export interface CycleState {
        cycle: number;               // 1-4
        focus: CycleFocus;           // mg, vc, tc, ch
        turnsCompleted: number;      // 0-4
        practiceState: StreamMinigameState | null;
        excursionEvent: ExcursionEvent | null;
        freeScheduleAction: FreeScheduleAction | null;
        checkpointState: CheckpointState | null;
        totalHype: number;
        totalSubs: number;
        isComplete: boolean;
}

/** Log entry for run summary (one per turn) */
export interface TurnSubLogEntry {
        turn: number;                // 1-16
        cycle: number;               // 1-4
        phase: TurnPhase;
        subsGained: number;
        hypeGenerated: number;
        description: string;
}

/** Currency + grade rewards awarded at run end */
export interface LiveONRewards {
        vgems: number;
        vringgit: number;
        liveCache: number;
        bondExp: number;
        grade: RunGrade;
        totalSubscribers: number;
}

/** Complete Live!ON run state (transient — not persisted across sessions) */
export interface LiveONRunState {
        active: boolean;

        // ── Lead VTuber & Coach Selection ──
        lead: string | null;                            // base VTuber slug
        leadRarity: Rarity | null;                      // lead VTuber's rarity
        coaches: [string | null, string | null, string | null]; // 3 coach slugs
        coachInspirations: Record<CycleFocus, number>;  // stat bonuses passed down at turn 1
        coachPassives: CoachPassiveTag[];               // active passive tags from coaches

        // ── Stats ──
        /** Lead's original base stats (before inspirations), snapshot at run start */
        baseStats: CharacterStats;
        /** Effective stats during run (base + inspirations), mutated by events */
        effectiveStats: CharacterStats;

        // ── Run Progress ──
        turn: number;                                   // 1-16
        cycle: number;                                  // 1-4
        cycles: CycleState[];                           // length 4, one per cycle
        currentPhase: TurnPhase;                        // which type of turn is active

        // ── PS (Passion) System ──
        ps: number;
        maxPS: number;

        // ── Tracking ──
        totalHype: number;
        totalSubscribers: number;
        subLog: TurnSubLogEntry[];
        inRunCurrency: number;                          // coins for shop purchases

        // ── Active Phase States (non-null when in that phase) ──
        currentMinigame: StreamMinigameState | null;
        currentExcursion: ExcursionEvent | null;
        currentCheckpoint: CheckpointState | null;
        freeScheduleAction: FreeScheduleAction | null;
        shopItems: ShopItem[];

        // ── Run Result ──
        ending: RunGrade | null;
        rewards: LiveONRewards | null;
}

// ─── Superchat Toss (Minigame) ───────────────────────

export interface MinigameState {
        dailyPlays: number;
        lastPlayDate: string;
        highScore: number;
}

export interface ChallengeInfo {
        name: string;
        desc: string;
        completed: boolean;
        weekKey: string;
}

// ─── Quests ───────────────────────────────────────────

export interface QuestDef {
        id: string;
        label: string;
        target: number;
        reward: {
                vgems: number;
                tickets?: number;
                streakScaled?: boolean;
        };
        desc: string;
        meta?: boolean;
}

export interface QuestProgress {
        date: string;
        weekId?: string;
        progress: Record<string, number>;
        claimed: Record<string, boolean>;
}

export interface QuestState {
        daily: QuestProgress;
        weekly: QuestProgress;
}

// ─── Producer ─────────────────────────────────────────

export interface ProducerLevel {
        level: number;
        exp: number;
}

// ─── Onboarding ────────────────────────────────────

export interface OnboardingState {
        welcome: boolean;       // Welcome sequence completed
        homeHint: boolean;       // Home page hint dismissed
        gachaHint: boolean;      // Gacha page hint dismissed
        liveonHint: boolean;     // Live!ON page hint dismissed
}

// ─── Game State (root) ────────────────────────────────

export interface GameState {
        version: number;
        playerId: string;
        username: string;
        producerLevel: ProducerLevel;
        currencies: Currencies;
        characters: Record<string, CharacterData>;
        oshiList: string[];
        featuredVtuber: string | null;
        trainedArchive: TrainedArchive;
        pity: { count: number };
        stats: {
                totalPulls: number;
                ssrStreak: number;
                bestSsrStreak: number;
        };
        pullHistory: Record<string, { firstPullDate: string; totalPulls: number }>;
        milestones: string[];
        dailyLogin: {
                streak: number;
                lastClaim: string | null;
        };
        quests: QuestState;
        stamina: {
                current: number;
                lastRecovery: number;
        };
        minigame: MinigameState;
        lastOnline: number;
        onboarding: OnboardingState;
        // Internal (not saved)
        _blueTicketRemainder?: number;
}
