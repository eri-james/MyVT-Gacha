/* ═══════════════════════════════════════════════
   gacha.js — Gacha V2: Pull Logic, Rates, Pity, Echo System
   ═══════════════════════════════════════════════ */

const Gacha = (() => {
  // ── Constants ──
  const VGEML_PER_TICKET = 150;

  // Base rates (sum to 1.0)
  const BASE_RATES = { R: 0.70, SR: 0.22, SSR: 0.07, UR: 0.01 };

  // Pity thresholds
  const SOFT_PITY_SSR = 40;
  const SOFT_PITY_UR = 80;
  const HARD_PITY = 90;

  // Featured characters
  const FEATURED_CHARACTERS = ['liliana-vampaia', 'lunaris-urufi'];
  const FEATURED_RATE_UP = 0.75;

  // Echo system
  const ECHO_MAX = 6;
  const ECHO_GAINS = {
    R:   { primary: 20, secondary: 10 },
    SR:  { primary: 23, secondary: 15 },
    SSR: { primary: 25, secondary: 18 },
    UR:  { primary: 25, secondary: 18 },
  };
  const E6_LIVECACHE = { R: 20, SR: 50, SSR: 100, UR: 200 };

  let currentBanner = 'standard'; // 'standard' or 'featured'

  // ── Pity System ──
  function calculateRates(pityCount) {
    if (pityCount >= HARD_PITY) {
      return { R: 0, SR: 0, SSR: 0.50, UR: 0.50 };
    }

    let ssrRate = BASE_RATES.SSR;
    let urRate = BASE_RATES.UR;

    // Soft pity: linearly increase SSR/UR rates
    if (pityCount >= SOFT_PITY_SSR) {
      const progress = Math.min(1, (pityCount - SOFT_PITY_SSR) / (HARD_PITY - SOFT_PITY_SSR));
      ssrRate += progress * 0.50;  // Up to ~57% at hard pity
    }
    if (pityCount >= SOFT_PITY_UR) {
      const progress = Math.min(1, (pityCount - SOFT_PITY_UR) / (HARD_PITY - SOFT_PITY_UR));
      urRate += progress * 0.15;   // Up to ~16% at hard pity
    }

    const srRate = BASE_RATES.SR;
    const rRate = Math.max(0, 1 - srRate - ssrRate - urRate);

    return { R: rRate, SR: srRate, SSR: ssrRate, UR: urRate };
  }

  function rollRarity() {
    const state = Game.getState();
    if (!state.pity) state.pity = { count: 0 };
    state.pity.count++;

    const rates = calculateRates(state.pity.count);
    const rand = Math.random();

    let cumulative = 0;
    const order = ['UR', 'SSR', 'SR', 'R']; // Check rarest first
    for (const rarity of order) {
      cumulative += rates[rarity];
      if (rand < cumulative) {
        // Reset pity on SSR+ pulls
        if (rarity === 'SSR' || rarity === 'UR') {
          state.pity.count = 0;
          // Track SSR streak
          state.stats.ssrStreak++;
          if (state.stats.ssrStreak > state.stats.bestSsrStreak) {
            state.stats.bestSsrStreak = state.stats.ssrStreak;
          }
        } else {
          state.stats.ssrStreak = 0;
        }
        return rarity;
      }
    }
    return 'R';
  }

  // ── Character Selection ──
  // characters.json already has rarity + stats assigned to all 319 characters
  function selectCharacter(rarity) {
    const allChars = DataLoader.get();
    if (!allChars || allChars.length === 0) return null; // DataLoader not ready
    const pool = allChars.filter(c => c.rarity === rarity);
    if (pool.length === 0) return null;

    // Featured banner rate-up
    if (currentBanner === 'featured') {
      const featuredInRarity = FEATURED_CHARACTERS.filter(slug => {
        const c = DataLoader.getBySlug(slug);
        return c && c.rarity === rarity;
      });

      if (featuredInRarity.length > 0 && Math.random() < FEATURED_RATE_UP) {
        const slug = featuredInRarity[Math.floor(Math.random() * featuredInRarity.length)];
        return DataLoader.getBySlug(slug);
      }
    }

    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ── Echo & Dupe Handling ──
  function handlePullResult(character) {
    const state = Game.getState();
    const slug = character.slug;
    const rarity = character.rarity;

    if (!state.characters[slug]) {
      // New character — use stats directly from characters.json
      state.characters[slug] = {
        owned: true,
        rarity: rarity,
        echo: 0,
        level: 1,
        stats: { ...character.stats },
        baseStats: { ...character.stats },
        variants: mapRarityToVariants(rarity),
        shards: 0,
        // Bond system (Phase 6 — Odekake)
        bondPoints: 0,
        bondLevel: 0,
        lastDateCooldown: 0,
      };
      return { isNew: true, echo: 0, liveCacheGained: 0 };
    }

    const charData = state.characters[slug];
    if (!charData.owned) {
      charData.owned = true;
      charData.rarity = rarity;
      charData.echo = 0;
      charData.level = 1;
      charData.stats = { ...character.stats };
      charData.baseStats = { ...character.stats };
      charData.variants = mapRarityToVariants(rarity);
      if (!charData.shards) charData.shards = 0;
      // Bond system defaults
      if (charData.bondPoints === undefined) charData.bondPoints = 0;
      if (charData.bondLevel === undefined) charData.bondLevel = 0;
      if (charData.lastDateCooldown === undefined) charData.lastDateCooldown = 0;
      return { isNew: true, echo: 0, liveCacheGained: 0 };
    }

    // Duplicate handling
    if (charData.echo < ECHO_MAX) {
      // Add Echo
      charData.echo++;
      const gains = ECHO_GAINS[rarity] || ECHO_GAINS.R;
      charData.stats.st += gains.primary;
      charData.stats.ps += gains.primary;
      charData.stats.tc += gains.secondary;
      charData.stats.ch += gains.secondary;
      charData.stats.vc += gains.secondary;
      charData.stats.mg += gains.secondary;

      // Update baseStats max cap for ST/PS so stamina system tracks the new max
      if (charData.baseStats) {
        charData.baseStats.st = charData.stats.st;
        charData.baseStats.ps = charData.stats.ps;
      }
      return { isNew: false, echo: charData.echo, liveCacheGained: 0 };
    } else {
      // E6 MAX — convert to LiveCache
      const lc = E6_LIVECACHE[rarity] || 20;
      state.currencies.liveCache += lc;
      return { isNew: false, echo: ECHO_MAX, liveCacheGained: lc };
    }
  }

  // Map rarity string to legacy variant array for backward compat
  function mapRarityToVariants(rarity) {
    if (rarity === 'UR') return ['ur'];
    if (rarity === 'SSR') return ['ssr'];
    if (rarity === 'SR') return ['sr'];
    return ['normal'];
  }

  // ── Ticket/Cost Logic ──
  function getTicketType() {
    return currentBanner === 'featured' ? 'red' : 'blue';
  }

  function getPullCost(count) {
    return count; // 1 ticket per pull
  }

  function canPull(count) {
    const state = Game.getState();
    const type = getTicketType();
    const tickets = state.currencies.myTicket ? (state.currencies.myTicket[type] || 0) : 0;
    const cost = getPullCost(count);
    const deficit = Math.max(0, cost - tickets);
    return tickets >= cost || state.currencies.vgems >= deficit * VGEML_PER_TICKET;
  }

  function deductPullCost(count) {
    const state = Game.getState();
    const type = getTicketType();
    const cost = getPullCost(count);
    const tickets = state.currencies.myTicket ? (state.currencies.myTicket[type] || 0) : 0;

    // Spend available tickets first
    if (tickets >= cost) {
      state.currencies.myTicket[type] = tickets - cost;
      return 0; // No VGems needed
    }

    // Not enough tickets — use all tickets, buy the rest with VGems
    const deficit = cost - tickets;
    const vgemsNeeded = deficit * VGEML_PER_TICKET;
    if (state.currencies.vgems < vgemsNeeded) return -1; // Can't afford

    state.currencies.myTicket[type] = 0;
    state.currencies.vgems -= vgemsNeeded;
    return deficit; // Return how many were bought with VGems
  }

  // ── Pull Functions ──
  function pullSingle() {
    if (!canPull(1)) return null;

    // Roll and select BEFORE deducting — prevents resource loss on failure
    const rarity = rollRarity();
    const character = selectCharacter(rarity);
    if (!character) return null; // Data not loaded or pool empty — don't deduct

    const state = Game.getState();
    state.stats.totalPulls++;

    const vgemsBought = deductPullCost(1);
    if (vgemsBought === -1) return null; // Can't afford

    const result = handlePullResult(character);
    trackPullHistory(character.slug);
    Game.save();

    return {
      character,
      rarity,
      isNew: result.isNew,
      echo: result.echo,
      liveCacheGained: result.liveCacheGained,
      vgemsBought,
    };
  }

  function pullMulti() {
    if (!canPull(10)) return null;

    const state = Game.getState();
    const results = [];
    let hasSRPlus = false;

    // Pre-roll ALL 10 selections BEFORE deducting cost
    // If any roll fails (data not loaded), abort without consuming resources
    // Snapshot pity before pre-rolls so we can revert on failure
    const pityBefore = state.pity ? state.pity.count : 0;
    const ssrStreakBefore = state.stats.ssrStreak;

    const preRolls = [];
    for (let i = 0; i < 10; i++) {
      let rarity = rollRarity();

      // Guarantee at least 1 SR+ in 10-pull
      if (i === 9 && !hasSRPlus) {
        rarity = Math.random() < 0.15 ? 'SSR' : 'SR';
      }

      if (rarity === 'SR' || rarity === 'SSR' || rarity === 'UR') hasSRPlus = true;

      const character = selectCharacter(rarity);
      if (!character) {
        // Data not loaded or pool empty — revert ALL state changes and abort
        state.pity.count = pityBefore;
        state.stats.ssrStreak = ssrStreakBefore;
        return null; // Don't deduct resources
      }

      preRolls.push({ rarity, character });
    }

    // All 10 selections succeeded — NOW deduct cost
    const vgemsBought = deductPullCost(10);
    if (vgemsBought === -1) return null;

    // Process pre-rolled results
    for (const { rarity, character } of preRolls) {
      state.stats.totalPulls++;
      const result = handlePullResult(character);
      trackPullHistory(character.slug);

      results.push({
        character,
        rarity,
        isNew: result.isNew,
        echo: result.echo,
        liveCacheGained: result.liveCacheGained,
      });
    }

    Game.save();
    return results;
  }

  function trackPullHistory(slug) {
    const state = Game.getState();
    if (!state.pullHistory[slug]) {
      state.pullHistory[slug] = { firstPullDate: new Date().toISOString(), totalPulls: 0 };
    }
    state.pullHistory[slug].totalPulls++;
  }

  // ── Public API ──
  function setBanner(banner) { currentBanner = banner; }
  function getBanner() { return currentBanner; }
  function getPityCount() { return Game.getState().pity?.count || 0; }

  // Return current pity-adjusted rates for display
  function getCurrentRates() {
    const pityCount = getPityCount();
    return calculateRates(pityCount);
  }

  // Return base banner rates for display (not pity-adjusted)
  function getDisplayRates() {
    return { ...BASE_RATES };
  }

  function getFeaturedCharacters() {
    return FEATURED_CHARACTERS.map(s => DataLoader.getBySlug(s)).filter(Boolean);
  }

  // Legacy compat: get ticket type for UI display
  function getTicketCostLabel(count) {
    const type = getTicketType();
    const typeName = type === 'red' ? 'Red' : 'Blue';
    return `${count} ${typeName} Ticket${count > 1 ? 's' : ''}`;
  }

  return {
    pullSingle, pullMulti,
    setBanner, getBanner,
    getPityCount, canPull,
    getDisplayRates, getCurrentRates,
    getFeaturedCharacters,
    getTicketCostLabel, getTicketType,
    VGEML_PER_TICKET, HARD_PITY, FEATURED_RATE_UP,
    BASE_RATES, SOFT_PITY_SSR, SOFT_PITY_UR,
  };
})();
