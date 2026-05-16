/* ═══════════════════════════════════════════════
   data.js — Character Roster Loader
   ═══════════════════════════════════════════════ */

const DataLoader = (() => {
  let _characters = [];
  let _loaded = false;
  let _loading = false;

  async function load() {
    if (_loaded) return _characters;
    if (_loading) {
      // Wait for the in-flight fetch to finish
      await new Promise(r => setTimeout(r, 100));
      return load();
    }
    _loading = true;
    try {
      const resp = await fetch('data/characters.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      _characters = await resp.json();
      _loaded = true;
      console.log(`Loaded ${_characters.length} characters.`);
      return _characters;
    } catch (err) {
      console.error('Failed to load characters:', err);
      return [];
    } finally {
      _loading = false;
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
