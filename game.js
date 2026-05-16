/* ═══════════════════════════════════════════════
   game.js — Core Game State, Save/Load, Tick Loop
   ═══════════════════════════════════════════════ */

const Game = (() => {
  const SAVE_KEY = 'myvt_gacha_save';
  const SAVE_VERSION = 3;
  const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
  const AUTO_BACKUP_INTERVAL = 300000; // 5 minutes
  const SLOT_PREFIX = 'myvt_gacha_slot_';
  const CLOUD_KEY = 'myvt_gacha_cloud';
  const BACKUP_KEY = 'myvt_gacha_backup';
  const BACKUPS_KEY = 'myvt_gacha_backups';
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

  const STATION_DEFS = {
    streamRoom:    { name: 'Stream Room',    resource: 'stars',         unlockLv: 1 },
    creativeCorner:{ name: 'Creative Corner',  resource: 'starDust',     unlockLv: 2 },
    practiceHall:  { name: 'Practice Hall',    resource: 'starFragments', unlockLv: 4 },
    lounge:        { name: 'Lounge',           resource: 'bondPoints',    unlockLv: 6 },
  };

  const STATION_UPGRADE_COSTS = [
    [0, 0],       // Lv 1 (base)
    [500, 50],    // Lv 2
    [2000, 200],  // Lv 3
    [8000, 800],  // Lv 4
    [30000, 3000],// Lv 5
  ];

  const STATION_MULTIPLIERS = [1, 1.5, 2, 3, 5];

  const BASE_RATES = {
    stars: 2,
    starDust: 1.5,
    starFragments: 1,
    bondPoints: 1,
  };

  const VARIANT_MULTIPLIERS = {
    normal: 1,
    sr: 2,
    ssr: 5,
  };

  const STUDIO_EXP_RATES = {
    normal: 0.5,
    sr: 1.5,
    ssr: 4,
  };

  const LEVEL_CAPS = {
    normal: 20,
    sr: 35,
    ssr: 50,
  };

  function getLevelCost(variant, level) {
    const base = variant === 'ssr' ? 80 : variant === 'sr' ? 30 : 10;
    const baseS = variant === 'ssr' ? 100 : variant === 'sr' ? 50 : 20;
    const mult = variant === 'ssr' ? 20 : variant === 'sr' ? 10 : 5;
    const multS = variant === 'ssr' ? 40 : variant === 'sr' ? 20 : 10;
    return [base + level * mult, baseS + level * multS];
  }

  const ASCENSION_COSTS = {
    'normal->sr': { fragments: 100, level: 20 },
    'sr->ssr': { fragments: 500, level: 35 },
  };

  const DAILY_BASE = 100;
  const DAILY_INCREMENT = 50;
  const DAILY_CAP = 500;
  const STARTING_STARS = 1000;

  let state = null;
  let _tickInterval = null;
  let _autoSaveInterval = null;
  let _autoBackupInterval = null;
  let _onStateChange = null;
  let activeSlot = 1; // Sprint 6: 1-3

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

  // ── Achievement Definitions ──
  const ACHIEVEMENTS = [
    { id: 'first_pull', name: 'First Steps', desc: 'Perform your first pull', icon: '\uD83C\uDFB0', check: s => s.stats.totalPulls >= 1 },
    { id: 'pulls_100', name: 'Dedicated', desc: 'Perform 100 pulls', icon: '\uD83C\uDFB2', check: s => s.stats.totalPulls >= 100 },
    { id: 'pulls_1000', name: 'Whale', desc: 'Perform 1,000 pulls', icon: '\uD83D\uDC33', check: s => s.stats.totalPulls >= 1000 },
    { id: 'first_ssrsr', name: 'Lucky Star', desc: 'Pull your first SSR or SR', icon: '\u2B50', check: s => {
      const chars = Object.values(s.characters);
      return chars.some(c => c.owned && (c.variants.includes('ssr') || c.variants.includes('sr')));
    }},
    { id: 'ssr_10', name: 'SSR Collector', desc: 'Own 10 SSR characters', icon: '\uD83D\uDC51', check: s => {
      const chars = Object.values(s.characters);
      return chars.filter(c => c.owned && c.variants.includes('ssr')).length >= 10;
    }},
    { id: 'ssr_50', name: 'SSR Legend', desc: 'Own 50 SSR characters', icon: '\uD83C\uDFC6', check: s => {
      const chars = Object.values(s.characters);
      return chars.filter(c => c.owned && c.variants.includes('ssr')).length >= 50;
    }},
    { id: 'first_ascend', name: 'Power Up', desc: 'Ascend a character for the first time', icon: '\uD83D\uDD3A', check: s => s.stats.totalAscensions >= 1 },
    { id: 'ascend_10', name: 'Ascension Master', desc: 'Ascend 10 characters', icon: '\uD83D\uDC8E', check: s => s.stats.totalAscensions >= 10 },
    { id: 'collection_10', name: 'Getting Started', desc: 'Collect 10 unique VTubers', icon: '\uD83D\uDCCB', check: s => {
      return Object.values(s.characters).filter(c => c.owned).length >= 10;
    }},
    { id: 'collection_50', name: 'Half Century', desc: 'Collect 50 unique VTubers', icon: '\uD83D\uDCD6', check: s => {
      return Object.values(s.characters).filter(c => c.owned).length >= 50;
    }},
    { id: 'collection_100', name: 'Collector', desc: 'Collect 100 unique VTubers', icon: '\uD83D\uDCDA', check: s => {
      return Object.values(s.characters).filter(c => c.owned).length >= 100;
    }},
    { id: 'collection_200', name: 'Completionist', desc: 'Collect 200 unique VTubers', icon: '\uD83C\uDF93', check: s => {
      return Object.values(s.characters).filter(c => c.owned).length >= 200;
    }},
    { id: 'collection_all', name: 'Completionist+', desc: 'Collect ALL 319 VTubers', icon: '\uD83C\uDF1F', check: s => {
      return Object.values(s.characters).filter(c => c.owned).length >= 319;
    }},
    { id: 'studio_5', name: 'Studio Upgrade', desc: 'Reach Studio Level 5', icon: '\uD83C\uDFD7\uFE0F', check: s => s.studio.level >= 5 },
    { id: 'studio_10', name: 'Studio Master', desc: 'Reach Studio Level 10', icon: '\uD83C\uDFE2', check: s => s.studio.level >= 10 },
  ];

  function createNewState() {
    return {
      version: SAVE_VERSION,
      playerId: generatePlayerId(),
      currencies: { stars: STARTING_STARS, starDust: 0, starFragments: 0, bondPoints: 0 },
      characters: {},
      studio: {
        level: 1, exp: 0,
        stations: {
          streamRoom: { level: 1, assigned: null },
          creativeCorner: { level: 1, assigned: null },
          practiceHall: { level: 1, assigned: null },
          lounge: { level: 1, assigned: null },
        },
      },
      pity: { count: 0 },
      stats: {
        totalPulls: 0, ssrStreak: 0, bestSsrStreak: 0,
        totalAscensions: 0, totalPlaySeconds: 0, createdDate: Date.now(),
      },
      dailyLogin: { streak: 0, lastClaim: null },
      lastOnline: Date.now(),
      milestones: [],
      pullHistory: {},
      pullLog: [],
      activityLog: [],
      achievements: [],
    };
  }

  // ── Sprint 6: Save Key Management ──
  function getActiveSlotKey() { return SLOT_PREFIX + activeSlot; }
  function getActiveSlot() { return activeSlot; }

  function save() {
    if (!state) return;
    state.lastOnline = Date.now();
    try {
      localStorage.setItem(getActiveSlotKey(), JSON.stringify(state));
      localStorage.setItem(SAVE_KEY, JSON.stringify(state)); // Backward compat
    } catch (err) {
      console.error('Save failed:', err);
    }
  }

  function load() {
    try {
      // Sprint 6: Try active slot first, then fall back to legacy key
      let raw = localStorage.getItem(getActiveSlotKey());
      if (!raw) raw = localStorage.getItem(SAVE_KEY); // v1/v2 migration
      if (raw) {
        state = JSON.parse(raw);
        if (state.version < SAVE_VERSION) {
          state = migrateState(state);
        }
        console.log('Game loaded from slot', activeSlot, '.');
      } else {
        state = createNewState();
        save();
        console.log('New game created in slot', activeSlot, '.');
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
    if (!merged.milestones) merged.milestones = [];
    if (!merged.pullHistory) merged.pullHistory = {};
    if (!merged.stats) merged.stats = {};
    if (merged.stats.totalAscensions === undefined) merged.stats.totalAscensions = 0;
    if (merged.stats.totalPlaySeconds === undefined) merged.stats.totalPlaySeconds = 0;
    if (!merged.stats.createdDate) merged.stats.createdDate = merged.lastOnline || Date.now();
    if (!merged.pullLog) merged.pullLog = [];
    if (!merged.activityLog) merged.activityLog = [];
    if (!merged.achievements) merged.achievements = [];
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
    addStudioExp(Math.floor(offline.earnings.studioExp));
    state.lastOnline = Date.now();
    save();
    if (_onStateChange) _onStateChange();
    return offline;
  }

  function addStudioExp(amount) {
    state.studio.exp += amount;
    const nextLevel = STUDIO_LEVELS.find(l => l.level === state.studio.level + 1);
    while (nextLevel && state.studio.exp >= nextLevel.exp) {
      state.studio.level = nextLevel.level;
      if (nextLevel.level >= STUDIO_LEVELS.length) break;
      const checkNext = STUDIO_LEVELS.find(l => l.level === state.studio.level + 1);
      if (checkNext && state.studio.exp >= checkNext.exp) {
      } else {
        break;
      }
    }
  }

  function getTotalIncome() {
    const earnings = { stars: 0, starDust: 0, starFragments: 0, bondPoints: 0 };
    for (const [stationId, def] of Object.entries(STATION_DEFS)) {
      const station = state.studio.stations[stationId];
      if (!station || !station.assigned) continue;
      if (state.studio.level < def.unlockLv) continue;
      earnings[def.resource] += getStationIncome(stationId);
    }
    return earnings;
  }

  function getTotalIncomePerMin() {
    const earnings = getTotalIncome();
    return earnings.stars + earnings.starDust + earnings.starFragments + earnings.bondPoints;
  }

  function getStationIncomeBreakdown() {
    const breakdown = [];
    for (const [stationId, def] of Object.entries(STATION_DEFS)) {
      const station = state.studio.stations[stationId];
      const isLocked = state.studio.level < def.unlockLv;
      if (!station || isLocked) continue;
      const income = station.assigned ? getStationIncome(stationId) : 0;
      const assignedChar = station.assigned ? DataLoader.getBySlug(station.assigned) : null;
      breakdown.push({
        stationId, name: def.name, resource: def.resource, income,
        assigned: !!station.assigned, assignedCharName: assignedChar ? assignedChar.name : null,
        level: station.level, isMaxLevel: station.level >= 5,
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

  function getBestVariant(variants) {
    if (!variants || variants.length === 0) return 'normal';
    if (variants.includes('ssr')) return 'ssr';
    if (variants.includes('sr')) return 'sr';
    return 'normal';
  }

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

  function startTickLoop() {
    if (_tickInterval) clearInterval(_tickInterval);
    _tickInterval = setInterval(() => {
      const earnings = calculatePerMinuteIncome(1/60);
      state.currencies.stars += earnings.stars / 60;
      state.currencies.starDust += earnings.starDust / 60;
      state.currencies.starFragments += earnings.starFragments / 60;
      state.currencies.bondPoints += earnings.bondPoints / 60;
      addStudioExp(earnings.studioExp / 60);
      state.lastOnline = Date.now();
      state.stats.totalPlaySeconds = (state.stats.totalPlaySeconds || 0) + 1;
      if (_onStateChange) _onStateChange();
    }, 1000);
  }

  function startAutoSave() {
    if (_autoSaveInterval) clearInterval(_autoSaveInterval);
    _autoSaveInterval = setInterval(save, AUTO_SAVE_INTERVAL);
  }

  function startAutoBackup() {
    if (_autoBackupInterval) clearInterval(_autoBackupInterval);
    _autoBackupInterval = setInterval(() => { createBackup(); }, AUTO_BACKUP_INTERVAL);
  }

  function stopLoops() {
    if (_tickInterval) clearInterval(_tickInterval);
    if (_autoSaveInterval) clearInterval(_autoSaveInterval);
    if (_autoBackupInterval) clearInterval(_autoBackupInterval);
  }

  function onStateChange(callback) {
    _onStateChange = callback;
  }

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
      total, owned, notOwned: total - owned,
      ssr: ssrCount, sr: srCount,
      normal: owned - ssrCount - srCount,
      pct: total > 0 ? Math.round((owned / total) * 100) : 0,
    };
  }

  function getMaxSlots() {
    if (state.studio.level >= 8) return 5;
    if (state.studio.level >= 5) return 4;
    if (state.studio.level >= 3) return 3;
    return 2;
  }

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

  function getPullHistory(slug) {
    return state.pullHistory[slug] || null;
  }

  const MILESTONES = [
    { count: 10,  stars: 500,   label: '10 Unique VTubers!' },
    { count: 25,  stars: 1500,  label: '25 Unique VTubers!' },
    { count: 50,  stars: 3000,  label: '50 Unique VTubers!' },
    { count: 100, stars: 8000,  label: '100 Unique VTubers!' },
    { count: 150, stars: 15000, label: '150 Unique VTubers!' },
    { count: 200, stars: 25000, label: '200 Unique VTubers!' },
    { count: 250, stars: 40000, label: '250 Unique VTubers!' },
    { count: 300, stars: 60000, label: '300 Unique VTubers!' },
    { count: 319,  stars: 100000, label: 'ALL 319 VTubers!' },
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
    return MILESTONES.map(m => ({ ...m, claimed: state.milestones.includes(m.count) }));
  }

  function addActivityLog(type, message) {
    if (!state.activityLog) state.activityLog = [];
    state.activityLog.unshift({ type, message, timestamp: Date.now() });
    if (state.activityLog.length > 50) state.activityLog = state.activityLog.slice(0, 50);
  }

  function addPullLogEntry(slug, name, variant, isNew) {
    if (!state.pullLog) state.pullLog = [];
    state.pullLog.unshift({ timestamp: Date.now(), slug, name, variant, isNew });
    if (state.pullLog.length > 50) state.pullLog = state.pullLog.slice(0, 50);
  }

  function getPullLog() { return state.pullLog || []; }
  function clearPullLog() { state.pullLog = []; save(); }
  function getActivityLog() { return state.activityLog || []; }

  function checkAchievements() {
    if (!state.achievements) state.achievements = [];
    const newlyUnlocked = [];
    for (const ach of ACHIEVEMENTS) {
      if (state.achievements.includes(ach.id)) continue;
      try { if (ach.check(state)) { state.achievements.push(ach.id); newlyUnlocked.push(ach); } }
      catch (err) { }
    }
    if (newlyUnlocked.length > 0) save();
    return newlyUnlocked;
  }

  function getAchievements() {
    if (!state.achievements) state.achievements = [];
    return ACHIEVEMENTS.map(a => ({ ...a, unlocked: state.achievements.includes(a.id) }));
  }

  function getPlayTime() {
    const total = state.stats.totalPlaySeconds || 0;
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    return { days, hours, minutes };
  }

  function clearActivityLog() { state.activityLog = []; save(); }

  function getCharacterStation(slug) {
    for (const [stationId, station] of Object.entries(state.studio.stations)) {
      if (station.assigned === slug) return stationId;
    }
    return null;
  }

  // ── Sprint 6: Save Slots ──
  function switchSlot(slotNum) {
    if (slotNum < 1 || slotNum > 3 || slotNum === activeSlot) return false;
    const slotKey = SLOT_PREFIX + slotNum;
    const raw = localStorage.getItem(slotKey);
    if (!raw) {
      activeSlot = slotNum;
      state = createNewState();
      save();
    } else {
      activeSlot = slotNum;
      state = JSON.parse(raw);
      if (state.version < SAVE_VERSION) state = migrateState(state);
    }
    if (_onStateChange) _onStateChange();
    return true;
  }

  function getSlotInfo(slotNum) {
    const key = SLOT_PREFIX + slotNum;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { slot: slotNum, empty: true };
      const data = JSON.parse(raw);
      const chars = data.characters || {};
      const ownedCount = Object.values(chars).filter(c => c.owned).length;
      const playTime = data.stats ? data.stats.totalPlaySeconds || 0 : 0;
      const hours = Math.floor(playTime / 3600);
      const mins = Math.floor((playTime % 3600) / 60);
      return {
        slot: slotNum, empty: false,
        playerId: data.playerId || 'Unknown',
        owned: ownedCount,
        pulls: data.stats ? data.stats.totalPulls : 0,
        playTimeStr: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
        lastOnline: data.lastOnline || 0,
      };
    } catch (e) {
      return { slot: slotNum, empty: true, error: true };
    }
  }

  function getSlotSummaries() {
    return [1, 2, 3].map(n => getSlotInfo(n));
  }

  // ── Sprint 6: Cloud Sync (simulated localStorage) ──
  function cloudSync() {
    if (!state) return false;
    try {
      const cloudData = { data: state, syncedAt: Date.now(), playerId: state.playerId };
      localStorage.setItem(CLOUD_KEY, JSON.stringify(cloudData));
      return true;
    } catch (err) { console.error('Cloud sync failed:', err); return false; }
  }

  function cloudLoad() {
    try {
      const raw = localStorage.getItem(CLOUD_KEY);
      if (!raw) return { success: false, reason: 'No cloud data found. Sync first.' };
      const cloudData = JSON.parse(raw);
      if (!cloudData.data || !cloudData.data.playerId) return { success: false, reason: 'Cloud data is corrupted.' };
      if (cloudData.data.playerId !== state.playerId) {
        return { success: false, reason: 'Player ID mismatch! This cloud save belongs to a different account.', conflict: true };
      }
      const cloudTime = cloudData.syncedAt || 0;
      const localTime = state.lastOnline || 0;
      if (cloudTime > localTime + 60000) {
        return { success: false, reason: 'Cloud save is newer than local. Tap "Force Load" to overwrite.', conflict: true, cloudTime, localTime, cloudData: cloudData.data };
      }
      return { success: false, reason: 'Local save is up to date.', localNewer: true };
    } catch (err) {
      return { success: false, reason: 'Failed to load cloud data.' };
    }
  }

  function cloudForceLoad() {
    try {
      const raw = localStorage.getItem(CLOUD_KEY);
      if (!raw) return false;
      const cloudData = JSON.parse(raw);
      if (!cloudData.data || !cloudData.data.playerId) return false;
      state = migrateState(cloudData.data);
      save();
      if (_onStateChange) _onStateChange();
      return true;
    } catch (err) { return false; }
  }

  function getCloudStatus() {
    try {
      const raw = localStorage.getItem(CLOUD_KEY);
      if (!raw) return { synced: false, lastSyncTime: null };
      const cd = JSON.parse(raw);
      return { synced: true, lastSyncTime: cd.syncedAt, playerId: cd.playerId };
    } catch (e) { return { synced: false, lastSyncTime: null }; }
  }

  // ── Sprint 6: Auto-Backup ──
  function createBackup() {
    if (!state) return false;
    try {
      const backup = { data: state, backedUpAt: Date.now() };
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
      let backups = [];
      try { backups = JSON.parse(localStorage.getItem(BACKUPS_KEY) || '[]'); } catch(e) {}
      backups.unshift({ playerId: state.playerId, backedUpAt: Date.now(), pulls: state.stats.totalPulls });
      if (backups.length > 3) backups = backups.slice(0, 3);
      localStorage.setItem(BACKUPS_KEY, JSON.stringify(backups));
      return true;
    } catch (err) { console.error('Backup failed:', err); return false; }
  }

  function getLastBackupTime() {
    try {
      const raw = localStorage.getItem(BACKUP_KEY);
      if (!raw) return null;
      return JSON.parse(raw).backedUpAt || null;
    } catch(e) { return null; }
  }

  return {
    load, save, getState, resetState,
    startTickLoop, startAutoSave, startAutoBackup, stopLoops,
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
    addActivityLog, addPullLogEntry, getPullLog, clearPullLog,
    getActivityLog, clearActivityLog,
    checkAchievements, getAchievements, getPlayTime,
    ACHIEVEMENTS,
    // Sprint 6 exports
    getActiveSlotKey, getActiveSlot, switchSlot, getSlotInfo, getSlotSummaries,
    cloudSync, cloudLoad, cloudForceLoad, getCloudStatus,
    createBackup, getLastBackupTime,
  };
})();
