/* ═══════════════════════════════════════════════
   gacha.js — Pull Logic, Rates, Pity, Duplicates
   ═══════════════════════════════════════════════ */

const Gacha = (() => {
  const PULL_COST_SINGLE = 100;
  const PULL_COST_MULTI = 1000;
  const PITY_THRESHOLD = 50;

  const RATES = {
    normal: 0.82,
    sr: 0.15,
    ssr: 0.03,
  };

  let currentBanner = 'standard';
  let featuredCharacters = []; // Populated dynamically

  function setBanner(banner) {
    currentBanner = banner;
  }

  function getBanner() {
    return currentBanner;
  }

  function setFeatured(slugs) {
    featuredCharacters = slugs;
  }

  // Roll variant tier
  function rollVariant() {
    const state = Game.getState();
    state.pity.count++;

    // Pity check
    if (state.pity.count >= PITY_THRESHOLD) {
      state.pity.count = 0;
      return 'ssr';
    }

    const rand = Math.random();
    let cumulative = 0;
    for (const [variant, rate] of Object.entries(RATES)) {
      cumulative += rate;
      if (rand < cumulative) {
        if (variant === 'ssr') {
          state.pity.count = 0;
          // Track SSR streak
          state.stats.ssrStreak++;
          if (state.stats.ssrStreak > state.stats.bestSsrStreak) {
            state.stats.bestSsrStreak = state.stats.ssrStreak;
          }
        } else {
          state.stats.ssrStreak = 0;
        }
        return variant;
      }
    }
    return 'normal';
  }

  // Roll a character (equal chance for all)
  function rollCharacter() {
    const chars = DataLoader.get();
    if (chars.length === 0) return null;

    // Featured banner: 50% chance to be a featured character
    if (currentBanner === 'featured' && featuredCharacters.length > 0 && Math.random() < 0.5) {
      const slug = featuredCharacters[Math.floor(Math.random() * featuredCharacters.length)];
      return DataLoader.getBySlug(slug);
    }

    return chars[Math.floor(Math.random() * chars.length)];
  }

  // Perform a single pull
  function pullSingle() {
    const state = Game.getState();
    if (state.currencies.stars < PULL_COST_SINGLE) return null;

    state.currencies.stars -= PULL_COST_SINGLE;
    state.stats.totalPulls++;

    const character = rollCharacter();
    if (!character) return null;

    const variant = rollVariant();

    // Check if character is new before adding
    const isNewChar = !state.characters[character.slug] || !state.characters[character.slug].owned;

    // Add to collection
    addPullToCollection(character, variant);

    Game.save();
    if (Game.onStateChange) {} // Will trigger via save

    return { character, variant, isNew: isNewChar };
  }

  // Perform multi pull (10x)
  function pullMulti() {
    const state = Game.getState();
    if (state.currencies.stars < PULL_COST_MULTI) return null;

    const results = [];
    let hasSR = false;

    state.currencies.stars -= PULL_COST_MULTI;

    for (let i = 0; i < 10; i++) {
      state.stats.totalPulls++;
      const character = rollCharacter();
      if (!character) continue;

      // Check if character is new before adding
      const isNewChar = !state.characters[character.slug] || !state.characters[character.slug].owned;

      let variant = rollVariant();
      if (variant === 'sr' || variant === 'ssr') hasSR = true;

      // Guarantee at least 1 SR on last pull
      if (i === 9 && !hasSR) {
        variant = Math.random() < 0.85 ? 'sr' : 'ssr';
        if (variant === 'ssr') state.pity.count = 0;
        state.stats.ssrStreak++;
        if (state.stats.ssrStreak > state.stats.bestSsrStreak) {
          state.stats.bestSsrStreak = state.stats.ssrStreak;
        }
      }

      addPullToCollection(character, variant);
      results.push({ character, variant, isNew: isNewChar });
    }

    Game.save();
    return results;
  }

  // Add pulled character to collection
  function addPullToCollection(character, variant) {
    const state = Game.getState();
    const slug = character.slug;

    if (!state.characters[slug]) {
      state.characters[slug] = {
        owned: true,
        variants: [],
        level: 1,
        shards: 0,
      };
    }

    const charData = state.characters[slug];

    // Check if already owned at this variant
    if (charData.variants.includes(variant)) {
      // Duplicate! Convert to shards
      const shardValue = variant === 'ssr' ? 10 : variant === 'sr' ? 5 : 2;
      // If already SSR and pulling any variant, give bonus stars instead
      if (charData.variants.includes('ssr')) {
        const starBonus = variant === 'ssr' ? 50 : variant === 'sr' ? 30 : 10;
        state.currencies.stars += starBonus;
      } else {
        charData.shards += shardValue;
      }
    } else {
      charData.variants.push(variant);
      if (!charData.owned) charData.owned = true;
    }
  }

  function getPityCount() {
    return Game.getState().pity.count;
  }

  function canPull(count) {
    const cost = count === 1 ? PULL_COST_SINGLE : PULL_COST_MULTI;
    return Game.getState().currencies.stars >= cost;
  }

  // Get random featured characters
  function generateFeatured() {
    const chars = DataLoader.get();
    const shuffled = [...chars].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4).map(c => c.slug);
  }

  return {
    pullSingle, pullMulti, setBanner, getBanner,
    setFeatured, generateFeatured,
    getPityCount, canPull,
    PULL_COST_SINGLE, PULL_COST_MULTI, PITY_THRESHOLD,
  };
})();
