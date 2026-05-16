/* ═══════════════════════════════════════════════
   minigame.js — Super Chat Toss Game Engine
   ═══════════════════════════════════════════════ */

const Minigame = (() => {
  // ── Constants ──
  const ROUND_DURATION = 30;
  const STAMINA_COST = 15;
  const DAILY_FREE_PLAYS = 5;
  const SUPER_MODE_DURATION = 5;
  const BOOST_DECAY_RATE = 1;
  const BUBBLE_BASE_SPEED = 80; // px/s
  const GEM_REWARD_THRESHOLDS = [250, 500, 1000];

  const BUBBLE_DEFS = {
    coin:    { baseValue: 10, weight: 65, boostFill: 8,  css: 'sc-coin',    label: '$10' },
    premium: { baseValue: 25, weight: 15, boostFill: 20, css: 'sc-premium', label: '$25' },
    gem:     { baseValue: 50, weight: 2,  boostFill: 0,  css: 'sc-gem',     label: 'GEM', givesGem: true },
    landmine:{ baseValue: 0,  weight: 0,  boostFill: 0,  css: 'sc-landmine', label: '!',   isLandmine: true, penaltyPct: 15 },
    gift:    { baseValue: 0,  weight: 3,  boostFill: 50, css: 'sc-gift',    label: '+3s', timeBonus: 3 },
  };

  // Difficulty: [startSec, endSec, spawnIntervalMs, landmineWeight]
  const DIFFICULTY = [
    { start: 0,  end: 8,  interval: 1200, lmW: 8  },
    { start: 8,  end: 16, interval: 900,  lmW: 12 },
    { start: 16, end: 24, interval: 600,  lmW: 16 },
    { start: 24, end: 99, interval: 400,  lmW: 20 },
  ];

  // ── Game State ──
  let isRunning = false;
  let score = 0;
  let gemsEarned = 0;
  let timeLeft = ROUND_DURATION;
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
  }

  // ── Daily Play System ──
  function getDailyPlays() {
    const state = Game.getState();
    if (!state.minigame) return { used: DAILY_FREE_PLAYS, total: DAILY_FREE_PLAYS };
    const today = new Date().toISOString().split('T')[0];
    if (state.minigame.lastPlayDate !== today) {
      state.minigame.dailyPlays = 0;
      state.minigame.lastPlayDate = today;
      Game.save();
    }
    return { used: state.minigame.dailyPlays || 0, total: DAILY_FREE_PLAYS };
  }

  function useDailyPlay() {
    const state = Game.getState();
    if (!state.minigame) {
      state.minigame = { dailyPlays: 1, lastPlayDate: new Date().toISOString().split('T')[0], highScore: 0 };
    } else {
      const today = new Date().toISOString().split('T')[0];
      if (state.minigame.lastPlayDate !== today) {
        state.minigame.dailyPlays = 0;
        state.minigame.lastPlayDate = today;
      }
      state.minigame.dailyPlays = (state.minigame.dailyPlays || 0) + 1;
    }
    Game.save();
  }

  function canPlay() {
    if (isRunning) return false;
    const daily = getDailyPlays();
    if (daily.used < daily.total) return true;
    const state = Game.getState();
    return state.currencies.bondPoints >= STAMINA_COST;
  }

  function getPlayCostLabel() {
    const daily = getDailyPlays();
    const remaining = daily.total - daily.used;
    if (remaining > 0) return `FREE (${remaining} left today)`;
    return `${STAMINA_COST} Bond Points`;
  }

  // ── Character Lead Bonus ──
  function getLeadMultiplier() {
    if (!leadSlug) return 1;
    const state = Game.getState();
    const charData = state.characters[leadSlug];
    if (!charData) return 1;
    const variant = Game.getBestVariant(charData.variants);
    if (variant === 'ssr') return 1.3;
    if (variant === 'sr') return 1.2;
    return 1.1;
  }

  function getLandmineReduction() {
    if (!leadSlug) return 0;
    const state = Game.getState();
    const charData = state.characters[leadSlug];
    if (!charData) return 0;
    const variant = Game.getBestVariant(charData.variants);
    if (variant === 'ssr') return 10;
    if (variant === 'sr') return 5;
    return 0;
  }

  function getBoostFillBonus() {
    if (!leadSlug) return 0;
    const state = Game.getState();
    const charData = state.characters[leadSlug];
    if (!charData) return 0;
    return Math.floor(charData.level / 10) * 5; // +5% per 10 levels
  }

  // ── Bubble Selection ──
  function pickBubbleType(elapsed) {
    const lmReduction = getLandmineReduction();
    const phase = DIFFICULTY.find(p => elapsed >= p.start && elapsed < p.end) || DIFFICULTY[DIFFICULTY.length - 1];

    // Build weighted pool
    const pool = [];
    for (const [key, def] of Object.entries(BUBBLE_DEFS)) {
      let w = def.weight;
      if (key === 'landmine') {
        w = phase.lmW;
        w = Math.max(0, w - lmReduction);
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
    const elapsed = ROUND_DURATION - timeLeft;
    const type = pickBubbleType(elapsed);
    const def = BUBBLE_DEFS[type];
    const areaW = $gameArea.clientWidth;
    const areaH = $gameArea.clientHeight;
    const size = type === 'premium' ? 64 : type === 'gift' ? 60 : type === 'gem' ? 56 : type === 'landmine' ? 52 : 50;

    const x = Math.random() * (areaW - size - 16) + 8;
    const phase = DIFFICULTY.find(p => elapsed >= p.start && elapsed < p.end) || DIFFICULTY[DIFFICULTY.length - 1];
    const speedMult = 1 + (elapsed / ROUND_DURATION) * 0.8; // 1x at start, 1.8x at end
    const speed = BUBBLE_BASE_SPEED * speedMult;
    if (isSuperMode) speed *= 0.6; // slower in super mode

    const bubble = {
      id: Date.now() + Math.random(),
      type,
      x,
      y: -size,
      size,
      speed,
      def,
      el: null,
    };

    // Create DOM element
    const el = document.createElement('div');
    el.className = `sc-bubble sc-bubble-${type}`;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.left = x + 'px';
    el.style.top = '-60px';
    el.dataset.bubbleId = bubble.id;

    const inner = document.createElement('span');
    inner.className = 'sc-bubble-label';
    inner.textContent = def.label;
    el.appendChild(inner);

    // Click handler
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      handleBubbleClick(bubble);
    });

    // Touch handler
    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleBubbleClick(bubble);
    }, { passive: false });

    $gameArea.appendChild(el);
    bubble.el = el;
    bubbles.push(bubble);
  }

  // ── Click Handling ──
  function handleBubbleClick(bubble) {
    if (!isRunning) return;
    const idx = bubbles.indexOf(bubble);
    if (idx === -1) return;
    bubbles.splice(idx, 1);

    totalClicked++;
    const def = bubble.def;

    if (def.isLandmine) {
      // Penalty
      comboCount = 0;
      const penalty = Math.max(10, Math.floor(score * (def.penaltyPct / 100)));
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
      const value = Math.floor(def.baseValue * getLeadMultiplier());
      score += value;
      if (isSuperMode) score += value; // double
      showFloatingText(bubble.x + bubble.size / 2, bubble.y, `GEM! +${isSuperMode ? value * 2 : value}`, 'sc-float-gem');
      bubble.el.classList.add('sc-bubble-pop-good');
    } else if (def.timeBonus) {
      // Gift sub
      comboCount++;
      if (comboCount > bestCombo) bestCombo = comboCount;
      bonusTime += def.timeBonus;
      showFloatingText(bubble.x + bubble.size / 2, bubble.y, `+${def.timeBonus}s!`, 'sc-float-gift');
      bubble.el.classList.add('sc-bubble-pop-good');
    } else {
      // Normal coin/premium
      comboCount++;
      if (comboCount > bestCombo) bestCombo = comboCount;
      const baseMult = getLeadMultiplier();
      const value = Math.floor(def.baseValue * baseMult);
      const finalValue = isSuperMode ? value * 2 : value;
      score += finalValue;
      showFloatingText(bubble.x + bubble.size / 2, bubble.y, `+${finalValue}`, 'sc-float-good');
      bubble.el.classList.add('sc-bubble-pop-good');

      // Boost meter
      if (!isSuperMode) {
        const boostBonus = getBoostFillBonus();
        boostMeter = Math.min(100, boostMeter + def.boostFill + boostBonus);
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
    isSuperMode = true;
    superModeTimer = SUPER_MODE_DURATION;
    boostMeter = 100; // keep it visually full during mode

    $gameArea.classList.add('sc-super-mode');
    $superOverlay.style.display = 'flex';

    // Splash text
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

  // ── Game Loop ──
  function gameLoop(timestamp) {
    if (!isRunning) return;

    if (!lastFrameTime) lastFrameTime = timestamp;
    const dt = Math.min((timestamp - lastFrameTime) / 1000, 0.1); // cap at 100ms
    lastFrameTime = timestamp;

    // Timer
    timeLeft -= dt;
    if (bonusTime > 0) {
      bonusTime -= dt;
      if (bonusTime < 0) {
        timeLeft += bonusTime; // carry over negative
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
    const elapsed = ROUND_DURATION - timeLeft;
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

      // Off screen
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

  // ── Start Round ──
  function startRound(slug) {
    if (isRunning) return;
    if (!canPlay()) {
      UI.showToast('Not enough Bond Points!', 'error');
      return;
    }

    const daily = getDailyPlays();
    const isFree = daily.used < daily.total;
    if (!isFree) {
      const state = Game.getState();
      state.currencies.bondPoints -= STAMINA_COST;
    }
    useDailyPlay();

    // Init state
    leadSlug = slug;
    score = 0;
    gemsEarned = 0;
    timeLeft = ROUND_DURATION;
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
      $streamerAvatar.src = charInfo.image;
      $streamerAvatar.style.display = 'block';
      $streamerAvatar.onerror = () => { $streamerAvatar.style.display = 'none'; };
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

    // Store stamina cost label for results
    _lastPlayWasFree = isFree;

    isRunning = true;
    updateHUD();
    animFrameId = requestAnimationFrame(gameLoop);
  }

  let _lastPlayWasFree = false;

  // ── End Round ──
  function endRound() {
    isRunning = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);

    // Clean up remaining bubbles
    bubbles.forEach(b => { if (b.el && b.el.parentNode) b.el.parentNode.removeChild(b.el); });
    bubbles = [];

    // Calculate gem rewards
    let gemReward = 0;
    for (const threshold of GEM_REWARD_THRESHOLDS) {
      if (Math.floor(score) >= threshold) gemReward++;
    }

    // Total gems = direct gem catches + threshold bonus
    const totalGems = gemsEarned + gemReward;

    // Apply rewards
    const state = Game.getState();
    const coinReward = Math.floor(score);
    state.currencies.stars += coinReward;
    state.currencies.bondPoints += 10; // +10 bond for the lead character

    // Add bond XP to lead character
    if (leadSlug && state.characters[leadSlug]) {
      const charData = state.characters[leadSlug];
      // Tiny XP boost via bond points conversion
      charData.level; // just access to confirm exists
    }

    // Update high score
    if (!state.minigame) state.minigame = { dailyPlays: 0, lastPlayDate: '', highScore: 0 };
    if (coinReward > (state.minigame.highScore || 0)) {
      state.minigame.highScore = coinReward;
    }

    Game.save();

    // Show results
    showResults(coinReward, totalGems);
    Game.notifyStateChange();
  }

  // ── Results Screen ──
  function showResults(coins, gems) {
    const $resCoins = document.getElementById('sc-res-coins');
    const $resGems = document.getElementById('sc-res-gems');
    const $resBonds = document.getElementById('sc-res-bonds');
    const $resScore = document.getElementById('sc-res-score');
    const $resCombo = document.getElementById('sc-res-combo');
    const $resAccuracy = document.getElementById('sc-res-accuracy');
    const $resHighScore = document.getElementById('sc-res-highscore');

    if ($resCoins) $resCoins.textContent = `+${coins} Stars`;
    if ($resGems) $resGems.textContent = gems > 0 ? `+${gems} Gems` : '--';
    if ($resBonds) $resBonds.textContent = '+10 Bond Points';
    if ($resScore) $resScore.textContent = `Score: ${coins}`;
    if ($resCombo) $resCombo.textContent = `Best Combo: ${bestCombo}`;
    const totalBubbles = totalClicked + totalMissed;
    const accuracy = totalBubbles > 0 ? Math.round((totalClicked / totalBubbles) * 100) : 0;
    if ($resAccuracy) $resAccuracy.textContent = `Accuracy: ${accuracy}%`;
    const state = Game.getState();
    if ($resHighScore) $resHighScore.textContent = `High Score: ${state.minigame?.highScore || coins}`;

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
    getDailyPlays,
    STAMINA_COST,
    DAILY_FREE_PLAYS,
  };
})();
