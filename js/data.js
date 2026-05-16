/* ═══════════════════════════════════════════════
   data.js — Character Roster Loader
   ═══════════════════════════════════════════════ */

const DataLoader = (() => {
  let _characters = [];
  let _loaded = false;

  async function load() {
    if (_loaded) return _characters;
    try {
      const resp = await fetch('data/characters.json');
      _characters = await resp.json();
      _loaded = true;
      console.log(`Loaded ${_characters.length} characters.`);
      return _characters;
    } catch (err) {
      console.error('Failed to load characters:', err);
      return [];
    }
  }

  function get() {
    return _characters;
  }

  function getBySlug(slug) {
    return _characters.find(c => c.slug === slug);
  }

  function getAgencies() {
    const agencies = new Set(_characters.map(c => c.agency));
    return [...agencies].sort();
  }

  function getRandom() {
    return _characters[Math.floor(Math.random() * _characters.length)];
  }

  return { load, get, getBySlug, getAgencies, getRandom };
})();
