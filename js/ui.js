/* ═══════════════════════════════════════════════
   ui.js — All UI Rendering, Navigation, Animations
   ═══════════════════════════════════════════════ */

const UI = (() => {
  let currentTab = 'home';

  // ── Initialization ──
  async function init() {
    await DataLoader.load();
    Game.load();
    Game.onStateChange(updateUI);
    Game.startTickLoop();
    Game.startAutoSave();
    bindEvents();
    setupFeaturedBanner();
    updateUI();
    checkOfflineEarnings();
    showToast('Welcome back to MyVT Gacha!', 'info');
  }

  // ── Event Binding ──
  function bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Settings
    document.getElementById('btn-settings').addEventListener('click', () => toggleModal('modal-settings'));
    document.getElementById('btn-close-settings').addEventListener('click', () => toggleModal('modal-settings'));

    // Home actions
    document.getElementById('btn-claim-offline').addEventListener('click', () => {
      const result = Game.claimOfflineEarnings();
      if (result) {
        const e = result.earnings;
        showToast(`Claimed ${result.minutes}min offline: +${Math.floor(e.stars)} Stars, +${Math.floor(e.starDust)} Dust, +${Math.floor(e.starFragments)} Fragments`, 'success');
        document.getElementById('btn-claim-offline').style.display = 'none';
        updateUI();
      }
    });

    document.getElementById('btn-daily-login').addEventListener('click', () => {
      const reward = Game.claimDailyLogin();
      if (reward) {
        showToast(`Day ${reward.streak} login! +${reward.reward} Stars`, 'success');
        updateUI();
      } else {
        showToast('Already claimed today!', 'warning');
      }
    });

    document.getElementById('btn-copy-id').addEventListener('click', () => {
      const id = document.getElementById('player-id').textContent;
      navigator.clipboard.writeText(id).then(() => {
        showToast('Player ID copied!', 'success');
      }).catch(() => {
        showToast('Failed to copy', 'error');
      });
    });

    // Pull
    document.querySelectorAll('.btn-pull').forEach(btn => {
      btn.addEventListener('click', () => handlePull(parseInt(btn.dataset.count)));
    });

    document.querySelectorAll('.banner-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.banner-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Gacha.setBanner(btn.dataset.banner);
        updateBannerInfo();
      });
    });

    // Collection filters
    document.getElementById('filter-ownership').addEventListener('change', renderCollection);
    document.getElementById('filter-variant').addEventListener('change', renderCollection);
    document.getElementById('filter-agency').addEventListener('change', renderCollection);
    document.getElementById('filter-search').addEventListener('input', debounce(renderCollection, 300));

    // Settings buttons
    document.getElementById('btn-save-manual').addEventListener('click', () => {
      Game.save();
      showToast('Game saved!', 'success');
    });

    document.getElementById('btn-export-save').addEventListener('click', () => {
      const code = Game.exportSaveCode();
      prompt('Copy your save code (keep it safe!):', code);
    });

    document.getElementById('btn-import-save').addEventListener('click', () => {
      const code = prompt('Paste your save code:');
      if (code) {
        if (Game.importSaveCode(code)) {
          showToast('Save imported successfully!', 'success');
          updateUI();
        } else {
          showToast('Invalid save code!', 'error');
        }
      }
    });

    document.getElementById('btn-cloud-sync').addEventListener('click', () => {
      showToast('Cloud sync coming soon!', 'info');
    });

    document.getElementById('btn-load-cloud').addEventListener('click', () => {
      showToast('Cloud load coming soon!', 'info');
    });

    document.getElementById('btn-transfer-download').addEventListener('click', () => {
      showToast('Cloud transfer coming soon!', 'info');
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      if (Game.resetState()) {
        showToast('Game data reset!', 'warning');
        updateUI();
        toggleModal('modal-settings');
      }
    });

    // Character modal
    document.getElementById('btn-close-character').addEventListener('click', () => toggleModal('modal-character'));
  }

  function setupFeaturedBanner() {
    const featured = Gacha.generateFeatured();
    Gacha.setFeatured(featured);
  }

  // ── Tab Navigation ──
  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.toggle('active', el.id === `tab-${tab}`));

    if (tab === 'collection') renderCollection();
    if (tab === 'studio') renderStudio();
    if (tab === 'pull') {
      updateBannerInfo();
      document.getElementById('pity-count').textContent = Gacha.getPityCount();
    }
    updateUI();
  }

  // ── Main UI Update ──
  function updateUI() {
    const state = Game.getState();
    const stats = Game.getCollectionStats();

    // Resources
    document.getElementById('res-stars').textContent = formatNum(Math.floor(state.currencies.stars));
    document.getElementById('res-stardust').textContent = formatNum(Math.floor(state.currencies.starDust));
    document.getElementById('res-fragments').textContent = formatNum(Math.floor(state.currencies.starFragments));
    document.getElementById('res-bonds').textContent = formatNum(Math.floor(state.currencies.bondPoints));

    // Home stats
    document.getElementById('stat-collection').textContent = `${stats.owned} / ${stats.total}`;
    document.getElementById('stat-ssr').textContent = stats.ssr;
    document.getElementById('stat-studio-lv').textContent = state.studio.level;
    document.getElementById('stat-pulls').textContent = formatNum(state.stats.totalPulls);

    // Player ID
    document.getElementById('player-id').textContent = state.playerId;

    // Daily login button
    const dailyReward = Game.getDailyLoginReward();
    document.getElementById('btn-daily-login').textContent = dailyReward
      ? `Daily Login (Day ${dailyReward.streak}) +${dailyReward.reward} Stars`
      : 'Login Claimed Today';
    document.getElementById('btn-daily-login').disabled = !dailyReward;

    // Pull button states
    document.querySelectorAll('.btn-pull').forEach(btn => {
      const count = parseInt(btn.dataset.count);
      btn.disabled = !Gacha.canPull(count);
    });

    // Pity counter
    document.getElementById('pity-count').textContent = Gacha.getPityCount();

    // Settings stats
    document.getElementById('settings-total-pulls').textContent = formatNum(state.stats.totalPulls);
    document.getElementById('settings-ssr-streak').textContent = state.stats.bestSsrStreak;
    document.getElementById('settings-collection-pct').textContent = stats.pct + '%';
    document.getElementById('settings-studio-lv').textContent = state.studio.level;

    // Update active tab content
    if (currentTab === 'studio') renderStudio();
    if (currentTab === 'collection') updateCollectionProgress();
  }

  // ── Offline Earnings ──
  function checkOfflineEarnings() {
    const offline = Game.getOfflineEarnings();
    if (offline) {
      const btn = document.getElementById('btn-claim-offline');
      const totalStars = Math.floor(offline.earnings.stars);
      btn.textContent = `Claim Offline (${Math.round(offline.minutes)}min) +${formatNum(totalStars)} Stars`;
      btn.style.display = 'inline-flex';
    }
  }

  // ── Pull Handling ──
  function handlePull(count) {
    let results;
    if (count === 1) {
      results = Gacha.pullSingle();
      if (!results) {
        showToast('Not enough Stars!', 'error');
        return;
      }
      results = [results];
    } else {
      results = Gacha.pullMulti();
      if (!results || results.length === 0) {
        showToast('Not enough Stars!', 'error');
        return;
      }
    }

    // Show pull animation
    showPullAnimation(results);
    updateUI();
  }

  function showPullAnimation(results) {
    const overlay = document.getElementById('pull-overlay');
    const container = document.getElementById('pull-animation');
    overlay.style.display = 'flex';
    container.innerHTML = '';

    // Set grid columns based on count
    if (results.length <= 5) {
      container.style.gridTemplateColumns = `repeat(${results.length}, 1fr)`;
    } else {
      container.style.gridTemplateColumns = 'repeat(5, 1fr)';
    }

    results.forEach((result, i) => {
      const card = createPullCard(result);
      container.appendChild(card);
    });

    // Close on click
    const closeHandler = () => {
      overlay.style.display = 'none';
      overlay.removeEventListener('click', closeHandler);
    };

    // Auto-close after 3 seconds
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.removeEventListener('click', closeHandler);
    }, 4000);
  }

  function createPullCard(result) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card-flip';

    const inner = document.createElement('div');
    inner.className = 'card-flip-inner';

    // Front (face down)
    const front = document.createElement('div');
    front.className = 'card-flip-front';
    front.textContent = '?';

    // Back (card face)
    const back = document.createElement('div');
    back.className = `card-flip-back char-card variant-${result.variant}`;
    const img = document.createElement('img');
    img.className = 'char-card-img';
    img.src = result.character.image;
    img.alt = result.character.name;
    img.loading = 'lazy';
    img.onerror = () => { img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" fill="%231c1b18"><rect width="300" height="300"/><text x="150" y="160" text-anchor="middle" fill="%23908e87" font-size="14">No Image</text></svg>'; };

    const overlay = document.createElement('div');
    overlay.className = 'char-card-overlay';
    const name = document.createElement('div');
    name.className = 'char-card-name';
    name.textContent = result.character.name;
    const agency = document.createElement('div');
    agency.className = 'char-card-agency';
    agency.textContent = result.character.agency;
    overlay.appendChild(name);
    overlay.appendChild(agency);

    const badge = document.createElement('div');
    badge.className = `char-card-badge badge-${result.variant}`;
    badge.textContent = result.variant.toUpperCase();

    back.appendChild(img);
    back.appendChild(overlay);
    back.appendChild(badge);

    inner.appendChild(front);
    inner.appendChild(back);
    wrapper.appendChild(inner);

    // Flip animation with delay
    setTimeout(() => {
      inner.classList.add('flipped');
    }, 300 + Math.random() * 500);

    // Click to view details
    wrapper.addEventListener('click', () => {
      showCharacterDetail(result.character.slug);
    });
    wrapper.style.cursor = 'pointer';

    return wrapper;
  }

  // ── Banner Info ──
  function updateBannerInfo() {
    const banner = Gacha.getBanner();
    const nameEl = document.getElementById('banner-name');
    const descEl = document.getElementById('banner-desc');

    if (banner === 'standard') {
      nameEl.textContent = 'Standard Banner';
      descEl.textContent = 'All 319 Malaysian VTubers';
    } else {
      nameEl.textContent = 'Featured Banner';
      const featured = Gacha.generateFeatured().slice(0, 4).map(s => {
        const c = DataLoader.getBySlug(s);
        return c ? c.name : s;
      }).join(', ');
      descEl.textContent = `Rate up: ${featured}`;
    }
  }

  // ── Collection Gallery ──
  function renderCollection() {
    const grid = document.getElementById('collection-grid');
    const chars = DataLoader.get();
    const state = Game.getState();

    const ownership = document.getElementById('filter-ownership').value;
    const variant = document.getElementById('filter-variant').value;
    const agency = document.getElementById('filter-agency').value;
    const search = document.getElementById('filter-search').value.toLowerCase().trim();

    let filtered = chars;

    if (ownership === 'owned') {
      filtered = filtered.filter(c => state.characters[c.slug] && state.characters[c.slug].owned);
    } else if (ownership === 'unowned') {
      filtered = filtered.filter(c => !state.characters[c.slug] || !state.characters[c.slug].owned);
    }

    if (variant !== 'all') {
      filtered = filtered.filter(c => {
        const data = state.characters[c.slug];
        return data && data.owned && data.variants.includes(variant);
      });
    }

    if (agency !== 'all') {
      filtered = filtered.filter(c => c.agency === agency);
    }

    if (search) {
      filtered = filtered.filter(c => c.name.toLowerCase().includes(search));
    }

    grid.innerHTML = '';
    filtered.forEach(char => {
      const card = createCollectionCard(char);
      grid.appendChild(card);
    });

    updateCollectionProgress();
  }

  function createCollectionCard(char) {
    const state = Game.getState();
    const charData = state.characters[char.slug];
    const owned = charData && charData.owned;
    const bestVariant = owned ? Game.getBestVariant(charData.variants) : null;

    const card = document.createElement('div');
    card.className = `char-card${bestVariant ? ` variant-${bestVariant}` : ''}`;

    if (!owned) {
      card.classList.add('not-owned');
    }

    const img = document.createElement('img');
    img.className = 'char-card-img';
    img.src = owned ? char.image : char.image;
    img.alt = char.name;
    img.loading = 'lazy';
    img.style.opacity = owned ? '1' : '0.3';
    img.onerror = () => { img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" fill="%231c1b18"><rect width="300" height="300"/><text x="150" y="160" text-anchor="middle" fill="%23908e87" font-size="14">No Image</text></svg>'; };

    const overlay = document.createElement('div');
    overlay.className = 'char-card-overlay';
    const name = document.createElement('div');
    name.className = 'char-card-name';
    name.textContent = char.name;
    const agencyEl = document.createElement('div');
    agencyEl.className = 'char-card-agency';
    agencyEl.textContent = char.agency;
    overlay.appendChild(name);
    overlay.appendChild(agencyEl);

    card.appendChild(img);
    card.appendChild(overlay);

    if (bestVariant) {
      const badge = document.createElement('div');
      badge.className = `char-card-badge badge-${bestVariant}`;
      badge.textContent = bestVariant.toUpperCase();
      card.appendChild(badge);
    }

    if (!owned) {
      const lock = document.createElement('div');
      lock.className = 'char-card-lock';
      lock.textContent = '?';
      card.appendChild(lock);
    }

    card.addEventListener('click', () => showCharacterDetail(char.slug));
    card.style.cursor = 'pointer';

    return card;
  }

  function updateCollectionProgress() {
    const stats = Game.getCollectionStats();
    document.getElementById('collection-progress-fill').style.width = stats.pct + '%';
    document.getElementById('collection-progress-text').textContent = `${stats.owned} / ${stats.total} (${stats.pct}%)`;
  }

  // ── Studio ──
  function renderStudio() {
    const state = Game.getState();
    const grid = document.getElementById('stations-grid');
    const maxSlots = Game.getMaxSlots();
    const expProgress = Game.getStudioExpProgress();

    document.getElementById('studio-level').textContent = state.studio.level;
    document.getElementById('studio-exp-fill').style.width = Math.min(expProgress.pct, 100) + '%';
    document.getElementById('studio-exp-text').textContent =
      state.studio.level >= 10 ? 'MAX' : `${formatNum(Math.floor(expProgress.current))} / ${formatNum(expProgress.required)} EXP`;

    grid.innerHTML = '';

    let slotCount = 0;
    for (const [stationId, def] of Object.entries(Game.STATION_DEFS)) {
      if (slotCount >= maxSlots) break;

      const station = state.studio.stations[stationId];
      const isLocked = state.studio.level < def.unlockLv;
      const assigned = station && station.assigned;
      const assignedChar = assigned ? DataLoader.getBySlug(station.assigned) : null;

      const el = document.createElement('div');
      el.className = `station${isLocked ? ' locked' : ''}`;

      const income = isLocked ? 0 : Game.getStationIncome(stationId);

      el.innerHTML = `
        <div class="station-header">
          <span class="station-name">${def.name}</span>
          <span class="station-level">Lv ${station ? station.level : 1}</span>
        </div>
        <div class="station-slot${assigned ? ' assigned' : ''}" data-station="${stationId}">
          ${assigned && assignedChar
            ? `<img src="${assignedChar.image}" alt="${assignedChar.name}" onerror="this.style.display='none'">
               <div class="station-slot-name">${assignedChar.name}</div>`
            : `<span class="station-slot-empty-text">${isLocked ? 'Locked' : 'Tap to assign'}</span>`
          }
        </div>
        <div class="station-output">
          <span class="station-output-label">${getResourceName(def.resource)}/min</span>
          <span class="station-output-value">${isLocked ? '--' : formatNum(income, 1)}</span>
        </div>
        ${!isLocked && station && station.level < 5 ? `
          <div class="station-upgrade">
            <button class="btn btn-secondary btn-sm" data-upgrade="${stationId}" style="width:100%;padding:6px;font-size:0.8rem;">
              Upgrade (${formatNum(Game.STATION_UPGRADE_COSTS[station.level][0])} Stars + ${formatNum(Game.STATION_UPGRADE_COSTS[station.level][1])} #)
            </button>
          </div>
        ` : ''}
        ${isLocked ? `<div style="font-size:0.75rem;color:var(--text-dim);text-align:center;">Requires Studio Lv ${def.unlockLv}</div>` : ''}
      `;

      grid.appendChild(el);
      slotCount++;

      // Bind events
      const slotEl = el.querySelector('.station-slot');
      if (!isLocked && slotEl) {
        slotEl.addEventListener('click', () => {
          if (assigned) {
            // Unassign
            if (confirm(`Unassign ${assignedChar ? assignedChar.name : 'character'}?`)) {
              Game.unassignStation(stationId);
            }
          } else {
            // Show owned characters for assignment
            showAssignModal(stationId);
          }
        });
      }

      const upgradeBtn = el.querySelector(`[data-upgrade="${stationId}"]`);
      if (upgradeBtn) {
        upgradeBtn.addEventListener('click', () => {
          if (Game.upgradeStation(stationId)) {
            showToast(`${def.name} upgraded to Lv ${state.studio.stations[stationId].level}!`, 'success');
            renderStudio();
          } else {
            showToast('Not enough resources to upgrade!', 'error');
          }
        });
      }
    }
  }

  // ── Character Detail Modal ──
  function showCharacterDetail(slug) {
    const data = Characters.getCharDisplayData(slug);
    if (!data) return;

    const detail = document.getElementById('char-detail');
    const owned = data.owned;
    const bestVariant = data.bestVariant;

    detail.innerHTML = `
      <img class="char-detail-img" src="${data.image}" alt="${data.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22260%22 fill=%22%231c1b18%22><rect width=%22200%22 height=%22260%22/><text x=%22100%22 y=%22140%22 text-anchor=%22middle%22 fill=%22%23908e87%22 font-size=%2214%22>No Image</text></svg>'">
      <div class="char-detail-name">${data.name}</div>
      <div class="char-detail-agency">${data.agency}</div>
      <div class="char-detail-variants">
        <span class="variant-badge badge-normal ${data.variants.includes('normal') ? 'owned' : 'not-owned'}">Normal</span>
        <span class="variant-badge badge-sr ${data.variants.includes('sr') ? 'owned' : 'not-owned'}">SR</span>
        <span class="variant-badge badge-ssr ${data.variants.includes('ssr') ? 'owned' : 'not-owned'}">SSR</span>
      </div>
      ${owned ? `
        <div class="char-detail-stats">
          <div class="char-detail-stat">
            <span>Level</span>
            <span>${data.level} / ${data.levelCap}</span>
          </div>
          <div class="char-detail-stat">
            <span>Best Variant</span>
            <span style="color:var(--rarity-${bestVariant})">${bestVariant.toUpperCase()}</span>
          </div>
          <div class="char-detail-stat">
            <span>Shards</span>
            <span>${data.shards}</span>
          </div>
        </div>
        <div class="char-detail-actions">
          <button class="btn btn-primary" onclick="UI.levelUpChar('${slug}')" ${data.level >= data.levelCap ? 'disabled' : ''}>
            Level Up (${formatNum(data.nextLevelCost[0])} Dust + ${formatNum(data.nextLevelCost[1])} Stars)
          </button>
          ${data.canAscend ? `
            <button class="btn btn-primary" style="background:var(--gold);color:#1a1a1a;" onclick="UI.ascendChar('${slug}')">
              Ascend to ${data.nextAscension.toVariant.toUpperCase()}
            </button>
          ` : ''}
        </div>
      ` : `
        <div style="color:var(--text-muted);margin-top:var(--space-md);">
          Not yet collected. Pull on banners to get this character!
        </div>
      `}
    `;

    toggleModal('modal-character');
  }

  // Expose for onclick
  function levelUpChar(slug) {
    const result = Characters.levelUp(slug);
    if (result.success) {
      showToast(`Level up! Now Lv ${result.newLevel}`, 'success');
      showCharacterDetail(slug);
      updateUI();
    } else {
      showToast(result.reason, 'error');
    }
  }

  function ascendChar(slug) {
    const result = Characters.ascend(slug);
    if (result.success) {
      showToast(`Ascended to ${result.newVariant.toUpperCase()}!`, 'success');
      showCharacterDetail(slug);
      updateUI();
    } else {
      showToast(result.reason, 'error');
    }
  }

  // ── Station Assignment Modal ──
  function showAssignModal(stationId) {
    const owned = Characters.getOwnedCharacters();
    if (owned.length === 0) {
      showToast('No characters to assign! Pull some first.', 'warning');
      return;
    }

    // Use a simple prompt approach for now (will be proper modal in future sprint)
    const name = prompt('Type VTuber name to assign (or leave blank to cancel):');
    if (!name) return;

    const match = owned.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
    if (!match) {
      showToast('Character not found in your collection!', 'error');
      return;
    }

    if (Game.assignToStation(stationId, match.slug)) {
      showToast(`Assigned ${match.name} to ${Game.STATION_DEFS[stationId].name}!`, 'success');
      renderStudio();
    }
  }

  // ── Modal Toggle ──
  function toggleModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    const isVisible = modal.style.display !== 'none';
    modal.style.display = isVisible ? 'none' : 'flex';
  }

  // ── Toast Notifications ──
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  }

  // ── Helpers ──
  function formatNum(num, decimals = 0) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return decimals > 0 ? num.toFixed(decimals) : Math.floor(num).toString();
  }

  function getResourceName(key) {
    const names = {
      stars: 'Stars',
      starDust: 'Star Dust',
      starFragments: 'Star Fragments',
      bondPoints: 'Bond Points',
    };
    return names[key] || key;
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  // Populate agency filter
  function populateAgencyFilter() {
    const select = document.getElementById('filter-agency');
    const agencies = DataLoader.getAgencies();
    agencies.forEach(agency => {
      const opt = document.createElement('option');
      opt.value = agency;
      opt.textContent = agency;
      select.appendChild(opt);
    });
  }

  return {
    init, switchTab, updateUI,
    showToast, levelUpChar, ascendChar,
  };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
});
