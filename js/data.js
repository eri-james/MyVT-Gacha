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

  /**
   * Get image URL for a character — tries local self-hosted portrait first,
   * falls back to the hololist.net original URL.
   * Local portraits are expected at: data/portraits/{slug}.jpg
   */
  function getImageUrl(slug) {
    const char = getBySlug(slug);
    if (!char) return '';
    // Self-hosted path (primary) — change extension here if portraits are PNG
    return `data/portraits/${slug}.jpg`;
  }

  /**
   * Get the original (remote) image URL for a character.
   */
  function getOriginalImageUrl(slug) {
    const char = getBySlug(slug);
    return char ? char.image : '';
  }

  return { load, get, getBySlug, getAgencies, getRandom, getImageUrl, getOriginalImageUrl };
})();
