/* ═══════════════════════════════════════════════
   minigame.js — Super Chat Toss Game Engine (Overhauled)
   Phase 5: Stat-to-mechanic wiring (GDD §8.1), overhaul currencies
   Phase 6: Weekly challenges
   ═══════════════════════════════════════════════ */

const Minigame = (() => {
  // ── Constants ──
  const BASE_ROUND_DURATION = 30;
  const STAMINA_COST = 15;
  const SUPER_MODE_DURATION = 5;
  const BOOST_DECAY_RATE = 1;
  const BUBBLE_BASE_SPEED = 120; // px/s
  const GEM_REWARD_THRESHOLDS = [250, 500, 1000];

  // Overhaul currency ratios
  const LIVECACHE_RATIO = 0.1;  // 1 LiveCache per 10 score
  const VRINGGIT_RATIO = 0.15;  // 0.15 VRinggit per score

  const BUBBLE_DEFS = {
    coin:    { baseValue: 10, weight: 65, boostFill: 8,  css: 'sc-coin',    label: '$10' },
    premium: { baseValue: 25, weight: 15, boostFill: 20, css: 'sc-premium', label: '$25' },
    gem:     { baseValue: 50, weight: 2,  boostFill: 0,  css: 'sc-gem',     label: 'GEM', givesGem: true },
    landmine:{ baseValue: 0,  weight: 0,  boostFill: 0,  css: 'sc-landmine', label: '!',   isLandmine: true, penaltyPct: 15 },
    gift:    { baseValue: 0,  weight: 3,  boostFill: 50, css: 'sc-gift',    label: '+3s', timeBonus: 3 },
  };

  // Difficulty: [startSec, endSec, spawnIntervalMs, landmineWeight]
  const DIFFICULTY = [
    { start: 0,  end: 8,  interval: 1200, lmW: 14 },
    { start: 8,  end: 16, interval: 900,  lmW: 20 },
    { start: 16, end: 24, interval: 600,  lmW: 26 },
    { start: 24, end: 99, interval: 400,  lmW: 32 },
  ];

  // Stat labels
  const STAT_LABELS = { tc: 'Tech', ch: 'Charisma', vc: 'Voice', mg: 'Music', ps: 'Passion', st: 'Stamina' };

  // ── Weekly Challenges (Phase 6) ──
  const CHALLENGE_TEMPLATES = [
    { id: 'double_landmines', name: 'Double Landmines',  desc: '2x landmine frequency',           mods: { lmWeightMult: 2.0,       rewardMult: 1.5 } },
    { id: 'speed_rush',       name: 'Speed Rush',        desc: '1.5x bubble speed',              mods: { speedMult: 1.5,          rewardMult: 1.3 } },
    { id: 'marathon',         name: 'Marathon',           desc: '2x round duration (60s)',         mods: { durationMult: 2,         rewardMult: 1.8 } },
    { id: 'tiny_targets',     name: 'Tiny Targets',       desc: '0.7x bubble size',               mods: { sizeMult: 0.7,           rewardMult: 1.4 } },
    { id: 'precision',        name: 'Precision',          desc: '0.5x landmine penalty, no Super', mods: { penaltyReduction: 0.5, noSuperMode: true, rewardMult: 1.2 } },
  ];

  const CHALLENGE_STORAGE_KEY = 'myvt_sc_challenge';
  const CHALLENGE_SCORE_THRESHOLD = 300;

  // ── Game State ──
  let isRunning = false;
  let score = 0;
  let gemsEarned = 0;
  let timeLeft = BASE_ROUND_DURATION;
  let sessionDuration = BASE_ROUND_DURATION;
  let bonusTime = 0;
  let boostMeter = 0;
  let isSuperMode = false;
  let superModeTimer = 0;
  let leadSlug = null;
  let bubbles = [];
  let lastSpawnTime = 0;
  let animFrameId = null;
  let lastFrameTime = 0;
  let totalClicked = 0;
  let totalMissed = 0;
  let comboCount = 0;
  let bestCombo = 0;

  // Lead character stat bonuses (computed at round start)
  let leadStats = null;    // { tc, ch, vc, mg, ps, st } effective stats (base + bond)
  let leadVariant = null;  // 'normal', 'sr', 'ssr'

  // Active challenge
  let activeChallenge = null;

  // Game area click handler flag (prevent double-registration)
  let _handlersRegistered = false;

  // DOM cache
  let $gameArea, $hudTimer, $hudScore, $hudBoost, $boostBar, $boostBarFill;
  let $streamerAvatar, $streamerName, $startScreen, $resultsScreen;
  let $superOverlay;

  // ── Initialize DOM refs ──
  function cacheDOM() {
    $gameArea = document.getElementById('sc-game-area');
    $hudTimer = document.getElementById('sc-timer');
    $hudScore = document.getElementById('sc-score');
    $hudBoost = document.getElementById('sc-boost-text');
    $boostBar = document.getElementById('sc-boost-bar');
    $boostBarFill = document.getElementById('sc-boost-fill');
    $streamerAvatar = document.getElementById('sc-streamer-avatar');
    $streamerName = document.getElementById('sc-streamer-name');
    $startScreen = document.getElementById('sc-start-screen');
    $resultsScreen = document.getElementById('sc-results-screen');
    $superOverlay = document.getElementById('sc-super-overlay');

    // Register game-area level click/touch handlers (for TC hit accuracy)
    if (!_handlersRegistered && $gameArea) {
      $gameArea.addEventListener('click', onGameAreaClick);
      $gameArea.addEventListener('touchstart', onGameAreaTouchStart, { passive: false });
      _handlersRegistered = true;
    }
  }

  // ═══════════════════════════════════════════════
  //  Per-VTuber Stamina
  // ═══════════════════════════════════════════════
  function canPlay() {
    if (isRunning) return false;
    if (!leadSlug) return false;
    const stamInfo = Game.getVTuberStaminaInfo(leadSlug);
    if (!stamInfo) return false;
    return stamInfo.current >= STAMINA_COST;
  }

  function getPlayCostLabel() {
    if (!leadSlug) return 'Pick a Streamer';
    const stamInfo = Game.getVTuberStaminaInfo(leadSlug);
    if (!stamInfo) return '? / ? ST';
    return `${stamInfo.current} / ${stamInfo.max} ST`;
  }

  function getLeadStaminaInfo() {
    if (!leadSlug) return null;
    return Game.getVTuberStaminaInfo(leadSlug);
  }

  /** Set lead character without starting round (for preview & stamina display) */
  function setLead(slug) {
    leadSlug = slug;
    computeLeadStats();
  }

  // ═══════════════════════════════════════════════
  //  Stat-to-Mechanic Wiring (GDD §8.1)
  //
  //  TC (Tech)      → Click Accuracy   — hit radius around each bubble
  //  CH (Charisma)  → Landmine Warning — dormant phase before activation
  //  VC (Vocal)     → Boost Fill Rate  — multiplier on boost meter fill
  //  MG (Management)→ Screen Org.      — minimum spacing between bubbles
  //  ST (Stamina)   → Session Duration — round timer = 30 + ST/20 seconds
  //  PS (Passion)   → Score Multiplier — 1 + PS/200 applied to all catches
  // ═══════════════════════════════════════════════

  /** Compute lead character's effective stats (base + bond bonus) at round start */
  function computeLeadStats() {
    if (!leadSlug) { leadStats = null; leadVariant = null; return; }
    const state = Game.getState();
    const charData = state.characters[leadSlug];
    if (!charData) { leadStats = null; leadVariant = null; return; }

    leadVariant = Game.getBestVariant(charData.variants);
    const bondBonus = Game.getBondStatBonus(leadSlug);

    leadStats = {
      tc: (charData.stats.tc || 0) + (bondBonus.tc || 0),
      ch: (charData.stats.ch || 0) + (bondBonus.ch || 0),
      vc: (charData.stats.vc || 0) + (bondBonus.vc || 0),
      mg: (charData.stats.mg || 0) + (bondBonus.mg || 0),
      ps: (charData.stats.ps || 0) + (bondBonus.ps || 0),
      st: (charData.stats.st || 0) + (bondBonus.st || 0),
    };
  }

  // ── TC: Click Accuracy ──
  // hitRadius = bubble.size/2 * (0.5 + TC/200)
  // TC=0: 50% of radius (very precise), TC=100: full radius, TC=200: 150% (generous)
  function getHitRadius(bubble) {
    const halfSize = bubble.size / 2;
    if (!leadStats) return halfSize; // no character = full radius
    const tc = leadStats.tc || 0;
    return Math.max(8, halfSize * (0.5 + tc / 200)); // min 8px hit zone
  }

  // ── CH: Landmine Warning ──
  // warningTime = 0.3 + CH/100 seconds (0.3s min, ~1.3s at CH=100, ~2.3s at CH=200)
  function getLandmineWarningTime() {
    if (!leadStats) return 300; // default 0.3s
    const ch = leadStats.ch || 0;
    return Math.max(300, (0.3 + ch / 100) * 1000); // ms, min 300ms
  }

  // ── VC: Boost Fill Rate ──
  // actualFill = boostFill * (1 + VC/150)
  // VC=0: normal fill, VC=75: 1.5x fill, VC=150: 2x fill
  function getVcBoostMultiplier() {
    if (!leadStats) return 1;
    return 1 + (leadStats.vc || 0) / 150;
  }

  // ── MG: Screen Organization ──
  // minSpacing = bubble.size * (1.5 - MG/200)
  // MG=0: 1.5x size spacing, MG=100: 1.0x, MG=200: 0.5x (tight clusters ok)
  function getMinSpacing(bubbleSize) {
    if (!leadStats) return bubbleSize * 1.5;
    const mg = leadStats.mg || 0;
    return bubbleSize * Math.max(0.3, 1.5 - mg / 200);
  }

  // ── ST: Session Duration ──
  // duration = 30 + ST/20 seconds (30s at ST=0, 40s at ST=200)
  function getSessionDuration() {
    if (!leadStats) return BASE_ROUND_DURATION;
    const st = leadStats.st || 0;
    return BASE_ROUND_DURATION + Math.floor(st / 20);
  }

  // ── PS: Score Multiplier ──
  // scoreMult = 1 + PS/200 (1.0x at PS=0, ~1.5x at PS=100, 2.0x at PS=200)
  function getScoreMultiplier() {
    if (!leadStats) return 1;
    return 1 + (leadStats.ps || 0) / 200;
  }

  /** Preview session duration for a character (used in start screen UI) */
  function getPreviewDuration(slug) {
    if (!slug) return BASE_ROUND_DURATION;
    const state = Game.getState();
    const charData = state.characters[slug];
    if (!charData) return BASE_ROUND_DURATION;
    const bondBonus = Game.getBondStatBonus(slug);
    const st = (charData.stats.st || 0) + (bondBonus.st || 0);
    return BASE_ROUND_DURATION + Math.floor(st / 20);
  }

  // ── Bubble Selection ──
  function pickBubbleType(elapsed) {
    const phase = DIFFICULTY.find(p => elapsed >= p.start && elapsed < p.end) || DIFFICULTY[DIFFICULTY.length - 1];

    // Build weighted pool
    const pool = [];
    for (const [key, def] of Object.entries(BUBBLE_DEFS)) {
      let w = def.weight;
      if (key === 'landmine') {
        w = phase.lmW;
        // Apply challenge mod
        if (activeChallenge && activeChallenge.mods.lmWeightMult) {
          w = Math.round(w * activeChallenge.mods.lmWeightMult);
        }
      }
      if (w > 0) pool.push({ type: key, weight: w });
    }

    const total = pool.reduce((s, p) => s + p.weight, 0);
    let roll = Math.random() * total;
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) return entry.type;
    }
    return 'coin';
  }

  // ── Spawning ──
  function spawnBubble() {
    const elapsed = sessionDuration - timeLeft;
    const type = pickBubbleType(elapsed);
    const def = BUBBLE_DEFS[type];
    const areaW = $gameArea.clientWidth;
    const areaH = $gameArea.clientHeight;

    // Base size
    let size = type === 'premium' ? 64 : type === 'gift' ? 60 : type === 'gem' ? 56 : type === 'landmine' ? 52 : 50;
    // Challenge: tiny targets
    if (activeChallenge && activeChallenge.mods.sizeMult) {
      size = Math.round(size * activeChallenge.mods.sizeMult);
      size = Math.max(20, size);
    }

    // MG: Screen organization — adjust position to reduce overlap
    let x = Math.random() * (areaW - size - 16) + 8;
    const minSpacing = getMinSpacing(size);
    if (minSpacing > 0) {
      for (let attempt = 0; attempt < 5; attempt++) {
        let tooClose = false;
        for (const b of bubbles) {
          const bCenterX = b.x + b.size / 2;
          const newCenterX = x + size / 2;
          if (Math.abs(newCenterX - bCenterX) < minSpacing) {
            tooClose = true;
            break;
          }
        }
        if (!tooClose) break;
        x = Math.random() * (areaW - size - 16) + 8;
      }
    }

    // Speed: base ramp + challenge mods + super mode
    const speedMult = 1 + (elapsed / sessionDuration) * 0.8;
    let speed = BUBBLE_BASE_SPEED * speedMult;
    if (activeChallenge && activeChallenge.mods.speedMult) {
      speed *= activeChallenge.mods.speedMult;
    }
    if (isSuperMode) speed *= 0.6;

    const bubble = {
      id: Date.now() + Math.random(),
      type,
      x,
      y: -size,
      size,
      speed,
      def,
      el: null,
      isDormant: false, // CH: landmine warning flag
    };

    // Create DOM element
    const el = document.createElement('div');
    el.className = `sc-bubble sc-bubble-${type}`;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.left = x + 'px';
    el.style.top = '-60px';
    el.dataset.bubbleId = bubble.id;

    const label = document.createElement('span');
    label.className = 'sc-bubble-label';
    label.textContent = def.label;
    el.appendChild(label);

    // CH: Landmine warning system — dormant phase before activation
    if (def.isLandmine) {
      const warningTimeMs = getLandmineWarningTime();
      bubble.isDormant = true;
      el.classList.add('sc-bubble-dormant');
      if (label) label.textContent = '?'; // show "?" during warning

      setTimeout(() => {
        if (bubbles.includes(bubble)) {
          bubble.isDormant = false;
          el.classList.remove('sc-bubble-dormant');
          if (label) label.textContent = def.label; // reveal "!"
        }
      }, warningTimeMs);
    }

    // NO individual click/touch handlers — game area handles all clicks (TC accuracy)

    $gameArea.appendChild(el);
    bubble.el = el;
    bubbles.push(bubble);
  }

  // ═══════════════════════════════════════════════
  //  Click Handling — Game Area Level (TC Hit Accuracy)
  // ═══════════════════════════════════════════════

  function onGameAreaClick(e) {
    if (!isRunning) return;
    const rect = $gameArea.getBoundingClientRect();
    handleGameClick(e.clientX - rect.left, e.clientY - rect.top);
  }

  function onGameAreaTouchStart(e) {
    if (!isRunning) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = $gameArea.getBoundingClientRect();
    handleGameClick(touch.clientX - rect.left, touch.clientY - rect.top);
  }

  function handleGameClick(clickX, clickY) {
    // Find the closest bubble within TC-based hit radius
    let closestBubble = null;
    let closestDist = Infinity;

    for (const bubble of bubbles) {
      // Skip dormant landmines (CH warning phase)
      if (bubble.isDormant) continue;

      const cx = bubble.x + bubble.size / 2;
      const cy = bubble.y + bubble.size / 2;
      const dist = Math.hypot(clickX - cx, clickY - cy);
      const hitRadius = getHitRadius(bubble);

      if (dist <= hitRadius && dist < closestDist) {
        closestDist = dist;
        closestBubble = bubble;
      }
    }

    if (closestBubble) {
      handleBubbleClick(closestBubble);
    }
    // Miss click: no feedback — TC naturally penalizes low-accuracy chars
  }

  function handleBubbleClick(bubble) {
    if (!isRunning) return;
    const idx = bubbles.indexOf(bubble);
    if (idx === -1) return;
    bubbles.splice(idx, 1);

    totalClicked++;
    const def = bubble.def;
    const psMult = getScoreMultiplier();

    if (def.isLandmine) {
      // Penalty
      comboCount = 0;
      let penaltyPct = def.penaltyPct;
      if (activeChallenge && activeChallenge.mods.penaltyReduction) {
        penaltyPct *= activeChallenge.mods.penaltyReduction;
      }
      const penalty = Math.max(10, Math.floor(score * (penaltyPct / 100)));
      score = Math.max(0, score - penalty);
      showFloatingText(bubble.x + bubble.size / 2, bubble.y, `-${penalty}`, 'sc-float-bad');
      bubble.el.classList.add('sc-bubble-pop-bad');
      // Screen shake
      $gameArea.classList.add('sc-shake');
      setTimeout(() => $gameArea.classList.remove('sc-shake'), 300);
    } else if (def.givesGem) {
      // Gem chat
      comboCount++;
      if (comboCount > bestCombo) bestCombo = comboCount;
      gemsEarned++;
      const value = Math.floor(def.baseValue * psMult);
      score += value;
      if (isSuperMode) {
        score += value; // double in super mode
        showFloatingText(bubble.x + bubble.size / 2, bubble.y, `GEM! +${value * 2}`, 'sc-float-gem');
      } else {
        showFloatingText(bubble.x + bubble.size / 2, bubble.y, `GEM! +${value}`, 'sc-float-gem');
      }
      bubble.el.classList.add('sc-bubble-pop-good');
    } else if (def.timeBonus) {
      // Gift sub (+time)
      comboCount++;
      if (comboCount > bestCombo) bestCombo = comboCount;
      bonusTime += def.timeBonus;
      showFloatingText(bubble.x + bubble.size / 2, bubble.y, `+${def.timeBonus}s!`, 'sc-float-gift');
      bubble.el.classList.add('sc-bubble-pop-good');
    } else {
      // Normal coin/premium
      comboCount++;
      if (comboCount > bestCombo) bestCombo = comboCount;
      const value = Math.floor(def.baseValue * psMult);
      const finalValue = isSuperMode ? value * 2 : value;
      score += finalValue;
      showFloatingText(bubble.x + bubble.size / 2, bubble.y, `+${finalValue}`, 'sc-float-good');
      bubble.el.classList.add('sc-bubble-pop-good');

      // VC: Boost meter fill (multiplied by VC stat)
      if (!isSuperMode) {
        const vcMult = getVcBoostMultiplier();
        boostMeter = Math.min(100, boostMeter + def.boostFill * vcMult);
        if (boostMeter >= 100) activateSuperMode();
      }
    }

    // Animate pop then remove
    setTimeout(() => {
      if (bubble.el && bubble.el.parentNode) bubble.el.parentNode.removeChild(bubble.el);
    }, 250);

    updateHUD();
  }

  // ── Floating Score Text ──
  function showFloatingText(x, y, text, cls) {
    const el = document.createElement('div');
    el.className = `sc-float ${cls}`;
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    $gameArea.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 800);
  }

  // ── Super Chat Mode ──
  function activateSuperMode() {
    if (isSuperMode) return;
    if (activeChallenge && activeChallenge.mods.noSuperMode) return;

    isSuperMode = true;
    superModeTimer = SUPER_MODE_DURATION;
    boostMeter = 100;

    $gameArea.classList.add('sc-super-mode');
    $superOverlay.style.display = 'flex';

    const splash = document.createElement('div');
    splash.className = 'sc-super-splash';
    splash.textContent = 'SUPER CHAT!';
    $gameArea.appendChild(splash);
    setTimeout(() => { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 1200);

    setTimeout(() => {
      isSuperMode = false;
      superModeTimer = 0;
      boostMeter = 0;
      $gameArea.classList.remove('sc-super-mode');
      $superOverlay.style.display = 'none';
      updateBoostBar();
    }, SUPER_MODE_DURATION * 1000);
  }

  // ── HUD Update ──
  function updateHUD() {
    const displayTime = Math.max(0, Math.ceil(timeLeft + bonusTime));
    const mins = Math.floor(displayTime / 60);
    const secs = displayTime % 60;
    $hudTimer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    $hudScore.textContent = Math.floor(score);
    $hudBoost.textContent = isSuperMode ? 'SUPER!' : `${Math.floor(boostMeter)}%`;
    updateBoostBar();
  }

  function updateBoostBar() {
    if ($boostBarFill) {
      $boostBarFill.style.width = Math.floor(boostMeter) + '%';
      $boostBar.classList.toggle('sc-boost-full', boostMeter >= 100);
    }
  }

  // ═══════════════════════════════════════════════
  //  Weekly Challenges (Phase 6)
  // ═══════════════════════════════════════════════

  function getWeekKey() {
    const now = new Date();
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now - oneJan) / 86400000) + 1;
    const weekNum = Math.ceil((dayOfYear + oneJan.getDay()) / 7);
    return `${now.getFullYear()}-W${weekNum}`;
  }

  function loadChallenge() {
    const weekKey = getWeekKey();
    const stored = localStorage.getItem(CHALLENGE_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.weekKey === weekKey) {
          const template = CHALLENGE_TEMPLATES.find(t => t.id === parsed.templateId);
          if (template) {
            activeChallenge = { template, mods: template.mods, weekKey, completed: parsed.completed || false };
            return;
          }
        }
      } catch (e) { /* ignore */ }
    }
    const weekIndex = (() => {
      const now = new Date();
      const oneJan = new Date(now.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((now - oneJan) / 86400000) + 1;
      const weekNum = Math.ceil((dayOfYear + oneJan.getDay()) / 7);
      return weekNum % CHALLENGE_TEMPLATES.length;
    })();
    const template = CHALLENGE_TEMPLATES[weekIndex];
    activeChallenge = { template, mods: template.mods, weekKey, completed: false };
    saveChallenge();
  }

  function saveChallenge() {
    if (!activeChallenge) return;
    localStorage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify({
      weekKey: activeChallenge.weekKey,
      templateId: activeChallenge.template.id,
      completed: activeChallenge.completed || false,
    }));
  }

  function completeChallenge() {
    if (!activeChallenge || activeChallenge.completed) return false;
    activeChallenge.completed = true;
    saveChallenge();
    return true;
  }

  function getChallengeInfo() {
    if (!activeChallenge) return null;
    return {
      name: activeChallenge.template.name,
      desc: activeChallenge.template.desc,
      completed: activeChallenge.completed,
      weekKey: activeChallenge.weekKey,
    };
  }

  // ═══════════════════════════════════════════════
  //  Game Loop
  // ═══════════════════════════════════════════════
  function gameLoop(timestamp) {
    if (!isRunning) return;

    if (!lastFrameTime) lastFrameTime = timestamp;
    const dt = Math.min((timestamp - lastFrameTime) / 1000, 0.1);
    lastFrameTime = timestamp;

    // Timer
    timeLeft -= dt;
    if (bonusTime > 0) {
      bonusTime -= dt;
      if (bonusTime < 0) {
        timeLeft += bonusTime;
        bonusTime = 0;
      }
    }

    if (timeLeft <= 0) {
      timeLeft = 0;
      endRound();
      return;
    }

    // Super mode timer
    if (isSuperMode) {
      superModeTimer -= dt;
    }

    // Boost decay
    if (!isSuperMode && boostMeter > 0) {
      boostMeter = Math.max(0, boostMeter - BOOST_DECAY_RATE * dt);
    }

    // Spawn check
    const elapsed = sessionDuration - timeLeft;
    const phase = DIFFICULTY.find(p => elapsed >= p.start && elapsed < p.end) || DIFFICULTY[DIFFICULTY.length - 1];
    const timeSinceLastSpawn = timestamp - lastSpawnTime;
    if (timeSinceLastSpawn >= phase.interval) {
      spawnBubble();
      lastSpawnTime = timestamp;
    }

    // Update bubble positions
    const areaH = $gameArea.clientHeight;
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.y += b.speed * dt;
      b.el.style.top = b.y + 'px';

      if (b.y > areaH + 20) {
        if (b.el.parentNode) b.el.parentNode.removeChild(b.el);
        bubbles.splice(i, 1);
        if (!b.def.isLandmine && !b.def.timeBonus) {
          totalMissed++;
        }
      }
    }

    updateHUD();
    animFrameId = requestAnimationFrame(gameLoop);
  }

  // ═══════════════════════════════════════════════
  //  Start Round
  // ═══════════════════════════════════════════════
  function startRound(slug) {
    if (isRunning) return;
    leadSlug = slug;

    if (!canPlay()) {
      const stamInfo = getLeadStaminaInfo();
      UI.showToast(`Not enough ST! Need ${STAMINA_COST}, have ${stamInfo ? stamInfo.current : 0}`, 'error');
      return;
    }

    // Deduct per-VTuber stamina
    if (!Game.useVTuberStamina(slug, STAMINA_COST)) {
      UI.showToast('Not enough Stamina!', 'error');
      return;
    }

    // Compute lead stats (base + bond)
    computeLeadStats();

    // Load weekly challenge
    loadChallenge();

    // ST: Session Duration — 30 + ST/20 seconds
    sessionDuration = getSessionDuration();
    // Challenge: marathon overrides
    if (activeChallenge && activeChallenge.mods.durationMult) {
      sessionDuration = Math.round(sessionDuration * activeChallenge.mods.durationMult);
    }

    // Init state
    score = 0;
    gemsEarned = 0;
    timeLeft = sessionDuration;
    bonusTime = 0;
    boostMeter = 0;
    isSuperMode = false;
    superModeTimer = 0;
    bubbles = [];
    lastSpawnTime = 0;
    lastFrameTime = 0;
    totalClicked = 0;
    totalMissed = 0;
    comboCount = 0;
    bestCombo = 0;

    // Set lead character display
    const charInfo = DataLoader.getBySlug(slug);
    if (charInfo && $streamerAvatar) {
      $streamerAvatar.src = DataLoader.getImageUrl(charInfo.slug);
      $streamerAvatar.style.display = 'block';
      $streamerAvatar.onerror = () => { $streamerAvatar.src = charInfo.image || $streamerAvatar.src; $streamerAvatar.onerror = () => { $streamerAvatar.style.display = 'none'; }; };
      $streamerName.textContent = charInfo.name;
    }

    // Clear old bubbles
    if ($gameArea) {
      $gameArea.querySelectorAll('.sc-bubble, .sc-float, .sc-super-splash').forEach(el => el.remove());
    }

    // UI state
    $startScreen.style.display = 'none';
    $resultsScreen.style.display = 'none';
    $superOverlay.style.display = 'none';
    $gameArea.classList.remove('sc-super-mode');

    isRunning = true;
    updateHUD();
    animFrameId = requestAnimationFrame(gameLoop);
  }

  // ═══════════════════════════════════════════════
  //  End Round
  // ═══════════════════════════════════════════════
  function endRound() {
    isRunning = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);

    // Clean up remaining bubbles
    bubbles.forEach(b => { if (b.el && b.el.parentNode) b.el.parentNode.removeChild(b.el); });
    bubbles = [];

    // Calculate VGem threshold rewards
    let gemReward = 0;
    const finalScore = Math.floor(score);
    for (const threshold of GEM_REWARD_THRESHOLDS) {
      if (finalScore >= threshold) gemReward++;
    }
    const totalGems = gemsEarned + gemReward;

    // ── Overhaul currency rewards ──
    const state = Game.getState();

    // LiveCache: score * 0.1
    const liveCacheReward = Math.floor(finalScore * LIVECACHE_RATIO);
    state.currencies.liveCache = (state.currencies.liveCache || 0) + liveCacheReward;

    // VRinggit: score * 0.15
    let vrReward = Math.floor(finalScore * VRINGGIT_RATIO);
    if (activeChallenge && activeChallenge.mods.rewardMult) {
      vrReward = Math.floor(vrReward * activeChallenge.mods.rewardMult);
    }
    state.currencies.vringgit = (state.currencies.vringgit || 0) + vrReward;

    // VGems
    state.currencies.vgems = (state.currencies.vgems || 0) + totalGems;

    // ── Challenge completion check ──
    let challengeJustCompleted = false;
    let challengeBonusReward = null;
    if (activeChallenge && !activeChallenge.completed && finalScore >= CHALLENGE_SCORE_THRESHOLD) {
      challengeJustCompleted = completeChallenge();
      if (challengeJustCompleted) {
        const bonusLC = 200;
        const bonusVR = 50;
        const bonusTicket = 1;
        state.currencies.liveCache += bonusLC;
        state.currencies.vringgit += bonusVR;
        if (!state.currencies.myTicket) state.currencies.myTicket = { blue: 0, red: 0 };
        state.currencies.myTicket.blue += bonusTicket;
        challengeBonusReward = { liveCache: bonusLC, vringgit: bonusVR, blueTicket: bonusTicket };
      }
    }

    // Update high score
    if (!state.minigame) state.minigame = { dailyPlays: 0, lastPlayDate: '', highScore: 0 };
    if (finalScore > (state.minigame.highScore || 0)) {
      state.minigame.highScore = finalScore;
    }

    // Get ST remaining after round
    const stamAfter = Game.getVTuberStaminaInfo(leadSlug);

    Game.save();

    // Build stat effects summary
    const statEffects = getStatEffects();

    // Show results
    showResults({
      liveCache: liveCacheReward,
      vringgit: vrReward,
      vgems: totalGems,
      score: finalScore,
      statEffects,
      stRemaining: stamAfter ? { current: stamAfter.current, max: stamAfter.max } : null,
      challenge: activeChallenge ? getChallengeInfo() : null,
      challengeJustCompleted,
      challengeBonusReward,
    });

    Game.notifyStateChange();
  }

  /** Build summary of each stat's effect for the results screen */
  function getStatEffects() {
    if (!leadStats) return null;
    const psMult = getScoreMultiplier();
    const hitPct = Math.round(((0.5 + (leadStats.tc || 0) / 200) / 1) * 100); // relative to base 50%
    const warningS = (0.3 + (leadStats.ch || 0) / 100).toFixed(1);
    const vcMult = getVcBoostMultiplier();
    const spacingPct = Math.round(((1.5 - (leadStats.mg || 0) / 200) / 1.5) * 100);
    return {
      tc: { label: 'TC', desc: 'Accuracy', value: `${hitPct}%`, raw: leadStats.tc },
      ch: { label: 'CH', desc: 'Warning', value: `${warningS}s`, raw: leadStats.ch },
      vc: { label: 'VC', desc: 'Boost', value: `x${vcMult.toFixed(2)}`, raw: leadStats.vc },
      mg: { label: 'MG', desc: 'Spacing', value: `${spacingPct}%`, raw: leadStats.mg },
      ps: { label: 'PS', desc: 'Score', value: `x${psMult.toFixed(2)}`, raw: leadStats.ps },
      st: { label: 'ST', desc: 'Duration', value: `${sessionDuration}s`, raw: leadStats.st },
    };
  }

  // ═══════════════════════════════════════════════
  //  Results Screen
  // ═══════════════════════════════════════════════
  function showResults(data) {
    const $resCoins = document.getElementById('sc-res-coins');
    const $resGems = document.getElementById('sc-res-gems');
    const $resBonds = document.getElementById('sc-res-bonds');
    const $resScore = document.getElementById('sc-res-score');
    const $resCombo = document.getElementById('sc-res-combo');
    const $resAccuracy = document.getElementById('sc-res-accuracy');
    const $resHighScore = document.getElementById('sc-res-highscore');
    const $resStat = document.getElementById('sc-res-stat');
    const $resStam = document.getElementById('sc-res-stamina');
    const $resChallenge = document.getElementById('sc-res-challenge');

    // Currency rewards
    if ($resCoins) $resCoins.innerHTML = CurrencyIcons.livecache(14) + '+' + data.liveCache;
    if ($resGems) $resGems.innerHTML = data.vgems > 0 ? CurrencyIcons.vgems(14) + '+' + data.vgems : '--';
    if ($resBonds) $resBonds.innerHTML = CurrencyIcons.vringgit(14) + '+' + data.vringgit;

    // Stats
    if ($resScore) $resScore.textContent = `Score: ${data.score}`;
    if ($resCombo) $resCombo.textContent = `Best Combo: ${bestCombo}`;
    const totalBubbles = totalClicked + totalMissed;
    const accuracy = totalBubbles > 0 ? Math.round((totalClicked / totalBubbles) * 100) : 0;
    if ($resAccuracy) $resAccuracy.textContent = `Accuracy: ${accuracy}%`;
    const state = Game.getState();
    if ($resHighScore) $resHighScore.textContent = `High Score: ${state.minigame?.highScore || data.score}`;

    // Stat effects summary (shows PS score multiplier as primary)
    if ($resStat) {
      if (data.statEffects) {
        const ps = data.statEffects.ps;
        $resStat.textContent = `${ps.desc}: ${ps.value} (PS ${ps.raw})`;
        $resStat.style.display = '';
      } else {
        $resStat.style.display = 'none';
      }
    }

    // ST remaining
    if ($resStam) {
      if (data.stRemaining) {
        $resStam.textContent = `ST: ${data.stRemaining.current} / ${data.stRemaining.max}`;
        $resStam.style.display = '';
      } else {
        $resStam.style.display = 'none';
      }
    }

    // Challenge info
    if ($resChallenge) {
      if (data.challenge) {
        let html = `<span class="sc-challenge-label">${data.challenge.completed ? '&#10003;' : '&#9889;'} Weekly: ${data.challenge.name}</span>`;
        html += `<span class="sc-challenge-desc">${data.challenge.desc}</span>`;
        if (data.challengeJustCompleted && data.challengeBonusReward) {
          const b = data.challengeBonusReward;
          html += `<span class="sc-challenge-complete">Completed! ${CurrencyIcons.livecache(12)}+${b.liveCache} ${CurrencyIcons.vringgit(12)}+${b.vringgit} ${CurrencyIcons.ticket_blue(12)}+${b.blueTicket}</span>`;
        } else if (!data.challenge.completed) {
          html += `<span class="sc-challenge-hint">Score ${CHALLENGE_SCORE_THRESHOLD}+ to complete</span>`;
        } else {
          html += `<span class="sc-challenge-done">Already completed this week</span>`;
        }
        $resChallenge.innerHTML = html;
        $resChallenge.style.display = '';
      } else {
        $resChallenge.style.display = 'none';
      }
    }

    $resultsScreen.style.display = 'block';
  }

  // ── Stop (cleanup) ──
  function stop() {
    isRunning = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    bubbles.forEach(b => { if (b.el && b.el.parentNode) b.el.parentNode.removeChild(b.el); });
    bubbles = [];
    $gameArea.classList.remove('sc-super-mode', 'sc-shake');
    $superOverlay.style.display = 'none';
  }

  // ═══════════════════════════════════════════════
  //  Stat Preview (Step 4)
  // ═══════════════════════════════════════════════

  /**
   * Compute gameplay effects from a character's effective stats.
   * Uses the Step 3 overhaul formulas so the preview matches actual mechanics.
   * Returns null if slug is invalid.
   */
  function getStatPreview(slug) {
    if (!slug) return null;
    const state = Game.getState();
    const charData = state.characters[slug];
    if (!charData) return null;

    const bondBonus = Game.getBondStatBonus(slug);
    const variant = Game.getBestVariant(charData.variants);

    const eff = {
      tc: (charData.stats.tc || 0) + (bondBonus.tc || 0),
      ch: (charData.stats.ch || 0) + (bondBonus.ch || 0),
      vc: (charData.stats.vc || 0) + (bondBonus.vc || 0),
      mg: (charData.stats.mg || 0) + (bondBonus.mg || 0),
      ps: (charData.stats.ps || 0) + (bondBonus.ps || 0),
      st: (charData.stats.st || 0) + (bondBonus.st || 0),
    };

    // Step 3 formula mappings
    // TC → Hit Accuracy: hitRadius = bubble.size/2 * (0.5 + TC/200)
    const accuracyMult = 0.5 + eff.tc / 200;

    // CH → Landmine Warning: warningTime = 0.3 + CH/100 seconds
    const warningTime = 0.3 + eff.ch / 100;

    // VC → Boost Fill Rate: actualFill = boostFill * (1 + VC/150)
    const boostMult = 1 + eff.vc / 150;

    // MG → Screen Organization: minSpacing = bubble.size * (1.5 - MG/200)
    // Higher MG = tighter spacing = less clutter → more organized
    const organizationPct = Math.min(100, Math.round(eff.mg / 2));

    // ST → Session Duration: round timer = 30 + ST/20 seconds
    const duration = 30 + Math.floor(eff.st / 20);

    // PS → Score Multiplier: scoreMult = 1 + PS/200
    const scoreMult = 1 + eff.ps / 200;

    return {
      stats: eff,
      variant,
      effects: {
        tc: { label: 'Accuracy',  value: accuracyMult,    display: `x${accuracyMult.toFixed(2)}`, color: '#42a5f5' },
        ch: { label: 'Warning',   value: warningTime,     display: `${warningTime.toFixed(1)}s`,   color: '#ef5350' },
        vc: { label: 'Boost',     value: boostMult,       display: `x${boostMult.toFixed(2)}`,    color: '#ffa726' },
        mg: { label: 'Clarity',   value: organizationPct, display: `${organizationPct}%`,           color: '#66bb6a' },
        st: { label: 'Duration',  value: duration,        display: `${duration}s`,                  color: '#64b5f6' },
        ps: { label: 'Score',     value: scoreMult,       display: `x${scoreMult.toFixed(2)}`,     color: '#ab47bc' },
      },
    };
  }

  // ── Getters ──
  function getIsRunning() { return isRunning; }
  function getLeadSlug() { return leadSlug; }

  return {
    cacheDOM,
    startRound,
    stop,
    canPlay,
    getPlayCostLabel,
    getIsRunning,
    getLeadSlug,
    getLeadStaminaInfo,
    setLead,
    getChallengeInfo,
    getPreviewDuration,
    getStatPreview,
    STAMINA_COST,
  };
})();
