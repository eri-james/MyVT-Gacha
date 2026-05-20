/* ═══════════════════════════════════════════════
   ui.js — All UI Rendering, Navigation, Animations
   ═══════════════════════════════════════════════ */

// ── Global Currency SVG Icons (shared across modules) ──
const CurrencyIcons = {
  vgems: function(size = 14) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:2px;"><path d="M12 2L14.5 8.5L21 9.5L16 14L17.5 21L12 17.5L6.5 21L8 14L3 9.5L9.5 8.5L12 2Z" fill="#00e5ff" stroke="#00b8d4" stroke-width="1"/></svg>`;
  },
  vringgit: function(size = 14) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:2px;"><circle cx="12" cy="12" r="10" fill="#ffa726" stroke="#fb8c00" stroke-width="1.5"/><text x="12" y="16" text-anchor="middle" fill="#5d4037" font-size="9" font-weight="bold" font-family="sans-serif">VR</text></svg>`;
  },
  livecache: function(size = 14) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:2px;"><rect x="3" y="5" width="18" height="14" rx="2" fill="#66bb6a" stroke="#43a047" stroke-width="1.2"/><rect x="6" y="3" width="4" height="3" rx="1" fill="#a5d6a7"/><rect x="14" y="3" width="4" height="3" rx="1" fill="#a5d6a7"/><rect x="7" y="9" width="10" height="2" rx="1" fill="#e8f5e9"/><rect x="7" y="13" width="10" height="2" rx="1" fill="#e8f5e9"/></svg>`;
  },
  ticket_blue: function(size = 14) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:2px;"><rect x="4" y="4" width="16" height="16" rx="2" fill="#42a5f5" stroke="#1e88e5" stroke-width="1.2"/><circle cx="8" cy="12" r="1.5" fill="#bbdefb"/><circle cx="12" cy="12" r="1.5" fill="#bbdefb"/><circle cx="16" cy="12" r="1.5" fill="#bbdefb"/></svg>`;
  },
  ticket_red: function(size = 14) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:2px;"><rect x="4" y="4" width="16" height="16" rx="2" fill="#ef5350" stroke="#c62828" stroke-width="1.2"/><circle cx="8" cy="12" r="1.5" fill="#ffcdd2"/><circle cx="12" cy="12" r="1.5" fill="#ffcdd2"/><circle cx="16" cy="12" r="1.5" fill="#ffcdd2"/></svg>`;
  },
};

const UI = (() => {
  let currentTab = 'home';
  let _collectionPage = 0;
  const COLLECTION_PAGE_SIZE = 40;
  let _lastStudioLevel = 0; // Sprint 4: Track studio level changes
  let _scLeadSlug = null; // Sprint 8: Minigame lead character

  // ── Currency Icon helper (delegates to global CurrencyIcons) ──
  function currencyIcon(type, size = 14) {
    return CurrencyIcons[type] ? CurrencyIcons[type](size) : '';
  }

  // ── Initialization ──
  async function init() {
    try {
      await DataLoader.load();
      Game.load();
      Game.repairBaseStats(); // Fix baseStats that were empty during migration (DataLoader not loaded yet)
      Game.onStateChange(updateUI);
      Game.startTickLoop();
      Game.startAutoSave();
      bindEvents();
      setupFeaturedBanner();
      populateAgencyFilter();
      updateUI();
      checkOfflineEarnings();
      checkMilestoneCelebration();
      _lastStudioLevel = Game.getState().studio.level; // Sprint 4: init studio level tracker
      _initSortBars();
      showToast('Welcome back to MyVT Gacha!', 'info');
    } catch (err) {
      console.error('Init failed:', err);
      // Ensure events are bound even if init partially fails
      try { bindEvents(); } catch (_) {}
      const pidEl = document.getElementById('settings-player-id');
      if (pidEl) pidEl.textContent = 'Error — check console';
    }
  }

  // ── Event Binding ──
  function bindEvents() {
    // Bottom navbar navigation
    document.querySelectorAll('.bnav-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        const deadPages = ['shop', 'friends'];
        if (deadPages.includes(page)) {
          showToast(`${page.charAt(0).toUpperCase() + page.slice(1)} — Coming Soon!`, 'info');
          return;
        }
        if (page === 'settings') {
          toggleModal('modal-settings');
          return;
        }
        switchTab(page);
      });
    });

    // Settings modal close
    document.getElementById('btn-close-settings').addEventListener('click', () => toggleModal('modal-settings'));

    // Home actions
    document.getElementById('btn-claim-offline').addEventListener('click', () => {
      // Use cached result to avoid race condition with tick loop overwriting lastOnline
      let result = null;
      if (_cachedOfflineResult) {
        result = Game.claimCachedOfflineEarnings(_cachedOfflineResult);
        _cachedOfflineResult = null;
      }
      if (result) {
        const e = result.earnings;
        const parts = [];
        if (e.vgems) parts.push(`VGems +${Math.floor(e.vgems)}`);
        if (e.vringgit) parts.push(`VRinggit +${Math.floor(e.vringgit)}`);
        if (e.liveCache) parts.push(`LiveCache +${Math.floor(e.liveCache)}`);
        showToast(`Claimed ${result.minutes}min offline: ${parts.join(', ') || 'nothing'}`, 'success');
        document.getElementById('btn-claim-offline').style.display = 'none';
        updateUI();
      } else {
        showToast('No offline earnings to claim.', 'warning');
        document.getElementById('btn-claim-offline').style.display = 'none';
      }
    });

    // Landing page panel buttons
    document.getElementById('btn-go-liveon').addEventListener('click', () => {
      showToast('Live!ON — Coming Soon!', 'info');
    });
    document.getElementById('btn-go-studio').addEventListener('click', () => switchTab('studio'));
    document.getElementById('btn-go-gacha').addEventListener('click', () => switchTab('pull'));

    // Back buttons
    document.getElementById('btn-back-home').addEventListener('click', () => switchTab('home'));
    document.getElementById('btn-back-home-2').addEventListener('click', () => switchTab('home'));
    document.getElementById('btn-back-home-3').addEventListener('click', () => switchTab('home'));
    document.getElementById('btn-back-home-4').addEventListener('click', () => switchTab('home'));

    // Featured VTuber select
    document.getElementById('btn-select-featured').addEventListener('click', () => {
      toggleModal('modal-featured-select');
      populateFeaturedGrid();
    });
    document.getElementById('btn-close-featured').addEventListener('click', () => toggleModal('modal-featured-select'));
    document.getElementById('btn-close-featured-x').addEventListener('click', () => toggleModal('modal-featured-select'));
    document.getElementById('featured-search').addEventListener('input', debounce(() => {
      populateFeaturedGrid();
    }, 200));

    // Settings: save username
    document.getElementById('btn-save-username').addEventListener('click', () => {
      const input = document.getElementById('input-username');
      const name = (input.value || '').trim();
      if (!name) { showToast('Username cannot be empty!', 'warning'); return; }
      Game.setUsername(name);
      updateProducerLevel();
      renderTopBarResources();
      showToast('Username saved!', 'success');
    });

    // Pull
    document.querySelectorAll('.btn-pull').forEach(btn => {
      btn.addEventListener('click', () => handlePull(parseInt(btn.dataset.count)));
    });

    // Banner buttons are now bound dynamically by renderGachaSidebar()
    // when the sidebar is generated on the pull tab.

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

    // Quest sub-tabs
    document.querySelectorAll('.quest-subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.questTab;
        document.querySelectorAll('.quest-subtab').forEach(b => b.classList.toggle('active', b.dataset.questTab === tabName));
        document.querySelectorAll('.quest-panel').forEach(p => p.style.display = p.id === `quest-${tabName}` ? '' : 'none');
        if (tabName === 'achievements') renderMilestones();
      });
    });

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
    document.getElementById('btn-close-character').addEventListener('click', () => {
      if (_detailMode && _detailMode.stationId) {
        // In assign mode: close detail, reopen assign modal
        _detailMode = null;
        toggleModal('modal-character');
        toggleModal('modal-assign');
      } else {
        toggleModal('modal-character');
      }
    });

    // Sprint 8: Minigame events
    document.getElementById('sc-pick-lead').addEventListener('click', openMinigameLeadPicker);
    document.getElementById('btn-close-sc-lead').addEventListener('click', closeMinigameLeadPicker);
    document.getElementById('btn-close-sc-lead-x').addEventListener('click', closeMinigameLeadPicker);
    document.getElementById('sc-lead-search').addEventListener('input', debounce(() => {
      populateMinigameLeadGrid();
    }, 200));
    document.getElementById('sc-start-btn').addEventListener('click', () => startMinigameRound());
    document.getElementById('sc-play-again-btn').addEventListener('click', () => {
      document.getElementById('sc-results-screen').style.display = 'none';
      document.getElementById('sc-start-screen').style.display = 'block';
      updateMinigameCostLabel();
    });
  }

  let _featuredDisplay = [];

  function setupFeaturedBanner() {
    _featuredDisplay = ['liliana-vampaia', 'lunaris-urufi'];
  }

  // ── Tab Navigation ──
  function switchTab(tab) {
    // V5-03: Stop minigame if leaving the tab while running
    if (currentTab === 'minigame' && tab !== 'minigame' && Minigame.getIsRunning()) {
      Minigame.stop();
      // Refund stamina
      const gameState = Game.getState();
      if (gameState.stamina) {
        gameState.stamina.current = Math.min(Game.STAMINA_MAX, gameState.stamina.current + Minigame.STAMINA_COST);
        Game.save();
      }
      // Reset minigame UI
      document.getElementById('sc-game-area').style.display = 'none';
      document.getElementById('sc-start-screen').style.display = 'block';
      document.getElementById('sc-results-screen').style.display = 'none';
    }

    currentTab = tab;
    document.querySelectorAll('.bnav-btn[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === tab));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.toggle('active', el.id === `tab-${tab}`));

    if (tab === 'collection') { _collectionPage = 0; renderCollection(); }
    if (tab === 'studio') renderStudio();
    if (tab === 'quests') renderQuests();
    if (tab === 'pull') {
      renderGachaSidebar();
      updateBannerInfo();
      updateGachaPityBar();
    }
    if (tab === 'minigame') renderMinigame();
    updateUI();
  }

  // ── Main UI Update ──
  function updateUI() {
    try {
    const state = Game.getState();
    const stats = Game.getCollectionStats();

    // Top bar resources
    renderTopBarResources();

    // Stamina
    updateStaminaDisplay();

    // Producer info
    const producerInfo = Game.getProducerInfo();

    // Producer level (top bar)
    updateProducerLevel();

    // Featured VTuber (landing page)
    renderFeaturedVtuber();

    // Player ID in settings
    const pidEl = document.getElementById('settings-player-id');
    if (pidEl) pidEl.textContent = state.playerId;

    // Producer level in settings
    const splEl = document.getElementById('settings-producer-level');
    if (splEl) splEl.textContent = producerInfo.level;
    const speEl = document.getElementById('settings-producer-exp');
    if (speEl) speEl.textContent = `${producerInfo.exp} / ${producerInfo.expCap}`;

    // Pull button states
    document.querySelectorAll('.btn-pull').forEach(btn => {
      const count = parseInt(btn.dataset.count);
      btn.disabled = !Gacha.canPull(count);
    });

    // Pity counter
    document.getElementById('pity-count').textContent = Gacha.getPityCount();
    updateGachaPityBar();

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

    // Sprint 4: Detect studio level-up
    const currentLv = Game.getState().studio.level;
    if (currentLv > _lastStudioLevel && _lastStudioLevel > 0) {
      const newLv = currentLv;
      const unlock = Game.STATION_LEVELS.find(l => l.level === newLv);
      const unlockText = unlock ? `Unlocked: ${unlock.unlocks}` : '';
      showToast(`Studio leveled up to Lv ${newLv}! ${unlockText}`, 'success');
      _lastStudioLevel = newLv;
    }
    } catch (err) { console.error('updateUI failed:', err); }
  }

  function updateStaminaDisplay() {
    const stam = Game.getStamina();
    const pct = (stam.current / stam.max) * 100;

    // Minigame tab stamina bar — uses lead character's per-VTuber ST
    updateMinigameStaminaBar();
  }

  function updateMinigameStaminaBar() {
    const scFill = document.getElementById('sc-stamina-bar-fill');
    const scVal = document.getElementById('sc-stamina-val');
    const scTimer = document.getElementById('sc-stamina-timer');
    if (scFill || scVal || scTimer) {
      const leadStam = Minigame.getLeadStaminaInfo();
      if (leadStam) {
        const scPct = leadStam.max > 0 ? (leadStam.current / leadStam.max) * 100 : 0;
        if (scFill) scFill.style.width = scPct + '%';
        if (scVal) scVal.textContent = `${leadStam.current} / ${leadStam.max}`;
        if (scTimer) {
          if (leadStam.isFull) {
            scTimer.textContent = 'Full';
          } else {
            scTimer.textContent = '';
          }
        }
      } else {
        // No lead selected — show dashes
        if (scFill) scFill.style.width = '0%';
        if (scVal) scVal.textContent = '- / -';
        if (scTimer) scTimer.textContent = '';
      }
    }
  }

  // ── Offline Earnings ──
  let _cachedOfflineResult = null;

  function checkOfflineEarnings() {
    const offline = Game.getOfflineEarnings();
    if (offline) {
      // Cache result so tick loop doesn't destroy the timestamp before user clicks
      _cachedOfflineResult = offline;
      const btn = document.getElementById('btn-claim-offline');
      const vgems = Math.floor(offline.earnings.vgems || 0);
      const vringgit = Math.floor(offline.earnings.vringgit || 0);
      const tickets = Math.floor(offline.earnings.liveCache || 0);
      const parts = [];
      if (vgems > 0) parts.push(`${currencyIcon('vgems', 12)}+${formatNum(vgems)}`);
      if (vringgit > 0) parts.push(`${currencyIcon('vringgit', 12)}+${formatNum(vringgit)}`);
      if (tickets > 0) parts.push(`${currencyIcon('livecache', 12)}+${tickets}`);
      btn.innerHTML = `Claim Offline (${Math.round(offline.minutes)}min) ${parts.join(' ')}`;
      btn.style.display = 'inline-flex';
    }
  }

  // ── Milestone Celebration ──
  function checkMilestoneCelebration() {
    const reached = Game.checkMilestones();
    if (reached.length > 0) {
      for (const m of reached) {
        const parts = [];
        if (m.vgems) parts.push(`VGems +${formatNum(m.vgems)}`);
        if (m.vringgit) parts.push(`VRinggit +${formatNum(m.vringgit)}`);
        if (m.tickets) parts.push(`Blue Tickets +${m.tickets}`);
        showToast(`Milestone: ${m.label} ${parts.join(', ')}`, 'success');
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
        showToast('Not enough tickets or VGems!', 'error');
        return;
      }
      results = [results];
    } else {
      results = Gacha.pullMulti();
      if (!results || results.length === 0) {
        showToast('Not enough tickets or VGems!', 'error');
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
    container.classList.remove('single-pull');

    // Sort results for dramatic effect: R first, SR next, SSR, UR last
    const rarityOrder = { R: 0, SR: 1, SSR: 2, UR: 3 };
    const sorted = [...results].sort((a, b) => (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0));
    const isSingle = sorted.length === 1;

    // Count rarities
    const counts = { R: 0, SR: 0, SSR: 0, UR: 0 };
    sorted.forEach(r => { if (counts[r.rarity] !== undefined) counts[r.rarity]++; });
    const newCount = sorted.filter(r => r.isNew).length;
    const totalLiveCache = sorted.reduce((sum, r) => sum + (r.liveCacheGained || 0), 0);

    // Grid setup
    if (isSingle) {
      container.style.gridTemplateColumns = '1fr';
      container.classList.add('single-pull');
    } else if (sorted.length <= 5) {
      container.style.gridTemplateColumns = `repeat(${sorted.length}, 1fr)`;
    } else {
      container.style.gridTemplateColumns = 'repeat(5, 1fr)';
    }

    // Build summary (hidden until all cards revealed)
    const summaryEl = document.createElement('div');
    summaryEl.className = 'pull-summary';
    const summaryParts = [];
    if (counts.UR > 0) summaryParts.push(`<span class="sum-ur">UR x${counts.UR}</span>`);
    if (counts.SSR > 0) summaryParts.push(`<span class="sum-ssr">SSR x${counts.SSR}</span>`);
    if (counts.SR > 0) summaryParts.push(`<span class="sum-sr">SR x${counts.SR}</span>`);
    let summaryHtml = summaryParts.length > 0
      ? summaryParts.join('&nbsp;&nbsp;')
      : `${sorted.length} R`;
    if (newCount > 0) summaryHtml += ` &middot; <span style="color:var(--success)">${newCount} NEW</span>`;
    if (totalLiveCache > 0) summaryHtml += ` &middot; <span style="color:var(--livecache)">+${totalLiveCache} LC</span>`;
    summaryEl.innerHTML = summaryHtml;
    container.appendChild(summaryEl);

    // Animation timing (ms)
    const SLIDE_MS = isSingle ? 400 : 280;
    const FLIP_MS  = isSingle ? 600 : 420;
    const GAP_MS   = isSingle ? 0 : 80;

    // Track animation state
    let animationDone = false;
    let skipRequested = false;
    let autoCloseTimer = null;

    function finishAnimation() {
      if (animationDone) return;
      animationDone = true;
      skipRequested = true; // prevent skip handler from running again

      const tapHint = document.createElement('div');
      tapHint.className = 'pull-tap-hint';
      tapHint.textContent = 'TAP TO CONTINUE';
      container.appendChild(tapHint);
      summaryEl.classList.add('visible');

      autoCloseTimer = setTimeout(() => closeOverlay(), 6000);
    }

    function closeOverlay() {
      clearTimeout(autoCloseTimer);
      overlay.style.display = 'none';
      overlay.removeEventListener('click', overlayClickHandler);
      showPullResultToast(sorted.length, newCount, counts);
    }

    // Unified overlay click handler
    const overlayClickHandler = (e) => {
      // During animation: skip to end
      if (!animationDone) {
        if (skipRequested) return;
        skipRequested = true;
        // Instantly reveal all cards that haven't started yet
        container.querySelectorAll('.card-flip:not(.slide-in)').forEach(c => {
          c.classList.add('slide-in');
          setTimeout(() => c.querySelector('.card-flip-inner').classList.add('flipped'), 50);
        });
        finishAnimation();
        return;
      }
      // After animation: close unless clicking on a card
      if (e.target.closest('.card-flip')) return;
      closeOverlay();
    };
    overlay.addEventListener('click', overlayClickHandler);

    // Sequential card reveal via promise chain
    let chain = Promise.resolve();
    sorted.forEach((result) => {
      chain = chain.then(() => new Promise(resolve => {
        if (skipRequested) {
          // If skip was requested, show this card instantly
          const card = createPullCard(result);
          card.classList.add('slide-in');
          container.appendChild(card);
          setTimeout(() => card.querySelector('.card-flip-inner').classList.add('flipped'), 50);
          setTimeout(resolve, 100);
          return;
        }

        const card = createPullCard(result);
        container.appendChild(card);

        // Double rAF ensures the browser has painted the initial state
        requestAnimationFrame(() => requestAnimationFrame(() => {
          card.classList.add('slide-in');
        }));

        // After slide-in completes, trigger flip
        setTimeout(() => {
          if (skipRequested) { resolve(); return; }
          const inner = card.querySelector('.card-flip-inner');
          inner.classList.add('flipped');

          // Screen flash for rare pulls
          if (result.rarity === 'UR') {
            overlay.classList.add('flash-ur');
            setTimeout(() => overlay.classList.remove('flash-ur'), 600);
          } else if (result.rarity === 'SSR') {
            overlay.classList.add('flash-ssr');
            setTimeout(() => overlay.classList.remove('flash-ssr'), 600);
          } else if (result.rarity === 'SR') {
            overlay.classList.add('flash-sr');
            setTimeout(() => overlay.classList.remove('flash-sr'), 600);
          }
        }, SLIDE_MS);

        // Resolve after flip finishes + gap
        setTimeout(resolve, SLIDE_MS + FLIP_MS + GAP_MS);
      }));
    });

    // After all cards revealed
    chain.then(() => finishAnimation());
  }

  function createPullCard(result) {
    const rarity = result.rarity || 'R';
    const rarityClass = rarity.toLowerCase(); // 'r', 'sr', 'ssr', 'ur'

    const wrapper = document.createElement('div');
    wrapper.className = 'card-flip';
    wrapper.dataset.variant = rarityClass;

    const inner = document.createElement('div');
    inner.className = 'card-flip-inner';

    // Front (face down — the card back design)
    const front = document.createElement('div');
    front.className = 'card-flip-front';
    const frontDesign = document.createElement('div');
    frontDesign.className = 'card-back-design';
    const frontIcon = document.createElement('div');
    frontIcon.className = 'card-back-icon';
    frontIcon.textContent = '\u2726'; // ✦ star
    front.appendChild(frontDesign);
    front.appendChild(frontIcon);

    // Back (revealed card face)
    const back = document.createElement('div');
    back.className = `card-flip-back char-card variant-${rarityClass}`;
    const img = document.createElement('img');
    img.className = 'char-card-img';
    img.src = DataLoader.getImageUrl(result.character.slug);
    img.alt = result.character.name;
    img.loading = 'eager';
    img.onerror = () => { img.src = result.character.image || img.src; img.onerror = () => { img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" fill="%231c1b18"><rect width="300" height="300"/><text x="150" y="160" text-anchor="middle" fill="%23908e87" font-size="14">No Image</text></svg>'; }; };

    const cardOverlay = document.createElement('div');
    cardOverlay.className = 'char-card-overlay';
    const name = document.createElement('div');
    name.className = 'char-card-name';
    name.textContent = result.character.name;
    const agency = document.createElement('div');
    agency.className = 'char-card-agency';
    agency.textContent = result.character.agency;
    cardOverlay.appendChild(name);
    cardOverlay.appendChild(agency);

    const badge = document.createElement('div');
    badge.className = `char-card-badge badge-${rarityClass}`;
    badge.textContent = rarity;

    back.appendChild(img);
    back.appendChild(cardOverlay);
    back.appendChild(badge);

    // NEW badge for new characters
    if (result.isNew) {
      const newBadge = document.createElement('div');
      newBadge.className = 'char-card-new';
      newBadge.textContent = 'NEW';
      back.appendChild(newBadge);
    }

    // Echo badge
    if (result.echo > 0) {
      const echoBadge = document.createElement('div');
      echoBadge.className = 'char-card-echo';
      echoBadge.textContent = result.echo >= 6 ? 'E6 MAX' : `E${result.echo}`;
      back.appendChild(echoBadge);
    }

    // LiveCache indicator
    if (result.liveCacheGained > 0) {
      const lcBadge = document.createElement('div');
      lcBadge.className = 'char-card-echo toast-livecache';
      lcBadge.style.top = result.echo > 0 ? '22px' : '4px';
      lcBadge.textContent = `+${result.liveCacheGained} LC`;
      back.appendChild(lcBadge);
    }

    // SSR/UR glow ring on the revealed card
    if (rarity === 'SSR') {
      const glowRing = document.createElement('div');
      glowRing.className = 'ssr-glow-ring';
      back.appendChild(glowRing);
    } else if (rarity === 'UR') {
      const glowRing = document.createElement('div');
      glowRing.className = 'ur-glow-ring';
      back.appendChild(glowRing);
    }

    inner.appendChild(front);
    inner.appendChild(back);
    wrapper.appendChild(inner);

    // Click to view details (stop propagation so overlay click doesn't close)
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
    const costSingle = document.getElementById('cost-single');
    const costMulti = document.getElementById('cost-multi');
    const timerEl = document.getElementById('banner-timer');

    if (banner === 'standard') {
      nameEl.textContent = 'Standard Banner';
      descEl.textContent = 'All 319 Malaysian VTubers';
      if (costSingle) costSingle.innerHTML = CurrencyIcons.ticket_blue(12) + '1';
      if (costMulti) costMulti.innerHTML = CurrencyIcons.ticket_blue(12) + '10';
      if (timerEl) timerEl.textContent = 'Permanent';
      renderRateUpSection('standard');
    } else {
      nameEl.textContent = 'Featured Banner';
      const featured = _featuredDisplay.map(s => {
        const c = DataLoader.getBySlug(s);
        return c ? c.name : s;
      }).join(', ');
      descEl.textContent = 'Rate up: ' + featured + ' (75%)';
      if (costSingle) costSingle.innerHTML = CurrencyIcons.ticket_red(12) + '1';
      if (costMulti) costMulti.innerHTML = CurrencyIcons.ticket_red(12) + '10';
      if (timerEl) timerEl.textContent = 'Ends in 14d 23h 59m';
      renderRateUpSection('featured');
    }

    // Update sidebar active state
    document.querySelectorAll('.gacha-banner-list-item').forEach(item => {
      const itemBanner = item.dataset.banner;
      item.classList.toggle('active', itemBanner === banner);
    });
  }

  // ── Render Rate-Up Section ──
  function renderRateUpSection(bannerType) {
    const container = document.getElementById('gacha-rateup');
    if (!container) return;

    if (bannerType === 'standard') {
      container.innerHTML = '<div class="gacha-rateup-placeholder">All 319 Malaysian VTubers available — no rate-up characters</div>';
      return;
    }

    // Featured banner: show featured characters
    let html = '';
    const featuredChars = _featuredDisplay;
    if (featuredChars.length > 0) {
      const mainSlug = featuredChars[0];
      const mainChar = DataLoader.getBySlug(mainSlug);
      if (mainChar) {
        const imgUrl = DataLoader.getImageUrl(mainSlug);
        html += '<div class="gacha-rateup-featured">';
        html += '<img class="rateup-avatar" src="' + imgUrl + '" alt="' + mainChar.name + '" onerror="this.style.display=\'none\'">';
        html += '<div class="rateup-info">';
        html += '<span class="rateup-up-badge">UP!</span>';
        html += '<div class="rateup-name">' + mainChar.name + '</div>';
        html += '<div class="rateup-subtitle">' + (mainChar.agency || '') + '</div>';
        html += '<div class="rateup-rate">Rate: 75%</div>';
        html += '<div class="rateup-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>';
        html += '</div></div>';
      }
    }

    // Sub rate-up characters
    const subSlugs = featuredChars.slice(1);
    if (subSlugs.length > 0) {
      html += '<div class="gacha-rateup-subs">';
      subSlugs.forEach(slug => {
        const c = DataLoader.getBySlug(slug);
        if (c) {
          const imgUrl = DataLoader.getImageUrl(slug);
          html += '<div class="gacha-rateup-sub">';
          html += '<img class="rateup-sub-avatar" src="' + imgUrl + '" alt="' + c.name + '" onerror="this.style.display=\'none\'">';
          html += '<div class="rateup-sub-name">' + c.name + '</div>';
          html += '<div class="rateup-sub-badge">SSR Rate-Up</div>';
          html += '</div>';
        }
      });
      html += '</div>';
    }

    container.innerHTML = html || '<div class="gacha-rateup-placeholder">No rate-up characters</div>';
  }

  // ── Update Gacha Pity Bar ──
  function updateGachaPityBar() {
    const pityCount = Gacha.getPityCount();
    const pityMax = Gacha.HARD_PITY || 90;
    const fillEl = document.getElementById('pity-bar-fill');
    if (fillEl) {
      const pct = Math.min((pityCount / pityMax) * 100, 100);
      fillEl.style.width = pct + '%';
    }
  }

  // ── Render Gacha Sidebar ──
  function renderGachaSidebar() {
    const container = document.getElementById('gacha-banner-list');
    if (!container) return;
    if (container.children.length > 0) return; // Already rendered

    const banners = [
      { id: 'featured', name: 'Golden Week Special', sub: 'Featured Banner', icon: '&#9733;', iconClass: 'icon-purple', isNew: true },
      { id: 'standard', name: 'Standard', sub: 'All VTubers', icon: '&#9733;', iconClass: 'icon-teal', isNew: false },
      { id: 'disabled-songstress', name: 'Songstress Premiere', sub: 'Rate-Up Banner', icon: '&#9835;', iconClass: 'icon-blue', isNew: false, disabled: true },
      { id: 'disabled-oshi', name: 'Oshi Collection', sub: 'Permanent Banner', icon: '&#9829;', iconClass: 'icon-pink', isNew: false, disabled: true },
      { id: 'disabled-collab', name: 'Collab Festival', sub: 'Limited Banner', icon: '&#127873;', iconClass: 'icon-orange', isNew: false, disabled: true },
      { id: 'disabled-beginner', name: 'Beginner\'s Luck', sub: 'Starter Banner', icon: '&#127915;', iconClass: 'icon-red', isNew: false, disabled: true },
    ];

    const currentBanner = Gacha.getBanner();

    banners.forEach(b => {
      const item = document.createElement('div');
      item.className = 'gacha-banner-list-item' + (b.id === currentBanner ? ' active' : '') + (b.disabled ? ' disabled' : '');
      item.dataset.banner = b.id;

      let inner = '<div class="gacha-banner-icon ' + b.iconClass + '">' + b.icon + '</div>';
      inner += '<div class="gacha-banner-text">';
      inner += '<div class="gacha-banner-text-name">' + b.name + '</div>';
      inner += '<div class="gacha-banner-text-sub">' + b.sub + '</div>';
      inner += '</div>';
      if (b.isNew) inner += '<span class="gacha-banner-new-badge">NEW</span>';

      item.innerHTML = inner;

      if (!b.disabled) {
        item.addEventListener('click', () => {
          Gacha.setBanner(b.id);
          updateBannerInfo();
          // Update active state
          document.querySelectorAll('.gacha-banner-list-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
        });
      }

      container.appendChild(item);
    });
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
    } else if (ownership === 'oshi') {
      filtered = filtered.filter(c => Game.isOshi(c.slug));
    }

    if (variant !== 'all') {
      filtered = filtered.filter(c => {
        const data = state.characters[c.slug];
        return data && data.owned && (data.rarity === variant);
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
      const rarityOrder = { UR: 4, SSR: 3, SR: 2, R: 1 };
      filtered = [...filtered].sort((a, b) => {
        const aData = state.characters[a.slug];
        const bData = state.characters[b.slug];
        const aRarity = aData && aData.owned ? (rarityOrder[aData.rarity] || 0) : 0;
        const bRarity = bData && bData.owned ? (rarityOrder[bData.rarity] || 0) : 0;
        return bRarity - aRarity || a.name.localeCompare(b.name);
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
    const rarity = owned ? (charData.rarity || 'R') : null;
    const rarityClass = rarity ? rarity.toLowerCase() : null;
    // Legacy variant for backward compat with studio system
    const bestVariant = owned ? Game.getBestVariant(charData.variants) : null;
    const assignedStation = owned ? Game.getCharacterStation(char.slug) : null;

    const card = document.createElement('div');
    card.className = `char-card${rarityClass ? ` variant-${rarityClass}` : ''}`;

    if (!owned) {
      card.classList.add('not-owned');
    }

    const img = document.createElement('img');
    img.className = 'char-card-img';
    img.src = DataLoader.getImageUrl(char.slug);
    img.alt = char.name;
    img.loading = 'lazy';
    img.style.opacity = owned ? '1' : '0.3';
    img.onerror = () => { img.src = char.image || img.src; img.onerror = () => { img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" fill="%231c1b18"><rect width="300" height="300"/><text x="150" y="160" text-anchor="middle" fill="%23908e87" font-size="14">No Image</text></svg>'; }; };

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

    if (rarity) {
      const badge = document.createElement('div');
      badge.className = `char-card-badge badge-${rarityClass}`;
      badge.textContent = rarity;
      card.appendChild(badge);
    }

    // Echo indicator
    if (owned && charData.echo > 0) {
      const echoBadge = document.createElement('div');
      echoBadge.className = 'char-card-echo';
      echoBadge.textContent = charData.echo >= 6 ? 'E6 MAX' : `E${charData.echo}`;
      card.appendChild(echoBadge);
    }

    // Legacy shard indicator — only show if old shards data exists
    if (owned && charData.shards > 0 && !(charData.variants && charData.variants.includes('ssr'))) {
      const shardDot = document.createElement('div');
      shardDot.className = 'char-card-shard-indicator';
      shardDot.title = `${charData.shards} shard${charData.shards > 1 ? 's' : ''} available`;
      card.appendChild(shardDot);
    }

    // Oshi star badge for favourite characters
    if (owned && Game.isOshi(char.slug)) {
      const oshiBadge = document.createElement('div');
      oshiBadge.className = 'char-card-oshi-badge';
      oshiBadge.innerHTML = '&#9733;'; // ★
      oshiBadge.title = 'Oshi (Favourite)';
      card.appendChild(oshiBadge);
    }

    // ST / PS display for owned characters
    if (owned) {
      const stInfo = Game.getVTuberStaminaInfo(char.slug);
      if (stInfo) {
        const statsBar = document.createElement('div');
        statsBar.className = 'char-card-stats-bar';
        // ST part
        const stSpan = document.createElement('span');
        stSpan.className = 'stats-st' + (stInfo.current < stInfo.max ? ' stats-depleted' : '');
        stSpan.textContent = `ST ${stInfo.current}/${stInfo.max}`;
        // PS part
        const psSpan = document.createElement('span');
        psSpan.className = 'stats-ps' + (stInfo.psDepleted ? ' stats-depleted' : '');
        psSpan.textContent = `PS ${stInfo.psCurrent}/${stInfo.psMax}`;
        statsBar.appendChild(stSpan);
        statsBar.appendChild(psSpan);
        card.appendChild(statsBar);
      }
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
      el.innerHTML = `<span class="vs-r">R: ${stats.R || 0}</span> | <span class="vs-sr">SR: ${stats.SR || 0}</span> | <span class="vs-ssr">SSR: ${stats.SSR || 0}</span> | <span class="vs-ur">UR: ${stats.UR || 0}</span>`;
    }
  }

  // ═══════════════════════════════════════════════
  //  QUESTS
  // ═══════════════════════════════════════════════
  let _currentQuestTab = 'daily';

  function renderQuests() {
    const data = Game.getQuestsData();

    // Login streak banner
    const streakEl = document.getElementById('quest-login-streak');
    if (streakEl) {
      streakEl.innerHTML = `<span class="quest-streak-label">Login Streak</span> <span class="quest-streak-value">${data.loginStreak} days</span>`;
    }

    renderQuestList('daily', data.daily);
    renderQuestList('weekly', data.weekly);
  }

  function renderQuestList(category, quests) {
    const container = document.getElementById(`quest-${category}`);
    if (!container) return;
    container.innerHTML = '';

    quests.forEach(q => {
      const el = document.createElement('div');
      const isMeta = !!q.meta;
      const isLocked = isMeta && !q.metaReady;
      const canClaim = q.completed && !q.claimed && !isLocked;

      el.className = `quest-item${q.claimed ? ' claimed' : ''}${canClaim ? ' completable' : ''}${isLocked ? ' locked' : ''}`;

      // Progress bar HTML
      const pct = Math.min(100, (q.progress / q.target) * 100);
      const progressHTML = `<div class="quest-progress-bar"><div class="quest-progress-fill" style="width:${pct}%"></div></div>`;

      // Reward display
      let rewardHTML = '';
      if (q.id === 'daily_login' && q.loginReward) {
        rewardHTML = `${currencyIcon('vgems', 12)}+${q.loginReward.vgems} ${currencyIcon('ticket_blue', 12)}+${q.loginReward.tickets}`;
      } else if (q.reward.streakScaled) {
        const lr = Game.getDailyLoginReward();
        if (lr) {
          rewardHTML = `${currencyIcon('vgems', 12)}+${lr.vgems} ${currencyIcon('ticket_blue', 12)}+${lr.tickets}`;
        } else {
          rewardHTML = `<span style="color:var(--text-dim);">Already claimed today</span>`;
        }
      } else {
        const parts = [];
        if (q.reward.vgems) parts.push(`${currencyIcon('vgems', 12)}+${q.reward.vgems}`);
        if (q.reward.tickets) parts.push(`${currencyIcon('ticket_blue', 12)}+${q.reward.tickets}`);
        rewardHTML = parts.join(' ');
      }

      // Status text
      let statusText = '';
      if (q.claimed) {
        statusText = '<span class="quest-status-claimed">Claimed</span>';
      } else if (isLocked) {
        statusText = '<span class="quest-status-locked">Complete all other quests</span>';
      } else if (canClaim) {
        statusText = '<button class="quest-claim-btn">Claim</button>';
      } else {
        statusText = `<span class="quest-status-progress">${q.progress} / ${q.target}</span>`;
      }

      el.innerHTML = `
        <div class="quest-info">
          <span class="quest-label">${q.label}</span>
          <span class="quest-desc">${q.desc}</span>
          ${progressHTML}
        </div>
        <div class="quest-right">
          <span class="quest-reward">${rewardHTML}</span>
          ${statusText}
        </div>
      `;

      // Wire claim button
      if (canClaim) {
        const claimBtn = el.querySelector('.quest-claim-btn');
        if (claimBtn) {
          claimBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const result = Game.claimQuest(category, q.id);
            if (result) {
              showToast(`Claimed! ${currencyIcon('vgems', 12)}+${result.vgems}${result.tickets ? ' ' + currencyIcon('ticket_blue', 12) + '+' + result.tickets : ''}`, 'success');
              renderQuests();
              updateUI();
            }
          });
        }
      }

      container.appendChild(el);
    });
  }

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
          <span class="milestone-reward">${currencyIcon('vgems', 12)}+${formatNum(m.vgems)} ${currencyIcon('vringgit', 12)}+${formatNum(m.vringgit)} ${currencyIcon('ticket_blue', 12)}+${m.tickets}</span>
        </div>
        <span class="milestone-status">${m.claimed ? 'Claimed' : stats.owned >= m.count ? 'Ready!' : `${stats.owned}/${m.count}`}</span>
      `;
      container.appendChild(el);
    });
  }

  // ═══════════════════════════════════════════════
  //  STUDIO — Enhanced (Sprint 4)
  // ═══════════════════════════════════════════════

  // Station type icons
  const STATION_ICONS = {
    streamRoom: '\uD83C\uDFA5',
    creativeCorner: '\uD83C\uDFA8',
    practiceHall: '\uD83C\uDFB5',
    lounge: '\u2615',
  };

  // Stat name mapping for display
  const STAT_NAMES = {
    st: 'Stamina', ps: 'Passion', tc: 'Tech', ch: 'Charisma', vc: 'Voice', mg: 'Music',
  };
  const STAT_COLORS = {
    st: '#f472b6', ps: '#fb923c', tc: '#60a5fa', ch: '#a78bfa', vc: '#34d399', mg: '#fbbf24',
  };

  // Collapsible toggle state (persists across re-renders but not saves)
  let _roadmapOpen = false;
  let _feedOpen = false;

  // Sort state for character selection modals
  let _assignSort = 'rarity';
  let _featuredSort = 'rarity';
  let _scLeadSort = 'rarity';

  const RARITY_ORDER = { UR: 4, SSR: 3, SR: 2, R: 1 };
  const STAT_KEYS = ['st', 'ps', 'tc', 'ch', 'vc', 'mg'];

  // Shared sort helper — sorts character list, always desc, level as tiebreaker
  function _sortCharList(list, sortBy, state) {
    return list.sort((a, b) => {
      const aState = state.characters[a.slug];
      const bState = state.characters[b.slug];
      if (!aState || !bState) return 0;

      if (sortBy === 'rarity') {
        const aR = RARITY_ORDER[a.rarity] || 0;
        const bR = RARITY_ORDER[b.rarity] || 0;
        if (bR !== aR) return bR - aR;
      } else if (STAT_KEYS.includes(sortBy)) {
        const aStat = aState.stats ? (aState.stats[sortBy] || 0) : 0;
        const bStat = bState.stats ? (bState.stats[sortBy] || 0) : 0;
        if (bStat !== aStat) return bStat - aStat;
      }
      return bState.level - aState.level;
    });
  }

  // Wire sort bar buttons — call once during init
  function _initSortBars() {
    const bars = [
      { id: 'sort-bar-assign', getSort: () => _assignSort, setSort: v => { _assignSort = v; populateAssignGrid(_assignStationId); } },
      { id: 'sort-bar-featured', getSort: () => _featuredSort, setSort: v => { _featuredSort = v; populateFeaturedGrid(); } },
      { id: 'sort-bar-sc-lead', getSort: () => _scLeadSort, setSort: v => { _scLeadSort = v; populateMinigameLeadGrid(); } },
    ];
    bars.forEach(bar => {
      const el = document.getElementById(bar.id);
      if (!el || el._bound) return;
      el._bound = true;
      el.addEventListener('click', (e) => {
        const pill = e.target.closest('.sort-pill');
        if (!pill) return;
        const sortVal = pill.dataset.sort;
        bar.setSort(sortVal);
        el.querySelectorAll('.sort-pill').forEach(p => p.classList.toggle('active', p.dataset.sort === sortVal));
      });
    });
  }

  function _initCollapsibleToggles() {
    const toggleRoadmap = document.getElementById('toggle-roadmap');
    const bodyRoadmap = document.getElementById('body-roadmap');
    const toggleFeed = document.getElementById('toggle-feed');
    const bodyFeed = document.getElementById('body-feed');

    if (toggleRoadmap && !toggleRoadmap._bound) {
      toggleRoadmap._bound = true;
      toggleRoadmap.addEventListener('click', () => {
        _roadmapOpen = !_roadmapOpen;
        toggleRoadmap.classList.toggle('open', _roadmapOpen);
        bodyRoadmap.classList.toggle('open', _roadmapOpen);
      });
    }
    if (toggleFeed && !toggleFeed._bound) {
      toggleFeed._bound = true;
      toggleFeed.addEventListener('click', () => {
        _feedOpen = !_feedOpen;
        toggleFeed.classList.toggle('open', _feedOpen);
        bodyFeed.classList.toggle('open', _feedOpen);
      });
    }

    // Sync DOM to current state (after renderStudio rebuilds inner content)
    toggleRoadmap.classList.toggle('open', _roadmapOpen);
    bodyRoadmap.classList.toggle('open', _roadmapOpen);
    toggleFeed.classList.toggle('open', _feedOpen);
    bodyFeed.classList.toggle('open', _feedOpen);
  }

  function renderStudio() {
    try {
    const state = Game.getState();
    const grid = document.getElementById('stations-grid');
    const maxSlots = Game.getMaxSlots();
    const expProgress = Game.getStudioExpProgress();
    const stamina = Game.getStamina();
    const trending = Game.getTrendingStat();
    const trendingMs = Game.getTrendingTimeRemaining();

    // Studio level + EXP bar
    document.getElementById('studio-level').textContent = state.studio.level;
    document.getElementById('studio-exp-fill').style.width = Math.min(expProgress.pct, 100) + '%';
    document.getElementById('studio-exp-text').textContent =
      state.studio.level >= 10 ? 'MAX' : `${formatNum(Math.floor(expProgress.current))} / ${formatNum(expProgress.required)} EXP`;

    // Trending banner
    renderTrendingBanner(trending, trendingMs);

    // Studio stats (quality distribution)
    renderStudioStats();

    // Unlock Roadmap
    renderUnlockRoadmap();

    // Stations grid
    grid.innerHTML = '';
    let slotCount = 0;
    for (const [stationId, def] of Object.entries(Game.STATION_DEFS)) {
      if (slotCount >= maxSlots) break;

      const station = state.studio.stations[stationId];
      const isLocked = state.studio.level < def.unlockLv;
      const assigned = station && station.assigned;
      const assignedChar = assigned ? DataLoader.getBySlug(station.assigned) : null;
      const contentType = Game.CONTENT_TYPES[stationId];
      const icon = STATION_ICONS[stationId] || '';

      // Quality preview
      let qualityHTML = '';
      let staminaCostHTML = '';
      let outputHTML = '';

      if (!isLocked && station) {
        const staminaCost = Game.STAMINA_COSTS[(station.level || 1) - 1] || 8;
        staminaCostHTML = `<span class="station-stamina-cost">${staminaCost} \u26A1</span>`;

        if (assigned) {
          const quality = Game.getContentQuality(stationId);
          if (quality) {
            const qClass = `quality-badge-${quality.quality}`;
            const trendingIcon = quality.trendingMatch ? ' \uD83D\uDD25' : '';
            qualityHTML = `<span class="quality-badge ${qClass}">${quality.quality}${trendingIcon}</span>`;
          }

          const income = Game.getStationIncome(stationId);
          const expIncome = Game.getStationStudioExp(stationId);
          const resName = getResourceName(def.resource);
          let rewardParts = [];
          rewardParts.push(`+${formatNum(income, 1)} ${resName}`);
          // Show passive EXP rate
          if (expIncome > 0) {
            rewardParts.push(`${formatNum(expIncome, 1)} EXP/min`);
          }
          // Lounge bonus LiveCache
          if (contentType && contentType.bonusResource) {
            const bonusVal = contentType.bonusAmount * (quality ? quality.qualityMultiplier : 1) * (state.characters[station.assigned] ? (Game.RarityMultipliers[state.characters[station.assigned].rarity] || 1) : 1);
            rewardParts.push(`${currencyIcon('livecache', 12)}+${formatNum(bonusVal, 1)}`);
          }
          outputHTML = `<div class="station-output"><span class="station-output-rewards">${rewardParts.join(' ')}</span></div>`;
        } else {
          outputHTML = `<div class="station-output"><span class="station-output-label">Tap to assign</span></div>`;
        }
      }

      const el = document.createElement('div');
      el.className = `station${isLocked ? ' locked' : ''}`;

      el.innerHTML = `
        <div class="station-header">
          <span class="station-name">${icon} ${def.name}</span>
          <div class="station-header-right">
            ${qualityHTML}
            <span class="station-level">Lv ${station ? station.level : 1}</span>
          </div>
        </div>
        ${contentType ? `
          <div class="station-stats-preview">
            <span class="station-stat-hint" style="color:${STAT_COLORS[contentType.primary]}">${contentType.primary.toUpperCase()}</span>
            <span class="station-stat-arrow">\u2190</span>
            <span class="station-stat-hint">Main</span>
            <span style="color:var(--text-dim);margin:0 4px;">|</span>
            <span class="station-stat-hint" style="color:${STAT_COLORS[contentType.secondary]}">${contentType.secondary.toUpperCase()}</span>
            <span class="station-stat-arrow">\u2190</span>
            <span class="station-stat-hint">Sub</span>
          </div>
        ` : ''}
        <div class="station-slot${assigned ? ' assigned' : ''}" data-station="${stationId}">
          ${assigned && assignedChar
            ? (() => {
                const stInfo = Game.getVTuberStaminaInfo(station.assigned);
                const stPct = stInfo ? Math.round((stInfo.current / Math.max(1, stInfo.max)) * 100) : 0;
                const stColor = stPct > 50 ? '#66bb6a' : stPct > 20 ? '#fb923c' : '#ef4444';
                const stLabel = stInfo && stInfo.current <= 0 ? 'Exhausted' : `${stInfo ? stInfo.current : 0}/${stInfo ? stInfo.max : 0}`;
                return `<img src="${DataLoader.getImageUrl(assignedChar.slug)}" alt="${assignedChar.name}" onerror="this.onerror=function(){this.src='${assignedChar.image}';this.onerror=function(){this.style.display='none'};}">
               <div class="station-stamina-bar">
                 <div class="station-stamina-fill" style="width:${stPct}%;background:${stColor};"></div>
                 <span class="station-stamina-text">\u26A1 ${stLabel}</span>
               </div>
               <div class="station-slot-name">${assignedChar.name}</div>`;
              })()
            : `<span class="station-slot-empty-text">${isLocked ? '\uD83D\uDD12 Locked' : 'Tap to assign'}</span>`
          }
        </div>
        ${outputHTML}
        ${staminaCostHTML ? `<div class="station-cost-row">${staminaCostHTML}<span class="station-cycle-info">per 60s</span></div>` : ''}
        ${!isLocked && station && station.level < 5 ? `
          <div class="station-upgrade">
            <button class="btn btn-secondary btn-sm" data-upgrade="${stationId}" style="width:100%;padding:6px;font-size:0.8rem;">
              Upgrade (${currencyIcon('vringgit', 12)}${formatNum(Game.STATION_UPGRADE_COSTS[station.level])})
            </button>
          </div>
        ` : ''}
        ${!isLocked && station && station.level >= 5 ? `
          <div style="font-size:0.75rem;color:var(--accent2);text-align:center;">MAX LEVEL</div>
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
            showToast(`${icon} ${def.name} upgraded to Lv ${state.studio.stations[stationId].level}!`, 'success');
            renderStudio();
          } else {
            showToast('Not enough VRinggit to upgrade!', 'error');
          }
        });
      }
    }

    // Content log feed
    renderContentLog();

    // Restore collapsible toggle states after DOM rebuild
    _initCollapsibleToggles();

    } catch (err) { console.error('renderStudio failed:', err); }
  }

  // Trending banner
  function renderTrendingBanner(trending, trendingMs) {
    const banner = document.getElementById('studio-trending');
    if (!banner) return;

    if (!trending) {
      banner.innerHTML = '<span class="trending-label">Trending: calculating...</span>';
      return;
    }

    const totalSec = Math.ceil(trendingMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
    const trendingColor = STAT_COLORS[trending] || 'var(--accent)';

    banner.innerHTML = `
      <span class="trending-fire">\uD83D\uDD25</span>
      <span class="trending-label">Trending:</span>
      <span class="trending-stat" style="color:${trendingColor};">${trending.toUpperCase()}</span>
      <span class="trending-name">${STAT_NAMES[trending] || trending}</span>
      <span class="trending-timer">${timeStr} left</span>
      <span class="trending-bonus">1.5x bonus!</span>
    `;
  }

  // Studio stats panel (quality distribution + estimated income + VTuber stamina)
  function renderStudioStats() {
    const dist = Game.getQualityDistribution();
    const breakdown = Game.getStationIncomeBreakdown();
    const state = Game.getState();

    const statsEl = document.getElementById('studio-stats-panel');
    if (!statsEl) return;

    // VTuber stamina info for assigned stations
    let staminaHTML = '';
    const maxSlots = Game.getMaxSlots();
    let slotCount = 0;
    let hasAssigned = false;
    for (const [stationId, def] of Object.entries(Game.STATION_DEFS)) {
      if (slotCount >= maxSlots) break;
      const station = state.studio.stations[stationId];
      if (!station || !station.assigned) { slotCount++; continue; }
      if (state.studio.level < def.unlockLv) { slotCount++; continue; }
      hasAssigned = true;
      const staminaCost = Game.STAMINA_COSTS[(station.level || 1) - 1] || 8;
      const stInfo = Game.getVTuberStaminaInfo(station.assigned);
      const charInfo = DataLoader.getBySlug(station.assigned);
      const name = charInfo ? charInfo.name : station.assigned;
      const stPct = stInfo ? Math.round((stInfo.current / Math.max(1, stInfo.max)) * 100) : 0;
      const canProduce = stInfo && stInfo.current >= staminaCost;
      const stColor = stPct > 50 ? '#66bb6a' : stPct > 20 ? '#fb923c' : '#ef4444';
      staminaHTML += `<div class="studio-stats-row">
        <span class="studio-stats-label">\u26A1 ${name}</span>
        <span class="studio-stats-value" style="color:${stColor};">${stInfo ? stInfo.current : 0} / ${stInfo ? stInfo.max : 0}${!canProduce && stInfo && stInfo.current > 0 ? ' (low)' : ''}${stInfo && stInfo.current <= 0 ? ' (exhausted)' : ''}</span>
      </div>`;
      slotCount++;
    }

    // Quality distribution
    let qualityHTML = '';
    const qualityOrder = ['SS', 'S', 'A', 'B', 'C', 'D'];
    const qualityColors = { SS: '#ffd700', S: '#c77dff', A: '#42a5f5', B: '#66bb6a', C: '#b0bec5', D: '#616161' };
    let totalPieces = 0;
    for (const q of qualityOrder) { totalPieces += (dist[q] || 0); }

    if (totalPieces > 0) {
      qualityHTML = '<div class="quality-distribution">';
      for (const q of qualityOrder) {
        const count = dist[q] || 0;
        if (count === 0) continue;
        const pct = Math.round((count / totalPieces) * 100);
        qualityHTML += `<span class="quality-dist-item"><span class="quality-badge quality-badge-${q}" style="font-size:0.65rem;">${q}</span><span>${count}</span><span class="quality-dist-pct">(${pct}%)</span></span>`;
      }
      qualityHTML += '</div>';
    }

    // Estimated income per cycle
    let incomeHTML = '';
    const totalIncome = Game.getTotalIncome();
    const hasIncome = totalIncome.vgems > 0 || totalIncome.vringgit > 0 || totalIncome.liveCache > 0;
    if (hasIncome) {
      incomeHTML = '<div class="income-breakdown-mini">';
      if (totalIncome.vgems > 0) incomeHTML += `<span class="income-mini-item" style="color:#22d3ee;">${currencyIcon('vgems', 12)}+${formatNum(totalIncome.vgems, 1)}</span>`;
      if (totalIncome.vringgit > 0) incomeHTML += `<span class="income-mini-item" style="color:#fb923c;">${currencyIcon('vringgit', 12)}+${formatNum(totalIncome.vringgit, 1)}</span>`;
      if (totalIncome.liveCache > 0) incomeHTML += `<span class="income-mini-item" style="color:#a78bfa;">${currencyIcon('livecache', 12)}+${formatNum(totalIncome.liveCache, 1)}</span>`;
      incomeHTML += '</div>';
    }

    statsEl.innerHTML = `
      ${staminaHTML}
      ${qualityHTML}
      ${hasIncome ? '<div class="studio-stats-divider"></div>' : ''}
      ${incomeHTML ? '<div class="studio-stats-estimate-label">Est. per cycle (60s)</div>' + incomeHTML : ''}
      ${!hasIncome && totalPieces === 0 ? '<div class="studio-stats-empty">Assign characters to start creating content!</div>' : ''}
    `;
  }

  // Content log feed
  function renderContentLog() {
    const logContainer = document.getElementById('content-log');
    if (!logContainer) return;

    const log = Game.getContentLog(10);
    if (!log || log.length === 0) {
      logContainer.innerHTML = '<div class="content-log-empty">No content created yet. Assign characters and wait 60 seconds!</div>';
      return;
    }

    logContainer.innerHTML = '';
    log.forEach(entry => {
      const el = document.createElement('div');
      el.className = `content-entry${entry.isOffline ? ' content-entry-offline' : ''}`;

      // Format rewards
      let rewardParts = [];
      if (entry.rewards) {
        if (entry.rewards.vgems) rewardParts.push(`${currencyIcon('vgems', 12)}+${formatNum(Math.floor(entry.rewards.vgems))}`);
        if (entry.rewards.vringgit) rewardParts.push(`${currencyIcon('vringgit', 12)}+${formatNum(Math.floor(entry.rewards.vringgit))}`);
        if (entry.rewards.liveCache) rewardParts.push(`${currencyIcon('livecache', 12)}+${formatNum(Math.floor(entry.rewards.liveCache))}`);
      }
      if (entry.flatBonus && entry.flatBonus > 0) {
        rewardParts.push(`<span style="color:var(--accent);font-size:0.8em">+${entry.flatBonus % 1 === 0 ? formatNum(entry.flatBonus) : entry.flatBonus.toFixed(1)} Lv bonus</span>`);
      }
      const rewardText = rewardParts.join(' ') || '--';

      // Format time
      const ago = getTimeAgo(entry.timestamp);

      // Quality badge
      const qClass = `quality-badge-${entry.quality}`;
      const trendingIcon = entry.trendingMatch ? ' \uD83D\uDD25' : '';

      // Offline summary entry
      if (entry.isOffline) {
        el.innerHTML = `
          <div class="content-entry-icon">\uD83D\uDD04</div>
          <div class="content-entry-body">
            <div class="content-entry-title">
              <span style="color:var(--text-muted);">${entry.charName}</span>
              <span class="quality-badge quality-badge-B">Offline</span>
              <span class="content-entry-pieces">${entry.contentPieces || 0} pieces</span>
            </div>
            <div class="content-entry-rewards">${rewardText}</div>
            <div class="content-entry-time">${ago}</div>
          </div>
        `;
      } else {
        el.innerHTML = `
          <div class="content-entry-portrait">
            ${entry.charImage ? `<img src="${entry.charImage}" alt="" onerror="this.style.display='none';">` : ''}
          </div>
          <div class="content-entry-body">
            <div class="content-entry-title">
              <span class="content-entry-name">${entry.charName}</span>
              <span class="content-entry-station">${entry.stationName}</span>
              <span class="quality-badge ${qClass}">${entry.quality}${trendingIcon}</span>
            </div>
            <div class="content-entry-rewards">${rewardText}</div>
            <div class="content-entry-time">${ago}</div>
          </div>
        `;
      }

      logContainer.appendChild(el);
    });
  }

  // Helper: relative time
  function getTimeAgo(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const sec = Math.floor(diff / 1000);
    if (sec < 5) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    return `${day}d ago`;
  }

  // Sprint 4: Unlock Roadmap
  function renderUnlockRoadmap() {
    const state = Game.getState();
    const container = document.getElementById('unlock-items');
    container.innerHTML = '';

    Game.STATION_LEVELS.forEach(lv => {
      const isUnlocked = state.studio.level >= lv.level;
      const isCurrent = state.studio.level === lv.level;
      const isNext = state.studio.level === lv.level - 1;

      const el = document.createElement('div');
      el.className = `unlock-item${isUnlocked ? ' unlocked' : ''}${isCurrent ? ' current' : ''}${isNext ? ' next-up' : ''}`;

      const statusIcon = isUnlocked ? '\u2713' : isNext ? '\u25B6' : '\u25CB';
      const statusClass = isUnlocked ? 'unlocked' : isNext ? 'next' : 'locked';

      el.innerHTML = `
        <span class="unlock-lv">Lv ${lv.level}</span>
        <span class="unlock-what">${lv.unlocks}</span>
        <span class="unlock-status unlock-${statusClass}">${statusIcon}</span>
      `;
      container.appendChild(el);
    });
  }

  // ═══════════════════════════════════════════════
  //  CHARACTER DETAIL MODAL — Enhanced (Sprint 3)
  // ═══════════════════════════════════════════════

  // _detailMode: null = normal view, { stationId } = assign mode
  let _detailMode = null;

  function formatCooldown(ms) {
    if (ms <= 0) return '';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
  }

  function showCharacterDetail(slug, options) {
    const data = Characters.getCharDisplayData(slug);
    if (!data) return;

    // Store mode for this detail view
    _detailMode = options && options.mode === 'assign' ? { stationId: options.stationId } : null;

    const detail = document.getElementById('char-detail');
    const owned = data.owned;
    const pullHistory = Game.getPullHistory(slug);
    const assignedStation = Game.getCharacterStation(slug);
    const rarity = data.rarity || 'R';

    // Bond info
    const bondInfo = owned ? Game.getCharacterBondInfo(slug) : null;

    // Rarity color mapping
    const rarityColors = {
      R: 'var(--rarity-normal, #a8a29e)',
      SR: 'var(--rarity-sr, #b0b8c8)',
      SSR: 'var(--rarity-ssr, #e8c547)',
      UR: 'var(--rarity-ur, #ff6b9d)',
    };
    const rarityColor = rarityColors[rarity] || 'var(--text-muted)';

    // Echo badge color
    const echoBadgeClass = data.echoCount >= 6 ? 'echo-badge-max' : data.echoCount > 0 ? 'echo-badge-active' : 'echo-badge-none';

    // Stat definitions — all 6 stats with colors (for reference-style layout)
    const allStatDefs = [
      { key: 'ST', label: 'Stamina', color: '#ef5350', icon: '\u2764' },
      { key: 'PS', label: 'Passion', color: '#ff9800', icon: '\u2B06' },
      { key: 'TC', label: 'Tech',    color: '#42a5f5', icon: '\u2699' },
      { key: 'CH', label: 'Charisma', color: '#ab47bc', icon: '\u2728' },
      { key: 'VC', label: 'Voice',   color: '#26c6da', icon: '\uD83C\uDFB5' },
      { key: 'MG', label: 'Music',   color: '#66bb6a', icon: '\uD83C\uDFB6' },
    ];

    // Build all 6 stat bar rows
    let allStatsHTML = '';

    // Stamina/Passion info for owned characters (needed by stat bars)
    const stInfo = owned ? Game.getVTuberStaminaInfo(slug) : null;
    const stCur = stInfo ? stInfo.current : (data.baseStats ? (data.baseStats.st || 0) : '?');
    const stMax = stInfo ? stInfo.max : stCur;
    const psCur = stInfo ? stInfo.psCurrent : (data.baseStats ? (data.baseStats.ps || 0) : '?');
    const psMax = stInfo ? stInfo.psMax : psCur;

    if (data.stats) {
      const maxStat = 150;
      allStatDefs.forEach(sd => {
        const val = data.stats[sd.key.toLowerCase()] || data.stats[sd.key] || 0;
        const baseVal = data.baseStats ? (data.baseStats[sd.key.toLowerCase()] || data.baseStats[sd.key] || 0) : val;
        const gain = val - baseVal;
        const pct = Math.min(100, (val / maxStat) * 100);
        const isExpendable = (sd.key === 'ST' || sd.key === 'PS');
        const maxVal = isExpendable ? (sd.key === 'ST' ? stMax : psMax) : maxStat;
        const curVal = isExpendable ? (sd.key === 'ST' ? stCur : psCur) : val;
        const displayPct = isExpendable ? Math.min(100, (curVal / maxVal) * 100) : pct;
        const displayVal = isExpendable ? `${curVal}/${maxVal}` : `${val}${gain > 0 ? '+' + gain : ''}`;
        allStatsHTML += `
          <div class="cdv-stat-row">
            <span class="cdv-stat-icon" style="color:${sd.color}">${sd.icon}</span>
            <span class="cdv-stat-label">${sd.key}</span>
            <span class="cdv-stat-val">${displayVal}</span>
            <div class="cdv-stat-bar-track">
              <div class="cdv-stat-bar-fill" style="width:${displayPct}%;background:${sd.color};"></div>
            </div>
          </div>
        `;
      });
    }

    // Format pull date
    let pullDateStr = 'Unknown';
    let totalPulls = 0;
    if (pullHistory) {
      totalPulls = pullHistory.totalPulls || 0;
      if (pullHistory.firstPullDate) {
        const d = new Date(pullHistory.firstPullDate);
        pullDateStr = d.toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' });
      }
    }

    // Debut date from rarity_data
    let debutDate = 'Unknown';
    if (data.rarity_data && data.rarity_data.debut) {
      debutDate = data.rarity_data.debut;
    }

    // Level info
    const level = owned ? (data.level || 1) : 1;
    const levelCap = owned ? (data.levelCap || 20) : 20;
    const lvPct = levelCap > 1 ? Math.round(((level - 1) / (levelCap - 1)) * 100) : 100;

    const isOshi = owned ? Game.isOshi(slug) : false;
    const oshiCount = Game.getOshiCount();
    const oshiFull = oshiCount >= Game.OSHI_MAX;

    // Portrait fallback SVG (light background)
    const fallbackSVG = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='260' fill='%23bbb'><rect width='200' height='260' fill='%23f0eef8'/><text x='100' y='140' text-anchor='middle' fill='%23999' font-size='14'>No Image</text></svg>";

    // Bond info HTML
    let bondHTML = '';
    if (bondInfo) {
      bondHTML = `
        <div class="cdv-bond-section">
          <div class="cdv-bond-header">
            <span class="cdv-bond-label">BOND</span>
            <span class="cdv-bond-level ${bondInfo.isMaxBond ? 'cdv-bond-max' : ''}">Lv.${bondInfo.bondLevel} / Lv.${Game.BOND_MAX_LEVEL || 8}</span>
          </div>
          <div class="cdv-bond-bar-track">
            <div class="cdv-bond-bar-fill ${bondInfo.isMaxBond ? 'cdv-bond-bar-max' : ''}" style="width:${bondInfo.bpProgressPct}%;"></div>
          </div>
          <div class="cdv-bond-text">${bondInfo.isMaxBond ? 'MAX' : bondInfo.bondPoints + ' / ' + bondInfo.nextLevelBpRequired + ' BP'}${bondInfo.totalBondStatBonus > 0 ? '  &middot;  +' + bondInfo.totalBondStatBonus + ' all stats' : ''}</div>
          ${bondInfo.isOnCooldown ? `<div class="cdv-bond-hint">Date cooldown: ${formatCooldown(bondInfo.cooldownRemaining)}</div>` : ''}
          ${!bondInfo.isOnCooldown && (data.level || 1) < Game.BOND_DATE_LEVEL_REQ ? `<div class="cdv-bond-hint">Requires LV.${Game.BOND_DATE_LEVEL_REQ} to date</div>` : ''}
        </div>
      `;
    }

    detail.innerHTML = `
      <div class="cdv-card">
        <!-- LEFT: Portrait -->
        <div class="cdv-portrait-col">
          <div class="cdv-portrait-frame" style="border-color:${rarityColor};${isOshi ? 'box-shadow:0 0 0 3px #ffd700,0 0 16px rgba(255,215,0,0.35);' : ''}">
            <img class="cdv-portrait-img" src="${DataLoader.getImageUrl(data.slug)}" alt="${data.name}" onerror="this.src='${data.image}';this.onerror=function(){this.src='${fallbackSVG}';};">
          </div>
          <div class="cdv-portrait-badges">
            <span class="cdv-badge cdv-badge-rarity" style="background:${rarityColor};color:#fff;">${rarity}</span>
            ${owned ? `<span class="cdv-badge cdv-badge-echo" style="background:#5c6bc0;color:#fff;">${data.echoLabel}</span>` : ''}
            ${isOshi ? '<span class="cdv-badge cdv-badge-oshi" style="background:#e91e63;color:#fff;">&#9733; OSHI</span>' : ''}
          </div>
          ${owned ? `
          <div class="cdv-portrait-meta">
            <div class="cdv-meta-item"><span class="cdv-meta-label">First Obtained</span><span class="cdv-meta-value">${pullDateStr}</span></div>
            <div class="cdv-meta-item"><span class="cdv-meta-label">Debut</span><span class="cdv-meta-value">${debutDate}</span></div>
            <div class="cdv-meta-item"><span class="cdv-meta-label">Total Pulls</span><span class="cdv-meta-value">${totalPulls}</span></div>
          </div>
          ` : `
          <div class="cdv-portrait-meta">
            <div class="cdv-meta-item"><span class="cdv-meta-label">Debut</span><span class="cdv-meta-value">${debutDate}</span></div>
          </div>
          `}
        </div>

        <!-- RIGHT: Info -->
        <div class="cdv-info-col">
          <!-- Name & Subtitle -->
          <div class="cdv-name-row">
            <h2 class="cdv-name" style="color:${owned ? '#2d2b55' : '#666'}">${data.name}</h2>
          </div>
          <p class="cdv-subtitle">${data.agency || 'Unknown'}</p>

          <!-- Top stat cards: Level | Power | Oshi -->
          ${owned ? `
          <div class="cdv-top-cards">
            <div class="cdv-top-card">
              <div class="cdv-top-card-label">Level</div>
              <div class="cdv-top-card-value" style="color:${rarityColor}">${level}<small style="font-size:0.7rem;color:#999;">/${levelCap}</small></div>
              <div class="cdv-top-card-bar"><div class="cdv-top-card-fill" style="width:${lvPct}%;background:${rarityColor};"></div></div>
            </div>
            <div class="cdv-top-card">
              <div class="cdv-top-card-label">Total Power</div>
              <div class="cdv-top-card-value" style="color:#42a5f5">${formatNum(data.totalPower)}</div>
            </div>
            <div class="cdv-top-card">
              <div class="cdv-top-card-label">Oshi Slot</div>
              <div class="cdv-top-card-value" style="color:#e91e63">${oshiCount}/${Game.OSHI_MAX}</div>
              <div class="cdv-top-card-bar"><div class="cdv-top-card-fill" style="width:${(oshiCount/Game.OSHI_MAX)*100}%;background:#e91e63;"></div></div>
            </div>
          </div>
          ` : ''}

          <!-- All 6 Stats -->
          <div class="cdv-stats-section">
            <div class="cdv-section-title">STATUS</div>
            <div class="cdv-stats-grid">
              ${allStatsHTML || '<div style="color:#999;font-size:0.8rem;">No stats</div>'}
            </div>
          </div>

          <!-- Bond -->
          ${bondHTML}

          <!-- Action Buttons -->
          ${owned ? `
          <div class="cdv-actions">
            <button class="cdv-btn cdv-btn-oshi ${isOshi ? 'cdv-btn-oshi-active' : ''}" onclick="UI.toggleOshi('${slug}')" ${!isOshi && oshiFull ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
              ${isOshi ? '&#9733; OSHI' : '&#9734; SET OSHI'}
            </button>
            ${_detailMode ? `
              <button class="cdv-btn cdv-btn-assign" onclick="UI.assignCharFromDetail('${slug}')">
                ASSIGN <span class="cdv-btn-sub">to ${Game.STATION_DEFS[_detailMode.stationId]?.name || 'Station'}</span>
              </button>
            ` : `
              <button class="cdv-btn cdv-btn-lvup" onclick="UI.levelUpChar('${slug}')" ${data.level >= data.levelCap ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
                LV UP <span class="cdv-btn-sub">${currencyIcon('vringgit', 12)}${formatNum(data.nextLevelCost[0])} ${currencyIcon('livecache', 12)}${data.nextLevelCost[1]}</span>
              </button>
              ${assignedStation ? `<span class="cdv-working-badge">Working: ${Game.STATION_DEFS[assignedStation]?.name || assignedStation}</span>` : ''}
            `}
          </div>
          ` : `
          <div class="cdv-actions">
            <div class="cdv-unowned-hint">Not yet collected. Pull on banners!</div>
          </div>
          `}
        </div>
      </div>
    `;

    toggleModal('modal-character');
  }

  // Expose for onclick
  function toggleOshi(slug) {
    const result = Game.toggleOshi(slug);
    if (!result.success) {
      showToast(result.reason, 'warning');
      return;
    }
    if (result.action === 'added') {
      showToast(`Added to Oshi! (${result.count}/${Game.OSHI_MAX})`, 'success');
    } else {
      showToast('Removed from Oshi.', 'info');
    }
    showCharacterDetail(slug);
    renderCollection();
  }

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

  function assignCharFromDetail(slug) {
    if (!_detailMode || !_detailMode.stationId) return;
    const stationId = _detailMode.stationId;
    if (Game.assignToStation(stationId, slug)) {
      const charInfo = DataLoader.getBySlug(slug);
      const stName = Game.STATION_DEFS[stationId]?.name || stationId;
      showToast(`Assigned ${charInfo ? charInfo.name : slug} to ${stName}!`, 'success');
      toggleModal('modal-character');
      _detailMode = null;
      closeAssignModal();
      renderStudio();
    } else {
      showToast('Assignment failed.', 'error');
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
    if (counts.UR > 0) parts.push(`${counts.UR} UR`);
    if (counts.SSR > 0) parts.push(`${counts.SSR} SSR`);
    if (counts.SR > 0) parts.push(`${counts.SR} SR`);
    if (counts.R > 0) parts.push(`${counts.R} R`);
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

    // Sort by active sort (default: rarity desc), level as tiebreaker
    _sortCharList(available, _assignSort, state);

    available.forEach(charInfo => {
      const charState = state.characters[charInfo.slug];
      const rarity = charInfo.rarity || 'R';

      const el = document.createElement('div');
      el.className = 'assign-char';

      const img = document.createElement('img');
      img.src = DataLoader.getImageUrl(charInfo.slug);
      img.alt = charInfo.name;
      img.onerror = () => { img.src = charInfo.image || img.src; img.onerror = () => { img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" fill="%231c1b18"><rect width="120" height="160"/><text x="60" y="85" text-anchor="middle" fill="%23908e87" font-size="12">No Img</text></svg>'; }; };

      const info = document.createElement('div');
      info.className = 'assign-char-info';
      info.textContent = `${charInfo.name} Lv${charState.level}`;

      const badge = document.createElement('div');
      badge.className = `assign-char-badge badge-${rarity.toLowerCase()}`;
      badge.textContent = rarity;

      // ST/PS stats bar
      const stInfo = Game.getVTuberStaminaInfo(charInfo.slug);
      if (stInfo) {
        const statsBar = document.createElement('div');
        statsBar.className = 'assign-char-stats';
        const stSpan = document.createElement('span');
        stSpan.className = 'acs-st' + (stInfo.current < stInfo.max ? ' acs-depleted' : '');
        stSpan.textContent = `ST ${stInfo.current}/${stInfo.max}`;
        const psSpan = document.createElement('span');
        psSpan.className = 'acs-ps' + (stInfo.psDepleted ? ' acs-depleted' : '');
        psSpan.textContent = `PS ${stInfo.psCurrent}/${stInfo.psMax}`;
        statsBar.appendChild(stSpan);
        statsBar.appendChild(psSpan);
        el.appendChild(statsBar);
      }

      el.appendChild(img);
      el.appendChild(info);
      el.appendChild(badge);

      el.addEventListener('click', () => {
        // Close assign modal, open character detail in assign mode
        toggleModal('modal-assign');
        showCharacterDetail(charInfo.slug, { mode: 'assign', stationId });
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
      vgems: 'VGems', vringgit: 'VRinggit', liveCache: 'LiveCache',
      blueTicket: 'Blue Tickets',
      stars: 'Stars', starDust: 'Star Dust', starFragments: 'Star Fragments', bondPoints: 'Bond Points',
    };
    return names[key] || key;
  }

  function getResourceIconType(key) {
    const map = { vgems: 'vgems', vringgit: 'vringgit', blueTicket: 'ticket_blue', liveCache: 'livecache' };
    return map[key] || '';
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

  // ═══════════════════════════════════════════════
  //  MINIGAME — Super Chat Toss (Sprint 8)
  // ═══════════════════════════════════════════════

  function renderMinigame() {
    Minigame.cacheDOM();
    updateMinigameCostLabel();
    updateMinigameHighScore();
    updateMinigameLeadPreview();

    // Show start screen, hide game area and results
    if (!Minigame.getIsRunning()) {
      document.getElementById('sc-start-screen').style.display = 'block';
      document.getElementById('sc-game-area').style.display = 'none';
      document.getElementById('sc-results-screen').style.display = 'none';
    }
  }

  function updateMinigameCostLabel() {
    const label = document.getElementById('sc-cost-label');
    if (label) label.textContent = Minigame.getPlayCostLabel();
    // Dynamic round duration based on lead's ST
    const durationEl = document.getElementById('sc-round-duration');
    if (durationEl && _scLeadSlug) {
      durationEl.textContent = Minigame.getPreviewDuration(_scLeadSlug);
    } else if (durationEl) {
      durationEl.textContent = '30';
    }
  }

  function updateMinigameHighScore() {
    const state = Game.getState();
    const hs = state.minigame && state.minigame.highScore ? state.minigame.highScore : 0;
    const display = document.getElementById('sc-high-score-display');
    const val = document.getElementById('sc-high-score-val');
    if (display && val) {
      if (hs > 0) {
        display.style.display = 'block';
        val.textContent = formatNum(hs);
      } else {
        display.style.display = 'none';
      }
    }
  }

  function updateMinigameLeadPreview() {
    const img = document.getElementById('sc-lead-preview-img');
    const name = document.getElementById('sc-lead-preview-name');
    if (!img || !name) return;

    if (_scLeadSlug) {
      const charInfo = DataLoader.getBySlug(_scLeadSlug);
      if (charInfo) {
        img.src = DataLoader.getImageUrl(charInfo.slug);
        img.style.display = 'block';
        img.alt = charInfo.name;
        img.onerror = () => { img.src = charInfo.image || img.src; img.onerror = () => { img.style.display = 'none'; }; };
        name.textContent = charInfo.name;
        updateStatPreview();
        return;
      }
    }
    img.style.display = 'none';
    name.textContent = 'Pick a Streamer';
    updateStatPreview(); // clear preview when no lead selected
  }

  function updateStatPreview() {
    const container = document.getElementById('sc-stat-preview');
    const durationEl = document.getElementById('sc-round-duration');
    if (!container) return;

    if (!_scLeadSlug) {
      container.style.display = 'none';
      if (durationEl) durationEl.textContent = '30';
      return;
    }

    const preview = Minigame.getStatPreview(_scLeadSlug);
    if (!preview) {
      container.style.display = 'none';
      if (durationEl) durationEl.textContent = '30';
      return;
    }

    // Update round duration display
    if (durationEl) durationEl.textContent = preview.effects.st.display.replace('s', '');

    // Build the stat preview grid: 3 columns x 2 rows
    const statKeys = ['tc', 'ch', 'vc', 'mg', 'st', 'ps'];
    const statLabels = { tc: 'TC', ch: 'CH', vc: 'VC', mg: 'MG', st: 'ST', ps: 'PS' };

    let html = '';
    for (const key of statKeys) {
      const effect = preview.effects[key];
      const statVal = preview.stats[key];
      html += `<div class="sc-sp-item">`;
      html += `<div class="sc-sp-stat"><span class="sc-sp-stat-name">${statLabels[key]}</span><span class="sc-sp-stat-val">${statVal}</span></div>`;
      html += `<div class="sc-sp-arrow">&rarr;</div>`;
      html += `<div class="sc-sp-effect" style="color:${effect.color};">${effect.label}</div>`;
      html += `<div class="sc-sp-value" style="color:${effect.color};">${effect.display}</div>`;
      html += `</div>`;
    }

    container.innerHTML = html;
    container.style.display = 'grid';
  }

  function openMinigameLeadPicker() {
    const owned = Characters.getOwnedCharacters();
    if (owned.length === 0) {
      showToast('No characters owned! Pull some first.', 'warning');
      return;
    }
    document.getElementById('sc-lead-search').value = '';
    populateMinigameLeadGrid();
    toggleModal('modal-sc-lead');
  }

  function closeMinigameLeadPicker() {
    toggleModal('modal-sc-lead');
  }

  function populateMinigameLeadGrid() {
    const grid = document.getElementById('sc-lead-grid');
    const search = document.getElementById('sc-lead-search').value.toLowerCase().trim();
    const owned = Characters.getOwnedCharacters();
    const state = Game.getState();

    const filtered = search
      ? owned.filter(c => c.name.toLowerCase().includes(search))
      : owned;

    // Sort by active sort (default: rarity desc), level as tiebreaker
    _sortCharList(filtered, _scLeadSort, state);

    grid.innerHTML = '';
    if (filtered.length === 0) {
      grid.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:var(--space-lg);grid-column:1/-1;">No characters found</div>';
      return;
    }

    filtered.forEach(charInfo => {
      const charState = state.characters[charInfo.slug];
      const rarity = charInfo.rarity || 'R';

      const el = document.createElement('div');
      el.className = 'assign-char';

      const img = document.createElement('img');
      img.src = DataLoader.getImageUrl(charInfo.slug);
      img.alt = charInfo.name;
      img.onerror = () => { img.src = charInfo.image || img.src; img.onerror = () => { img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" fill="%231c1b18"><rect width="120" height="160"/><text x="60" y="85" text-anchor="middle" fill="%23908e87" font-size="12">No Img</text></svg>'; }; };

      const info = document.createElement('div');
      info.className = 'assign-char-info';
      info.textContent = `${charInfo.name} Lv${charState.level}`;

      const badge = document.createElement('div');
      badge.className = `assign-char-badge badge-${rarity.toLowerCase()}`;
      badge.textContent = rarity;

      el.appendChild(img);
      el.appendChild(info);
      el.appendChild(badge);

      el.addEventListener('click', () => {
        _scLeadSlug = charInfo.slug;
        Minigame.setLead(charInfo.slug);
        updateMinigameLeadPreview();
        updateMinigameCostLabel();
        updateMinigameStaminaBar();
        closeMinigameLeadPicker();
        showToast(`Lead: ${charInfo.name} (${rarity})`, 'success');
      });

      grid.appendChild(el);
    });
  }

  function startMinigameRound() {
    if (!Minigame.canPlay()) {
      const stamInfo = Minigame.getLeadStaminaInfo();
      showToast(`Not enough ST! Need ${Minigame.STAMINA_COST}, have ${stamInfo ? stamInfo.current : '?'}`, 'error');
      return;
    }

    const lead = _scLeadSlug;
    if (!lead) {
      showToast('Pick a streamer character first!', 'warning');
      return;
    }

    // Show game area, hide start screen
    document.getElementById('sc-start-screen').style.display = 'none';
    document.getElementById('sc-game-area').style.display = 'block';
    document.getElementById('sc-results-screen').style.display = 'none';

    // Clear game area
    const area = document.getElementById('sc-game-area');
    area.querySelectorAll('.sc-bubble, .sc-float, .sc-super-splash').forEach(el => el.remove());

    Minigame.startRound(lead);
  }

  // ═══════════════════════════════════════════════
  //  NEW LAYOUT HELPERS — Top Bar, Featured, Landing
  // ═══════════════════════════════════════════════

  function renderTopBarResources() {
    const container = document.getElementById('top-bar-resources');
    if (!container) return;
    const state = Game.getState();
    const c = state.currencies || {};
    const mt = c.myTicket || {};
    const items = [
      { icon: CurrencyIcons.vgems(12), val: formatNum(Math.floor(c.vgems || 0)) },
      { icon: CurrencyIcons.ticket_blue(12), val: formatNum(mt.blue || 0) },
      { icon: CurrencyIcons.ticket_red(12), val: formatNum(mt.red || 0) },
      { icon: CurrencyIcons.livecache(12), val: formatNum(Math.floor(c.liveCache || 0)) },
      { icon: CurrencyIcons.vringgit(12), val: formatNum(Math.floor(c.vringgit || 0)) },
    ];
    container.innerHTML = items.map(i =>
      `<div class="resource-pill">${i.icon}<span>${i.val}</span></div>`
    ).join('');
  }

  function updateProducerLevel() {
    const info = Game.getProducerInfo();
    const nameEl = document.getElementById('producer-name');
    const lvEl = document.getElementById('producer-level');
    const fillEl = document.getElementById('producer-exp-fill');
    const username = Game.getUsername();

    if (nameEl) nameEl.textContent = username || 'Producer';
    if (lvEl) lvEl.textContent = info.level;
    if (fillEl) fillEl.style.width = (info.expCap > 0 ? (info.exp / info.expCap) * 100 : 0) + '%';

    // Settings producer level
    const splEl = document.getElementById('settings-producer-level');
    if (splEl) splEl.textContent = info.level;
    const speEl = document.getElementById('settings-producer-exp');
    if (speEl) speEl.textContent = `${info.exp} / ${info.expCap}`;
  }

  function renderFeaturedVtuber() {
    const slug = Game.getFeaturedVtuber();
    const placeholder = document.getElementById('featured-placeholder');
    const img = document.getElementById('featured-img');
    const info = document.getElementById('featured-info');
    const nameEl = document.getElementById('featured-name');
    const agencyEl = document.getElementById('featured-agency');
    const rarityEl = document.getElementById('featured-rarity');

    if (!slug || !DataLoader) {
      if (placeholder) placeholder.style.display = 'flex';
      if (img) img.style.display = 'none';
      if (info) info.style.display = 'none';
      return;
    }

    const char = DataLoader.getBySlug(slug);
    if (!char) {
      if (placeholder) placeholder.style.display = 'flex';
      if (img) img.style.display = 'none';
      if (info) info.style.display = 'none';
      return;
    }

    const state = Game.getState();
    const charData = state.characters[slug];
    const rarity = charData && charData.owned ? charData.rarity : 'R';

    if (img) {
      img.src = DataLoader.getImageUrl(slug);
      img.alt = char.name;
      img.style.display = 'block';
    }
    if (placeholder) placeholder.style.display = 'none';
    if (info) info.style.display = 'flex';
    if (nameEl) nameEl.textContent = char.name;
    if (agencyEl) agencyEl.textContent = char.agency || '';
    if (rarityEl) rarityEl.textContent = rarity;

    // Also update banner name on landing page
    const bannerName = document.getElementById('landing-banner-name');
    if (bannerName && _featuredDisplay.length > 0) {
      const mainChar = DataLoader.getBySlug(_featuredDisplay[0]);
      if (mainChar) bannerName.textContent = mainChar.name + ' Rate-Up';
    }
  }

  function populateFeaturedGrid() {
    const container = document.getElementById('featured-grid');
    if (!container) return;
    const searchEl = document.getElementById('featured-search');
    const search = searchEl ? searchEl.value.toLowerCase().trim() : '';
    const state = Game.getState();
    const chars = DataLoader.get();

    const owned = chars.filter(c => state.characters[c.slug] && state.characters[c.slug].owned);
    const filtered = search ? owned.filter(c => c.name.toLowerCase().includes(search)) : owned;

    // Sort by active sort (default: rarity desc), level as tiebreaker
    _sortCharList(filtered, _featuredSort, state);

    container.innerHTML = '';
    if (filtered.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:20px;">No owned characters found.</div>';
      return;
    }

    const currentFeatured = Game.getFeaturedVtuber();

    filtered.forEach(c => {
      const data = state.characters[c.slug];
      const rarity = data && data.rarity ? data.rarity : 'R';
      const isSelected = c.slug === currentFeatured;

      const item = document.createElement('div');
      item.className = 'assign-char' + (isSelected ? ' selected' : '');
      item.style.borderColor = isSelected ? 'var(--accent)' : '';

      const imgEl = document.createElement('img');
      imgEl.src = DataLoader.getImageUrl(c.slug);
      imgEl.alt = c.name;
      imgEl.onerror = function() { this.style.display = 'none'; };

      const badge = document.createElement('div');
      badge.className = 'assign-char-badge';
      badge.style.background = rarity === 'UR' ? 'linear-gradient(135deg,#e040fb,#ffd700)' :
        rarity === 'SSR' ? '#e8c547' :
        rarity === 'SR' ? '#b0b8c8' : 'rgba(136,136,128,0.7)';
      badge.textContent = rarity;

      const nameInfo = document.createElement('div');
      nameInfo.className = 'assign-char-info';
      nameInfo.textContent = c.name;

      item.appendChild(imgEl);
      item.appendChild(badge);
      item.appendChild(nameInfo);

      item.addEventListener('click', () => {
        Game.setFeaturedVtuber(c.slug);
        renderFeaturedVtuber();
        toggleModal('modal-featured-select');
        showToast(`Featured VTuber set to ${c.name}!`, 'success');
      });

      container.appendChild(item);
    });
  }

  return {
    init, switchTab, updateUI,
    showToast, levelUpChar, ascendChar, convertShards, assignCharFromDetail,
    toggleOshi,
  };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
});
