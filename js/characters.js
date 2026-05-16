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

    const [dustCost, starCost] = Game.getLevelCost(bestVariant, charData.level);
    if (state.currencies.starDust < dustCost) return { success: false, reason: 'Not enough Star Dust' };
    if (state.currencies.stars < starCost) return { success: false, reason: 'Not enough Stars' };

    state.currencies.starDust -= dustCost;
    state.currencies.stars -= starCost;
    charData.level++;

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

  // Get character data for display
  function getCharDisplayData(slug) {
    const charInfo = DataLoader.getBySlug(slug);
    if (!charInfo) return null;

    const state = Game.getState();
    const charData = state.characters[slug] || { owned: false, variants: [], level: 1, shards: 0 };

    return {
      ...charInfo,
      ...charData,
      bestVariant: Game.getBestVariant(charData.variants),
      levelCap: charData.owned ? Game.LEVEL_CAPS[Game.getBestVariant(charData.variants)] : 20,
      nextLevelCost: charData.owned ? Game.getLevelCost(Game.getBestVariant(charData.variants), charData.level) : [0, 0],
      canAscend: canAscend(slug),
      nextAscension: getNextAscension(slug),
    };
  }

  function canAscend(slug) {
    const state = Game.getState();
    const charData = state.characters[slug];
    if (!charData || !charData.owned) return false;

    if (charData.variants.includes('normal') && !charData.variants.includes('sr')) {
      const cost = Game.ASCENSION_COSTS['normal->sr'];
      return charData.level >= cost.level && state.currencies.starFragments >= cost.fragments;
    }
    if (charData.variants.includes('sr') && !charData.variants.includes('ssr')) {
      const cost = Game.ASCENSION_COSTS['sr->ssr'];
      return charData.level >= cost.level && state.currencies.starFragments >= cost.fragments;
    }
    return false;
  }

  function getNextAscension(slug) {
    const state = Game.getState();
    const charData = state.characters[slug];
    if (!charData || !charData.owned) return null;

    if (charData.variants.includes('normal') && !charData.variants.includes('sr')) {
      return { type: 'normal->sr', toVariant: 'sr', ...Game.ASCENSION_COSTS['normal->sr'] };
    }
    if (charData.variants.includes('sr') && !charData.variants.includes('ssr')) {
      return { type: 'sr->ssr', toVariant: 'ssr', ...Game.ASCENSION_COSTS['sr->ssr'] };
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
