/* ═══════════════════════════════════════════════
   game.js — Core Game State, Save/Load, Tick Loop
   ═══════════════════════════════════════════════ */

const Game = (() => {
  const SAVE_KEY = 'myvt_gacha_save';
  const SAVE_VERSION = 1;
  const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
  const OFFLINE_EARNINGS_CAP_HOURS = 12;

  // Studio Level thresholds
  const STUDIO_LEVELS = [
    { level: 1, exp: 0, unlocks: 'Stream Room + 2 slots' },
    { level: 2, exp: 200, unlocks: 'Creative Corner' },
    { level: 3, exp: 600, unlocks: '3rd station slot' },
    { level: 4, exp: 1500, unlocks: 'Practice Hall' },
    { level: 5, exp: 3500, unlocks: '4th station slot' },
    { level: 6, exp: 7000, unlocks: 'Lounge' },
    { level: 7, exp: 12000, unlocks: 'Character detail stats' },
    { level: 8, exp: 20000, unlocks: '5th station slot' },
    { level: 9, exp: 35000, unlocks: 'Agency filter' },
    { level: 10, exp: 60000, unlocks: 'Odekake (Going Out)' },
  ];

  // Station definitions
  const STATION_DEFS = {
    streamRoom:    { name: 'Stream Room',    resource: 'stars',         unlockLv: 1 },
    creativeCorner:{ name: 'Creative Corner',  resource: 'starDust',     unlockLv: 2 },
    practiceHall:  { name: 'Practice Hall',    resource: 'starFragments', unlockLv: 4 },
    lounge:        { name: 'Lounge',           resource: 'bondPoints',    unlockLv: 6 },
  };

  // Station upgrade costs: [stars, fragments]
  const STATION_UPGRADE_COSTS = [
    [0, 0],       // Lv 1 (base)
    [500, 50],    // Lv 2
    [2000, 200],  // Lv 3
    [8000, 800],  // Lv 4
    [30000, 3000],// Lv 5
  ];

  const STATION_MULTIPLIERS = [1, 1.5, 2, 3, 5];

  // Resource base rates per minute
  const BASE_RATES = {
    stars: 2,
    starDust: 1.5,
    starFragments: 1,
    bondPoints: 1,
  };

  // Variant multipliers
  const VARIANT_MULTIPLIERS = {
    normal: 1,
    sr: 2,
    ssr: 5,
  };

  // Studio EXP per minute per variant
  const STUDIO_EXP_RATES = {
    normal: 0.5,
    sr: 1.5,
    ssr: 4,
  };

  // Level caps per variant
  const LEVEL_CAPS = {
    normal: 20,
    sr: 35,
    ssr: 50,
  };

  // Level costs per level: [starDust, stars]
  function getLevelCost(variant, level) {
    const base = variant === 'ssr' ? 80 : variant === 'sr' ? 30 : 10;
    const baseS = variant === 'ssr' ? 100 : variant === 'sr' ? 50 : 20;
    const mult = variant === 'ssr' ? 20 : variant === 'sr' ? 10 : 5;
    const multS = variant === 'ssr' ? 40 : variant === 'sr' ? 20 : 10;
    return [base + level * mult, baseS + level * multS];
  }

  // Ascension costs
  const ASCENSION_COSTS = {
    'normal->sr': { fragments: 100, level: 20 },
    'sr->ssr': { fragments: 500, level: 35 },
  };

  // Daily login rewards
  const DAILY_BASE = 100;
  const DAILY_INCREMENT = 50;
  const DAILY_CAP = 500;

  // Starting resources
  const STARTING_STARS = 1000;

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
        stars: STARTING_STARS,
        starDust: 0,
        starFragments: 0,
        bondPoints: 0,
      },
      characters: {}, // slug -> { owned, variants: [normal/sr/ssr], level, shards }
      studio: {
        level: 1,
        exp: 0,
        stations: {
          streamRoom: { level: 1, assigned: null },
          creativeCorner: { level: 1, assigned: null },
          practiceHall: { level: 1, assigned: null },
          lounge: { level: 1, assigned: null },
        },
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
      } else {
        state = createNewState();
        save();
        console.log('New game created.');
      }
    } catch (err) {
      console.error('Load failed, creating new game:', err);
      state = createNewState();
      save();
    }
    return state;
  }

  function migrateState(oldState) {
    const merged = { ...createNewState(), ...oldState, version: SAVE_VERSION };
    // Ensure new fields exist in migrated state
    if (!merged.milestones) merged.milestones = [];
    if (!merged.pullHistory) merged.pullHistory = {};
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

  // Calculate offline earnings
  function getOfflineEarnings() {
    if (!state || !state.lastOnline) return null;
    const now = Date.now();
    const elapsed = now - state.lastOnline;
    const maxMs = OFFLINE_EARNINGS_CAP_HOURS * 60 * 60 * 1000;
    const cappedMs = Math.min(elapsed, maxMs);
    const minutes = cappedMs / 60000;
    if (minutes < 1) return null;

    const earnings = calculatePerMinuteIncome(minutes);
    return { minutes: Math.round(minutes), earnings, totalMs: elapsed };
  }

  // Calculate income per minute
  function calculatePerMinuteIncome(minutes) {
    const earnings = { stars: 0, starDust: 0, starFragments: 0, bondPoints: 0, studioExp: 0 };

    for (const [stationId, def] of Object.entries(STATION_DEFS)) {
      const station = state.studio.stations[stationId];
      if (!station || !station.assigned) continue;
      if (state.studio.level < def.unlockLv) continue;

      const charData = state.characters[station.assigned];
      if (!charData) continue;

      const bestVariant = getBestVariant(charData.variants);
      const variantMult = VARIANT_MULTIPLIERS[bestVariant] || 1;
      const levelBonus = 1 + (charData.level * 0.02);
      const stationMult = STATION_MULTIPLIERS[station.level - 1] || 1;
      const baseRate = BASE_RATES[def.resource] || 0;

      const perMinute = baseRate * variantMult * levelBonus * stationMult;
      earnings[def.resource] += perMinute * minutes;

      // Studio EXP
      const expRate = STUDIO_EXP_RATES[bestVariant] || 0;
      earnings.studioExp += expRate * levelBonus * stationMult * minutes;
    }

    return earnings;
  }

  function claimOfflineEarnings() {
    const offline = getOfflineEarnings();
    if (!offline) return null;

    state.currencies.stars += Math.floor(offline.earnings.stars);
    state.currencies.starDust += Math.floor(offline.earnings.starDust);
    state.currencies.starFragments += Math.floor(offline.earnings.starFragments);
    state.currencies.bondPoints += Math.floor(offline.earnings.bondPoints);

    // Add studio EXP
    addStudioExp(Math.floor(offline.earnings.studioExp));

    state.lastOnline = Date.now();
    save();
    if (_onStateChange) _onStateChange();
    return offline;
  }

  // Studio EXP
  function addStudioExp(amount) {
    state.studio.exp += amount;
    const nextLevel = STUDIO_LEVELS.find(l => l.level === state.studio.level + 1);
    while (nextLevel && state.studio.exp >= nextLevel.exp) {
      state.studio.level = nextLevel.level;
      if (nextLevel.level >= STUDIO_LEVELS.length) break;
      const checkNext = STUDIO_LEVELS.find(l => l.level === state.studio.level + 1);
      if (checkNext && state.studio.exp >= checkNext.exp) {
        // Continue looping
      } else {
        break;
      }
    }
  }

  // Get total income per minute across all active stations
  function getTotalIncome() {
    const earnings = { stars: 0, starDust: 0, starFragments: 0, bondPoints: 0 };
    for (const [stationId, def] of Object.entries(STATION_DEFS)) {
      const station = state.studio.stations[stationId];
      if (!station || !station.assigned) continue;
      if (state.studio.level < def.unlockLv) continue;
      const income = getStationIncome(stationId);
      earnings[def.resource] += income;
    }
    return earnings;
  }

  // Get total income per minute as a single number (Stars equivalent)
  function getTotalIncomePerMin() {
    const earnings = getTotalIncome();
    return earnings.stars + earnings.starDust + earnings.starFragments + earnings.bondPoints;
  }

  // Get breakdown of station incomes for display
  function getStationIncomeBreakdown() {
    const breakdown = [];
    for (const [stationId, def] of Object.entries(STATION_DEFS)) {
      const station = state.studio.stations[stationId];
      const isLocked = state.studio.level < def.unlockLv;
      if (!station || isLocked) continue;
      const income = station.assigned ? getStationIncome(stationId) : 0;
      const assignedChar = station.assigned ? DataLoader.getBySlug(station.assigned) : null;
      breakdown.push({
        stationId,
        name: def.name,
        resource: def.resource,
        income,
        assigned: !!station.assigned,
        assignedCharName: assignedChar ? assignedChar.name : null,
        level: station.level,
        isMaxLevel: station.level >= 5,
      });
    }
    return breakdown;
  }

  function getStudioExpProgress() {
    const current = STUDIO_LEVELS.find(l => l.level === state.studio.level);
    const next = STUDIO_LEVELS.find(l => l.level === state.studio.level + 1);
    if (!next) return { current: state.studio.exp, required: state.studio.exp, pct: 100 };
    return {
      current: state.studio.exp - (current ? current.exp : 0),
      required: next.exp - (current ? current.exp : 0),
      pct: ((state.studio.exp - (current ? current.exp : 0)) / (next.exp - (current ? current.exp : 0))) * 100,
    };
  }

  // Daily login
  function getDailyLoginReward() {
    const today = new Date().toISOString().split('T')[0];
    if (state.dailyLogin.lastClaim === today) return null;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (state.dailyLogin.lastClaim === yesterday) {
      state.dailyLogin.streak++;
    } else if (state.dailyLogin.lastClaim !== today) {
      state.dailyLogin.streak = 1;
    }

    const reward = Math.min(DAILY_BASE + (state.dailyLogin.streak - 1) * DAILY_INCREMENT, DAILY_CAP);
    return { streak: state.dailyLogin.streak, reward };
  }

  function claimDailyLogin() {
    const reward = getDailyLoginReward();
    if (!reward) return null;
    state.currencies.stars += reward.reward;
    state.dailyLogin.lastClaim = new Date().toISOString().split('T')[0];
    save();
    if (_onStateChange) _onStateChange();
    return reward;
  }

  // Helper: best variant
  function getBestVariant(variants) {
    if (!variants || variants.length === 0) return 'normal';
    if (variants.includes('ssr')) return 'ssr';
    if (variants.includes('sr')) return 'sr';
    return 'normal';
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

  // Tick loop (runs every second while game is open)
  function startTickLoop() {
    if (_tickInterval) clearInterval(_tickInterval);
    _tickInterval = setInterval(() => {
      const earnings = calculatePerMinuteIncome(1/60); // 1 second worth
      state.currencies.stars += earnings.stars / 60;
      state.currencies.starDust += earnings.starDust / 60;
      state.currencies.starFragments += earnings.starFragments / 60;
      state.currencies.bondPoints += earnings.bondPoints / 60;
      addStudioExp(earnings.studioExp / 60);
      state.lastOnline = Date.now();

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

  // Collection stats
  function getCollectionStats() {
    const chars = DataLoader.get();
    const total = chars.length;
    let owned = 0, ssrCount = 0, srCount = 0;

    for (const char of chars) {
      const data = state.characters[char.slug];
      if (data && data.owned) {
        owned++;
        if (data.variants.includes('ssr')) ssrCount++;
        if (data.variants.includes('sr')) srCount++;
      }
    }

    return {
      total,
      owned,
      notOwned: total - owned,
      ssr: ssrCount,
      sr: srCount,
      normal: owned - ssrCount - srCount,
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

  // Get station income per minute
  function getStationIncome(stationId) {
    const station = state.studio.stations[stationId];
    const def = STATION_DEFS[stationId];
    if (!station || !def || !station.assigned) return 0;
    if (state.studio.level < def.unlockLv) return 0;

    const charData = state.characters[station.assigned];
    if (!charData) return 0;

    const bestVariant = getBestVariant(charData.variants);
    const variantMult = VARIANT_MULTIPLIERS[bestVariant] || 1;
    const levelBonus = 1 + (charData.level * 0.02);
    const stationMult = STATION_MULTIPLIERS[station.level - 1] || 1;
    const baseRate = BASE_RATES[def.resource] || 0;

    return baseRate * variantMult * levelBonus * stationMult;
  }

  // Assign character to station
  function assignToStation(stationId, slug) {
    if (!state.studio.stations[stationId]) return false;
    const def = STATION_DEFS[stationId];
    if (state.studio.level < def.unlockLv) return false;
    state.studio.stations[stationId].assigned = slug;
    save();
    if (_onStateChange) _onStateChange();
    return true;
  }

  function unassignStation(stationId) {
    if (!state.studio.stations[stationId]) return;
    state.studio.stations[stationId].assigned = null;
    save();
    if (_onStateChange) _onStateChange();
  }

  // Upgrade station
  function upgradeStation(stationId) {
    const station = state.studio.stations[stationId];
    if (!station || station.level >= 5) return false;
    const costs = STATION_UPGRADE_COSTS[station.level];
    if (state.currencies.stars < costs[0] || state.currencies.starFragments < costs[1]) return false;
    state.currencies.stars -= costs[0];
    state.currencies.starFragments -= costs[1];
    station.level++;
    save();
    if (_onStateChange) _onStateChange();
    return true;
  }

  // Get pull history for a character
  function getPullHistory(slug) {
    return state.pullHistory[slug] || null;
  }

  // Collection milestones
  const MILESTONES = [
    { count: 10,  stars: 500,   label: '10 Unique VTubers!' },
    { count: 25,  stars: 1500,  label: '25 Unique VTubers!' },
    { count: 50,  stars: 3000,  label: '50 Unique VTubers!' },
    { count: 100, stars: 8000,  label: '100 Unique VTubers!' },
    { count: 150, stars: 15000, label: '150 Unique VTubers!' },
    { count: 200, stars: 25000, label: '200 Unique VTubers!' },
    { count: 250, stars: 40000, label: '250 Unique VTubers!' },
    { count: 300, stars: 60000, label: '300 Unique VTubers!' },
    { count: 319, stars: 100000, label: 'ALL 319 VTubers!' },
  ];

  function checkMilestones() {
    const stats = getCollectionStats();
    const newlyReached = [];
    for (const m of MILESTONES) {
      if (stats.owned >= m.count && !state.milestones.includes(m.count)) {
        state.milestones.push(m.count);
        state.currencies.stars += m.stars;
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
    getOfflineEarnings, claimOfflineEarnings,
    getDailyLoginReward, claimDailyLogin,
    exportSaveCode, importSaveCode,
    onStateChange, getCollectionStats,
    getMaxSlots, getStationIncome,
    assignToStation, unassignStation, upgradeStation,
    getStudioExpProgress, getPullHistory, checkMilestones, getMilestones,
    getCharacterStation, MILESTONES,
    STATION_DEFS, STATION_LEVELS, STATION_UPGRADE_COSTS,
    STATION_MULTIPLIERS, VARIANT_MULTIPLIERS, LEVEL_CAPS,
    BASE_RATES, getLevelCost, ASCENSION_COSTS,
    getBestVariant, SAVE_KEY,
    getTotalIncome, getTotalIncomePerMin, getStationIncomeBreakdown,
  };
})();
