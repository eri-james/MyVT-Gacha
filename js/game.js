/* ═══════════════════════════════════════════════
   game.js — Core Game State, Save/Load, Tick Loop
   ═══════════════════════════════════════════════ */

const Game = (() => {
  const SAVE_KEY = 'myvt_gacha_save';
  const SAVE_VERSION = 8;
  const VGEML_PER_TICKET = 150;
  const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
  const OFFLINE_EARNINGS_CAP_HOURS = 12;

  // Studio Level thresholds
  const STATION_LEVELS = [
    { level: 1,  exp: 0,     unlocks: 'Stream Room + 2 slots' },
    { level: 2,  exp: 200,   unlocks: '+5 flat bonus to all stations' },
    { level: 3,  exp: 600,   unlocks: 'Creative Corner' },
    { level: 4,  exp: 1500,  unlocks: '+5 flat bonus (total +10)' },
    { level: 5,  exp: 3500,  unlocks: 'Practice Hall' },
    { level: 6,  exp: 7000,  unlocks: '+5 flat bonus (total +15)' },
    { level: 7,  exp: 12000, unlocks: 'Lounge' },
    { level: 8,  exp: 20000, unlocks: '+5 flat bonus (total +20)' },
    { level: 9,  exp: 35000, unlocks: '+5 flat bonus (total +25)' },
    { level: 10, exp: 60000, unlocks: '+5 flat bonus (total +30)' },
  ];

  // Station definitions — overhauled to use new economy
  const STATION_DEFS = {
    streamRoom:    { name: 'Stream Room',    resource: 'vgems',        unlockLv: 1 },
    creativeCorner:{ name: 'Creative Corner',  resource: 'vringgit',     unlockLv: 3 },
    practiceHall:  { name: 'Practice Hall',    resource: 'liveCache',    unlockLv: 5 },
    lounge:        { name: 'Lounge',           resource: 'vringgit',     unlockLv: 7 },
  };

  // Station upgrade costs: VRinggit only
  const STATION_UPGRADE_COSTS = [
    0,      // Lv 1 (base)
    200,    // Lv 2
    800,    // Lv 3
    2500,   // Lv 4
    8000,   // Lv 5
  ];

  const STATION_MULTIPLIERS = [1, 1.5, 2, 3, 5];

  // Studio EXP passive drip rates per minute (all stations produce EXP)
  const STUDIO_EXP_RATES = {
    streamRoom: 1,
    creativeCorner: 5,
    practiceHall: 10,
    lounge: 15,
  };

  // Studio EXP rarity multiplier
  const STUDIO_EXP_RARITY_MULT = { R: 1.0, SR: 1.2, SSR: 1.5, UR: 1.5 };

  // Studio flat bonus per level (+5 for most stations, +1 for Practice Hall)
  // Premium currency stations (VGems) do NOT receive flat bonus
  const STUDIO_FLAT_BONUS_PER_LEVEL = 5;
  const STUDIO_FLAT_BONUS_PRACTICE_HALL = 1;

  // Content creation system
  const CONTENT_INTERVAL = 60; // seconds between content creation ticks
  const TRENDING_ROTATION_MS = 2 * 60 * 60 * 1000; // 2 hours
  const CONTENT_LOG_MAX = 20;

  // Content types with primary/secondary stat mappings (keys must match lowercase stat keys in characters.json)
  const CONTENT_TYPES = {
    streamRoom:    { primary: 'ch', secondary: 'vc', resource: 'vgems',      baseReward: 2 },                            // VGems (reduced)
    creativeCorner:{ primary: 'tc', secondary: 'mg', resource: 'vringgit',   baseReward: 3 },                            // VRinggit
    practiceHall:  { primary: 'st', secondary: 'ps', resource: 'liveCache',  baseReward: 0.5 },                           // LiveCache
    lounge:        { primary: 'ps', secondary: 'ch', resource: 'vringgit',   baseReward: 2, bonusResource: 'liveCache', bonusAmount: 0.2 }, // VRinggit + small LiveCache
  };

  // Quality tier definitions
  const QUALITY_TIERS = [
    { tier: 'SS', minScore: 100, multiplier: 5.0, color: '#ffd700', label: 'Masterpiece' },
    { tier: 'S',  minScore: 75,  multiplier: 2.5, color: '#c77dff', label: 'Excellent' },
    { tier: 'A',  minScore: 50,  multiplier: 1.5, color: '#42a5f5', label: 'Great' },
    { tier: 'B',  minScore: 30,  multiplier: 1.0, color: '#66bb6a', label: 'Good' },
    { tier: 'C',  minScore: 15,  multiplier: 0.5, color: '#b0bec5', label: 'Normal' },
    { tier: 'D',  minScore: 0,   multiplier: 0.1, color: '#616161', label: 'Poor' },
  ];

  // Stamina costs per station level (index 0 = Lv1)
  const STAMINA_COSTS = [2, 2, 1, 1, 1];

  // Rarity multipliers (used by studio for income calc — backward compat)
  const VARIANT_MULTIPLIERS = {
    r: 1,
    sr: 2,
    ssr: 5,
    ur: 10,
  };

  // New Rarity multipliers for Gacha V2
  const RarityMultipliers = { R: 1, SR: 2, SSR: 5, UR: 10 };



  // Level caps per rarity
  const LEVEL_CAPS = {
    r: 20,
    sr: 35,
    ssr: 50,
    ur: 70,
  };

  // Level costs per level: VRinggit + LiveCache (LiveCache ~20% of VRinggit)
  function getLevelCost(variant, level) {
    const v = variant.toLowerCase();
    const base = v === 'ur' ? 50 : v === 'ssr' ? 30 : v === 'sr' ? 15 : 5;
    const mult = v === 'ur' ? 12 : v === 'ssr' ? 8 : v === 'sr' ? 5 : 3;
    const ringgitCost = base + level * mult;
    const liveCacheCost = Math.ceil(ringgitCost * 0.2);
    return [ringgitCost, liveCacheCost];
  }

  // Ascension removed — replaced by Echo system in Gacha V2
  const ASCENSION_COSTS = {};

  // Daily login rewards — overhaul currencies
  const DAILY_BASE_VGEMS = 100;
  const DAILY_INCREMENT_VGEMS = 50;
  const DAILY_CAP_VGEMS = 500;
  const DAILY_BASE_TICKETS = 1;
  const DAILY_INCREMENT_TICKETS = 0;
  const DAILY_CAP_TICKETS = 3;

  // Quest definitions
  const DAILY_QUESTS = [
    { id: 'daily_login',    label: 'Daily Login',              target: 1,  reward: { vgems: 100, streakScaled: true }, desc: 'Log in today (rewards scale with streak!)' },
    { id: 'daily_assign',   label: 'Assign a VTuber',          target: 1,  reward: { vgems: 100 }, desc: 'Assign a VTuber to any station' },
    { id: 'daily_toss',     label: 'Play Superchat Toss',      target: 1,  reward: { vgems: 100 }, desc: 'Complete a Superchat Toss round' },
    { id: 'daily_all',      label: 'Clear All Daily Quests',   target: 1,  reward: { vgems: 200, tickets: 1 }, desc: 'Claim all daily quests', meta: true },
  ];
  const WEEKLY_QUESTS = [
    { id: 'weekly_login3',  label: 'Login 3 Days',            target: 3,  reward: { vgems: 200, tickets: 1 }, desc: 'Log in on 3 different days this week' },
    { id: 'weekly_assign10',label: 'Assign to Station x10',   target: 10, reward: { vgems: 200, tickets: 1 }, desc: 'Assign VTubers to stations 10 times' },
    { id: 'weekly_toss25',  label: 'Play Toss x25',           target: 25, reward: { vgems: 200, tickets: 1 }, desc: 'Play Superchat Toss 25 times' },
    { id: 'weekly_all',     label: 'Clear All Weekly Quests', target: 1,  reward: { vgems: 500, tickets: 2 }, desc: 'Claim all weekly quests', meta: true },
  ];

  // Stamina system
  const STAMINA_MAX = 200;
  const STAMINA_RECOVERY_INTERVAL_MS = 4 * 60 * 1000; // 1 point every 4 minutes

  // Bond Level thresholds and stat rewards (GDD §9.1)
  const BOND_LEVELS = [
    { level: 1, bpRequired: 100,  statBonus: 2 },
    { level: 2, bpRequired: 250,  statBonus: 3 },
    { level: 3, bpRequired: 500,  statBonus: 3 },
    { level: 4, bpRequired: 800,  statBonus: 4 },
    { level: 5, bpRequired: 1200, statBonus: 4 },
    { level: 6, bpRequired: 1800, statBonus: 5 },
    { level: 7, bpRequired: 2500, statBonus: 5 },
    { level: 8, bpRequired: 3500, statBonus: 6 },
  ];
  const BOND_MAX_LEVEL = 8;
  const BOND_DATE_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours
  const BOND_DATE_LEVEL_REQ = 10; // VTuber must be Level 10+

  // Starting resources
  const OSHI_MAX = 6; // Maximum Oshi (favourite) slots
  const STARTING_STARS = 1000; // legacy only

  // Producer Level system (separate from Studio Level)
  const PRODUCER_MAX_LEVEL = 30;
  const PRODUCER_INITIAL_EXP_CAP = 10;
  const PRODUCER_EXP_CAP_GROWTH = 1.2; // +20% per level
  const PRODUCER_REWARD_LEVELS = [10, 15, 20, 25, 30]; // Each grants 10 blue tickets
  const PRODUCER_REWARD_TICKETS = 10;

  let state = null;
  let _tickInterval = null;
  let _autoSaveInterval = null;
  let _onStateChange = null;

  function generatePlayerId() {
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

  function createNewState() {
    return {
      version: SAVE_VERSION,
      playerId: generatePlayerId(),
      currencies: {
        // New overhaul currencies
        vgems: 1500,
        vringgit: 0,
        myTicket: { blue: 10, red: 0 },
        liveCache: 0,
        // Legacy currencies (kept for studio/minigame backward compat until Phase 4-5)
        stars: STARTING_STARS,
        starDust: 0,
        starFragments: 0,
        bondPoints: 0,
        gems: 0,
      },
      characters: {}, // slug -> { owned, rarity, echo, level, stats, baseStats, bondPoints, bondLevel, lastDateCooldown, ... }
      studio: {
        level: 1,
        exp: 0,
        stations: {
          streamRoom: { level: 1, assigned: null },
          creativeCorner: { level: 1, assigned: null },
          practiceHall: { level: 1, assigned: null },
          lounge: { level: 1, assigned: null },
        },
        contentLog: [],
        lastContentTick: Date.now(),
        trendingStat: null,
        trendingExpires: 0,
      },
      pity: { count: 0 },
      stats: {
        totalPulls: 0,
        ssrStreak: 0,
        bestSsrStreak: 0,
      },
      dailyLogin: {
        streak: 0,
        lastClaim: null,
      },
      lastOnline: Date.now(),
      milestones: [], // Track milestone rewards claimed
      pullHistory: {}, // slug -> { firstPullDate, totalPulls }
      quests: {
        daily:  { date: '', progress: {}, claimed: {} },
        weekly: { weekId: '', progress: {}, claimed: {} },
      },
      stamina: { current: STAMINA_MAX, lastRecovery: Date.now() },
      minigame: { dailyPlays: 0, lastPlayDate: null, highScore: 0 },
      oshiList: [], // Array of slugs designated as Oshi (max OSHI_MAX)
      // Landing page / Producer system
      username: 'Producer',
      featuredVtuber: null, // slug of featured VTuber on landing page
      producerLevel: { level: 1, exp: 0 },
    };
  }

  function save() {
    if (!state) return;
    state.lastOnline = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error('Save failed:', err);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        state = JSON.parse(raw);
        // Migration for future versions
        if (state.version < SAVE_VERSION) {
          state = migrateState(state);
        }
        console.log('Game loaded.');
        resetQuestsIfNeeded();
      } else {
        state = createNewState();
        save();
        console.log('New game created.');
        resetQuestsIfNeeded();
      }
    } catch (err) {
      console.error('Load failed, creating new game:', err);
      state = createNewState();
      save();
    }
    return state;
  }

  function migrateState(oldState) {
    const merged = { ...createNewState(), ...oldState, version: SAVE_VERSION }
    // Ensure new fields exist in migrated state
    if (!merged.milestones) merged.milestones = [];
    if (!merged.pullHistory) merged.pullHistory = {};
    if (!merged.minigame) merged.minigame = { dailyPlays: 0, lastPlayDate: null, highScore: 0 };
    if (!merged.stamina) merged.stamina = { current: STAMINA_MAX, lastRecovery: Date.now() };
    if (!merged.quests) merged.quests = { daily: { date: '', progress: {}, claimed: {} }, weekly: { weekId: '', progress: {}, claimed: {} } };

    // v1 → v2: Add new overhaul currencies alongside legacy ones
    if (!merged.currencies) merged.currencies = {};
    // Preserve existing legacy currencies, add new ones with defaults
    const legacyCurrencies = { stars: 0, starDust: 0, starFragments: 0, bondPoints: 0, gems: 0 };
    const newCurrencies = { vgems: 1500, vringgit: 0, myTicket: { blue: 10, red: 0 }, liveCache: 0 };
    for (const [key, def] of Object.entries(legacyCurrencies)) {
      if (merged.currencies[key] === undefined) merged.currencies[key] = def;
    }
    for (const [key, def] of Object.entries(newCurrencies)) {
      if (merged.currencies[key] === undefined) merged.currencies[key] = def;
    }
    if (typeof merged.currencies.myTicket !== 'object') {
      merged.currencies.myTicket = { blue: 10, red: 0 };
    }
    if (!merged.currencies.myTicket.blue) merged.currencies.myTicket.blue = 0;
    if (!merged.currencies.myTicket.red) merged.currencies.myTicket.red = 0;

    // v2 → v3: Studio overhaul — stations now produce overhaul currencies instead of legacy ones.
    // Station structure (level, assigned) is unchanged, so no data migration needed.
    // The STATION_DEFS, CONTENT_TYPES, upgrade costs etc. are all in constants.
    // Legacy currencies (stars, starDust, starFragments, bondPoints) are preserved but no longer generated.
    // Ensure _blueTicketRemainder exists for fractional ticket tracking
    if (merged._blueTicketRemainder === undefined) merged._blueTicketRemainder = 0;

    // v3 → v4: Add content creation system fields to studio
    if (!merged.studio) merged.studio = { level: 1, exp: 0, stations: {} };
    if (!merged.studio.contentLog) merged.studio.contentLog = [];
    if (!merged.studio.lastContentTick) merged.studio.lastContentTick = Date.now();
    if (!merged.studio.trendingStat) merged.studio.trendingStat = null;
    if (!merged.studio.trendingExpires) merged.studio.trendingExpires = 0;

    // v4 → v5: Add per-character bond system fields
    if (merged.characters) {
      for (const [slug, charData] of Object.entries(merged.characters)) {
        if (!charData) continue;
        if (charData.bondPoints === undefined) charData.bondPoints = 0;
        if (charData.bondLevel === undefined) charData.bondLevel = 0;
        if (charData.lastDateCooldown === undefined) charData.lastDateCooldown = 0;
      }
    }

    // v5 → v6: Add Oshi collection list
    if (!merged.oshiList || !Array.isArray(merged.oshiList)) merged.oshiList = [];
    merged.oshiList = merged.oshiList.filter(slug => {
      const cd = merged.characters[slug];
      return cd && cd.owned;
    });
    if (merged.oshiList.length > OSHI_MAX) merged.oshiList.length = OSHI_MAX;

    // v7 → v8: Add producer system fields + featured VTuber
    if (!merged.producerLevel) merged.producerLevel = { level: 1, exp: 0 };
    if (merged.username === undefined) merged.username = 'Producer';
    if (merged.featuredVtuber === undefined) merged.featuredVtuber = null;

    // v6 → v7: Normalize stat keys to lowercase (bug: echo gains used uppercase ST/TC/etc
    // but JSON base stats use lowercase st/tc/etc, causing display to miss echo bonuses)
    if (merged.characters) {
      const statKeyMap = { ST: 'st', PS: 'ps', TC: 'tc', CH: 'ch', VC: 'vc', MG: 'mg' };
      for (const charData of Object.values(merged.characters)) {
        if (!charData || !charData.stats) continue;
        for (const [upper, lower] of Object.entries(statKeyMap)) {
          if (charData.stats[upper] !== undefined) {
            charData.stats[lower] = (charData.stats[lower] || 0) + charData.stats[upper];
            delete charData.stats[upper];
          }
        }
        if (charData.baseStats) {
          for (const [upper, lower] of Object.entries(statKeyMap)) {
            if (charData.baseStats[upper] !== undefined) {
              charData.baseStats[lower] = (charData.baseStats[lower] || 0) + charData.baseStats[upper];
              delete charData.baseStats[upper];
            }
          }
        }
      }
    }

    // Migrate existing characters: add rarity field from characters.json
    if (merged.characters) {
      for (const [slug, charData] of Object.entries(merged.characters)) {
        if (charData && charData.owned && !charData.rarity) {
          const charInfo = DataLoader.getBySlug(slug);
          charData.rarity = charInfo ? charInfo.rarity : 'R';
          // Add echo and stats if missing
          if (charData.echo === undefined) charData.echo = 0;
          if (!charData.stats) {
            charData.stats = charInfo && charInfo.stats ? { ...charInfo.stats } : { st: 10, ps: 10, tc: 5, ch: 5, vc: 5, mg: 5 };
          }
          if (!charData.baseStats) {
            charData.baseStats = charInfo && charInfo.stats ? { ...charInfo.stats } : { ...charData.stats };
          }
          // Map legacy variants to rarity for backward compat
          if (!charData.variants || charData.variants.length === 0) {
            const rarityToLower = charData.rarity ? charData.rarity.toLowerCase() : 'normal';
            if (rarityToLower === 'r' || rarityToLower === 'normal') charData.variants = ['r'];
            else if (rarityToLower === 'sr') charData.variants = ['sr'];
            else if (rarityToLower === 'ssr') charData.variants = ['ssr'];
            else if (rarityToLower === 'ur') charData.variants = ['ur'];
            else charData.variants = ['r'];
          }
          if (charData.shards === undefined) charData.shards = 0;
        }
        // v4 → v5: Add VTuber stamina recovery tracking (all owned, not just unmigrated)
        if (charData.owned && charData.lastStaminaRecovery === undefined) {
          charData.lastStaminaRecovery = Date.now();
        }
        // Migrate 'normal' variant → 'r' for all existing saves
        if (charData.variants && charData.variants.includes('normal')) {
          charData.variants = charData.variants.map(v => v === 'normal' ? 'r' : v);
        }
      }
    }

    return merged;
  }

  function getState() { return state; }

  function resetState() {
    if (!confirm('Are you sure you want to reset ALL game data? This cannot be undone!')) return false;
    state = createNewState();
    save();
    if (_onStateChange) _onStateChange();
    return true;
  }

  // ═══════════════════════════════════════════════
  //  CONTENT CREATION SYSTEM (Phase 4 — Studio Overhaul)
  // ═══════════════════════════════════════════════

  // Get current trending stat (rotates every 2 hours)
  function getTrendingStat() {
    const now = Date.now();
    // Normalize legacy uppercase trending stat from older saves
    if (state.studio.trendingStat && state.studio.trendingStat !== state.studio.trendingStat.toLowerCase()) {
      state.studio.trendingStat = state.studio.trendingStat.toLowerCase();
    }
    if (!state.studio.trendingStat || !state.studio.trendingExpires || now >= state.studio.trendingExpires) {
      // Only growth stats can trend — ST/PS are expendable (HP/SP) and excluded
      const trendableStats = ['tc', 'ch', 'vc', 'mg'];
      state.studio.trendingStat = trendableStats[Math.floor(Math.random() * trendableStats.length)];
      state.studio.trendingExpires = now + TRENDING_ROTATION_MS;
    }
    return state.studio.trendingStat;
  }

  // Get time remaining on current trending stat (ms)
  function getTrendingTimeRemaining() {
    const now = Date.now();
    if (!state.studio.trendingExpires) return 0;
    return Math.max(0, state.studio.trendingExpires - now);
  }

  // Calculate content quality for a station
  function getContentQuality(stationId) {
    const station = state.studio.stations[stationId];
    const def = CONTENT_TYPES[stationId];
    if (!station || !def || !station.assigned) return null;

    const charData = state.characters[station.assigned];
    if (!charData || !charData.stats) return null;

    const stats = charData.stats;
    const primaryStat = stats[def.primary] || 0;
    const secondaryStat = stats[def.secondary] || 0;

    // Average of all other stats (not primary or secondary)
    const otherStatKeys = Object.keys(stats).filter(k => k !== def.primary && k !== def.secondary);
    const avgOtherStats = otherStatKeys.length > 0
      ? otherStatKeys.reduce((sum, k) => sum + (stats[k] || 0), 0) / otherStatKeys.length
      : 0;

    const levelBonus = 1 + (charData.level || 0) * 0.02;
    const stationMult = STATION_MULTIPLIERS[(station.level || 1) - 1] || 1;

    // Trending bonus
    const trending = getTrendingStat();
    let trendingBonus = 1;
    if (trending === def.primary || trending === def.secondary) {
      trendingBonus = 1.5;
    }

    const statScore = (primaryStat * 0.6 + secondaryStat * 0.3 + avgOtherStats * 0.1) * levelBonus * stationMult * trendingBonus;

    // Determine quality tier
    let quality = QUALITY_TIERS[QUALITY_TIERS.length - 1]; // default D
    for (const qt of QUALITY_TIERS) {
      if (statScore >= qt.minScore) {
        quality = qt;
        break;
      }
    }

    return {
      statScore: Math.round(statScore * 10) / 10,
      quality: quality.tier,
      qualityMultiplier: quality.multiplier,
      qualityColor: quality.color,
      qualityLabel: quality.label,
      trendingMatch: trendingBonus > 1,
      trendingStat: trending,
    };
  }

  // Generate content for a station (one piece)
  function generateContent(stationId) {
    const station = state.studio.stations[stationId];
    const def = CONTENT_TYPES[stationId];
    const stationDef = STATION_DEFS[stationId];
    if (!station || !def || !station.assigned) return null;
    if (state.studio.level < stationDef.unlockLv) return null;

    const charData = state.characters[station.assigned];
    if (!charData) return null;

    // Check VTuber stamina (their ST stat)
    const staminaCost = STAMINA_COSTS[(station.level || 1) - 1] || 8;
    recoverVTuberStamina(station.assigned);
    const currentST = charData.stats ? (charData.stats.st || 0) : 0;
    if (currentST < staminaCost) return null;

    // Studio flat bonus (after multipliers) — NOT applied to premium currency (VGems)
    const studioLv = state.studio.level;
    const flatBonus = stationId === 'streamRoom'
      ? 0
      : stationId === 'practiceHall'
        ? (studioLv - 1) * STUDIO_FLAT_BONUS_PRACTICE_HALL
        : (studioLv - 1) * STUDIO_FLAT_BONUS_PER_LEVEL;

    // Calculate quality BEFORE consuming stamina
    const quality = getContentQuality(stationId);
    if (!quality) return null;

    // Consume VTuber stamina (deplete ST stat)
    charData.stats.st -= staminaCost;
    if (charData.stats.st < 0) charData.stats.st = 0;

    // Auto-remove VTuber from station when ST reaches 0
    if (charData.stats.st <= 0) {
      station.assigned = null;
      // Start recovery timer from this moment
      charData.lastStaminaRecovery = Date.now();
    }

    // Rarity multiplier
    const rarityMult = RarityMultipliers[charData.rarity] || 1;

    // Station level multiplier & VTuber level bonus (synced with offline formula)
    const stationMult = STATION_MULTIPLIERS[(station.level || 1) - 1] || 1;
    const levelBonus = 1 + (charData.level || 0) * 0.02;

    // Calculate rewards (synced with offline: baseReward × quality × rarity × stationMult × levelBonus + flatBonus)
    const baseReward = def.baseReward;
    const finalReward = baseReward * quality.qualityMultiplier * rarityMult * stationMult * levelBonus + flatBonus;

    const rewards = {};
    rewards[def.resource] = finalReward;

    // Lounge produces bonus LiveCache
    if (def.bonusResource) {
      rewards[def.bonusResource] = (rewards[def.bonusResource] || 0) + (def.bonusAmount * quality.qualityMultiplier * rarityMult * stationMult * levelBonus);
    }

    // Apply rewards
    if (rewards.vgems) {
      state.currencies.vgems += Math.floor(rewards.vgems);
    }
    if (rewards.vringgit) {
      state.currencies.vringgit += Math.floor(rewards.vringgit);
    }
    if (rewards.liveCache) {
      state.currencies.liveCache += Math.floor(rewards.liveCache);
    }
    if (rewards.blueTicket) {
      // Blue tickets are fractional — track remainder
      const blueWhole = Math.floor(rewards.blueTicket);
      const blueFrac = rewards.blueTicket - blueWhole;
      state.currencies.myTicket.blue += blueWhole;
      if (!state._blueTicketRemainder) state._blueTicketRemainder = 0;
      state._blueTicketRemainder += blueFrac;
      if (state._blueTicketRemainder >= 1) {
        const carry = Math.floor(state._blueTicketRemainder);
        state.currencies.myTicket.blue += carry;
        state._blueTicketRemainder -= carry;
      }
    }

    // Create log entry
    const charInfo = DataLoader.getBySlug(station.assigned);
    const entry = {
      timestamp: Date.now(),
      stationId: stationId,
      stationName: stationDef.name,
      charSlug: station.assigned,
      charName: charInfo ? charInfo.name : station.assigned,
      charImage: charInfo ? DataLoader.getImageUrl(charInfo.slug) : '',
      quality: quality.quality,
      qualityColor: quality.qualityColor,
      qualityLabel: quality.qualityLabel,
      qualityMultiplier: quality.qualityMultiplier,
      rewards: { ...rewards },
      trendingMatch: quality.trendingMatch,
      staminaCost: staminaCost,
      flatBonus: flatBonus,
    };

    // Add to content log (keep last 20)
    state.studio.contentLog.unshift(entry);
    if (state.studio.contentLog.length > CONTENT_LOG_MAX) {
      state.studio.contentLog.length = CONTENT_LOG_MAX;
    }

    return entry;
  }

  // Process content tick — called every CONTENT_INTERVAL seconds
  function processContentTick() {
    const maxSlots = getMaxSlots();
    let slotCount = 0;
    let created = 0;
    let removed = false;

    for (const [stationId, stationDef] of Object.entries(STATION_DEFS)) {
      if (slotCount >= maxSlots) break;
      const station = state.studio.stations[stationId];
      if (!station || !station.assigned) continue;
      if (state.studio.level < stationDef.unlockLv) continue;

      const wasAssigned = station.assigned;
      const entry = generateContent(stationId);
      if (entry) created++;
      // Track auto-removal (VTuber exhausted)
      if (!station.assigned && wasAssigned) removed = true;
      slotCount++;
    }

    state.studio.lastContentTick = Date.now();

    if (created > 0 || removed) {
      save();
      if (_onStateChange) _onStateChange();
    }
  }

  // Get content log (last N entries)
  function getContentLog(count) {
    const log = state.studio.contentLog || [];
    return count ? log.slice(0, count) : log;
  }

  // Get quality distribution from content log
  function getQualityDistribution() {
    const log = state.studio.contentLog || [];
    const dist = {};
    for (const entry of log) {
      dist[entry.quality] = (dist[entry.quality] || 0) + 1;
    }
    return dist;
  }

  // Calculate offline earnings based on content creation
  function getOfflineEarnings() {
    if (!state || !state.lastOnline) return null;
    const now = Date.now();
    const elapsed = now - state.lastOnline;
    const maxMs = OFFLINE_EARNINGS_CAP_HOURS * 60 * 60 * 1000;
    const cappedMs = Math.min(elapsed, maxMs);
    const minutes = cappedMs / 60000;
    if (minutes < 1) return null;

    const earnings = calculateOfflineContentEarnings(minutes);
    return { minutes: Math.round(minutes), earnings, totalMs: elapsed };
  }

  // Calculate offline content earnings (pure — does NOT mutate state)
  function calculateOfflineContentEarnings(minutes) {
    const earnings = { vgems: 0, vringgit: 0, liveCache: 0, studioExp: 0, contentPieces: 0, stationPieces: {} };
    const contentCycles = Math.floor(minutes); // 1 per minute
    if (contentCycles <= 0) return earnings;

    const recoveryPerMin = (STAMINA_RECOVERY_INTERVAL_MS > 0) ? (60000 / STAMINA_RECOVERY_INTERVAL_MS) : 0;

    const maxSlots = getMaxSlots();
    let slotCount = 0;

    for (const [stationId, stationDef] of Object.entries(STATION_DEFS)) {
      if (slotCount >= maxSlots) break;
      const station = state.studio.stations[stationId];
      if (!station || !station.assigned) continue;
      if (state.studio.level < stationDef.unlockLv) continue;

      const charData = state.characters[station.assigned];
      if (!charData) { slotCount++; continue; }

      const def = CONTENT_TYPES[stationId];
      if (!def) { slotCount++; continue; }

      const staminaCost = STAMINA_COSTS[(station.level || 1) - 1] || 8;

      // Per-VTuber stamina: current ST + offline recovery
      const maxST = charData.baseStats ? (charData.baseStats.st || 0) : 0;
      const currentST = charData.stats ? (charData.stats.st || 0) : 0;
      const stAfterRecovery = Math.min(maxST, currentST + Math.floor(recoveryPerMin * minutes));
      const maxPieces = Math.floor(stAfterRecovery / staminaCost);
      const actualPieces = Math.min(contentCycles, maxPieces);

      if (actualPieces <= 0) { slotCount++; continue; }

      // Track per-station piece count for accurate ST deduction on claim
      earnings.stationPieces[stationId] = actualPieces;

      // Calculate rewards using base stats (offline quality = B tier)
      const stats = charData.baseStats || {};
      const levelBonus = 1 + (charData.level || 0) * 0.02;
      const stationMult = STATION_MULTIPLIERS[(station.level || 1) - 1] || 1;
      const rarityMult = RarityMultipliers[charData.rarity] || 1;

      const qualityMult = 1.0; // B tier

      // Studio flat bonus per level (NOT applied to premium currency VGems)
      const flatBonus = stationId === 'streamRoom'
        ? 0
        : stationId === 'practiceHall'
          ? (state.studio.level - 1) * STUDIO_FLAT_BONUS_PRACTICE_HALL
          : (state.studio.level - 1) * STUDIO_FLAT_BONUS_PER_LEVEL;

      const perPieceReward = def.baseReward * qualityMult * rarityMult * stationMult * levelBonus + flatBonus;
      const totalReward = perPieceReward * actualPieces;

      if (def.resource === 'vgems') earnings.vgems += Math.floor(totalReward);
      else if (def.resource === 'vringgit') earnings.vringgit += Math.floor(totalReward);
      else if (def.resource === 'liveCache') earnings.liveCache += totalReward;

      // Lounge bonus LiveCache
      if (def.bonusResource === 'liveCache' && def.bonusAmount) {
        earnings.liveCache += Math.floor(def.bonusAmount * qualityMult * rarityMult * stationMult * levelBonus * actualPieces);
      }

      // Passive studio EXP drip (runs for full offline duration regardless of stamina)
      const expRate = (STUDIO_EXP_RATES[stationId] || 0) * (STUDIO_EXP_RARITY_MULT[charData.rarity] || 1.0);
      earnings.studioExp += Math.floor(expRate * minutes);

      earnings.contentPieces += actualPieces;
      slotCount++;
    }

    return earnings;
  }

  function claimOfflineEarnings() {
    const offline = getOfflineEarnings();
    if (!offline) return null;
    return applyOfflineEarnings(offline);
  }

  // Accept pre-calculated offline result (avoids race condition with tick loop)
  function claimCachedOfflineEarnings(offline) {
    if (!offline || !offline.earnings) return null;
    return applyOfflineEarnings(offline);
  }

  function applyOfflineEarnings(offline) {
    // Apply overhaul currency earnings
    state.currencies.vgems += Math.floor(offline.earnings.vgems || 0);
    state.currencies.vringgit += Math.floor(offline.earnings.vringgit || 0);
    state.currencies.liveCache += Math.floor(offline.earnings.liveCache || 0);
    // Blue tickets are fractional — track remainder
    const blueWhole = Math.floor(offline.earnings.blueTicket || 0);
    const blueFrac = (offline.earnings.blueTicket || 0) - blueWhole;
    state.currencies.myTicket.blue += blueWhole;
    if (!state._blueTicketRemainder) state._blueTicketRemainder = 0;
    state._blueTicketRemainder += blueFrac;
    if (state._blueTicketRemainder >= 1) {
      const carry = Math.floor(state._blueTicketRemainder);
      state.currencies.myTicket.blue += carry;
      state._blueTicketRemainder -= carry;
    }

    addStudioExp(Math.floor(offline.earnings.studioExp || 0));

    // Deduct VTuber stamina used offline (per-station accurate)
    if (offline.earnings.contentPieces > 0 && offline.earnings.stationPieces) {
      const maxSlots = getMaxSlots();
      let slotCount = 0;
      for (const [stationId, stationDef] of Object.entries(STATION_DEFS)) {
        if (slotCount >= maxSlots) break;
        const station = state.studio.stations[stationId];
        if (!station || !station.assigned) { slotCount++; continue; }
        if (state.studio.level < stationDef.unlockLv) { slotCount++; continue; }
        if (!offline.earnings.stationPieces[stationId]) { slotCount++; continue; }

        const charData = state.characters[station.assigned];
        if (!charData) { slotCount++; continue; }

        const staminaCost = STAMINA_COSTS[(station.level || 1) - 1] || 8;
        const actualPieces = offline.earnings.stationPieces[stationId];
        const stUsed = actualPieces * staminaCost;
        if (!charData.stats) charData.stats = {};
        charData.stats.st = Math.max(0, (charData.stats.st || 0) - stUsed);

        // Auto-remove if VTuber is exhausted
        if (charData.stats.st <= 0) {
          station.assigned = null;
          charData.lastStaminaRecovery = Date.now();
        }
        slotCount++;
      }
    }

    // Add offline summary to content log
    if (offline.earnings.contentPieces > 0) {
      state.studio.contentLog.unshift({
        timestamp: Date.now(),
        stationId: 'offline',
        stationName: 'Offline',
        charSlug: null,
        charName: 'Offline Summary',
        charImage: '',
        quality: 'B',
        qualityColor: '#66bb6a',
        qualityLabel: 'Offline',
        qualityMultiplier: 1.0,
        rewards: {
          vgems: Math.floor(offline.earnings.vgems || 0),
          vringgit: Math.floor(offline.earnings.vringgit || 0),
          liveCache: Math.floor(offline.earnings.liveCache || 0),
          studioExp: Math.floor(offline.earnings.studioExp || 0),
        },
        trendingMatch: false,
        staminaCost: 0,
        isOffline: true,
        contentPieces: offline.earnings.contentPieces,
      });
      if (state.studio.contentLog.length > CONTENT_LOG_MAX) {
        state.studio.contentLog.length = CONTENT_LOG_MAX;
      }
    }

    state.lastOnline = Date.now();
    save();
    if (_onStateChange) _onStateChange();
    return offline;
  }

  // Studio EXP
  function addStudioExp(amount) {
    state.studio.exp += amount;
    while (true) {
      const nextLevel = STATION_LEVELS.find(l => l.level === state.studio.level + 1);
      if (!nextLevel || state.studio.exp < nextLevel.exp) break;
      state.studio.level = nextLevel.level;
    }
  }

  // Get estimated income per content cycle (60s) for all active stations
  function getTotalIncome() {
    const earnings = { vgems: 0, vringgit: 0, liveCache: 0 };
    for (const [stationId, stationDef] of Object.entries(STATION_DEFS)) {
      if (stationDef.resource === 'studioExp') continue; // Studio EXP not a currency
      const station = state.studio.stations[stationId];
      if (!station || !station.assigned) continue;
      if (state.studio.level < stationDef.unlockLv) continue;
      const income = getStationIncome(stationId);
      earnings[stationDef.resource] += income;
    }
    return earnings;
  }

  // Get total estimated income per content cycle
  function getTotalIncomePerMin() {
    const earnings = getTotalIncome();
    return earnings.vgems + earnings.vringgit + earnings.liveCache;
  }

  // Get breakdown of station incomes for display (quality-based)
  function getStationIncomeBreakdown() {
    const breakdown = [];
    for (const [stationId, stationDef] of Object.entries(STATION_DEFS)) {
      const station = state.studio.stations[stationId];
      const isLocked = state.studio.level < stationDef.unlockLv;
      if (!station || isLocked) continue;

      let income = 0;
      let quality = null;
      const assignedChar = station.assigned ? DataLoader.getBySlug(station.assigned) : null;

      if (station.assigned) {
        quality = getContentQuality(stationId);
        if (quality) {
          const charData = state.characters[station.assigned];
          const rarityMult = RarityMultipliers[charData.rarity] || 1;
          const def = CONTENT_TYPES[stationId];
          const baseReward = def ? def.baseReward : 0;
          const stationMult = STATION_MULTIPLIERS[(station.level || 1) - 1] || 1;
          const levelBonus = 1 + (charData.level || 0) * 0.02;
          const flatBonus = stationId === 'streamRoom'
            ? 0
            : stationId === 'practiceHall'
              ? (state.studio.level - 1) * STUDIO_FLAT_BONUS_PRACTICE_HALL
              : (state.studio.level - 1) * STUDIO_FLAT_BONUS_PER_LEVEL;
          income = baseReward * quality.qualityMultiplier * rarityMult * stationMult * levelBonus + flatBonus;
        }
      }

      breakdown.push({
        stationId,
        name: stationDef.name,
        resource: stationDef.resource,
        income,
        assigned: !!station.assigned,
        assignedCharName: assignedChar ? assignedChar.name : null,
        level: station.level,
        isMaxLevel: station.level >= 5,
        quality: quality ? quality.quality : null,
        qualityColor: quality ? quality.qualityColor : null,
      });
    }
    return breakdown;
  }

  function getStudioExpProgress() {
    const current = STATION_LEVELS.find(l => l.level === state.studio.level);
    const next = STATION_LEVELS.find(l => l.level === state.studio.level + 1);
    if (!next) return { current: state.studio.exp, required: state.studio.exp, pct: 100 };
    return {
      current: state.studio.exp - (current ? current.exp : 0),
      required: next.exp - (current ? current.exp : 0),
      pct: ((state.studio.exp - (current ? current.exp : 0)) / (next.exp - (current ? current.exp : 0))) * 100,
    };
  }

  // ═══════════════════════════════════════════════
  //  QUEST SYSTEM
  // ═══════════════════════════════════════════════

  function getISOWeekId() {
    const d = new Date();
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const wk = Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(wk).padStart(2, '0')}`;
  }

  function resetQuestsIfNeeded() {
    if (!state.quests) {
      state.quests = { daily: { date: '', progress: {}, claimed: {} }, weekly: { weekId: '', progress: {}, claimed: {} } };
    }
    const today = new Date().toISOString().split('T')[0];
    const weekId = getISOWeekId();

    // Daily reset
    if (state.quests.daily.date !== today) {
      const wasDate = state.quests.daily.date;
      state.quests.daily = { date: today, progress: {}, claimed: {} };
      // Auto-increment login quests on new day
      if (wasDate !== today) {
        state.quests.daily.progress['daily_login'] = 1;
        state.quests.weekly.progress['weekly_login3'] = (state.quests.weekly.progress['weekly_login3'] || 0) + 1;
      }
    }

    // Weekly reset
    if (state.quests.weekly.weekId !== weekId) {
      state.quests.weekly = { weekId, progress: {}, claimed: {} };
      // Re-count today's login for the new week
      state.quests.weekly.progress['weekly_login3'] = (state.quests.daily.progress['daily_login'] || 0);
    }
  }

  function incrementQuestProgress(category, questId, amount) {
    resetQuestsIfNeeded();
    const q = state.quests[category];
    if (!q || q.claimed[questId]) return;
    q.progress[questId] = (q.progress[questId] || 0) + (amount || 1);
  }

  function canClaimMeta(category) {
    const defs = category === 'daily' ? DAILY_QUESTS : WEEKLY_QUESTS;
    const q = state.quests[category];
    return defs.filter(d => !d.meta).every(d => q.claimed[d.id]);
  }

  function claimQuest(category, questId) {
    resetQuestsIfNeeded();
    const defs = category === 'daily' ? DAILY_QUESTS : WEEKLY_QUESTS;
    const def = defs.find(q => q.id === questId);
    const q = state.quests[category];
    if (!def || q.claimed[questId]) return null;

    // Meta quest: only claimable after all non-meta quests are claimed
    if (def.meta && !canClaimMeta(category)) return null;

    let vgems = def.reward.vgems || 0;
    let tickets = def.reward.tickets || 0;

    // Login quest: delegate to existing claimDailyLogin() for streak logic
    if (questId === 'daily_login') {
      const lr = claimDailyLogin();
      if (!lr) return null;
      vgems = lr.vgems;
      tickets = lr.tickets;
    } else {
      state.currencies.vgems += vgems;
      if (tickets > 0) state.currencies.myTicket.blue += tickets;
    }

    q.claimed[questId] = true;

    // Auto-complete meta quest progress when all non-meta quests are claimed
    if (!def.meta && canClaimMeta(category)) {
      const metaId = category === 'daily' ? 'daily_all' : 'weekly_all';
      q.progress[metaId] = (q.progress[metaId] || 0) + 1;
    }

    save();
    if (_onStateChange) _onStateChange();
    return { vgems, tickets };
  }

  function getQuestsData() {
    resetQuestsIfNeeded();
    return {
      daily: DAILY_QUESTS.map(d => ({
        ...d,
        progress: Math.min(state.quests.daily.progress[d.id] || 0, d.target),
        claimed: !!state.quests.daily.claimed[d.id],
        completed: (state.quests.daily.progress[d.id] || 0) >= d.target,
        loginReward: d.id === 'daily_login' ? getDailyLoginReward() : null,
        metaReady: d.meta ? canClaimMeta('daily') : false,
      })),
      weekly: WEEKLY_QUESTS.map(d => ({
        ...d,
        progress: Math.min(state.quests.weekly.progress[d.id] || 0, d.target),
        claimed: !!state.quests.weekly.claimed[d.id],
        completed: (state.quests.weekly.progress[d.id] || 0) >= d.target,
        metaReady: d.meta ? canClaimMeta('weekly') : false,
      })),
      loginStreak: state.dailyLogin.streak,
    };
  }

  // Daily login (read-only — does NOT mutate state)
  function getDailyLoginReward() {
    const today = new Date().toISOString().split('T')[0];
    if (state.dailyLogin.lastClaim === today) return null;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let projectedStreak;
    if (state.dailyLogin.lastClaim === yesterday) {
      projectedStreak = state.dailyLogin.streak + 1;  // READ ONLY
    } else {
      projectedStreak = 1;
    }

    const vgemsReward = Math.min(DAILY_BASE_VGEMS + (projectedStreak - 1) * DAILY_INCREMENT_VGEMS, DAILY_CAP_VGEMS);
    const ticketsReward = Math.min(DAILY_BASE_TICKETS + (projectedStreak - 1) * DAILY_INCREMENT_TICKETS, DAILY_CAP_TICKETS);
    return { streak: projectedStreak, vgems: vgemsReward, tickets: ticketsReward };
  }

  function claimDailyLogin() {
    const reward = getDailyLoginReward();
    if (!reward) return null;

    // NOW mutate state
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (state.dailyLogin.lastClaim === yesterday) {
      state.dailyLogin.streak++;
    } else {
      state.dailyLogin.streak = 1;
    }

    // Award overhaul currencies
    state.currencies.vgems += reward.vgems;
    state.currencies.myTicket.blue += reward.tickets;
    state.dailyLogin.lastClaim = new Date().toISOString().split('T')[0];
    save();
    if (_onStateChange) _onStateChange();
    return reward;
  }

  // Helper: best variant (maps rarity to variant for studio compat)
  function getBestVariant(variants) {
    if (!variants || variants.length === 0) return 'r';
    if (variants.includes('ur')) return 'ur';
    if (variants.includes('ssr')) return 'ssr';
    if (variants.includes('sr')) return 'sr';
    return 'r';
  }

  // Helper: get character rarity from DataLoader
  function getCharacterRarity(slug) {
 const charInfo = DataLoader.getBySlug(slug);
    return charInfo ? charInfo.rarity : 'R';
  }

  // Helper: get rarity counts for owned characters
  function getRarityCounts() {
    const stats = getCollectionStats();
    return { R: stats.R, SR: stats.SR, SSR: stats.SSR, UR: stats.UR, total: stats.owned };
  }

  // ── Currency Helpers (Gacha V2) ──
  function addCurrency(currencyId, amount) {
    if (currencyId === 'myTicket') {
      // amount should be { blue: n, red: n } or just add to blue
      if (typeof amount === 'object') {
        state.currencies.myTicket.blue += amount.blue || 0;
        state.currencies.myTicket.red += amount.red || 0;
      } else {
        state.currencies.myTicket.blue += amount;
      }
    } else {
      state.currencies[currencyId] = (state.currencies[currencyId] || 0) + amount;
    }
  }

  function spendCurrency(currencyId, amount) {
    if (currencyId === 'myTicket') {
      // amount should be { blue: n, red: n }
      if (typeof amount === 'object') {
        const blueAvail = state.currencies.myTicket.blue || 0;
        const redAvail = state.currencies.myTicket.red || 0;
        if (blueAvail < (amount.blue || 0)) return false;
        if (redAvail < (amount.red || 0)) return false;
        state.currencies.myTicket.blue -= amount.blue || 0;
        state.currencies.myTicket.red -= amount.red || 0;
        return true;
      }
    }
    if ((state.currencies[currencyId] || 0) < amount) return false;
    state.currencies[currencyId] -= amount;
    return true;
  }

  function getTicketCount(type) {
    return state.currencies.myTicket ? (state.currencies.myTicket[type] || 0) : 0;
  }

  function addLiveCache(amount) {
    state.currencies.liveCache = (state.currencies.liveCache || 0) + amount;
  }

  function buyTicketsWithVGems(count, type) {
    const cost = count * VGEML_PER_TICKET;
    if ((state.currencies.vgems || 0) < cost) return false;
    state.currencies.vgems -= cost;
    if (!state.currencies.myTicket) state.currencies.myTicket = { blue: 0, red: 0 };
    state.currencies.myTicket[type || 'blue'] = (state.currencies.myTicket[type || 'blue'] || 0) + count;
    save();
    if (_onStateChange) _onStateChange();
    return true;
  }

  function spendTickets(count, type) {
    if (!state.currencies.myTicket) return false;
    const available = state.currencies.myTicket[type] || 0;
    if (available < count) return false;
    state.currencies.myTicket[type] -= count;
    return true;
  }

  // Export/Import save code
  function exportSaveCode() {
    const json = JSON.stringify(state);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return b64;
  }

  function importSaveCode(code) {
    try {
      const json = decodeURIComponent(escape(atob(code.trim())));
      const imported = JSON.parse(json);
      if (!imported.version || !imported.playerId) throw new Error('Invalid save data');
      state = migrateState(imported);
      save();
      if (_onStateChange) _onStateChange();
      return true;
    } catch (err) {
      console.error('Import failed:', err);
      return false;
    }
  }

  // ── Stamina System ──
  function recoverStamina() {
    if (!state.stamina) state.stamina = { current: STAMINA_MAX, lastRecovery: Date.now() };
    const now = Date.now();
    const elapsed = now - (state.stamina.lastRecovery || now);
    const pointsToAdd = Math.floor(elapsed / STAMINA_RECOVERY_INTERVAL_MS);
    if (pointsToAdd > 0) {
      state.stamina.current = Math.min(STAMINA_MAX, state.stamina.current + pointsToAdd);
      state.stamina.lastRecovery += pointsToAdd * STAMINA_RECOVERY_INTERVAL_MS;
    }
  }

  function useStamina(amount) {
    recoverStamina();
    if (state.stamina.current < amount) return false;
    state.stamina.current -= amount;
    save();
    return true;
  }

  function getStamina() {
    recoverStamina();
    return {
      current: state.stamina.current,
      max: STAMINA_MAX,
      isFull: state.stamina.current >= STAMINA_MAX,
    };
  }

  function getStaminaTimeToNext() {
    if (!state.stamina) return 0;
    recoverStamina();
    if (state.stamina.current >= STAMINA_MAX) return 0;
    const sinceLast = Date.now() - (state.stamina.lastRecovery || Date.now());
    return Math.max(0, STAMINA_RECOVERY_INTERVAL_MS - sinceLast);
  }

  // ═══════════════════════════════════════════════
  //  VTUBER STAMINA & PASSION SYSTEM (Phase 4 — Per-Character)
  // ═══════════════════════════════════════════════
  // Each VTuber's ST (stamina) and PS (passion) are their resource pools.
  // Max = baseStats values. Recovery: 1 point each per STAMINA_RECOVERY_INTERVAL_MS.
  // Only recovers while OFF station. Tea: +20 ST. Coffee: +60 ST.

  function recoverVTuberStamina(slug) {
    const charData = state.characters[slug];
    if (!charData || !charData.stats) return;

    // Skip recovery if assigned to a station
    if (getCharacterStation(slug)) return;

    const maxST = charData.baseStats ? (charData.baseStats.st || 0) : 0;
    const maxPS = charData.baseStats ? (charData.baseStats.ps || 0) : 0;

    // Ensure current ST/PS never exceed the new max (from echo/level-up upgrades)
    if (charData.stats.st > maxST) charData.stats.st = maxST;
    if (charData.stats.ps > maxPS) charData.stats.ps = maxPS;

    const currentST = charData.stats.st || 0;
    const currentPS = charData.stats.ps || 0;

    // Nothing to recover if both are at max
    if (currentST >= maxST && currentPS >= maxPS) return;

    const now = Date.now();
    // Initialize lastStaminaRecovery if missing (ensures offline time is counted)
    if (!charData.lastStaminaRecovery) {
      charData.lastStaminaRecovery = now;
      return;
    }
    const lastRecovery = charData.lastStaminaRecovery;
    const elapsed = now - lastRecovery;
    const pointsToAdd = Math.floor(elapsed / STAMINA_RECOVERY_INTERVAL_MS);

    if (pointsToAdd > 0) {
      if (currentST < maxST) {
        charData.stats.st = Math.min(maxST, currentST + pointsToAdd);
      }
      if (currentPS < maxPS) {
        charData.stats.ps = Math.min(maxPS, currentPS + pointsToAdd);
      }
      charData.lastStaminaRecovery = lastRecovery + pointsToAdd * STAMINA_RECOVERY_INTERVAL_MS;
    }
  }

  function recoverAllVTuberStamina() {
    for (const [slug, charData] of Object.entries(state.characters)) {
      if (charData && charData.owned) {
        recoverVTuberStamina(slug);
      }
    }
  }

  function restoreVTuberStamina(slug, amount) {
    const charData = state.characters[slug];
    if (!charData || !charData.stats) return false;
    const maxST = charData.baseStats ? (charData.baseStats.st || 0) : 0;
    charData.stats.st = Math.min(maxST, (charData.stats.st || 0) + amount);
    save();
    if (_onStateChange) _onStateChange();
    return true;
  }

  function useVTuberStamina(slug, amount) {
    const charData = state.characters[slug];
    if (!charData || !charData.stats) return false;
    recoverVTuberStamina(slug);
    const currentST = charData.stats.st || 0;
    if (currentST < amount) return false;
    charData.stats.st = currentST - amount;
    save();
    if (_onStateChange) _onStateChange();
    return true;
  }

  function getVTuberStaminaInfo(slug) {
    const charData = state.characters[slug];
    if (!charData || !charData.stats) return null;
    recoverVTuberStamina(slug);
    const maxST = charData.baseStats ? (charData.baseStats.st || 0) : 0;
    const currentST = charData.stats.st || 0;
    const maxPS = charData.baseStats ? (charData.baseStats.ps || 0) : 0;
    const currentPS = charData.stats.ps || 0;
    return {
      current: currentST,
      max: maxST,
      isExhausted: currentST <= 0,
      isFull: currentST >= maxST,
      psCurrent: currentPS,
      psMax: maxPS,
      psDepleted: currentPS < maxPS,
    };
  }

  // ═══════════════════════════════════════════════
  //  BOND SYSTEM (Phase 6 — Odekake Foundation)
  // ═══════════════════════════════════════════════
  // Per-character bondPoints, bondLevel (0-8), lastDateCooldown (timestamp).
  // Bond Level 0 = no bond yet. Levels 1-8 grant permanent stat bonuses.

  function getCharacterBondInfo(slug) {
    const charData = state.characters[slug];
    if (!charData) return null;
    const bp = charData.bondPoints || 0;
    const bl = charData.bondLevel || 0;
    const nextLevel = bl < BOND_MAX_LEVEL ? BOND_LEVELS[bl] : null; // Next level definition
    const bpForNext = nextLevel ? nextLevel.bpRequired : 0;
    const prevThreshold = bl > 0 ? BOND_LEVELS[bl - 1].bpRequired : 0;
    const bpInCurrentLevel = bp - prevThreshold;
    const bpNeededForNext = bpForNext - prevThreshold;
    const isMaxBond = bl >= BOND_MAX_LEVEL;
    const bpProgressPct = isMaxBond ? 100 : bpNeededForNext > 0 ? Math.min(100, Math.round((bpInCurrentLevel / bpNeededForNext) * 100)) : 0;
    // Total cumulative stat bonus from bond levels
    let totalBondBonus = 0;
    for (let i = 0; i < bl; i++) {
      totalBondBonus += BOND_LEVELS[i].statBonus;
    }
    // Cooldown
    const now = Date.now();
    const cooldownEnd = charData.lastDateCooldown || 0;
    const isOnCooldown = cooldownEnd > now;
    const cooldownRemaining = isOnCooldown ? cooldownEnd - now : 0;
    return {
      bondPoints: bp,
      bondLevel: bl,
      isMaxBond,
      nextLevelBpRequired: bpForNext,
      bpProgressPct,
      totalBondStatBonus: totalBondBonus, // per stat (all 6 stats get this much bonus)
      isOnCooldown,
      cooldownRemaining,
      isDateEligible: (charData.level || 1) >= BOND_DATE_LEVEL_REQ && !isOnCooldown,
    };
  }

  // Get total bond stat bonus for a character (returns per-stat object for flexibility)
  function getBondStatBonus(slug) {
    const charData = state.characters[slug];
    if (!charData) return { st: 0, ps: 0, tc: 0, ch: 0, vc: 0, mg: 0 };
    const bl = charData.bondLevel || 0;
    if (bl <= 0) return { st: 0, ps: 0, tc: 0, ch: 0, vc: 0, mg: 0 };
    let total = 0;
    for (let i = 0; i < bl; i++) {
      total += BOND_LEVELS[i].statBonus;
    }
    return { st: total, ps: total, tc: total, ch: total, vc: total, mg: total };
  }

  // ═══════════════════════════════════════════════
  //  PRODUCER LEVEL SYSTEM
  // ═══════════════════════════════════════════════
  // Separate from Studio Level. EXP resets on level up.
  // EXP cap starts at 10, +20% per level. Max level 30.
  // Milestone rewards: levels 10/15/20/25/30 grant 10 blue tickets each.

  function getProducerInfo() {
    if (!state.producerLevel) state.producerLevel = { level: 1, exp: 0 };
    const pl = state.producerLevel;
    const expCap = Math.floor(PRODUCER_INITIAL_EXP_CAP * Math.pow(PRODUCER_EXP_CAP_GROWTH, pl.level - 1));
    return { level: pl.level, exp: pl.exp, expCap };
  }

  function addProducerExp(amount) {
    if (!state.producerLevel) state.producerLevel = { level: 1, exp: 0 };
    const pl = state.producerLevel;
    if (pl.level >= PRODUCER_MAX_LEVEL) return null;
    pl.exp += amount;
    let leveled = false;
    const rewards = [];
    while (pl.level < PRODUCER_MAX_LEVEL) {
      const expCap = Math.floor(PRODUCER_INITIAL_EXP_CAP * Math.pow(PRODUCER_EXP_CAP_GROWTH, pl.level - 1));
      if (pl.exp >= expCap) {
        pl.exp -= expCap;
        pl.level++;
        leveled = true;
        // Check milestone reward
        if (PRODUCER_REWARD_LEVELS.includes(pl.level)) {
          state.currencies.myTicket.blue += PRODUCER_REWARD_TICKETS;
          rewards.push({ level: pl.level, tickets: PRODUCER_REWARD_TICKETS });
        }
      } else {
        break;
      }
    }
    // Cap at max level
    if (pl.level >= PRODUCER_MAX_LEVEL) {
      pl.exp = 0;
    }
    if (leveled) {
      save();
      if (_onStateChange) _onStateChange();
    }
    return leveled ? { rewards } : null;
  }

  // ═══════════════════════════════════════════════
  //  USERNAME & FEATURED VTUBER
  // ═══════════════════════════════════════════════

  function getUsername() {
    return state.username || 'Producer';
  }

  function setUsername(name) {
    state.username = (name || '').trim() || 'Producer';
    save();
    if (_onStateChange) _onStateChange();
  }

  function getFeaturedVtuber() {
    // Validate: only return if the slug exists and is owned
    if (!state.featuredVtuber) return null;
    const charData = state.characters[state.featuredVtuber];
    if (!charData || !charData.owned) {
      // Featured VTuber no longer owned (shouldn't happen) — clear it
      state.featuredVtuber = null;
      save();
      return null;
    }
    return state.featuredVtuber;
  }

  function setFeaturedVtuber(slug) {
    if (!slug) {
      state.featuredVtuber = null;
    } else {
      const charData = state.characters[slug];
      if (!charData || !charData.owned) return false;
      state.featuredVtuber = slug;
    }
    save();
    if (_onStateChange) _onStateChange();
    return true;
  }

  // Tick loop (runs every second while game is open)
  let _contentTickCounter = 0;
  function startTickLoop() {
    if (_tickInterval) clearInterval(_tickInterval);
    _contentTickCounter = 0;
    _tickInterval = setInterval(() => {
      // Passive studio EXP drip (every second, accumulated from per-minute rates)
      const maxSlots = getMaxSlots();
      let slotCount = 0;
      let expThisTick = 0;
      for (const [sid, sdef] of Object.entries(STATION_DEFS)) {
        if (slotCount >= maxSlots) break;
        const st = state.studio.stations[sid];
        if (!st || !st.assigned) continue;
        if (state.studio.level < sdef.unlockLv) continue;
        const charData = state.characters[st.assigned];
        if (!charData) { slotCount++; continue; }
        const rate = (STUDIO_EXP_RATES[sid] || 0) * (STUDIO_EXP_RARITY_MULT[charData.rarity] || 1.0);
        expThisTick += rate / 60; // per-second fraction
        slotCount++;
      }
      if (expThisTick > 0) {
        // Track remainder to avoid losing fractional EXP
        if (!state._studioExpRemainder) state._studioExpRemainder = 0;
        state._studioExpRemainder += expThisTick;
        const whole = Math.floor(state._studioExpRemainder);
        if (whole > 0) {
          state._studioExpRemainder -= whole;
          addStudioExp(whole);
        }
      }

      // Content creation tick every CONTENT_INTERVAL seconds
      _contentTickCounter++;
      if (_contentTickCounter >= CONTENT_INTERVAL) {
        _contentTickCounter = 0;
        processContentTick();
      }

      state.lastOnline = Date.now();

      // Global stamina recovery (minigame)
      recoverStamina();

      // VTuber stamina recovery (all owned characters)
      recoverAllVTuberStamina();

      if (_onStateChange) _onStateChange();
    }, 1000);
  }

  function startAutoSave() {
    if (_autoSaveInterval) clearInterval(_autoSaveInterval);
    _autoSaveInterval = setInterval(save, AUTO_SAVE_INTERVAL);
  }

  function stopLoops() {
    if (_tickInterval) clearInterval(_tickInterval);
    if (_autoSaveInterval) clearInterval(_autoSaveInterval);
  }

  function onStateChange(callback) {
    _onStateChange = callback;
  }

  function notifyStateChange() {
    if (_onStateChange) _onStateChange();
  }

  // Collection stats (now uses rarity from characters.json)
  function getCollectionStats() {
    const chars = DataLoader.get();
    const total = chars.length;
    let owned = 0, rCount = 0, srCount = 0, ssrCount = 0, urCount = 0;

    for (const char of chars) {
      const data = state.characters[char.slug];
      if (data && data.owned) {
        owned++;
        const rarity = data.rarity || 'R';
        if (rarity === 'UR') urCount++;
        else if (rarity === 'SSR') ssrCount++;
        else if (rarity === 'SR') srCount++;
        else rCount++;
      }
    }

    return {
      total,
      owned,
      notOwned: total - owned,
      R: rCount,
      SR: srCount,
      SSR: ssrCount,
      UR: urCount,
      highRarity: urCount + ssrCount,
      // Legacy fields kept for backward compat
      ssr: ssrCount,
      sr: srCount,
      r: rCount,
      pct: total > 0 ? Math.round((owned / total) * 100) : 0,
    };
  }

  // Get available station slots
  function getMaxSlots() {
    if (state.studio.level >= 8) return 5;
    if (state.studio.level >= 5) return 4;
    if (state.studio.level >= 3) return 3;
    return 2;
  }

  // Get estimated station income per content cycle (quality-based)
  function getStationIncome(stationId) {
    const station = state.studio.stations[stationId];
    const stationDef = STATION_DEFS[stationId];
    if (!station || !stationDef || !station.assigned) return 0;
    if (state.studio.level < stationDef.unlockLv) return 0;
    if (stationDef.resource === 'studioExp') return 0; // EXP handled separately (passive drip)

    const quality = getContentQuality(stationId);
    if (!quality) return 0;

    const charData = state.characters[station.assigned];
    if (!charData) return 0;

    const rarityMult = RarityMultipliers[charData.rarity] || 1;
    const def = CONTENT_TYPES[stationId];
    if (!def) return 0;

    const flatBonus = stationId === 'practiceHall'
      ? (state.studio.level - 1) * STUDIO_FLAT_BONUS_PRACTICE_HALL
      : (state.studio.level - 1) * STUDIO_FLAT_BONUS_PER_LEVEL;

    return def.baseReward * quality.qualityMultiplier * rarityMult + flatBonus;
  }

  // Get estimated station studio EXP per minute (passive drip)
  function getStationStudioExp(stationId) {
    const station = state.studio.stations[stationId];
    const stationDef = STATION_DEFS[stationId];
    if (!station || !stationDef || !station.assigned) return 0;
    if (state.studio.level < stationDef.unlockLv) return 0;

    const charData = state.characters[station.assigned];
    if (!charData) return 0;

    const expRate = STUDIO_EXP_RATES[stationId] || 0;
    const rarityMult = STUDIO_EXP_RARITY_MULT[charData.rarity] || 1.0;

    return expRate * rarityMult;
  }

  // Assign character to station
  function assignToStation(stationId, slug) {
    if (!state.studio.stations[stationId]) return false;
    const def = STATION_DEFS[stationId];
    if (state.studio.level < def.unlockLv) return false;
    state.studio.stations[stationId].assigned = slug;
    incrementQuestProgress('daily', 'daily_assign', 1);
    incrementQuestProgress('weekly', 'weekly_assign10', 1);
    save();
    if (_onStateChange) _onStateChange();
    return true;
  }

  function unassignStation(stationId) {
    if (!state.studio.stations[stationId]) return;
    const slug = state.studio.stations[stationId].assigned;
    state.studio.stations[stationId].assigned = null;
    // Start recovery timer for the unassigned VTuber
    if (slug && state.characters[slug]) {
      state.characters[slug].lastStaminaRecovery = Date.now();
    }
    save();
    if (_onStateChange) _onStateChange();
  }

  // Upgrade station — costs VRinggit
  function upgradeStation(stationId) {
    const station = state.studio.stations[stationId];
    if (!station || station.level >= 5) return false;
    const cost = STATION_UPGRADE_COSTS[station.level];
    if (state.currencies.vringgit < cost) return false;
    state.currencies.vringgit -= cost;
    station.level++;
    save();
    if (_onStateChange) _onStateChange();
    return true;
  }

  // Get pull history for a character
  function getPullHistory(slug) {
    return state.pullHistory[slug] || null;
  }

  // Collection milestones — overhaul currency rewards
  const MILESTONES = [
    { count: 10,  vgems: 200,    vringgit: 50,    tickets: 2,  label: '10 Unique VTubers!' },
    { count: 25,  vgems: 500,    vringgit: 150,   tickets: 3,  label: '25 Unique VTubers!' },
    { count: 50,  vgems: 1000,   vringgit: 300,   tickets: 5,  label: '50 Unique VTubers!' },
    { count: 100, vgems: 2500,   vringgit: 500,   tickets: 8,  label: '100 Unique VTubers!' },
    { count: 150, vgems: 5000,   vringgit: 1000,  tickets: 10, label: '150 Unique VTubers!' },
    { count: 200, vgems: 8000,   vringgit: 1500,  tickets: 15, label: '200 Unique VTubers!' },
    { count: 250, vgems: 12000,  vringgit: 2500,  tickets: 20, label: '250 Unique VTubers!' },
    { count: 300, vgems: 20000,  vringgit: 4000,  tickets: 30, label: '300 Unique VTubers!' },
    { count: 319, vgems: 50000,  vringgit: 10000, tickets: 50, label: 'ALL 319 VTubers!' },
  ];

  function checkMilestones() {
    const stats = getCollectionStats();
    const newlyReached = [];
    for (const m of MILESTONES) {
      if (stats.owned >= m.count && !state.milestones.includes(m.count)) {
        state.milestones.push(m.count);
        state.currencies.vgems += m.vgems || 0;
        state.currencies.vringgit += m.vringgit || 0;
        state.currencies.myTicket.blue += m.tickets || 0;
        newlyReached.push(m);
      }
    }
    if (newlyReached.length > 0) {
      save();
      if (_onStateChange) _onStateChange();
    }
    return newlyReached;
  }

  function getMilestones() {
    return MILESTONES.map(m => ({
      ...m,
      claimed: state.milestones.includes(m.count),
    }));
  }

  // ═══════════════════════════════════════════════
  //  OSHI COLLECTION (Phase 7 — Collection Polish)
  // ═══════════════════════════════════════════════

  function isOshi(slug) {
    return state.oshiList && state.oshiList.includes(slug);
  }

  function getOshiList() {
    return state.oshiList || [];
  }

  function getOshiCount() {
    return (state.oshiList || []).length;
  }

  function toggleOshi(slug) {
    const charData = state.characters[slug];
    if (!charData || !charData.owned) return { success: false, reason: 'Character not owned' };
    if (!state.oshiList) state.oshiList = [];
    if (state.oshiList.includes(slug)) {
      state.oshiList = state.oshiList.filter(s => s !== slug);
      save();
      if (_onStateChange) _onStateChange();
      return { success: true, action: 'removed', count: state.oshiList.length };
    } else {
      if (state.oshiList.length >= OSHI_MAX) {
        return { success: false, reason: `Oshi list full (${OSHI_MAX}/${OSHI_MAX})` };
      }
      state.oshiList.push(slug);
      save();
      if (_onStateChange) _onStateChange();
      return { success: true, action: 'added', count: state.oshiList.length };
    }
  }

  // Repair baseStats for characters that got empty baseStats during migration
  // (DataLoader wasn't loaded yet when migrateState ran, so charInfo was null)
  function repairBaseStats() {
    if (!state || !state.characters) return;
    let repaired = false;
    for (const [slug, charData] of Object.entries(state.characters)) {
      if (!charData || !charData.owned) continue;
      if (!charData.baseStats || charData.baseStats.st === 0) {
        const charInfo = DataLoader.getBySlug(slug);
        if (charInfo && charInfo.stats) {
          const fresh = { ...charInfo.stats };
          // Preserve echo gains: add current stats minus current baseStats
          if (charData.stats) {
            const oldBase = charData.baseStats || {};
            for (const k of Object.keys(fresh)) {
              const gain = (charData.stats[k] || 0) - (oldBase[k] || 0);
              if (gain > 0) fresh[k] += gain;
            }
          }
          charData.baseStats = charInfo.stats;
          // Only overwrite current stats if they were empty/broken
          if (!charData.stats || Object.keys(charData.stats).length === 0) {
            charData.stats = fresh;
          }
          repaired = true;
        }
      }
    }
    if (repaired) {
      save();
      if (_onStateChange) _onStateChange();
    }
  }

  // Find which station a character is assigned to
  function getCharacterStation(slug) {
    for (const [stationId, station] of Object.entries(state.studio.stations)) {
      if (station.assigned === slug) return stationId;
    }
    return null;
  }

  return {
    load, save, getState, resetState,
    startTickLoop, startAutoSave, stopLoops,
    getOfflineEarnings, claimOfflineEarnings, claimCachedOfflineEarnings,
    getContentQuality, getContentLog, getQualityDistribution,
    generateContent, processContentTick, getTrendingStat, getTrendingTimeRemaining,
    getDailyLoginReward, claimDailyLogin,
    getQuestsData, claimQuest, incrementQuestProgress,
    DAILY_QUESTS, WEEKLY_QUESTS,
    exportSaveCode, importSaveCode,
    onStateChange, notifyStateChange, getCollectionStats,
    getMaxSlots, getStationIncome, getStationStudioExp,
    assignToStation, unassignStation, upgradeStation,
    getStudioExpProgress, getPullHistory, checkMilestones, getMilestones,
    getCharacterStation, MILESTONES,
    STATION_DEFS, STATION_LEVELS, STATION_UPGRADE_COSTS,
    STATION_MULTIPLIERS, VARIANT_MULTIPLIERS, LEVEL_CAPS,
    STUDIO_EXP_RATES, STUDIO_EXP_RARITY_MULT, STUDIO_FLAT_BONUS_PER_LEVEL, STUDIO_FLAT_BONUS_PRACTICE_HALL,
    getLevelCost, ASCENSION_COSTS,
    CONTENT_TYPES, QUALITY_TIERS, CONTENT_INTERVAL, STAMINA_COSTS,
    getBestVariant, getCharacterRarity, getRarityCounts,
    addCurrency, spendCurrency, getTicketCount, addLiveCache,
    buyTicketsWithVGems, spendTickets,
    VGEML_PER_TICKET, RarityMultipliers, SAVE_KEY,
    getTotalIncome, getTotalIncomePerMin, getStationIncomeBreakdown,
    getStamina, useStamina, getStaminaTimeToNext,
    STAMINA_MAX, STAMINA_RECOVERY_INTERVAL_MS,
    recoverVTuberStamina, recoverAllVTuberStamina, restoreVTuberStamina, useVTuberStamina, getVTuberStaminaInfo,
    getCharacterBondInfo, getBondStatBonus,
    BOND_MAX_LEVEL, BOND_LEVELS, BOND_DATE_COOLDOWN_MS, BOND_DATE_LEVEL_REQ,
    OSHI_MAX, isOshi, getOshiList, getOshiCount, toggleOshi,
    repairBaseStats,
    getProducerInfo, addProducerExp, PRODUCER_MAX_LEVEL,
    getUsername, setUsername,
    getFeaturedVtuber, setFeaturedVtuber,
  };
})();
