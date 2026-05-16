/* ═══════════════════════════════════════════════
   ui.js — All UI Rendering, Navigation, Animations
   ═══════════════════════════════════════════════ */

const UI = (() => {
  let currentTab = 'home';
  let _collectionPage = 0;
  const COLLECTION_PAGE_SIZE = 40;

  // ── Initialization ──
  async function init() {
    await DataLoader.load();
    Game.load();
    Game.onStateChange(updateUI);
    Game.startTickLoop();
    Game.startAutoSave();
    bindEvents();
    setupFeaturedBanner();
    populateAgencyFilter();
    updateUI();
    checkOfflineEarnings();
    checkMilestoneCelebration();
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
    document.getElementById('filter-ownership').addEventListener('change', () => { _collectionPage = 0; renderCollection(); });
    document.getElementById('filter-variant').addEventListener('change', () => { _collectionPage = 0; renderCollection(); });
    document.getElementById('filter-agency').addEventListener('change', () => { _collectionPage = 0; renderCollection(); });
    document.getElementById('filter-station').addEventListener('change', () => { _collectionPage = 0; renderCollection(); });
    document.getElementById('filter-search').addEventListener('input', debounce(() => { _collectionPage = 0; renderCollection(); }, 300));
    document.getElementById('filter-sort').addEventListener('change', () => { _collectionPage = 0; renderCollection(); });

    // Assign modal
    document.getElementById('btn-close-assign').addEventListener('click', closeAssignModal);
    document.getElementById('btn-close-assign-x').addEventListener('click', closeAssignModal);
    document.getElementById('assign-search').addEventListener('input', debounce(() => {
      const stationId = document.getElementById('assign-grid').dataset.station;
      if (stationId) populateAssignGrid(stationId);
    }, 200));

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

    if (tab === 'collection') { _collectionPage = 0; renderCollection(); }
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
    if (currentTab === 'collection') {
      updateCollectionProgress();
      updateCollectionVariantStats();
    }
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

  // ── Milestone Celebration ──
  function checkMilestoneCelebration() {
    const reached = Game.checkMilestones();
    if (reached.length > 0) {
      for (const m of reached) {
        showToast(`Milestone reached: ${m.label} +${formatNum(m.stars)} Stars!`, 'success');
      }
      renderMilestones();
      updateUI();
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

    // Check milestones after pull
    setTimeout(() => checkMilestoneCelebration(), 500);
  }

  function showPullAnimation(results) {
    const overlay = document.getElementById('pull-overlay');
    const container = document.getElementById('pull-animation');
    overlay.style.display = 'flex';
    overlay.className = 'pull-overlay';
    container.innerHTML = '';

    // Sort results for dramatic effect: Normal first, SR next, SSR last
    const rarityOrder = { normal: 0, sr: 1, ssr: 2 };
    const sorted = [...results].sort((a, b) => (rarityOrder[a.variant] || 0) - (rarityOrder[b.variant] || 0));

    // Build pull summary
    const counts = { normal: 0, sr: 0, ssr: 0 };
    sorted.forEach(r => { if (counts[r.variant] !== undefined) counts[r.variant]++; });
    const summaryParts = [];
    if (counts.sr > 0) summaryParts.push(`<span class="sum-sr">SR x${counts.sr}</span>`);
    if (counts.ssr > 0) summaryParts.push(`<span class="sum-ssr">SSR x${counts.ssr}</span>`);
    const summaryEl = document.createElement('div');
    summaryEl.className = 'pull-summary';
    summaryEl.innerHTML = summaryParts.length > 0
      ? summaryParts.join('&nbsp;&nbsp;')
      : `${sorted.length} Normal`;
    container.appendChild(summaryEl);

    // Set grid columns based on count
    if (sorted.length <= 5) {
      container.style.gridTemplateColumns = `repeat(${sorted.length}, 1fr)`;
    } else {
      container.style.gridTemplateColumns = 'repeat(5, 1fr)';
    }

    // Create cards with staggered flip delays
    sorted.forEach((result, i) => {
      const card = createPullCard(result, i * 200);
      container.appendChild(card);
    });

    // Add tap hint
    const tapHint = document.createElement('div');
    tapHint.className = 'pull-tap-hint';
    tapHint.textContent = 'TAP TO CONTINUE';
    container.appendChild(tapHint);

    // Screen flash effect
    const hasSSR = sorted.some(r => r.variant === 'ssr');
    const hasSR = sorted.some(r => r.variant === 'sr');
    if (hasSSR) {
      setTimeout(() => {
        overlay.classList.add('flash-ssr');
        setTimeout(() => overlay.classList.remove('flash-ssr'), 600);
      }, sorted.length > 1 ? (sorted.length - 1) * 200 + 300 : 300);
    } else if (hasSR) {
      setTimeout(() => {
        overlay.classList.add('flash-sr');
        setTimeout(() => overlay.classList.remove('flash-sr'), 600);
      }, sorted.length > 1 ? sorted.findIndex(r => r.variant === 'sr') * 200 + 300 : 300);
    }

    // Count new characters for post-pull toast
    const newCount = sorted.filter(r => r.isNew).length;

    // Close on click
    const closeHandler = () => {
      overlay.style.display = 'none';
      overlay.removeEventListener('click', closeHandler);
      showPullResultToast(sorted.length, newCount, counts);
    };
    overlay.addEventListener('click', closeHandler);

    // Auto-close after 8 seconds
    const autoCloseTimer = setTimeout(() => {
      overlay.style.display = 'none';
      overlay.removeEventListener('click', closeHandler);
      showPullResultToast(sorted.length, newCount, counts);
    }, 8000);
  }

  function createPullCard(result, delay) {
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

    // NEW badge for new characters
    if (result.isNew) {
      const newBadge = document.createElement('div');
      newBadge.className = 'char-card-new';
      newBadge.textContent = 'NEW';
      back.appendChild(newBadge);
    }

    inner.appendChild(front);
    inner.appendChild(back);
    wrapper.appendChild(inner);

    // Flip animation with staggered delay
    setTimeout(() => {
      inner.classList.add('flipped');
    }, 300 + delay);

    // Click to view details
    wrapper.addEventListener('click', (e) => {
      e.stopPropagation();
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

  // ═══════════════════════════════════════════════
  //  COLLECTION GALLERY — Deep-Dive (Sprint 3)
  // ═══════════════════════════════════════════════

  function getFilteredCharacters() {
    const chars = DataLoader.get();
    const state = Game.getState();

    const ownership = document.getElementById('filter-ownership').value;
    const variant = document.getElementById('filter-variant').value;
    const agency = document.getElementById('filter-agency').value;
    const stationFilter = document.getElementById('filter-station').value;
    const search = document.getElementById('filter-search').value.toLowerCase().trim();
    const sortBy = document.getElementById('filter-sort').value;

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

    // Station filter: only for owned characters
    if (stationFilter === 'assigned') {
      filtered = filtered.filter(c => {
        const data = state.characters[c.slug];
        return data && data.owned && Game.getCharacterStation(c.slug);
      });
    } else if (stationFilter === 'unassigned') {
      filtered = filtered.filter(c => {
        const data = state.characters[c.slug];
        return data && data.owned && !Game.getCharacterStation(c.slug);
      });
    }

    if (search) {
      filtered = filtered.filter(c => c.name.toLowerCase().includes(search));
    }

    // Sorting
    if (sortBy === 'name') {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'variant') {
      const rarityOrder = { ssr: 3, sr: 2, normal: 1 };
      filtered = [...filtered].sort((a, b) => {
        const aData = state.characters[a.slug];
        const bData = state.characters[b.slug];
        const aBest = aData && aData.owned ? (rarityOrder[Game.getBestVariant(aData.variants)] || 0) : 0;
        const bBest = bData && bData.owned ? (rarityOrder[Game.getBestVariant(bData.variants)] || 0) : 0;
        return bBest - aBest || a.name.localeCompare(b.name);
      });
    } else if (sortBy === 'level') {
      filtered = [...filtered].sort((a, b) => {
        const aData = state.characters[a.slug];
        const bData = state.characters[b.slug];
        const aLv = aData && aData.owned ? aData.level : 0;
        const bLv = bData && bData.owned ? bData.level : 0;
        return bLv - aLv || a.name.localeCompare(b.name);
      });
    }

    return filtered;
  }

  function renderCollection() {
    const grid = document.getElementById('collection-grid');
    const filtered = getFilteredCharacters();

    // Pagination
    const totalPages = Math.ceil(filtered.length / COLLECTION_PAGE_SIZE);
    if (_collectionPage >= totalPages && totalPages > 0) _collectionPage = totalPages - 1;
    const start = _collectionPage * COLLECTION_PAGE_SIZE;
    const pageItems = filtered.slice(start, start + COLLECTION_PAGE_SIZE);

    grid.innerHTML = '';
    pageItems.forEach(char => {
      const card = createCollectionCard(char);
      grid.appendChild(card);
    });

    renderPagination(filtered.length, totalPages);
    updateCollectionProgress();
    updateCollectionVariantStats();
    renderMilestones();
  }

  function renderPagination(totalItems, totalPages) {
    const container = document.getElementById('collection-pagination');
    container.innerHTML = '';

    if (totalPages <= 1) {
      container.innerHTML = `<span class="page-info">${totalItems} characters</span>`;
      return;
    }

    const start = _collectionPage * COLLECTION_PAGE_SIZE + 1;
    const end = Math.min(start + COLLECTION_PAGE_SIZE - 1, totalItems);

    let html = `<span class="page-info">${start}-${end} of ${totalItems}</span>`;
    html += `<div class="page-buttons">`;

    // Prev button
    html += `<button class="btn btn-secondary btn-sm page-btn" data-page="${_collectionPage - 1}" ${_collectionPage === 0 ? 'disabled' : ''}>&laquo; Prev</button>`;

    // Page numbers (show max 7 pages with ellipsis)
    const maxVisible = 7;
    let pages = [];
    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      let startP = Math.max(1, _collectionPage - 2);
      let endP = Math.min(totalPages - 2, _collectionPage + 2);
      if (startP > 1) pages.push(-1); // ellipsis
      for (let i = startP; i <= endP; i++) pages.push(i);
      if (endP < totalPages - 2) pages.push(-2); // ellipsis
      pages.push(totalPages - 1);
    }

    for (const p of pages) {
      if (p < 0) {
        html += `<span class="page-ellipsis">...</span>`;
      } else {
        html += `<button class="btn btn-secondary btn-sm page-btn ${p === _collectionPage ? 'active' : ''}" data-page="${p}">${p + 1}</button>`;
      }
    }

    // Next button
    html += `<button class="btn btn-secondary btn-sm page-btn" data-page="${_collectionPage + 1}" ${_collectionPage >= totalPages - 1 ? 'disabled' : ''}>Next &raquo;</button>`;
    html += `</div>`;

    container.innerHTML = html;

    // Bind page buttons
    container.querySelectorAll('.page-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        _collectionPage = parseInt(btn.dataset.page);
        renderCollection();
        // Scroll to top of collection
        document.getElementById('tab-collection').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function createCollectionCard(char) {
    const state = Game.getState();
    const charData = state.characters[char.slug];
    const owned = charData && charData.owned;
    const bestVariant = owned ? Game.getBestVariant(charData.variants) : null;
    const assignedStation = owned ? Game.getCharacterStation(char.slug) : null;

    const card = document.createElement('div');
    card.className = `char-card${bestVariant ? ` variant-${bestVariant}` : ''}`;

    if (!owned) {
      card.classList.add('not-owned');
    }

    const img = document.createElement('img');
    img.className = 'char-card-img';
    img.src = char.image;
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
    let agencyText = char.agency;
    if (owned) agencyText += ` Lv${charData.level}`;
    if (assignedStation) {
      const stDef = Game.STATION_DEFS[assignedStation];
      if (stDef) agencyText += ` [${stDef.name}]`;
    }
    agencyEl.textContent = agencyText;
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

    // Station indicator badge
    if (assignedStation) {
      const stBadge = document.createElement('div');
      stBadge.className = 'char-card-station-badge';
      stBadge.textContent = 'WRK';
      stBadge.title = `Working in ${Game.STATION_DEFS[assignedStation]?.name || assignedStation}`;
      card.appendChild(stBadge);
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

  function updateCollectionVariantStats() {
    const stats = Game.getCollectionStats();
    const el = document.getElementById('collection-variant-stats');
    if (el) {
      el.innerHTML = `<span class="vs-normal">Normal: ${stats.normal}</span> | <span class="vs-sr">SR: ${stats.sr}</span> | <span class="vs-ssr">SSR: ${stats.ssr}</span>`;
    }
  }

  // ── Milestones ──
  function renderMilestones() {
    const milestones = Game.getMilestones();
    const stats = Game.getCollectionStats();
    const container = document.getElementById('milestone-list');
    if (!container) return;

    container.innerHTML = '';
    milestones.forEach(m => {
      const el = document.createElement('div');
      el.className = `milestone-item${m.claimed ? ' claimed' : ''}${stats.owned >= m.count ? ' reached' : ''}`;

      const icon = m.claimed ? '\u2713' : stats.owned >= m.count ? '\u2605' : '\u25CB';
      el.innerHTML = `
        <span class="milestone-icon">${icon}</span>
        <div class="milestone-info">
          <span class="milestone-label">${m.label}</span>
          <span class="milestone-reward">+${formatNum(m.stars)} Stars</span>
        </div>
        <span class="milestone-status">${m.claimed ? 'Claimed' : stats.owned >= m.count ? 'Ready!' : `${stats.owned}/${m.count}`}</span>
      `;
      container.appendChild(el);
    });
  }

  // ═══════════════════════════════════════════════
  //  STUDIO
  // ═══════════════════════════════════════════════

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
            if (confirm(`Unassign ${assignedChar ? assignedChar.name : 'character'}?`)) {
              Game.unassignStation(stationId);
            }
          } else {
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

  // ═══════════════════════════════════════════════
  //  CHARACTER DETAIL MODAL — Enhanced (Sprint 3)
  // ═══════════════════════════════════════════════

  function showCharacterDetail(slug) {
    const data = Characters.getCharDisplayData(slug);
    if (!data) return;

    const detail = document.getElementById('char-detail');
    const owned = data.owned;
    const bestVariant = data.bestVariant;
    const pullHistory = Game.getPullHistory(slug);
    const assignedStation = Game.getCharacterStation(slug);

    // Format pull date
    let pullDateStr = 'Unknown';
    if (pullHistory && pullHistory.firstPullDate) {
      const d = new Date(pullHistory.firstPullDate);
      pullDateStr = d.toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' });
    }

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
          ${pullHistory ? `
          <div class="char-detail-stat">
            <span>Times Pulled</span>
            <span>${pullHistory.totalPulls}</span>
          </div>
          <div class="char-detail-stat">
            <span>First Obtained</span>
            <span>${pullDateStr}</span>
          </div>
          ` : ''}
          ${assignedStation ? `
          <div class="char-detail-stat">
            <span>Assigned To</span>
            <span style="color:var(--accent2)">${Game.STATION_DEFS[assignedStation]?.name || assignedStation}</span>
          </div>
          ` : ''}
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
        ${data.shards > 0 ? `
          <div class="shard-convert-section">
            <h4>Convert Shards (${data.shards} available)</h4>
            <div class="shard-buttons">
              <button class="btn btn-secondary btn-sm" onclick="UI.convertShards('${slug}', 'starDust')">
                +${data.shards * 5} Star Dust
              </button>
              <button class="btn btn-secondary btn-sm" onclick="UI.convertShards('${slug}', 'starFragments')">
                +${data.shards * 2} Fragments
              </button>
              <button class="btn btn-secondary btn-sm" onclick="UI.convertShards('${slug}', 'stars')">
                +${data.shards} Stars
              </button>
            </div>
          </div>
        ` : ''}
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

  function convertShards(slug, resource) {
    const result = Characters.convertShards(slug, resource);
    if (result.success) {
      const resName = resource === 'starDust' ? 'Star Dust' : resource === 'starFragments' ? 'Fragments' : 'Stars';
      showToast(`Converted ${result.converted} shards -> +${result.gained} ${resName}`, 'success');
      showCharacterDetail(slug);
      updateUI();
    } else {
      showToast(result.reason, 'error');
    }
  }

  // ── Pull Result Summary Toast ──
  function showPullResultToast(total, newCount, counts) {
    const parts = [];
    if (counts.ssr > 0) parts.push(`${counts.ssr} SSR`);
    if (counts.sr > 0) parts.push(`${counts.sr} SR`);
    if (counts.normal > 0) parts.push(`${counts.normal} Normal`);
    const newPart = newCount > 0 ? `${newCount} NEW` : '';
    const msg = newPart
      ? `Pulled x${total}: ${newPart}, ${parts.join(', ')}`
      : `Pulled x${total}: ${parts.join(', ')}`;
    showToast(msg, newCount > 0 ? 'success' : 'info');
  }

  // ── Station Assignment Modal ──
  let _assignStationId = null;

  function showAssignModal(stationId) {
    const owned = Characters.getOwnedCharacters();
    if (owned.length === 0) {
      showToast('No characters to assign! Pull some first.', 'warning');
      return;
    }

    _assignStationId = stationId;
    document.getElementById('assign-search').value = '';
    document.getElementById('assign-grid').dataset.station = stationId;
    populateAssignGrid(stationId);
    toggleModal('modal-assign');
  }

  function populateAssignGrid(stationId) {
    const grid = document.getElementById('assign-grid');
    const search = document.getElementById('assign-search').value.toLowerCase().trim();
    const owned = Characters.getOwnedCharacters();

    const state = Game.getState();
    const available = owned.filter(c => {
      for (const [sid, st] of Object.entries(state.studio.stations)) {
        if (st.assigned === c.slug && sid !== stationId) return false;
      }
      if (search && !c.name.toLowerCase().includes(search)) return false;
      return true;
    });

    grid.innerHTML = '';
    if (available.length === 0) {
      grid.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:var(--space-lg);grid-column:1/-1;">No characters available</div>';
      return;
    }

    available.forEach(charInfo => {
      const charState = state.characters[charInfo.slug];
      const bestVariant = Game.getBestVariant(charState.variants);

      const el = document.createElement('div');
      el.className = 'assign-char';

      const img = document.createElement('img');
      img.src = charInfo.image;
      img.alt = charInfo.name;
      img.onerror = () => { img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" fill="%231c1b18"><rect width="120" height="160"/><text x="60" y="85" text-anchor="middle" fill="%23908e87" font-size="12">No Img</text></svg>'; };

      const info = document.createElement('div');
      info.className = 'assign-char-info';
      info.textContent = `${charInfo.name} Lv${charState.level}`;

      const badge = document.createElement('div');
      badge.className = `assign-char-badge badge-${bestVariant}`;
      badge.textContent = bestVariant.toUpperCase();

      el.appendChild(img);
      el.appendChild(info);
      el.appendChild(badge);

      el.addEventListener('click', () => {
        if (Game.assignToStation(stationId, charInfo.slug)) {
          showToast(`Assigned ${charInfo.name} to ${Game.STATION_DEFS[stationId].name}!`, 'success');
          closeAssignModal();
          renderStudio();
        }
      });

      grid.appendChild(el);
    });
  }

  function closeAssignModal() {
    toggleModal('modal-assign');
    _assignStationId = null;
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
    showToast, levelUpChar, ascendChar, convertShards,
  };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
});
