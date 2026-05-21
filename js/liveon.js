/* ═══════════════════════════════════════════════
   liveon.js — Live!ON Roguelite Streaming Simulation Engine
   ═══════════════════════════════════════════════ */

const LiveON = (() => {

  // ── Constants ──────────────────────────────────────────

  const MAX_TURNS = 20;
  // Safe zone fully removed — all turns have stat checks + PS costs
  const AGENCY_VISIT_TURNS = [5, 10, 15];

  const COACH_SLOTS = ['streamer', 'performance', 'stage'];

  // Each coach slot boosts two stats
  const COACH_STAT_MAP = {
    streamer:     ['tc', 'ch'],
    performance:  ['ch', 'vc'],
    stage:        ['vc', 'mg'],
  };

  const COACH_BASE_BONUS = 10; // % per coach

  // Coach rarity multiplier — distinct from gacha pull RarityMultipliers
  // R=1x, SR=1.5x, SSR=2x, UR=3x (so SSR coach = 20% bonus)
  const COACH_RARITY_MULT = { R: 1, SR: 1.5, SSR: 2, UR: 3 };

  // Choice tier multipliers and PS costs (all turns)
  // Stat check: each choice checks a different stat; if effective stat < threshold, choice is locked out
  const CHOICE_TIERS = {
    best:    { mult: 1.0, psCost: 2 },
    good:    { mult: 0.6, psCost: 5 },
    neutral: { mult: 0.4, psCost: 8 },
  };

  // Skip penalty (player opts out or can't pick)
  const SKIP_SUB_LOSS_PCT = 0.05;
  const SKIP_PS_LOSS = 10;

  // Comeback bonus: flat +20 subs on Best choice success during final turn
  const FINALE_COMEBACK_BONUS = 20;

  // Finale target formula: FINALE_BASE_TARGET + scenario.difficulty * FINALE_DIFFICULTY_MULT
  const FINALE_BASE_TARGET = 1100; // 1100 + 1*100 = 1200 finale target
  const FINALE_DIFFICULTY_MULT = 100;

  // Ending reward multipliers
  const ENDING_MULT = { bad: 0.6, neutral: 1.0, good: 1.2 };

  // Stat labels for display
  const STAT_LABELS = { tc: 'Tech', ch: 'Charisma', vc: 'Voice', mg: 'Management' };


  // ── Scenarios ──────────────────────────────────────────

  const SCENARIOS = [
    {
      id: 'debut_stream',
      title: 'Debut Stream',
      description: 'Your lead VTuber takes the stage for their very first broadcast. Build a loyal audience and survive 20 turns of streaming chaos!',
      difficulty: 1, // target = 500 + 1*100 = 600
      icon: '🎬',
      unlockCondition: null, // always available
    },
  ];


  // ── Event Pool ─────────────────────────────────────────

  const EVENT_POOL = [
    {
      id: 'evt_debut_nerves',
      title: 'Debut Jitters',
      description: 'Your lead is shaking before their first stream. The chat is already filling with anticipation…',
      choices: [
        { label: 'Give a heartfelt pep talk', stat: 'ch', tier: 'best' },
        { label: 'Run full tech checks to distract them', stat: 'tc', tier: 'good' },
        { label: 'Just push them live — sink or swim!', stat: 'ch', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_tech_emergency',
      title: 'Tech Emergency!',
      description: 'Mid-stream audio cuts out and the bitrate is dropping. Viewers are starting to leave…',
      choices: [
        { label: 'Diagnose and fix the setup live', stat: 'tc', tier: 'best' },
        { label: 'Switch to a backup streaming rig', stat: 'mg', tier: 'good' },
        { label: 'Pretend it\'s a "silent challenge" stream', stat: 'ch', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_superchat_surprise',
      title: 'Superchat Avalanche',
      description: 'A generous fan drops a massive superchat. Chat erupts. How does your lead respond?',
      choices: [
        { label: 'Deliver an emotional thank-you speech', stat: 'ch', tier: 'best' },
        { label: 'Plan a special content reward for donors', stat: 'mg', tier: 'good' },
        { label: 'Scream and break character composure', stat: 'vc', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_collab_request',
      title: 'Collab Request',
      description: 'A popular VTuber from another agency slides into your DMs wanting to collab. This could be huge…',
      choices: [
        { label: 'Coordinate a polished joint stream plan', stat: 'mg', tier: 'best' },
        { label: 'Freestyle it — organic chemistry matters', stat: 'ch', tier: 'good' },
        { label: 'Say yes but wing the entire setup', stat: 'tc', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_troll_attack',
      title: 'Trolls in Chat',
      description: 'A coordinated raid of antis floods the chat with negativity. Your lead\'s composure is tested…',
      choices: [
        { label: 'Deploy anti-troll tools and timing', stat: 'tc', tier: 'best' },
        { label: 'Laugh it off with professional charm', stat: 'ch', tier: 'good' },
        { label: 'Get visibly frustrated on stream', stat: 'vc', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_viral_clip',
      title: 'Viral Clip',
      description: 'A 30-second clip from yesterday\'s stream is going viral on social media! New viewers are flooding in…',
      choices: [
        { label: 'Capitalize with a follow-up stream', stat: 'mg', tier: 'best' },
        { label: 'Engage the new fans on social media', stat: 'mg', tier: 'good' },
        { label: 'Ignore it and do your usual content', stat: 'vc', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_equipment_upgrade',
      title: 'Equipment Upgrade',
      description: 'Your current mic is crackling and the lighting is dim. Time to invest in better gear?',
      choices: [
        { label: 'Research and buy optimal gear within budget', stat: 'mg', tier: 'best' },
        { label: 'Borrow equipment from a senpai VTuber', stat: 'mg', tier: 'good' },
        { label: 'DIY a solution with duct tape and prayers', stat: 'tc', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_fanart_gallery',
      title: 'Fan Art Showcase',
      description: 'Fans have been flooding your hashtag with amazing artwork. Time for a dedicated art stream!',
      choices: [
        { label: 'Set up a polished gallery overlay', stat: 'tc', tier: 'best' },
        { label: 'Prepare heartfelt commentary on each piece', stat: 'ch', tier: 'good' },
        { label: 'Rush through them — too many to cover', stat: 'mg', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_asmr_challenge',
      title: 'ASMR Challenge',
      description: 'Chat has been begging for ASMR content. Your lead has never tried it before…',
      choices: [
        { label: 'Practice whispering techniques beforehand', stat: 'vc', tier: 'best' },
        { label: 'Study popular ASMR VTuber methods', stat: 'mg', tier: 'good' },
        { label: 'Just start whispering into the mic randomly', stat: 'tc', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_singing_stream',
      title: 'Singing Stream',
      description: 'Karaoke night! Your lead\'s singing will be on full display. This is make-or-break for growth.',
      choices: [
        { label: 'Rehearse song picks and warm up vocals', stat: 'vc', tier: 'best' },
        { label: 'Take song requests from chat live', stat: 'vc', tier: 'good' },
        { label: 'Sing loudly but completely off-key', stat: 'ch', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_gaming_disaster',
      title: 'Gaming Disaster',
      description: 'The game your lead is playing keeps crashing and corrupting their save file. Chat is laughing…',
      choices: [
        { label: 'Turn the disaster into entertaining content', stat: 'ch', tier: 'best' },
        { label: 'Troubleshoot and switch games smoothly', stat: 'tc', tier: 'good' },
        { label: 'Rage-quit on stream dramatically', stat: 'vc', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_charity_stream',
      title: 'Charity Stream',
      description: 'A local charity has asked your lead to host a fundraiser stream. Great for reputation!',
      choices: [
        { label: 'Organize milestone-based donation goals', stat: 'mg', tier: 'best' },
        { label: 'Pour genuine emotion into the cause', stat: 'vc', tier: 'good' },
        { label: 'Wing it and hope donations flow naturally', stat: 'tc', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_marshmallow_qa',
      title: 'Marshmallow Q&A',
      description: 'Anonymous questions are pouring in. Some are wholesome, some are… spicy.',
      choices: [
        { label: 'Filter carefully and answer thoughtfully', stat: 'mg', tier: 'best' },
        { label: 'Read everything raw for authentic reactions', stat: 'tc', tier: 'good' },
        { label: 'Only pick the weird ones for shock value', stat: 'tc', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_costume_reveal',
      title: 'New Outfit Reveal',
      description: 'The mama/papa has finished a gorgeous new costume! Time for the grand reveal stream.',
      choices: [
        { label: 'Plan a choreographed reveal with effects', stat: 'vc', tier: 'best' },
        { label: 'Show it off casually with genuine excitement', stat: 'ch', tier: 'good' },
        { label: 'Wear it backward and pretend it\'s intentional', stat: 'mg', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_stream_marathon',
      title: 'Stream Marathon',
      description: 'Your lead wants to attempt a 12-hour endurance stream. Their energy management is crucial.',
      choices: [
        { label: 'Maintain vocal energy throughout', stat: 'vc', tier: 'best' },
        { label: 'Power through with sheer determination', stat: 'vc', tier: 'good' },
        { label: 'Forget schedule and wing it entirely', stat: 'mg', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_harsh_review',
      title: 'Harsh Review',
      description: 'A prominent VTuber reviewer just published a scathing critique of your lead\'s content. Ouch.',
      choices: [
        { label: 'Use data to track and improve metrics', stat: 'tc', tier: 'best' },
        { label: 'Address it professionally on next stream', stat: 'vc', tier: 'good' },
        { label: 'Make a passive-aggressive reply video', stat: 'vc', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_meme_review',
      title: 'Meme Review Stream',
      description: 'Chat has compiled a folder of memes about your lead. Most are flattering… most.',
      choices: [
        { label: 'React with perfect comedic timing', stat: 'ch', tier: 'best' },
        { label: 'Set up a professional slideshow presentation', stat: 'tc', tier: 'good' },
        { label: 'Get offended at every single meme', stat: 'vc', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_cooking_stream',
      title: 'Cooking Stream',
      description: 'Your lead attempts to cook live on stream. The kitchen may or may not survive.',
      choices: [
        { label: 'Set up camera for cooking show presentation', stat: 'tc', tier: 'best' },
        { label: 'Improvise with chat-suggested ingredients', stat: 'vc', tier: 'good' },
        { label: 'Wing it without any preparation', stat: 'mg', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_milestone_celebration',
      title: 'Milestone Celebration',
      description: 'Your lead is approaching a major subscriber milestone! Time to celebrate properly.',
      choices: [
        { label: 'Sing a special celebration song', stat: 'vc', tier: 'best' },
        { label: 'Do a heartfelt gratitude stream with fans', stat: 'ch', tier: 'good' },
        { label: 'Just announce it and move on', stat: 'ch', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_horror_game',
      title: 'Horror Game Stream',
      description: 'Chat voted for the scariest horror game available. Your lead is terrified of horror.',
      choices: [
        { label: 'Use voice acting skills to play it up', stat: 'vc', tier: 'best' },
        { label: 'Bribe chat to switch to a cozy game', stat: 'ch', tier: 'good' },
        { label: 'Scream so loud the mic clips every 10 seconds', stat: 'mg', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_relay_race',
      title: 'Agency Relay',
      description: 'The agency is hosting a relay stream event. Your lead needs to pass the baton smoothly.',
      choices: [
        { label: 'Coordinate handoff timing with next VTuber', stat: 'mg', tier: 'best' },
        { label: 'Give an energetic and memorable segment', stat: 'vc', tier: 'good' },
        { label: 'Forget about the relay and go over time', stat: 'tc', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_special_announcement',
      title: 'Special Announcement',
      description: 'Management wants your lead to make a major announcement on stream. The stakes are high.',
      choices: [
        { label: 'Prepare a polished presentation with visuals', stat: 'tc', tier: 'best' },
        { label: 'Deliver the news with genuine excitement', stat: 'vc', tier: 'good' },
        { label: 'Accidentally leak the news on Twitter first', stat: 'mg', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_zatsudan',
      title: 'Zatsudan — Free Talk',
      description: 'A relaxed talking stream with no plan. Just your lead and their thoughts. Simple, right?',
      choices: [
        { label: 'Weave engaging stories and anecdotes', stat: 'ch', tier: 'best' },
        { label: 'Prepare talking points hidden in a second monitor', stat: 'mg', tier: 'good' },
        { label: 'Stare at chat in silence for 2 minutes', stat: 'vc', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_hashtag_trend',
      title: 'Hashtag Trending',
      description: 'Your lead\'s stream hashtag is suddenly trending! New viewers are pouring in from everywhere.',
      choices: [
        { label: 'Welcome newcomers warmly and explain the channel', stat: 'ch', tier: 'best' },
        { label: 'Quickly set up a fresh overlay for new viewers', stat: 'tc', tier: 'good' },
        { label: 'Panic and freeze under the pressure', stat: 'ch', tier: 'neutral' },
      ],
    },
    {
      id: 'evt_voice_lesson',
      title: 'Impromptu Voice Lesson',
      description: 'A professional voice coach is watching and offering live tips. Chat is hype!',
      choices: [
        { label: 'Follow the advice and demonstrate range', stat: 'vc', tier: 'best' },
        { label: 'Ask thoughtful questions about technique', stat: 'tc', tier: 'good' },
        { label: 'Try to imitate a dubbing meme instead', stat: 'ch', tier: 'neutral' },
      ],
    },
  ];


  // ── Upgrade Pool (Agency Visits) ───────────────────────

  const UPGRADE_POOL = [
    {
      id: 'upgrade_coach_streamer',
      label: 'Train Streamer Coach',
      description: '+5% base effectiveness for Streamer Coach (boosts TC/CH)',
      effect: { type: 'coach_boost', coach: 'streamer', amount: 5 },
      repeatable: true,
    },
    {
      id: 'upgrade_coach_performance',
      label: 'Train Performance Coach',
      description: '+5% base effectiveness for Performance Coach (boosts CH/VC)',
      effect: { type: 'coach_boost', coach: 'performance', amount: 5 },
      repeatable: true,
    },
    {
      id: 'upgrade_coach_stage',
      label: 'Train Stage Coach',
      description: '+5% base effectiveness for Stage Coach (boosts VC/MG)',
      effect: { type: 'coach_boost', coach: 'stage', amount: 5 },
      repeatable: true,
    },
    {
      id: 'upgrade_ps_recover',
      label: 'Rest & Recover',
      description: 'Restore 15 PS to keep the run going!',
      effect: { type: 'ps_recover', amount: 15 },
      repeatable: true,
    },
    {
      id: 'upgrade_flat_subs',
      label: 'Social Media Blitz',
      description: 'Gain 50 flat subscribers instantly!',
      effect: { type: 'flat_subs', amount: 50 },
      repeatable: true,
    },
    {
      id: 'upgrade_chaos_yolo',
      label: '🔥 YOLO Mode',
      description: '+40% sub gains on all choices, but every choice now costs +3 PS!',
      effect: { type: 'chaos', subBoost: 0.40, psPenalty: 3 },
      repeatable: false,
    },
  ];


  // ── Run State (session-only, not persisted) ────────────

  let _runState = null;


  // ── Helper: Reset run state ────────────────────────────

  function createRunState() {
    return {
      active: false,
      scenario: null,
      lead: null,
      coaches: { streamer: null, performance: null, stage: null },
      coachBonuses: { streamer: COACH_BASE_BONUS, performance: COACH_BASE_BONUS, stage: COACH_BASE_BONUS },
      turn: 0,
      maxTurns: MAX_TURNS,
      ps: 0,
      maxPS: 0,
      subscribers: 0,
      subscriberLog: [],
      upgrades: [],
      consumedUpgrades: [], // upgrades picked during agency visits (disappear from future visits)
      chaosUpgrades: [],
      targetSubs: 0,
      currentEvent: null,
      ending: null,
      rewards: null,
    };
  }


  // ── Coach Bonus Calculation ────────────────────────────

  function calculateCoachBonus(stat) {
    if (!_runState || !_runState.active) return 0;
    let totalBonus = 0;
    for (const slot of COACH_SLOTS) {
      const coachSlug = _runState.coaches[slot];
      if (!coachSlug) continue;
      const boostedStats = COACH_STAT_MAP[slot];
      if (!boostedStats.includes(stat)) continue;

      // Get coach rarity from saved character data
      const state = Game.getState();
      const charData = state.characters[coachSlug];
      if (!charData) continue;

      const rarity = charData.rarity || 'R';
      const rarityMult = COACH_RARITY_MULT[rarity] || 1;
      const baseBonus = _runState.coachBonuses[slot] || COACH_BASE_BONUS;

      // Bonus = baseBonus% * rarityMult (expressed as decimal)
      totalBonus += (baseBonus / 100) * rarityMult;
    }
    return totalBonus;
  }

  function getEffectiveStats() {
    if (!_runState || !_runState.active || !_runState.lead) return null;
    const state = Game.getState();
    const charData = state.characters[_runState.lead];
    if (!charData || !charData.stats) return null;

    const base = { ...charData.stats };
    const boosted = {};
    for (const stat of ['tc', 'ch', 'vc', 'mg']) {
      const bonus = calculateCoachBonus(stat);
      boosted[stat] = {
        base: base[stat] || 0,
        bonus: Math.round(bonus * 100),
        total: Math.round((base[stat] || 0) * (1 + bonus)),
      };
    }
    return { base, boosted };
  }


  // ── Scenario & Eligibility ─────────────────────────────

  function getScenarios() {
    return SCENARIOS.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      difficulty: s.difficulty,
      icon: s.icon,
      targetSubs: FINALE_BASE_TARGET + s.difficulty * FINALE_DIFFICULTY_MULT,
      unlocked: true,
    }));
  }

  function canStartRun() {
    const stamina = Game.getStamina();
    if (stamina.current < Game.LIVEON_STAMINA_COST) return { can: false, reason: 'Not enough stamina. Need ' + Game.LIVEON_STAMINA_COST + '.' };
    const state = Game.getState();
    const ownedCount = Object.values(state.characters).filter(c => c && c.owned).length;
    if (ownedCount < 1) return { can: false, reason: 'You need at least 1 VTuber to start a run.' };
    return { can: true };
  }


  // ── VTuber Selection Helpers ───────────────────────────

  function getOwnedVTubersForLead(excludeSlugs) {
    const state = Game.getState();
    const exclude = new Set(excludeSlugs || []);
    const owned = [];
    for (const [slug, charData] of Object.entries(state.characters)) {
      if (!charData || !charData.owned) continue;
      if (exclude.has(slug)) continue;
      const info = DataLoader.getBySlug(slug);
      if (!info) continue;
      owned.push({
        slug,
        name: info.name,
        agency: info.agency || '',
        rarity: charData.rarity || 'R',
        level: charData.level || 1,
        currentPS: charData.stats ? (charData.stats.ps || 0) : 0,
        maxPS: charData.baseStats ? (charData.baseStats.ps || 0) : 0,
        stats: charData.stats || {},
        imageUrl: DataLoader.getImageUrl(slug),
      });
    }
    // Sort by current PS descending — higher PS leads survive longer
    owned.sort((a, b) => b.currentPS - a.currentPS);
    return owned;
  }

  function getOwnedVTubersForCoach(excludeSlugs) {
    const state = Game.getState();
    const exclude = new Set(excludeSlugs || []);
    const owned = [];
    for (const [slug, charData] of Object.entries(state.characters)) {
      if (!charData || !charData.owned) continue;
      if (exclude.has(slug)) continue;
      const info = DataLoader.getBySlug(slug);
      if (!info) continue;
      // Calculate the coach bonus this VTuber would provide in each slot
      const rarity = charData.rarity || 'R';
      const rarityMult = COACH_RARITY_MULT[rarity] || 1;
      owned.push({
        slug,
        name: info.name,
        agency: info.agency || '',
        rarity,
        level: charData.level || 1,
        echo: charData.echo || 0,
        stats: charData.stats || {},
        imageUrl: DataLoader.getImageUrl(slug),
        coachBonusPct: Math.round(COACH_BASE_BONUS * rarityMult),
        // Per-slot effectiveness for display
        slotEffectiveness: {
          streamer: Math.round(COACH_BASE_BONUS * rarityMult),
          performance: Math.round(COACH_BASE_BONUS * rarityMult),
          stage: Math.round(COACH_BASE_BONUS * rarityMult),
        },
      });
    }
    // Sort by rarity (UR first) then echo
    const rarityOrder = { UR: 0, SSR: 1, SR: 2, R: 3 };
    owned.sort((a, b) => (rarityOrder[a.rarity] || 3) - (rarityOrder[b.rarity] || 3) || b.echo - a.echo);
    return owned;
  }


  // ── Run Start ──────────────────────────────────────────

  function startRun(scenarioId, leadSlug, coaches) {
    const eligibility = canStartRun();
    if (!eligibility.can) return { success: false, reason: eligibility.reason };

    const state = Game.getState();
    const leadData = state.characters[leadSlug];
    if (!leadData || !leadData.owned) return { success: false, reason: 'Lead VTuber is not owned.' };

    // Deduct stamina
    if (!Game.useStamina(Game.LIVEON_STAMINA_COST)) {
      return { success: false, reason: 'Failed to deduct stamina.' };
    }

    // Find scenario
    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return { success: false, reason: 'Invalid scenario.' };

    // Validate coaches
    if (coaches.streamer && (!state.characters[coaches.streamer] || !state.characters[coaches.streamer].owned)) {
      return { success: false, reason: 'Streamer coach is not owned.' };
    }
    if (coaches.performance && (!state.characters[coaches.performance] || !state.characters[coaches.performance].owned)) {
      return { success: false, reason: 'Performance coach is not owned.' };
    }
    if (coaches.stage && (!state.characters[coaches.stage] || !state.characters[coaches.stage].owned)) {
      return { success: false, reason: 'Stage coach is not owned.' };
    }

    // Lead's current PS is the run's HP (not max)
    const runPS = leadData.stats ? (leadData.stats.ps || 0) : 0;
    if (runPS <= 0) return { success: false, reason: 'Lead has no PS! Restore their Passion first.' };

    const targetSubs = FINALE_BASE_TARGET + scenario.difficulty * FINALE_DIFFICULTY_MULT;

    _runState = createRunState();
    _runState.active = true;
    _runState.scenario = { ...scenario };
    _runState.lead = leadSlug;
    _runState.coaches = {
      streamer: coaches.streamer || null,
      performance: coaches.performance || null,
      stage: coaches.stage || null,
    };
    _runState.turn = 1;
    _runState.ps = runPS;
    _runState.maxPS = leadData.baseStats ? (leadData.baseStats.ps || 0) : runPS;
    _runState.targetSubs = targetSubs;
    _runState.currentEvent = getRandomEvent();

    return {
      success: true,
      runState: getRunState(),
    };
  }


  // ── Turn Utilities ─────────────────────────────────────

  function isAgencyVisitTurn(turn) {
    return AGENCY_VISIT_TURNS.includes(turn);
  }

  function isFinaleTurn(turn) {
    return turn === MAX_TURNS;
  }


  // ── Base Subscriber Calculation ────────────────────────

  function calculateBaseSubs(turn) {
    return 30 + turn * 5 + Math.floor(Math.random() * 20);
  }


  // ── Stat Check for Choices ────────────────────────────
  // Each choice (Best/Good/Neutral) checks a different stat against a threshold.
  // If BASE stat (no coach bonus) < threshold, the choice is LOCKED OUT (greyed out).
  // Coach bonuses boost SUB GAINS but do NOT bypass lockout thresholds.

  const STAT_CHECK_ENABLED = true;

  // Get the lead's highest base stat (no coach bonuses — used for threshold scaling)
  function getLeadMaxStat() {
    if (!_runState || !_runState.active || !_runState.lead) return 20; // fallback
    const state = Game.getState();
    const charData = state.characters[_runState.lead];
    if (!charData || !charData.stats) return 20;
    const tc = charData.stats.tc || 0;
    const ch = charData.stats.ch || 0;
    const vc = charData.stats.vc || 0;
    const mg = charData.stats.mg || 0;
    return Math.max(tc, ch, vc, mg);
  }

  // Get the lead's raw base stat for a specific stat key (no coach bonuses)
  function getLeadBaseStat(stat) {
    if (!_runState || !_runState.active || !_runState.lead) return 0;
    const state = Game.getState();
    const charData = state.characters[_runState.lead];
    if (!charData || !charData.stats) return 0;
    return charData.stats[stat] || 0;
  }

  // Threshold formula: scales from lead's max base stat (no coach bonuses in check)
  // Best:    ~60% at turn 1 → ~110% at turn 20 of max stat
  // Good:    ~45% at turn 1 → ~85% at turn 20
  // Neutral: ~12% at turn 1 → ~20% at turn 20
  function getStatThreshold(tier, turn) {
    const base = getLeadMaxStat();
    switch (tier) {
      case 'best':    return Math.round(base * (0.60 + turn * 0.025));
      case 'good':    return Math.round(base * (0.45 + turn * 0.020));
      case 'neutral': return Math.round(base * (0.12 + turn * 0.004));
      default:        return Infinity;
    }
  }

  // Check if a choice is available (not locked out)
  // Uses BASE stat only — coach bonuses boost rewards, not threshold access
  function canPickChoice(stat, tier, turn) {
    if (!STAT_CHECK_ENABLED) return { canPick: true, playerStat: 0, threshold: 0 };
    const playerStat = getLeadBaseStat(stat);
    if (playerStat <= 0) return { canPick: false, playerStat, threshold: Infinity };
    const threshold = getStatThreshold(tier, turn);
    return {
      canPick: playerStat >= threshold,
      playerStat,
      threshold,
      tier,
    };
  }

  // Returns choice availability for UI display (any tier)
  function getStatCheckPreview(stat, tier, turn) {
    if (!STAT_CHECK_ENABLED) return { enabled: false };
    return canPickChoice(stat, tier, turn);
  }


  // ── Event Selection ────────────────────────────────────

  function getEventPool() {
    if (!_runState || !_runState.active) return [];
    // Return a shuffled copy of the event pool for variety
    const shuffled = [...EVENT_POOL];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function getRandomEvent() {
    const pool = getEventPool();
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }


  // ── Choice Resolution ──────────────────────────────────

  function processChoice(turn, event, choiceIndex) {
    if (!_runState || !_runState.active) return { error: 'No active run.' };
    if (turn !== _runState.turn) return { error: 'Turn mismatch.' };
    if (!event || !event.choices || choiceIndex < 0 || choiceIndex >= event.choices.length) {
      return { error: 'Invalid choice.' };
    }

    const choice = event.choices[choiceIndex];
    const stat = choice.stat;
    const tier = choice.tier;

    // Lockout check: is this choice available?
    const pickCheck = canPickChoice(stat, tier, turn);
    if (!pickCheck.canPick) {
      return {
        error: 'Choice locked',
        locked: true,
        playerStat: pickCheck.playerStat,
        threshold: pickCheck.threshold,
      };
    }

    const coachBonus = calculateCoachBonus(stat);
    const tierData = CHOICE_TIERS[tier] || CHOICE_TIERS.neutral;
    let choiceMult = tierData.mult;
    let psCost = tierData.psCost;

    // Apply chaos upgrades
    for (const chaos of _runState.chaosUpgrades) {
      choiceMult += chaos.subBoost;
      psCost += chaos.psPenalty;
    }

    let subGain = calculateBaseSubs(turn) * choiceMult * (1 + coachBonus);

    // Turn 20 comeback: Best choice gives flat +20 bonus
    if (turn === MAX_TURNS && tier === 'best') {
      subGain += FINALE_COMEBACK_BONUS;
    }

    subGain = Math.floor(subGain);

    // Apply results
    _runState.subscribers += subGain;
    _runState.ps -= psCost;
    if (_runState.ps < 0) _runState.ps = 0;

    // Log this turn
    const logEntry = {
      turn,
      eventId: event.id,
      eventTitle: event.title,
      choiceLabel: choice.label,
      choiceStat: stat,
      choiceTier: tier,
      subGain,
      psCost,
      psRemaining: _runState.ps,
      coachBonus: Math.round(coachBonus * 100),
      comebackBonus: (turn === MAX_TURNS && tier === 'best') ? FINALE_COMEBACK_BONUS : 0,
    };
    _runState.subscriberLog.push(logEntry);

    // Check for Bad Ending (PS hit 0)
    if (_runState.ps <= 0 && turn < MAX_TURNS) {
      _runState.ending = 'bad';
      endRun('bad');
      return { result: logEntry, runEnded: true, ending: 'bad' };
    }

    // Advance turn
    _runState.turn++;

    // Check if this was the last turn (turn 20) — determine ending
    if (turn === MAX_TURNS) {
      const ending = _runState.subscribers >= _runState.targetSubs ? 'good' : 'neutral';
      _runState.ending = ending;
      endRun(ending);
      return { result: logEntry, runEnded: true, ending };
    }

    // Generate next event
    _runState.currentEvent = getRandomEvent();

    return { result: logEntry, runEnded: false };
  }

  function processSkip(turn, event) {
    if (!_runState || !_runState.active) return { error: 'No active run.' };
    if (turn !== _runState.turn) return { error: 'Turn mismatch.' };

    // Skip: lose 5% current total subs and 12 PS
    const subLoss = Math.floor(_runState.subscribers * SKIP_SUB_LOSS_PCT);
    const psLoss = SKIP_PS_LOSS;

    _runState.subscribers -= subLoss;
    if (_runState.subscribers < 0) _runState.subscribers = 0;
    _runState.ps -= psLoss;
    if (_runState.ps < 0) _runState.ps = 0;

    const logEntry = {
      turn,
      eventId: event ? event.id : null,
      eventTitle: event ? event.title : 'Skipped',
      choiceLabel: 'Skipped',
      choiceStat: null,
      choiceTier: 'skip',
      subGain: -subLoss,
      psCost: psLoss,
      psRemaining: _runState.ps,
      coachBonus: 0,
    };
    _runState.subscriberLog.push(logEntry);

    // Check Bad Ending
    if (_runState.ps <= 0 && turn < MAX_TURNS) {
      _runState.ending = 'bad';
      endRun('bad');
      return { result: logEntry, runEnded: true, ending: 'bad' };
    }

    _runState.turn++;
    _runState.currentEvent = getRandomEvent();

    return { result: logEntry, runEnded: false };
  }


  // ── Agency Visit ───────────────────────────────────────

  function getUpgradePool() {
    if (!_runState || !_runState.active) return [];
    // Filter out upgrades already consumed in previous agency visits
    return UPGRADE_POOL.filter(u => {
      if (_runState.consumedUpgrades.includes(u.id)) return false;
      if (!u.repeatable && _runState.upgrades.some(gu => gu.id === u.id)) return false;
      return true;
    });
  }

  // Returns a random subset of upgrades for the current agency visit
  function getAgencyVisitChoices(count) {
    if (!_runState || !_runState.active) return [];
    const pool = getUpgradePool();
    // Shuffle and pick 'count' upgrades
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const choices = shuffled.slice(0, Math.min(count, shuffled.length));
    // Store for processAgencyVisit to reference
    _runState.currentVisitChoices = choices;
    return choices;
  }

  function processAgencyVisit(upgradeIndex) {
    if (!_runState || !_runState.active) return { error: 'No active run.' };
    if (!isAgencyVisitTurn(_runState.turn)) return { error: 'Not an agency visit turn.' };

    const choices = _runState.currentVisitChoices;
    if (!choices || upgradeIndex < 0 || upgradeIndex >= choices.length) return { error: 'Invalid upgrade.' };

    const upgrade = choices[upgradeIndex];
    const effect = upgrade.effect;

    // Apply upgrade effect
    switch (effect.type) {
      case 'coach_boost': {
        const slot = effect.coach;
        if (slot && _runState.coachBonuses[slot] !== undefined) {
          _runState.coachBonuses[slot] += effect.amount;
        }
        break;
      }
      case 'ps_recover': {
        _runState.ps += effect.amount;
        if (_runState.maxPS > 0 && _runState.ps > _runState.maxPS) {
          _runState.ps = _runState.maxPS;
        }
        break;
      }
      case 'flat_subs': {
        _runState.subscribers += effect.amount;
        break;
      }
      case 'chaos': {
        _runState.chaosUpgrades.push({ subBoost: effect.subBoost, psPenalty: effect.psPenalty });
        break;
      }
    }

    // Track the upgrade
    _runState.upgrades.push({ id: upgrade.id, label: upgrade.label, effect: { ...effect } });

    // Log agency visit
    _runState.subscriberLog.push({
      turn: _runState.turn,
      eventId: 'agency_visit',
      eventTitle: 'Agency Visit',
      choiceLabel: upgrade.label,
      choiceStat: null,
      choiceTier: 'upgrade',
      subGain: effect.type === 'flat_subs' ? effect.amount : 0,
      psCost: effect.type === 'ps_recover' ? -effect.amount : 0,
      psRemaining: _runState.ps,
      coachBonus: 0,
    });

    // Mark upgrade as consumed (disappears from future visits)
    if (!_runState.consumedUpgrades.includes(upgrade.id)) {
      _runState.consumedUpgrades.push(upgrade.id);
    }
    _runState.currentVisitChoices = null;

    // Advance turn after agency visit
    _runState.turn++;

    return {
      success: true,
      upgrade: { id: upgrade.id, label: upgrade.label, description: upgrade.description },
      runState: getRunState(),
    };
  }


  // ── Run End & Rewards ──────────────────────────────────

  function endRun(ending) {
    if (!_runState) return null;
    if (!ending) {
      // Determine ending from current state
      if (_runState.ps <= 0) ending = 'bad';
      else if (_runState.subscribers >= _runState.targetSubs) ending = 'good';
      else ending = 'neutral';
    }

    _runState.ending = ending;
    _runState.active = false;

    const mult = ENDING_MULT[ending] || 1.0;
    const turnsSurvived = _runState.subscriberLog.length;

    // Calculate rewards
    const bondBase = Math.min(turnsSurvived * 3, 60); // max 60 from turns
    const rewards = {
      vringgit: Math.floor(_runState.subscribers / 10 * mult),
      liveCache: Math.floor(_runState.subscribers / 20 * mult),
      bondExp: bondBase,
    };

    if (ending === 'good') rewards.bondExp += 40;
    if (ending === 'neutral') rewards.bondExp += 15;

    _runState.rewards = rewards;

    // Apply rewards to game state
    const state = Game.getState();

    // VRinggit
    if (rewards.vringgit > 0) {
      state.currencies.vringgit = (state.currencies.vringgit || 0) + rewards.vringgit;
    }

    // LiveCache
    if (rewards.liveCache > 0) {
      state.currencies.liveCache = (state.currencies.liveCache || 0) + rewards.liveCache;
    }

    // Bond EXP to lead
    if (_runState.lead && rewards.bondExp > 0) {
      const leadData = state.characters[_runState.lead];
      if (leadData) {
        leadData.bondPoints = (leadData.bondPoints || 0) + rewards.bondExp;
      }
    }

    // Also give smaller bond EXP to coaches (25% of lead's)
    if (rewards.bondExp > 0) {
      const coachBondExp = Math.floor(rewards.bondExp * 0.25);
      for (const slot of COACH_SLOTS) {
        const coachSlug = _runState.coaches[slot];
        if (!coachSlug) continue;
        const coachData = state.characters[coachSlug];
        if (coachData) {
          coachData.bondPoints = (coachData.bondPoints || 0) + coachBondExp;
        }
      }
    }

    // Restore lead's PS to max
    if (_runState.lead) {
      const leadData = state.characters[_runState.lead];
      if (leadData && leadData.baseStats) {
        leadData.stats.ps = leadData.baseStats.ps || 0;
      }
    }

    // Give Producer EXP
    Game.addProducerExp(Math.floor(turnsSurvived * 2));

    // Save
    Game.save();

    return _runState;
  }


  // ── Run State Accessor ─────────────────────────────────

  function getRunState() {
    if (!_runState) return null;
    return { ..._runState };
  }

  function isRunActive() {
    return _runState && _runState.active;
  }


  // ── Progress Summary ───────────────────────────────────

  function getRunProgress() {
    if (!_runState) return null;

    const currentEvent = isAgencyVisitTurn(_runState.turn)
      ? { type: 'agency_visit' }
      : isFinaleTurn(_runState.turn)
        ? { type: 'finale' }
        : { type: 'event' };

    return {
      turn: _runState.turn,
      maxTurns: _runState.maxTurns,
      ps: _runState.ps,
      maxPS: _runState.maxPS,
      psPct: _runState.maxPS > 0 ? Math.round((_runState.ps / _runState.maxPS) * 100) : 0,
      subscribers: _runState.subscribers,
      targetSubs: _runState.targetSubs,
      subPct: _runState.targetSubs > 0 ? Math.round((_runState.subscribers / _runState.targetSubs) * 100) : 0,
      currentEventType: currentEvent.type,
      isAgency: isAgencyVisitTurn(_runState.turn),
      isFinale: isFinaleTurn(_runState.turn),
      chaosActive: _runState.chaosUpgrades.length > 0,
      coachSummary: getCoachSummary(),
    };
  }

  function getCoachSummary() {
    if (!_runState) return null;
    const summary = {};
    for (const slot of COACH_SLOTS) {
      const coachSlug = _runState.coaches[slot];
      if (!coachSlug) {
        summary[slot] = { slug: null, name: null, bonusPct: 0, stats: COACH_STAT_MAP[slot] };
        continue;
      }
      const info = DataLoader.getBySlug(coachSlug);
      const state = Game.getState();
      const charData = state.characters[coachSlug];
      const rarity = charData ? (charData.rarity || 'R') : 'R';
      const rarityMult = COACH_RARITY_MULT[rarity] || 1;
      const baseBonus = _runState.coachBonuses[slot] || COACH_BASE_BONUS;
      summary[slot] = {
        slug: coachSlug,
        name: info ? info.name : coachSlug,
        rarity,
        bonusPct: Math.round(baseBonus * rarityMult),
        stats: COACH_STAT_MAP[slot],
        imageUrl: info ? DataLoader.getImageUrl(coachSlug) : '',
      };
    }
    return summary;
  }


  // ── Run Abandon (voluntary quit — no rewards) ──────────

  function abandonRun() {
    if (!_runState || !_runState.active) return false;

    // Restore lead PS to max (same as normal end)
    const state = Game.getState();
    if (_runState.lead) {
      const leadData = state.characters[_runState.lead];
      if (leadData && leadData.baseStats) {
        leadData.stats.ps = leadData.baseStats.ps || 0;
      }
    }

    _runState.active = false;
    _runState.ending = 'abandoned';
    _runState.rewards = null;

    Game.save();
    return true;
  }


  // ── Constants Accessor ─────────────────────────────────

  function getConstants() {
    return {
      MAX_TURNS,
      SAFE_ZONE_END,
      AGENCY_VISIT_TURNS,
      COACH_SLOTS,
      COACH_STAT_MAP,
      COACH_BASE_BONUS,
      COACH_RARITY_MULT,
      CHOICE_TIERS,
      SKIP_SUB_LOSS_PCT,
      SKIP_PS_LOSS,
      FINALE_BASE_TARGET,
      FINALE_DIFFICULTY_MULT,
      ENDING_MULT,
      STAT_LABELS,
    };
  }


  // ── Public API ─────────────────────────────────────────

  return {
    // Run lifecycle
    canStartRun,
    startRun,
    endRun,
    getRunState,
    isRunActive,
    abandonRun,

    // Turn processing
    processChoice,
    processSkip,
    processAgencyVisit,

    // Queries
    getScenarios,
    getEventPool,
    getRandomEvent,
    getUpgradePool,
    getAgencyVisitChoices,
    getRunProgress,

    // Coach system
    calculateCoachBonus,
    getEffectiveStats,
    getCoachSummary,

    // Stat check
    getStatThreshold,
    canPickChoice,
    getStatCheckPreview,
    getLeadMaxStat,

    // VTuber selection
    getOwnedVTubersForLead,
    getOwnedVTubersForCoach,

    // Turn checks
    isSafeZone,
    isAgencyVisitTurn,
    isFinaleTurn,

    // Constants
    getConstants,
    STAT_LABELS,
  };

})();
