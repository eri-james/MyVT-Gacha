/* ═══════════════════════════════════════════════
   characters.js — Leveling, Ascension, Shard System
   ═══════════════════════════════════════════════ */

const Characters = (() => {

  // Level up a character
  function levelUp(slug) {
    const state = Game.getState();
    const charData = state.characters[slug];
    if (!charData || !charData.owned) return { success: false, reason: 'Character not owned' };

    const bestVariant = Game.getBestVariant(charData.variants);
    const levelCap = Game.LEVEL_CAPS[bestVariant];
    if (charData.level >= levelCap) return { success: false, reason: 'Max level for this variant' };

    const [ringgitCost, liveCacheCost] = Game.getLevelCost(bestVariant, charData.level);
    if (state.currencies.vringgit < ringgitCost) return { success: false, reason: 'Not enough VRinggit' };
    if ((state.currencies.liveCache || 0) < liveCacheCost) return { success: false, reason: 'Not enough LiveCache' };

    state.currencies.vringgit -= ringgitCost;
    state.currencies.liveCache = (state.currencies.liveCache || 0) - liveCacheCost;
    charData.level++;

    // Boost stats slightly on level up
    if (charData.stats) {
      for (const key of Object.keys(charData.stats)) {
        charData.stats[key] += Math.ceil(Math.random() * 2);
      }
    }

    // Update baseStats max cap for ST/PS so stamina system tracks the new max
    if (charData.baseStats) {
      charData.baseStats.st = charData.stats.st;
      charData.baseStats.ps = charData.stats.ps;
    }

    Game.save();
    return { success: true, newLevel: charData.level };
  }

  // Ascend character
  function ascend(slug) {
    const state = Game.getState();
    const charData = state.characters[slug];
    if (!charData || !charData.owned) return { success: false, reason: 'Character not owned' };

    let ascType, newVariant;

    if (charData.variants.includes('normal') && !charData.variants.includes('sr')) {
      ascType = 'normal->sr';
      newVariant = 'sr';
    } else if (charData.variants.includes('sr') && !charData.variants.includes('ssr')) {
      ascType = 'sr->ssr';
      newVariant = 'ssr';
    } else {
      return { success: false, reason: 'Already at max ascension' };
    }

    const cost = Game.ASCENSION_COSTS[ascType];
    if (charData.level < cost.level) {
      return { success: false, reason: `Requires level ${cost.level}` };
    }
    if (state.currencies.starFragments < cost.fragments) {
      return { success: false, reason: 'Not enough Star Fragments' };
    }

    state.currencies.starFragments -= cost.fragments;
    charData.variants.push(newVariant);

    Game.save();
    return { success: true, newVariant };
  }

  // Convert shards
  function convertShards(slug, toResource) {
    const state = Game.getState();
    const charData = state.characters[slug];
    if (!charData || charData.shards <= 0) return { success: false, reason: 'No shards' };

    const amount = Math.min(charData.shards, 10); // Convert up to 10 at a time
    charData.shards -= amount;

    const rates = { starDust: 5, starFragments: 2, stars: 1 };
    const value = amount * (rates[toResource] || 1);
    state.currencies[toResource] += value;

    Game.save();
    return { success: true, converted: amount, gained: value, resource: toResource };
  }

  // Get character data for display (Gacha V2 — includes stats, echo, rarity, power)
  function getCharDisplayData(slug) {
    const charInfo = DataLoader.getBySlug(slug);
    if (!charInfo) return null;

    const state = Game.getState();
    const charData = state.characters[slug] || { owned: false, variants: [], level: 1, shards: 0 };

    // Compute total power from current stats (may differ from base due to Echo boosts)
    let totalPower = 0;
    if (charData.stats) {
      totalPower = Object.values(charData.stats).reduce((a, b) => a + b, 0);
    } else if (charInfo.stats) {
      totalPower = charInfo.power || Object.values(charInfo.stats).reduce((a, b) => a + b, 0);
    }

    // Echo display label
    const echoCount = charData.echo || 0;
    const echoLabel = echoCount >= 6 ? 'E6 MAX' : `E${echoCount}`;

    return {
      ...charInfo,
      ...charData,
      bestVariant: Game.getBestVariant(charData.variants),
      levelCap: charData.owned ? Game.LEVEL_CAPS[Game.getBestVariant(charData.variants)] : 20,
      nextLevelCost: charData.owned ? Game.getLevelCost(Game.getBestVariant(charData.variants), charData.level) : [0, 0],
      canAscend: canAscend(slug),
      nextAscension: getNextAscension(slug),
      // V2 fields
      totalPower,
      echoLabel,
      echoCount,
      rarity: charData.rarity || charInfo.rarity || null,
      stats: charData.stats || charInfo.stats || null,
      baseStats: charData.baseStats || charInfo.stats || null,
    };
  }

  function canAscend(slug) {
    const state = Game.getState();
    const charData = state.characters[slug];
    if (!charData || !charData.owned) return false;

    // Ascension removed in Gacha V2 (replaced by Echo system)
    if (!Game.ASCENSION_COSTS || Object.keys(Game.ASCENSION_COSTS).length === 0) return false;

    if (charData.variants.includes('normal') && !charData.variants.includes('sr')) {
      const cost = Game.ASCENSION_COSTS['normal->sr'];
      if (!cost) return false;
      return charData.level >= cost.level && state.currencies.starFragments >= cost.fragments;
    }
    if (charData.variants.includes('sr') && !charData.variants.includes('ssr')) {
      const cost = Game.ASCENSION_COSTS['sr->ssr'];
      if (!cost) return false;
      return charData.level >= cost.level && state.currencies.starFragments >= cost.fragments;
    }
    return false;
  }

  function getNextAscension(slug) {
    const state = Game.getState();
    const charData = state.characters[slug];
    if (!charData || !charData.owned) return null;

    // Ascension removed in Gacha V2 (replaced by Echo system)
    if (!Game.ASCENSION_COSTS || Object.keys(Game.ASCENSION_COSTS).length === 0) return null;

    if (charData.variants.includes('normal') && !charData.variants.includes('sr')) {
      const cost = Game.ASCENSION_COSTS['normal->sr'];
      if (!cost) return null;
      return { type: 'normal->sr', toVariant: 'sr', ...cost };
    }
    if (charData.variants.includes('sr') && !charData.variants.includes('ssr')) {
      const cost = Game.ASCENSION_COSTS['sr->ssr'];
      if (!cost) return null;
      return { type: 'sr->ssr', toVariant: 'ssr', ...cost };
    }
    return null;
  }

  // Get owned characters for station assignment
  function getOwnedCharacters() {
    const state = Game.getState();
    const chars = DataLoader.get();
    return chars.filter(c => state.characters[c.slug] && state.characters[c.slug].owned);
  }

  return {
    levelUp, ascend, convertShards,
    getCharDisplayData, canAscend, getNextAscension,
    getOwnedCharacters,
  };
})();
