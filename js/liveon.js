/* ═══════════════════════════════════════════════
   liveon.js — Live!ON Roguelite Streaming Simulation Engine
   ═══════════════════════════════════════════════ */

const LiveON = (() => {

  // ── Constants ──────────────────────────────────────────

  const MAX_TURNS = 20;
  const SAFE_ZONE_END = 5;
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

  // Choice tier multipliers and PS costs (for turns 6-20)
  const CHOICE_TIERS = {
    best:    { mult: 1.0, psCost: 0 },
    neutral: { mult: 0.7, psCost: 4 },
    fumble:  { mult: 0.5, psCost: 8 },
  };

  // Skip penalty (player opts out or can't pick)
  const SKIP_SUB_LOSS_PCT = 0.05;
  const SKIP_PS_LOSS = 12;

  // Finale target formula: FINALE_BASE_TARGET + scenario.difficulty * FINALE_DIFFICULTY_MULT
  const FINALE_BASE_TARGET = 500;
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
        { label: 'Run full tech checks to distract them', stat: 'tc', tier: 'neutral' },
        { label: 'Just push them live — sink or swim!', stat: 'mg', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_tech_emergency',
      title: 'Tech Emergency!',
      description: 'Mid-stream audio cuts out and the bitrate is dropping. Viewers are starting to leave…',
      choices: [
        { label: 'Diagnose and fix the setup live', stat: 'tc', tier: 'best' },
        { label: 'Switch to a backup streaming rig', stat: 'mg', tier: 'neutral' },
        { label: 'Pretend it\'s a "silent challenge" stream', stat: 'ch', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_superchat_surprise',
      title: 'Superchat Avalanche',
      description: 'A generous fan drops a massive superchat. Chat erupts. How does your lead respond?',
      choices: [
        { label: 'Deliver an emotional thank-you speech', stat: 'ch', tier: 'best' },
        { label: 'Plan a special content reward for donors', stat: 'mg', tier: 'neutral' },
        { label: 'Scream and break character composure', stat: 'vc', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_collab_request',
      title: 'Collab Request',
      description: 'A popular VTuber from another agency slides into your DMs wanting to collab. This could be huge…',
      choices: [
        { label: 'Coordinate a polished joint stream plan', stat: 'mg', tier: 'best' },
        { label: 'Freestyle it — organic chemistry matters', stat: 'ch', tier: 'neutral' },
        { label: 'Say yes but wing the entire setup', stat: 'tc', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_troll_attack',
      title: 'Trolls in Chat',
      description: 'A coordinated raid of antis floods the chat with negativity. Your lead\'s composure is tested…',
      choices: [
        { label: 'Laugh it off with professional charm', stat: 'ch', tier: 'best' },
        { label: 'Use moderation tools to clean house', stat: 'tc', tier: 'neutral' },
        { label: 'Get visibly frustrated on stream', stat: 'vc', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_viral_clip',
      title: 'Viral Clip',
      description: 'A 30-second clip from yesterday\'s stream is going viral on social media! New viewers are flooding in…',
      choices: [
        { label: 'Capitalize with a follow-up stream', stat: 'mg', tier: 'best' },
        { label: 'Engage the new fans on social media', stat: 'ch', tier: 'neutral' },
        { label: 'Ignore it and do your usual content', stat: 'vc', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_equipment_upgrade',
      title: 'Equipment Upgrade',
      description: 'Your current mic is crackling and the lighting is dim. Time to invest in better gear?',
      choices: [
        { label: 'Research and buy optimal gear within budget', stat: 'mg', tier: 'best' },
        { label: 'Borrow equipment from a senpai VTuber', stat: 'ch', tier: 'neutral' },
        { label: 'DIY a solution with duct tape and prayers', stat: 'tc', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_fanart_gallery',
      title: 'Fan Art Showcase',
      description: 'Fans have been flooding your hashtag with amazing artwork. Time for a dedicated art stream!',
      choices: [
        { label: 'Prepare a heartfelt commentary on each piece', stat: 'ch', tier: 'best' },
        { label: 'Set up a polished gallery overlay', stat: 'tc', tier: 'neutral' },
        { label: 'Rush through them — too many to cover', stat: 'mg', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_asmr_challenge',
      title: 'ASMR Challenge',
      description: 'Chat has been begging for ASMR content. Your lead has never tried it before…',
      choices: [
        { label: 'Practice whispering techniques beforehand', stat: 'vc', tier: 'best' },
        { label: 'Study popular ASMR VTuber methods', stat: 'mg', tier: 'neutral' },
        { label: 'Just start whispering into the mic randomly', stat: 'tc', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_singing_stream',
      title: 'Singing Stream',
      description: 'Karaoke night! Your lead\'s singing will be on full display. This is make-or-break for growth.',
      choices: [
        { label: 'Rehearse song picks and warm up vocals', stat: 'vc', tier: 'best' },
        { label: 'Take song requests from chat live', stat: 'ch', tier: 'neutral' },
        { label: 'Sing loudly but completely off-key', stat: 'mg', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_gaming_disaster',
      title: 'Gaming Disaster',
      description: 'The game your lead is playing keeps crashing and corrupting their save file. Chat is laughing…',
      choices: [
        { label: 'Turn the disaster into entertaining content', stat: 'ch', tier: 'best' },
        { label: 'Troubleshoot and switch games smoothly', stat: 'tc', tier: 'neutral' },
        { label: 'Rage-quit on stream dramatically', stat: 'vc', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_charity_stream',
      title: 'Charity Stream',
      description: 'A local charity has asked your lead to host a fundraiser stream. Great for reputation!',
      choices: [
        { label: 'Organize milestone-based donation goals', stat: 'mg', tier: 'best' },
        { label: 'Pour genuine emotion into the cause', stat: 'ch', tier: 'neutral' },
        { label: ' wing it and hope donations flow naturally', stat: 'vc', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_marshmallow_qa',
      title: 'Marshmallow Q&A',
      description: 'Anonymous questions are pouring in. Some are wholesome, some are… spicy.',
      choices: [
        { label: 'Filter carefully and answer thoughtfully', stat: 'mg', tier: 'best' },
        { label: 'Read everything raw for authentic reactions', stat: 'ch', tier: 'neutral' },
        { label: 'Only pick the weird ones for shock value', stat: 'tc', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_costume_reveal',
      title: 'New Outfit Reveal',
      description: 'The mama/papa has finished a gorgeous new costume! Time for the grand reveal stream.',
      choices: [
        { label: 'Plan a choreographed reveal with effects', stat: 'vc', tier: 'best' },
        { label: 'Show it off casually with genuine excitement', stat: 'ch', tier: 'neutral' },
        { label: 'Wear it backward and pretend it\'s intentional', stat: 'mg', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_stream_marathon',
      title: 'Stream Marathon',
      description: 'Your lead wants to attempt a 12-hour endurance stream. Their energy management is crucial.',
      choices: [
        { label: 'Schedule breaks and prepare snacks/drinks', stat: 'mg', tier: 'best' },
        { label: 'Power through with sheer determination', stat: 'ch', tier: 'neutral' },
        { label: 'Fall asleep on stream after 3 hours', stat: 'vc', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_harsh_review',
      title: 'Harsh Review',
      description: 'A prominent VTuber reviewer just published a scathing critique of your lead\'s content. Ouch.',
      choices: [
        { label: 'Analyze the feedback for actionable improvements', stat: 'mg', tier: 'best' },
        { label: 'Address it professionally on next stream', stat: 'ch', tier: 'neutral' },
        { label: 'Make a passive-aggressive reply video', stat: 'vc', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_meme_review',
      title: 'Meme Review Stream',
      description: 'Chat has compiled a folder of memes about your lead. Most are flattering… most.',
      choices: [
        { label: 'React with perfect comedic timing', stat: 'ch', tier: 'best' },
        { label: 'Set up a professional slideshow presentation', stat: 'tc', tier: 'neutral' },
        { label: 'Get offended at every single meme', stat: 'vc', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_cooking_stream',
      title: 'Cooking Stream',
      description: 'Your lead attempts to cook live on stream. The kitchen may or may not survive.',
      choices: [
        { label: 'Follow a tested recipe with mise en place', stat: 'mg', tier: 'best' },
        { label: 'Improvise with chat-suggested ingredients', stat: 'ch', tier: 'neutral' },
        { label: 'Set off the smoke alarm within 5 minutes', stat: 'tc', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_milestone_celebration',
      title: 'Milestone Celebration',
      description: 'Your lead is approaching a major subscriber milestone! Time to celebrate properly.',
      choices: [
        { label: 'Plan an elaborate variety show', stat: 'mg', tier: 'best' },
        { label: 'Do a heartfelt gratitude stream with fans', stat: 'ch', tier: 'neutral' },
        { label: 'Just shout "THANKS" and play a game', stat: 'vc', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_horror_game',
      title: 'Horror Game Stream',
      description: 'Chat voted for the scariest horror game available. Your lead is terrified of horror.',
      choices: [
        { label: 'Use voice acting skills to play it up', stat: 'vc', tier: 'best' },
        { label: 'Bribe chat to switch to a cozy game', stat: 'ch', tier: 'neutral' },
        { label: 'Scream so loud the mic clips every 10 seconds', stat: 'mg', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_relay_race',
      title: 'Agency Relay',
      description: 'The agency is hosting a接力 (relay) stream event. Your lead needs to pass the baton smoothly.',
      choices: [
        { label: 'Coordinate handoff timing with next VTuber', stat: 'mg', tier: 'best' },
        { label: 'Give an energetic and memorable segment', stat: 'vc', tier: 'neutral' },
        { label: 'Forget about the relay and go over time', stat: 'tc', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_special_announcement',
      title: 'Special Announcement',
      description: 'Management wants your lead to make a major announcement on stream. The stakes are high.',
      choices: [
        { label: 'Prepare a polished presentation with visuals', stat: 'tc', tier: 'best' },
        { label: 'Deliver the news with genuine excitement', stat: 'ch', tier: 'neutral' },
        { label: 'Accidentally leak the news on Twitter first', stat: 'mg', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_zatsudan',
      title: 'Zatsudan — Free Talk',
      description: 'A relaxed talking stream with no plan. Just your lead and their thoughts. Simple, right?',
      choices: [
        { label: 'Weave engaging stories and anecdotes', stat: 'ch', tier: 'best' },
        { label: 'Prepare talking points hidden in a second monitor', stat: 'mg', tier: 'neutral' },
        { label: 'Stare at chat in silence for 2 minutes', stat: 'vc', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_hashtag_trend',
      title: 'Hashtag Trending',
      description: 'Your lead\'s stream hashtag is suddenly trending! New viewers are pouring in from everywhere.',
      choices: [
        { label: 'Welcome newcomers warmly and explain the channel', stat: 'ch', tier: 'best' },
        { label: 'Quickly set up a fresh overlay for new viewers', stat: 'tc', tier: 'neutral' },
        { label: 'Panic and freeze under the pressure', stat: 'vc', tier: 'fumble' },
      ],
    },
    {
      id: 'evt_voice_lesson',
      title: 'Impromptu Voice Lesson',
      description: 'A professional voice coach is watching and offering live tips. Chat is hype!',
      choices: [
        { label: 'Follow the advice and demonstrate range', stat: 'vc', tier: 'best' },
        { label: 'Ask thoughtful questions about technique', stat: 'ch', tier: 'neutral' },
        { label: 'Try to imitate a dubbing meme instead', stat: 'mg', tier: 'fumble' },
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

  function isSafeZone(turn) {
    return turn >= 1 && turn <= SAFE_ZONE_END;
  }

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
  // Best choice requires meeting a stat threshold; fail = downgraded to Neutral.
  // Threshold scales with turn number so later turns demand stronger teams.

  const STAT_CHECK_ENABLED = true;
  // Base threshold at turn 6, scales up by +2 per turn
  // Turn 6: 18, Turn 10: 26, Turn 15: 36, Turn 20: 46
  function getStatThreshold(turn) {
    return 16 + (turn - 5) * 2;
  }

  // Returns stat check preview for UI display
  function getStatCheckPreview(stat, turn) {
    if (!STAT_CHECK_ENABLED) return { enabled: false };
    const effective = getEffectiveStats();
    if (!effective) return { enabled: false };
    const statData = effective.boosted[stat];
    const playerStat = statData ? statData.total : 0;
    const threshold = getStatThreshold(turn);
    return {
      enabled: true,
      playerStat,
      threshold,
      willPass: playerStat >= threshold,
    };
  }

  function checkStatForChoice(stat, turn) {
    if (!STAT_CHECK_ENABLED) return { passed: true };
    const effective = getEffectiveStats();
    if (!effective) return { passed: true }; // fallback: no check if no stats
    const statData = effective.boosted[stat];
    const playerStat = statData ? statData.total : 0;
    const threshold = getStatThreshold(turn);
    return { passed: playerStat >= threshold, playerStat, threshold };
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
    const coachBonus = calculateCoachBonus(stat);

    let subGain, psCost;
    let effectiveTier = tier; // may be downgraded by stat check
    let statCheck = { passed: true };
    const safe = isSafeZone(turn);

    if (safe) {
      // Safe zone: all choices are 100% with 0 PS cost, no stat check
      subGain = calculateBaseSubs(turn) * 1.0 * (1 + coachBonus);
      psCost = 0;
    } else {
      // Stat check: Best choice can be downgraded to Neutral if stat is too low
      if (tier === 'best') {
        statCheck = checkStatForChoice(stat, turn);
        if (!statCheck.passed) {
          effectiveTier = 'neutral';
        }
      }

      const tierData = CHOICE_TIERS[effectiveTier] || CHOICE_TIERS.neutral;
      let choiceMult = tierData.mult;
      psCost = tierData.psCost;

      // Apply chaos upgrades
      for (const chaos of _runState.chaosUpgrades) {
        choiceMult += chaos.subBoost;
        psCost += chaos.psPenalty;
      }

      subGain = calculateBaseSubs(turn) * choiceMult * (1 + coachBonus);
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
      effectiveTier,
      statCheck: statCheck.passed ? null : { playerStat: statCheck.playerStat, threshold: statCheck.threshold },
      subGain,
      psCost,
      psRemaining: _runState.ps,
      coachBonus: Math.round(coachBonus * 100),
      safe,
    };
    _runState.subscriberLog.push(logEntry);

    // Check for Bad Ending (PS hit 0 before finale)
    if (_runState.ps <= 0 && !isFinaleTurn(turn)) {
      _runState.ending = 'bad';
      endRun('bad');
      return { result: logEntry, runEnded: true, ending: 'bad' };
    }

    // Advance turn
    _runState.turn++;

    // Generate next event (if not finale)
    if (!isFinaleTurn(turn)) {
      _runState.currentEvent = getRandomEvent();
    }

    // Check if this was the finale turn (turn 20)
    if (isFinaleTurn(turn)) {
      if (_runState.subscribers >= _runState.targetSubs) {
        _runState.ending = 'good';
        endRun('good');
      } else {
        _runState.ending = 'neutral';
        endRun('neutral');
      }
      return { result: logEntry, runEnded: true, ending: _runState.ending };
    }

    return { result: logEntry, runEnded: false, statCheck: statCheck.passed ? null : statCheck };
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
      safe: isSafeZone(turn),
    };
    _runState.subscriberLog.push(logEntry);

    // Check Bad Ending
    if (_runState.ps <= 0 && !isFinaleTurn(turn)) {
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
    // Filter out non-repeatable upgrades that have already been taken
    return UPGRADE_POOL.filter(u => {
      if (!u.repeatable && _runState.upgrades.some(gu => gu.id === u.id)) return false;
      return true;
    });
  }

  function processAgencyVisit(upgradeIndex) {
    if (!_runState || !_runState.active) return { error: 'No active run.' };
    if (!isAgencyVisitTurn(_runState.turn)) return { error: 'Not an agency visit turn.' };

    const pool = getUpgradePool();
    if (upgradeIndex < 0 || upgradeIndex >= pool.length) return { error: 'Invalid upgrade.' };

    const upgrade = pool[upgradeIndex];
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
      safe: false,
    });

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
      isSafe: isSafeZone(_runState.turn),
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

    // Refund stamina if in safe zone (turns 1-5)
    if (isSafeZone(_runState.turn)) {
      state.stamina.current = Math.min(Game.STAMINA_MAX, (state.stamina.current || 0) + Game.LIVEON_STAMINA_COST);
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
    getRunProgress,

    // Coach system
    calculateCoachBonus,
    getEffectiveStats,
    getCoachSummary,

    // Stat check
    getStatThreshold,
    getStatCheckPreview,

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
